"""Integration tests for the NovaPay seed script (Seam: app.seed.run against a real DB)."""

import json
from datetime import date

import pytest

from app.seed.data import AREAS, INDICATORS
from app.seed.run import run
from app.services.scoring import compute_department_score, compute_kpi_score, compute_status, score_to_grade

pytestmark = pytest.mark.asyncio


async def test_seed_creates_pillars_areas_and_indicators(migrated_test_db, db_conn):
    await run()

    pillar_count = await db_conn.fetchval("SELECT count(*) FROM strategic_pillars")
    assert pillar_count >= 1

    area_names = {
        row["name"] for row in await db_conn.fetch("SELECT name FROM areas")
    }
    assert area_names == {"Finance", "Sales", "People", "Governance", "Technology"}

    indicator_count = await db_conn.fetchval("SELECT count(*) FROM indicators")
    assert indicator_count == 17


async def test_indicator_department_weights_sum_to_one_per_area(migrated_test_db, db_conn):
    await run()

    rows = await db_conn.fetch(
        """
        SELECT a.name AS area_name, sum(id_.weight) AS total_weight
        FROM indicator_departments id_
        JOIN areas a ON a.id = id_.area_id
        GROUP BY a.name
        """
    )
    assert {row["area_name"] for row in rows} == {
        "Finance", "Sales", "People", "Governance", "Technology",
    }
    for row in rows:
        assert float(row["total_weight"]) == pytest.approx(1.0), row["area_name"]


async def test_related_kpis_reflects_nine_edge_map(migrated_test_db, db_conn):
    await run()

    rows = await db_conn.fetch(
        "SELECT code, related_kpis FROM indicators WHERE related_kpis IS NOT NULL"
    )
    edges = [
        (row["code"], edge["code"])
        for row in rows
        for edge in json.loads(row["related_kpis"])
    ]
    assert len(edges) == 9
    assert ("PEOPLE_HCG", "SALES_PSP") in edges
    assert ("SALES_ACB", "FIN_REV") in edges
    assert ("TECH_UPTIME", "FIN_REV") in edges


async def test_seed_creates_408_indicator_results_with_scored_status(migrated_test_db, db_conn):
    await run()

    result_count = await db_conn.fetchval("SELECT count(*) FROM indicator_results")
    assert result_count == 24 * 17

    rows = await db_conn.fetch(
        """
        SELECT i.code, i.polarity, ir.result, ir.target, ir.kpi_score, ir.status
        FROM indicator_results ir
        JOIN indicators i ON i.id = ir.indicator_id
        """
    )
    assert len(rows) == 408

    # kpi_type isn't a DB column (out of scope for the migrated schema), so
    # cross-check against the source data module's kpi_type per code.
    kpi_type_by_code = {row["code"]: row["kpi_type"] for row in INDICATORS}

    for row in rows:
        kpi_type = kpi_type_by_code[row["code"]]
        polarity = "higher_is_better" if kpi_type == "milestone" else row["polarity"]
        expected_score = compute_kpi_score(
            float(row["result"]), float(row["target"]), polarity, kpi_type
        )
        expected_status = compute_status(
            float(row["result"]), float(row["target"]), polarity, 0.10
        )
        assert float(row["kpi_score"]) == pytest.approx(expected_score, abs=1e-6)
        assert row["status"] == expected_status


async def test_narrative_shows_dips_growth_and_special_patterns(migrated_test_db, db_conn):
    await run()

    rows = await db_conn.fetch(
        """
        SELECT i.code, ir.period, ir.status, ir.result
        FROM indicator_results ir
        JOIN indicators i ON i.id = ir.indicator_id
        ORDER BY i.code, ir.period
        """
    )

    first_year = [r for r in rows if r["period"] < date(2024, 1, 1)]
    second_year = [r for r in rows if r["period"] >= date(2024, 1, 1)]

    off_track_first_year = sum(1 for r in first_year if r["status"] == "off_track")
    off_track_second_year = sum(1 for r in second_year if r["status"] == "off_track")

    # Months 1-12: gradual growth with off-track dips.
    assert off_track_first_year >= 2
    # Months 13-24: improvement-with-setbacks — fewer off-track months than
    # the first year (setbacks are milder, at-risk rather than off-track).
    assert off_track_second_year < off_track_first_year

    # At least one indicator shows a clear seasonal (yearly cyclical) pattern.
    seasonal_results = [float(r["result"]) for r in rows if r["code"] == "SALES_ACB"]
    winter = seasonal_results[10] + seasonal_results[11]  # Nov, Dec (peak)
    summer = seasonal_results[5] + seasonal_results[6]  # Jun, Jul (trough)
    assert winter > summer * 1.05

    # At least one indicator shows a sudden, sharp one-month drop.
    uptime_results = [float(r["result"]) for r in rows if r["code"] == "TECH_UPTIME"]
    drop = max(
        uptime_results[i - 1] - uptime_results[i]
        for i in range(1, len(uptime_results))
    )
    assert drop > 5.0


async def test_department_scores_exist_for_every_area_period(migrated_test_db, db_conn):
    await run()

    score_count = await db_conn.fetchval("SELECT count(*) FROM department_scores")
    assert score_count == 5 * 24

    rows = await db_conn.fetch(
        """
        SELECT a.name AS area_name, ds.period, ds.score, ds.grade
        FROM department_scores ds
        JOIN areas a ON a.id = ds.area_id
        """
    )

    weights_by_area_indicator = {
        (i["area_key"], i["code"]): i["weight"] for i in INDICATORS
    }
    area_key_by_name = {a["name"]: a["key"] for a in AREAS}

    results_rows = await db_conn.fetch(
        """
        SELECT i.code, i.area_id, a.name AS area_name, ir.period, ir.kpi_score
        FROM indicator_results ir
        JOIN indicators i ON i.id = ir.indicator_id
        JOIN areas a ON a.id = i.area_id
        """
    )
    scores_by_area_period: dict[tuple[str, object], list[tuple[float, float]]] = {}
    for r in results_rows:
        key = (r["area_name"], r["period"])
        weight = weights_by_area_indicator[(area_key_by_name[r["area_name"]], r["code"])]
        scores_by_area_period.setdefault(key, []).append((float(r["kpi_score"]), weight))

    for row in rows:
        key = (row["area_name"], row["period"])
        expected_score = compute_department_score(scores_by_area_period[key])
        expected_grade = score_to_grade(expected_score)
        assert float(row["score"]) == pytest.approx(expected_score, abs=1e-6)
        assert row["grade"] == expected_grade


async def test_seed_is_idempotent_on_rerun(migrated_test_db, db_conn):
    await run()

    async def snapshot():
        return {
            table: await db_conn.fetchval(f"SELECT count(*) FROM {table}")
            for table in (
                "strategic_pillars",
                "areas",
                "indicators",
                "indicator_departments",
                "indicator_results",
                "department_scores",
            )
        }

    first_counts = await snapshot()
    first_result_ids = {
        row["id"] for row in await db_conn.fetch("SELECT id FROM indicator_results")
    }

    await run()

    second_counts = await snapshot()
    second_result_ids = {
        row["id"] for row in await db_conn.fetch("SELECT id FROM indicator_results")
    }

    assert second_counts == first_counts
    # Re-running truncates and reseeds, so rows are freshly inserted, not
    # left as duplicates alongside the originals.
    assert first_result_ids.isdisjoint(second_result_ids)

    orphaned_results = await db_conn.fetchval(
        """
        SELECT count(*) FROM indicator_results ir
        LEFT JOIN indicators i ON i.id = ir.indicator_id
        WHERE i.id IS NULL
        """
    )
    assert orphaned_results == 0

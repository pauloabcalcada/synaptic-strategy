"""Seam: GET /api/executive/overview HTTP endpoint, against the real seeded NovaPay DB."""

import pytest

from app.seed.run import run

pytestmark = pytest.mark.asyncio


async def _area_row(response_body: dict, name: str) -> dict:
    return next(row for row in response_body["areas"] if row["name"] == name)


async def test_overview_returns_one_area_card_per_seeded_area_with_score_grade_and_trend(
    migrated_test_db, db_conn, api_client
):
    await run()

    seeded = await db_conn.fetchrow(
        """
        SELECT ds.score, ds.grade,
               ds.score - lag(ds.score) OVER (ORDER BY ds.period) AS trend
        FROM department_scores ds
        JOIN areas a ON a.id = ds.area_id
        WHERE a.name = 'Technology'
        ORDER BY ds.period DESC
        LIMIT 1
        """
    )
    seeded_area_names = {
        row["name"] for row in await db_conn.fetch("SELECT name FROM areas")
    }

    response = await api_client.get("/api/executive/overview")

    assert response.status_code == 200
    body = response.json()
    assert {row["name"] for row in body["areas"]} == seeded_area_names

    row = await _area_row(body, "Technology")
    assert row["score"] == pytest.approx(float(seeded["score"]))
    assert row["grade"] == seeded["grade"]
    assert row["score_mom_delta"] == pytest.approx(float(seeded["trend"]))


async def test_overview_returns_pillar_rollup_grade_as_average_of_member_area_scores(
    migrated_test_db, db_conn, api_client
):
    await run()

    pillar_row = await db_conn.fetchrow(
        "SELECT id, name FROM strategic_pillars WHERE name = 'Operational Excellence'"
    )
    member_scores = await db_conn.fetch(
        """
        SELECT ds.score
        FROM department_scores ds
        JOIN areas a ON a.id = ds.area_id
        WHERE a.pillar_id = $1
          AND ds.period = (SELECT max(period) FROM department_scores)
        """,
        pillar_row["id"],
    )
    expected_rollup_score = sum(float(r["score"]) for r in member_scores) / len(member_scores)

    response = await api_client.get("/api/executive/overview")
    body = response.json()
    pillar = next(p for p in body["pillars"] if p["name"] == "Operational Excellence")

    assert pillar["rollup_score"] == pytest.approx(expected_rollup_score)
    assert set(pillar["areas"]) == {"Governance", "Technology"}
    # Grade brackets are a known, documented constant (A>=85, B>=70, C>=50, D<50) —
    # independently applied here rather than importing score_to_grade from the source.
    if expected_rollup_score >= 85:
        expected_grade = "A"
    elif expected_rollup_score >= 70:
        expected_grade = "B"
    elif expected_rollup_score >= 50:
        expected_grade = "C"
    else:
        expected_grade = "D"
    assert pillar["rollup_grade"] == expected_grade


async def test_overview_heatmap_has_12_cells_per_area_in_period_order(
    migrated_test_db, db_conn, api_client
):
    await run()

    area_row = await db_conn.fetchrow("SELECT id FROM areas WHERE name = 'Finance'")
    seeded_rows = await db_conn.fetch(
        """
        SELECT period, score, grade
        FROM department_scores
        WHERE area_id = $1
        ORDER BY period DESC
        LIMIT 12
        """,
        area_row["id"],
    )
    expected_periods = [r["period"].isoformat() for r in reversed(seeded_rows)]
    expected_scores = {r["period"].isoformat(): float(r["score"]) for r in seeded_rows}
    expected_grades = {r["period"].isoformat(): r["grade"] for r in seeded_rows}

    response = await api_client.get("/api/executive/overview")
    body = response.json()
    heatmap_row = next(h for h in body["heatmap"] if h["name"] == "Finance")

    assert len(heatmap_row["cells"]) == 12
    assert [cell["period"] for cell in heatmap_row["cells"]] == expected_periods
    for cell in heatmap_row["cells"]:
        assert cell["score"] == pytest.approx(expected_scores[cell["period"]])
        assert cell["grade"] == expected_grades[cell["period"]]

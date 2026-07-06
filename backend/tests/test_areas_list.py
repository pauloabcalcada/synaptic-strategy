"""Seam: GET /api/areas HTTP endpoint, against the real seeded DB."""

from datetime import date

import pytest

from app.seed.run import run

pytestmark = pytest.mark.asyncio


async def _area_row(response_body: list, name: str) -> dict:
    return next(row for row in response_body if row["name"] == name)


async def test_list_areas_returns_all_seeded_areas_with_name_and_pillar(
    migrated_test_db, db_conn, api_client
):
    await run()

    seeded = await db_conn.fetch(
        """
        SELECT a.name, p.name AS pillar_name
        FROM areas a
        JOIN strategic_pillars p ON p.id = a.pillar_id
        """
    )
    seeded_by_name = {row["name"]: row["pillar_name"] for row in seeded}

    response = await api_client.get("/api/areas")

    assert response.status_code == 200
    body = response.json()
    assert {row["name"] for row in body} == set(seeded_by_name)
    for row in body:
        assert row["pillar"] == seeded_by_name[row["name"]]


async def test_list_areas_returns_current_score_grade_and_trend(
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

    response = await api_client.get("/api/areas")
    row = await _area_row(response.json(), "Technology")

    assert row["score"] == pytest.approx(float(seeded["score"]))
    assert row["grade"] == seeded["grade"]
    assert row["score_trend"] == pytest.approx(float(seeded["trend"]))


async def test_list_areas_returns_kpi_count(migrated_test_db, db_conn, api_client):
    await run()

    seeded_count = await db_conn.fetchval(
        """
        SELECT count(*)
        FROM indicator_departments id_
        JOIN areas a ON a.id = id_.area_id
        WHERE a.name = 'Finance'
        """
    )

    response = await api_client.get("/api/areas")
    row = await _area_row(response.json(), "Finance")

    assert row["kpi_count"] == seeded_count


async def test_list_areas_returns_status_breakdown_for_current_period(
    migrated_test_db, db_conn, api_client
):
    await run()

    seeded_rows = await db_conn.fetch(
        """
        SELECT ir.status, count(*) AS n
        FROM indicator_results ir
        JOIN indicator_departments id_ ON id_.indicator_id = ir.indicator_id
        JOIN areas a ON a.id = id_.area_id
        WHERE a.name = 'Governance' AND ir.period = $1
        GROUP BY ir.status
        """,
        date(2024, 12, 1),
    )
    expected_breakdown = {row["status"]: row["n"] for row in seeded_rows}

    response = await api_client.get("/api/areas")
    row = await _area_row(response.json(), "Governance")

    assert row["status_breakdown"] == expected_breakdown

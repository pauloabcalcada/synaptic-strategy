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

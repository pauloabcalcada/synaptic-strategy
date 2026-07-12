"""Seam: GET /api/areas/{id}/dashboard HTTP endpoint, against the real seeded DB."""

import uuid
from datetime import date

import pytest

from app.seed.run import run

pytestmark = pytest.mark.asyncio


async def _get_area_id(db_conn, name: str) -> str:
    row = await db_conn.fetchrow("SELECT id FROM areas WHERE name = $1", name)
    return str(row["id"])


async def test_dashboard_returns_department_score_and_grade_matching_seeded_row(
    migrated_test_db, db_conn, api_client
):
    await run()
    area_id = await _get_area_id(db_conn, "Technology")

    seeded = await db_conn.fetchrow(
        "SELECT score, grade FROM department_scores WHERE area_id = $1 AND period = $2",
        uuid.UUID(area_id),
        date(2024, 12, 1),
    )

    response = await api_client.get(f"/api/areas/{area_id}/dashboard")

    assert response.status_code == 200
    body = response.json()
    assert body["period"] == "2024-12-01"
    assert body["score"] == pytest.approx(float(seeded["score"]))
    assert body["grade"] == seeded["grade"]


async def test_dashboard_unknown_area_returns_404(migrated_test_db, api_client):
    await run()

    response = await api_client.get(f"/api/areas/{uuid.uuid4()}/dashboard")

    assert response.status_code == 404


async def test_dashboard_score_mom_delta_is_current_minus_prior_period(
    migrated_test_db, db_conn, api_client
):
    await run()
    area_id = await _get_area_id(db_conn, "Technology")

    december = await db_conn.fetchrow(
        "SELECT score FROM department_scores WHERE area_id = $1 AND period = $2",
        uuid.UUID(area_id),
        date(2024, 12, 1),
    )
    november = await db_conn.fetchrow(
        "SELECT score FROM department_scores WHERE area_id = $1 AND period = $2",
        uuid.UUID(area_id),
        date(2024, 11, 1),
    )
    expected_delta = float(december["score"]) - float(november["score"])

    response = await api_client.get(f"/api/areas/{area_id}/dashboard")

    assert response.json()["score_mom_delta"] == pytest.approx(expected_delta)


async def test_dashboard_score_mom_delta_is_null_for_first_period(
    migrated_test_db, db_conn, api_client
):
    await run()
    area_id = await _get_area_id(db_conn, "Technology")

    response = await api_client.get(
        f"/api/areas/{area_id}/dashboard", params={"period": "2023-01-01"}
    )

    assert response.json()["score_mom_delta"] is None


async def _kpi_row(response_body: dict, code: str) -> dict:
    return next(row for row in response_body["kpis"] if row["code"] == code)


async def test_dashboard_kpi_row_matches_seeded_result_for_lower_is_better_indicator(
    migrated_test_db, db_conn, api_client
):
    """FIN_OCR (Operating Cost Ratio) is lower-is-better."""
    await run()
    area_id = await _get_area_id(db_conn, "Finance")

    seeded = await db_conn.fetchrow(
        """
        SELECT ir.result, ir.target, ir.kpi_score, ir.status, i.name, i.unit
        FROM indicator_results ir
        JOIN indicators i ON i.id = ir.indicator_id
        WHERE i.code = 'FIN_OCR' AND ir.period = $1
        """,
        date(2024, 12, 1),
    )

    response = await api_client.get(f"/api/areas/{area_id}/dashboard")
    row = await _kpi_row(response.json(), "FIN_OCR")

    assert row["name"] == seeded["name"]
    assert row["unit"] == seeded["unit"]
    assert row["result"] == pytest.approx(float(seeded["result"]))
    assert row["target"] == pytest.approx(float(seeded["target"]))
    assert row["kpi_score"] == pytest.approx(float(seeded["kpi_score"]))
    assert row["status"] == seeded["status"]


async def test_dashboard_kpi_row_includes_weight_and_variance_for_lower_is_better_indicator(
    migrated_test_db, db_conn, api_client
):
    """FIN_OCR (Operating Cost Ratio) is lower-is-better, so a result below
    target is a favorable (positive) variance."""
    await run()
    area_id = await _get_area_id(db_conn, "Finance")

    seeded = await db_conn.fetchrow(
        """
        SELECT ir.result, ir.target, id.weight
        FROM indicator_results ir
        JOIN indicators i ON i.id = ir.indicator_id
        JOIN indicator_departments id ON id.indicator_id = i.id AND id.area_id = $2
        WHERE i.code = 'FIN_OCR' AND ir.period = $1
        """,
        date(2024, 12, 1),
        uuid.UUID(area_id),
    )
    expected_variance = float(seeded["target"]) - float(seeded["result"])

    response = await api_client.get(f"/api/areas/{area_id}/dashboard")
    row = await _kpi_row(response.json(), "FIN_OCR")

    assert row["weight"] == pytest.approx(float(seeded["weight"]))
    assert row["variance"] == pytest.approx(expected_variance)


async def test_dashboard_kpi_row_mom_trend_is_null_for_first_period(
    migrated_test_db, db_conn, api_client
):
    await run()
    area_id = await _get_area_id(db_conn, "Finance")

    response = await api_client.get(
        f"/api/areas/{area_id}/dashboard", params={"period": "2023-01-01"}
    )
    row = await _kpi_row(response.json(), "FIN_OCR")

    assert row["mom_trend"] is None


async def test_dashboard_kpi_row_sparkline_is_last_12_kpi_scores_in_period_order(
    migrated_test_db, db_conn, api_client
):
    await run()
    area_id = await _get_area_id(db_conn, "Finance")

    seeded_rows = await db_conn.fetch(
        """
        SELECT ir.kpi_score, ir.period
        FROM indicator_results ir
        JOIN indicators i ON i.id = ir.indicator_id
        WHERE i.code = 'FIN_OCR' AND ir.period <= $1
        ORDER BY ir.period DESC
        LIMIT 12
        """,
        date(2024, 12, 1),
    )
    expected_sparkline = [float(r["kpi_score"]) for r in reversed(seeded_rows)]

    response = await api_client.get(f"/api/areas/{area_id}/dashboard")
    row = await _kpi_row(response.json(), "FIN_OCR")

    assert row["sparkline"] == pytest.approx(expected_sparkline)
    assert len(row["sparkline"]) == 12


async def test_dashboard_kpi_row_matches_seeded_result_for_milestone_indicator(
    migrated_test_db, db_conn, api_client
):
    """GOV_REG (Regulatory Filing On-Time Rate) is a milestone KPI."""
    await run()
    area_id = await _get_area_id(db_conn, "Governance")

    seeded = await db_conn.fetchrow(
        """
        SELECT ir.result, ir.target, ir.kpi_score, ir.status
        FROM indicator_results ir
        JOIN indicators i ON i.id = ir.indicator_id
        WHERE i.code = 'GOV_REG' AND ir.period = $1
        """,
        date(2024, 12, 1),
    )

    response = await api_client.get(f"/api/areas/{area_id}/dashboard")
    row = await _kpi_row(response.json(), "GOV_REG")

    assert row["result"] == pytest.approx(float(seeded["result"]))
    assert row["target"] == pytest.approx(float(seeded["target"]))
    assert row["kpi_score"] == pytest.approx(float(seeded["kpi_score"]))
    assert row["status"] == seeded["status"]

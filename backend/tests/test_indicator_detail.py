"""Seam: GET /api/indicators/{code} HTTP endpoint, against the real seeded DB."""

from datetime import date

import pytest

from app.seed.run import run

pytestmark = pytest.mark.asyncio


async def test_detail_returns_metadata_matching_seeded_indicator(
    migrated_test_db, db_conn, api_client
):
    await run()

    seeded = await db_conn.fetchrow(
        """
        SELECT name, code, unit, polarity, calculation_method, composition,
               accumulation_type, kpi_type
        FROM indicators WHERE code = 'FIN_OCR'
        """
    )

    response = await api_client.get("/api/indicators/FIN_OCR")

    assert response.status_code == 200
    body = response.json()
    assert body["name"] == seeded["name"]
    assert body["code"] == seeded["code"]
    assert body["unit"] == seeded["unit"]
    assert body["polarity"] == seeded["polarity"]
    assert body["calculation_method"] == seeded["calculation_method"]
    assert body["composition"] == seeded["composition"]
    assert body["accumulation_type"] == seeded["accumulation_type"]
    assert body["kpi_type"] == seeded["kpi_type"]


async def test_detail_returns_current_period_result_target_score_status(
    migrated_test_db, db_conn, api_client
):
    await run()

    seeded = await db_conn.fetchrow(
        """
        SELECT ir.result, ir.target, ir.kpi_score, ir.status
        FROM indicator_results ir
        JOIN indicators i ON i.id = ir.indicator_id
        WHERE i.code = 'FIN_OCR' AND ir.period = $1
        """,
        date(2024, 12, 1),
    )

    response = await api_client.get("/api/indicators/FIN_OCR")

    body = response.json()
    assert body["period"] == "2024-12-01"
    assert body["result"] == pytest.approx(float(seeded["result"]))
    assert body["target"] == pytest.approx(float(seeded["target"]))
    assert body["kpi_score"] == pytest.approx(float(seeded["kpi_score"]))
    assert body["status"] == seeded["status"]


async def test_detail_returns_full_24_month_history_in_period_order(
    migrated_test_db, db_conn, api_client
):
    await run()

    seeded_rows = await db_conn.fetch(
        """
        SELECT ir.period, ir.result, ir.target, ir.kpi_score, ir.status
        FROM indicator_results ir
        JOIN indicators i ON i.id = ir.indicator_id
        WHERE i.code = 'FIN_OCR'
        ORDER BY ir.period ASC
        """
    )

    response = await api_client.get("/api/indicators/FIN_OCR")

    history = response.json()["history"]
    assert len(history) == 24
    assert len(seeded_rows) == 24
    for entry, seeded in zip(history, seeded_rows):
        assert entry["period"] == seeded["period"].isoformat()
        assert entry["result"] == pytest.approx(float(seeded["result"]))
        assert entry["target"] == pytest.approx(float(seeded["target"]))
        assert entry["kpi_score"] == pytest.approx(float(seeded["kpi_score"]))
        assert entry["status"] == seeded["status"]


async def test_detail_matches_seeded_data_for_milestone_indicator(
    migrated_test_db, db_conn, api_client
):
    """GOV_REG (Regulatory Filing On-Time Rate) is a milestone KPI."""
    await run()

    seeded_indicator = await db_conn.fetchrow(
        "SELECT kpi_type, polarity FROM indicators WHERE code = 'GOV_REG'"
    )
    seeded_current = await db_conn.fetchrow(
        """
        SELECT ir.result, ir.target, ir.kpi_score, ir.status
        FROM indicator_results ir
        JOIN indicators i ON i.id = ir.indicator_id
        WHERE i.code = 'GOV_REG' AND ir.period = $1
        """,
        date(2024, 12, 1),
    )

    response = await api_client.get("/api/indicators/GOV_REG")

    body = response.json()
    assert body["kpi_type"] == seeded_indicator["kpi_type"] == "milestone"
    assert body["result"] == pytest.approx(float(seeded_current["result"]))
    assert body["target"] == pytest.approx(float(seeded_current["target"]))
    assert body["kpi_score"] == pytest.approx(float(seeded_current["kpi_score"]))
    assert body["status"] == seeded_current["status"]
    assert len(body["history"]) == 24


async def test_detail_unknown_code_returns_404(migrated_test_db, api_client):
    await run()

    response = await api_client.get("/api/indicators/NOPE_404")

    assert response.status_code == 404

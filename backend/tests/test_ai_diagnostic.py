"""Seam: POST /api/ai/diagnose-deviation HTTP endpoint, against the real seeded DB.

All requests use dry_run=True so no test ever contacts OpenAI.
"""

from datetime import date

import pytest

from app.seed.run import run

pytestmark = pytest.mark.asyncio

VALID_PATTERNS = {"sudden_drop", "gradual_deterioration", "seasonal", "persistent"}
VALID_CONFIDENCE = {"high", "medium", "low"}


async def test_off_track_miss_computes_and_persists_diagnostic(
    migrated_test_db, db_conn, api_client
):
    await run()

    response = await api_client.post(
        "/api/ai/diagnose-deviation",
        json={"code": "FIN_OCR", "period": "2023-05-01", "dry_run": True},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["pattern"] in VALID_PATTERNS
    assert body["confidence"] in VALID_CONFIDENCE
    assert isinstance(body["description"], str) and body["description"]
    assert isinstance(body["suggested_focus"], str) and body["suggested_focus"]

    rows = await db_conn.fetch(
        """
        SELECT pattern FROM ai_diagnostics d
        JOIN indicators i ON i.id = d.indicator_id
        WHERE i.code = 'FIN_OCR' AND d.period = $1
        """,
        date(2023, 5, 1),
    )
    assert len(rows) == 1


async def test_second_call_returns_cached_row_without_duplicate(
    migrated_test_db, db_conn, api_client
):
    await run()

    first = await api_client.post(
        "/api/ai/diagnose-deviation",
        json={"code": "FIN_OCR", "period": "2023-05-01", "dry_run": True},
    )
    second = await api_client.post(
        "/api/ai/diagnose-deviation",
        json={"code": "FIN_OCR", "period": "2023-05-01", "dry_run": True},
    )

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json() == second.json()

    rows = await db_conn.fetch(
        """
        SELECT d.id FROM ai_diagnostics d
        JOIN indicators i ON i.id = d.indicator_id
        WHERE i.code = 'FIN_OCR' AND d.period = $1
        """,
        date(2023, 5, 1),
    )
    assert len(rows) == 1


async def test_non_off_track_indicator_returns_null_and_writes_no_row(
    migrated_test_db, db_conn, api_client
):
    await run()

    status_row = await db_conn.fetchrow(
        """
        SELECT ir.status FROM indicator_results ir
        JOIN indicators i ON i.id = ir.indicator_id
        WHERE i.code = 'FIN_OCR' AND ir.period = $1
        """,
        date(2024, 12, 1),
    )
    assert status_row["status"] != "off_track"

    response = await api_client.post(
        "/api/ai/diagnose-deviation",
        json={"code": "FIN_OCR", "period": "2024-12-01", "dry_run": True},
    )

    assert response.status_code == 200
    assert response.json() is None

    rows = await db_conn.fetch(
        """
        SELECT d.id FROM ai_diagnostics d
        JOIN indicators i ON i.id = d.indicator_id
        WHERE i.code = 'FIN_OCR' AND d.period = $1
        """,
        date(2024, 12, 1),
    )
    assert len(rows) == 0


async def test_unknown_indicator_code_returns_404(migrated_test_db, api_client):
    await run()

    response = await api_client.post(
        "/api/ai/diagnose-deviation",
        json={"code": "NOPE_404", "period": "2024-12-01", "dry_run": True},
    )

    assert response.status_code == 404

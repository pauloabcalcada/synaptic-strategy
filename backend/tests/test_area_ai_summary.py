"""Seam: GET /api/areas/{area_id}/ai-summary HTTP endpoint, against the real seeded DB.

This is a read-only rollup of the ai_diagnostics cache — no diagnostic
generation happens here. Diagnostics are seeded via the existing
dry_run /api/ai/diagnose-deviation endpoint, matching how the cache is
populated in production.
"""

from datetime import date

import pytest

from app.seed.run import run

pytestmark = pytest.mark.asyncio


async def _get_area_id(db_conn, name: str) -> str:
    row = await db_conn.fetchrow("SELECT id FROM areas WHERE name = $1", name)
    return str(row["id"])


async def test_returns_diagnostic_for_most_severe_off_track_kpi(
    migrated_test_db, db_conn, api_client
):
    await run()
    area_id = await _get_area_id(db_conn, "Finance")

    diagnose_response = await api_client.post(
        "/api/ai/diagnose-deviation",
        json={"code": "FIN_OCR", "period": "2023-05-01", "dry_run": True},
    )
    assert diagnose_response.status_code == 200
    expected_diagnostic = diagnose_response.json()

    response = await api_client.get(
        f"/api/areas/{area_id}/ai-summary", params={"period": "2023-05-01"}
    )

    assert response.status_code == 200
    body = response.json()
    assert body["period"] == "2023-05-01"
    assert body["summary"] is not None
    assert body["summary"]["indicator_code"] == "FIN_OCR"
    assert body["summary"]["indicator_name"] == "Operating Cost Ratio"
    assert body["summary"]["pattern"] == expected_diagnostic["pattern"]
    assert body["summary"]["confidence"] == expected_diagnostic["confidence"]
    assert body["summary"]["description"] == expected_diagnostic["description"]
    assert body["summary"]["suggested_focus"] == expected_diagnostic["suggested_focus"]


async def test_returns_null_summary_when_area_has_no_off_track_kpis(
    migrated_test_db, db_conn, api_client
):
    await run()
    area_id = await _get_area_id(db_conn, "Technology")

    status_rows = await db_conn.fetch(
        """
        SELECT ir.status FROM indicator_results ir
        JOIN indicator_departments id ON id.indicator_id = ir.indicator_id
        JOIN areas a ON a.id = id.area_id
        WHERE a.name = 'Technology' AND ir.period = $1
        """,
        date(2024, 1, 1),
    )
    assert all(row["status"] != "off_track" for row in status_rows)

    response = await api_client.get(
        f"/api/areas/{area_id}/ai-summary", params={"period": "2024-01-01"}
    )

    assert response.status_code == 200
    body = response.json()
    assert body["period"] == "2024-01-01"
    assert body["summary"] is None


async def test_unknown_area_returns_404(migrated_test_db, api_client):
    await run()

    response = await api_client.get(
        "/api/areas/00000000-0000-0000-0000-000000000000/ai-summary",
        params={"period": "2024-01-01"},
    )

    assert response.status_code == 404

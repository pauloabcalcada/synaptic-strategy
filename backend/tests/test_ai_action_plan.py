"""Seam: POST /api/ai/generate-action-plan HTTP endpoint, against the real seeded DB.

All requests use dry_run=True so no test ever contacts OpenAI. Generation is
ephemeral: it must never write to action_plans.
"""

from datetime import date

import pytest

from app.seed.run import run

pytestmark = pytest.mark.asyncio

VALID_DEADLINE_TYPES = {"short_term", "mid_term", "long_term"}


async def test_generate_action_plan_returns_draft_and_writes_no_row(
    migrated_test_db, db_conn, api_client
):
    await run()

    response = await api_client.post(
        "/api/ai/generate-action-plan",
        json={"code": "FIN_OCR", "period": "2023-05-01", "dry_run": True},
    )

    assert response.status_code == 200
    body = response.json()
    assert isinstance(body["probable_causes"], list) and body["probable_causes"]
    assert isinstance(body["actions"], list) and body["actions"]
    for action in body["actions"]:
        assert isinstance(action["action"], str) and action["action"]
        assert isinstance(action["responsible"], str) and action["responsible"]
        assert action["deadline_type"] in VALID_DEADLINE_TYPES
    assert (
        isinstance(body["monitoring_suggestion"], str) and body["monitoring_suggestion"]
    )

    rows = await db_conn.fetch(
        """
        SELECT ap.id FROM action_plans ap
        JOIN indicators i ON i.id = ap.indicator_id
        WHERE i.code = 'FIN_OCR' AND ap.period = $1
        """,
        date(2023, 5, 1),
    )
    assert len(rows) == 0


async def test_unknown_indicator_code_returns_404(migrated_test_db, api_client):
    await run()

    response = await api_client.post(
        "/api/ai/generate-action-plan",
        json={"code": "NOPE_404", "period": "2024-12-01", "dry_run": True},
    )

    assert response.status_code == 404

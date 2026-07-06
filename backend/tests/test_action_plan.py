"""Seam: GET/PUT /api/indicators/{code}/action-plan HTTP endpoints, against the real seeded DB."""

from datetime import date

import pytest

from app.seed.run import run

pytestmark = pytest.mark.asyncio

SAMPLE_CONTENT = {
    "probable_causes": ["Vendor cost spike"],
    "actions": [
        {
            "action": "Renegotiate vendor contract",
            "responsible": "manager",
            "deadline_type": "short_term",
        }
    ],
    "monitoring_suggestion": "Review monthly.",
}


async def test_get_action_plan_returns_null_when_none_recorded(
    migrated_test_db, api_client
):
    await run()

    response = await api_client.get(
        "/api/indicators/FIN_OCR/action-plan", params={"period": "2024-12-01"}
    )

    assert response.status_code == 200
    body = response.json()
    assert body["content"] is None
    assert body["author_id"] is None


async def test_put_creates_action_plan_then_get_reads_it_back(
    migrated_test_db, api_client
):
    await run()

    put_response = await api_client.put(
        "/api/indicators/FIN_OCR/action-plan",
        json={
            "period": "2024-12-01",
            "content": SAMPLE_CONTENT,
            "author_id": "manager",
        },
    )
    assert put_response.status_code == 200
    put_body = put_response.json()
    assert put_body["content"] == SAMPLE_CONTENT
    assert put_body["author_id"] == "manager"

    get_response = await api_client.get(
        "/api/indicators/FIN_OCR/action-plan", params={"period": "2024-12-01"}
    )
    get_body = get_response.json()
    assert get_body["content"] == SAMPLE_CONTENT
    assert get_body["author_id"] == "manager"


async def test_put_updates_existing_action_plan_for_same_period(
    migrated_test_db, db_conn, api_client
):
    await run()

    await api_client.put(
        "/api/indicators/FIN_OCR/action-plan",
        json={"period": "2024-12-01", "content": SAMPLE_CONTENT, "author_id": "manager"},
    )
    revised_content = {**SAMPLE_CONTENT, "monitoring_suggestion": "Review weekly."}
    second = await api_client.put(
        "/api/indicators/FIN_OCR/action-plan",
        json={
            "period": "2024-12-01",
            "content": revised_content,
            "author_id": "executive",
        },
    )

    assert second.status_code == 200
    body = second.json()
    assert body["content"] == revised_content
    assert body["author_id"] == "executive"

    rows = await db_conn.fetch(
        """
        SELECT ap.author_id FROM action_plans ap
        JOIN indicators i ON i.id = ap.indicator_id
        WHERE i.code = 'FIN_OCR' AND ap.period = $1
        """,
        date(2024, 12, 1),
    )
    assert len(rows) == 1
    assert rows[0]["author_id"] == "executive"


async def test_get_and_put_unknown_indicator_code_returns_404(
    migrated_test_db, api_client
):
    await run()

    get_response = await api_client.get(
        "/api/indicators/NOPE_404/action-plan", params={"period": "2024-12-01"}
    )
    put_response = await api_client.put(
        "/api/indicators/NOPE_404/action-plan",
        json={"period": "2024-12-01", "content": SAMPLE_CONTENT, "author_id": "manager"},
    )

    assert get_response.status_code == 404
    assert put_response.status_code == 404

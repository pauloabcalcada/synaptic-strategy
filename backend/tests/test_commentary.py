"""Seam: GET/PUT /api/indicators/{code}/commentary HTTP endpoints, against the real seeded DB."""

from datetime import date

import pytest

from app.seed.run import run

pytestmark = pytest.mark.asyncio


async def test_get_commentary_returns_null_when_none_recorded(
    migrated_test_db, api_client
):
    await run()

    response = await api_client.get(
        "/api/indicators/FIN_OCR/commentary", params={"period": "2024-12-01"}
    )

    assert response.status_code == 200
    body = response.json()
    assert body["content"] is None
    assert body["is_ai_generated"] is False
    assert body["author_id"] is None


async def test_put_creates_commentary_then_get_reads_it_back(
    migrated_test_db, api_client
):
    await run()

    put_response = await api_client.put(
        "/api/indicators/FIN_OCR/commentary",
        json={
            "period": "2024-12-01",
            "content": "Margin dipped due to one-off vendor costs.",
            "author_id": "manager",
        },
    )
    assert put_response.status_code == 200
    put_body = put_response.json()
    assert put_body["content"] == "Margin dipped due to one-off vendor costs."
    assert put_body["author_id"] == "manager"
    assert put_body["is_ai_generated"] is False

    get_response = await api_client.get(
        "/api/indicators/FIN_OCR/commentary", params={"period": "2024-12-01"}
    )
    get_body = get_response.json()
    assert get_body["content"] == "Margin dipped due to one-off vendor costs."
    assert get_body["author_id"] == "manager"
    assert get_body["is_ai_generated"] is False


async def test_put_updates_existing_commentary_for_same_period(
    migrated_test_db, db_conn, api_client
):
    await run()

    await api_client.put(
        "/api/indicators/FIN_OCR/commentary",
        json={"period": "2024-12-01", "content": "First draft.", "author_id": "manager"},
    )
    second = await api_client.put(
        "/api/indicators/FIN_OCR/commentary",
        json={"period": "2024-12-01", "content": "Revised note.", "author_id": "executive"},
    )

    assert second.status_code == 200
    body = second.json()
    assert body["content"] == "Revised note."
    assert body["author_id"] == "executive"

    rows = await db_conn.fetch(
        """
        SELECT c.content FROM commentaries c
        JOIN indicators i ON i.id = c.indicator_id
        WHERE i.code = 'FIN_OCR' AND c.period = $1
        """,
        date(2024, 12, 1),
    )
    assert len(rows) == 1
    assert rows[0]["content"] == "Revised note."


async def test_get_and_put_unknown_indicator_code_returns_404(
    migrated_test_db, api_client
):
    await run()

    get_response = await api_client.get(
        "/api/indicators/NOPE_404/commentary", params={"period": "2024-12-01"}
    )
    put_response = await api_client.put(
        "/api/indicators/NOPE_404/commentary",
        json={"period": "2024-12-01", "content": "x", "author_id": "manager"},
    )

    assert get_response.status_code == 404
    assert put_response.status_code == 404

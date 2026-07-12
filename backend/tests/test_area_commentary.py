"""Seam: GET/PUT /api/areas/{area_id}/commentary HTTP endpoints, against the real seeded DB."""

import uuid
from datetime import date

import pytest

from app.seed.run import run

pytestmark = pytest.mark.asyncio


async def _get_area_id(db_conn, name: str) -> str:
    row = await db_conn.fetchrow("SELECT id FROM areas WHERE name = $1", name)
    return str(row["id"])


async def test_get_commentary_returns_null_when_none_recorded(
    migrated_test_db, db_conn, api_client
):
    await run()
    area_id = await _get_area_id(db_conn, "Technology")

    response = await api_client.get(
        f"/api/areas/{area_id}/commentary", params={"period": "2024-12-01"}
    )

    assert response.status_code == 200
    body = response.json()
    assert body["content"] is None
    assert body["is_ai_generated"] is False
    assert body["author_id"] is None


async def test_put_creates_commentary_then_get_reads_it_back(
    migrated_test_db, db_conn, api_client
):
    await run()
    area_id = await _get_area_id(db_conn, "Technology")

    put_response = await api_client.put(
        f"/api/areas/{area_id}/commentary",
        json={
            "period": "2024-12-01",
            "content": "Strong month across the board.",
            "author_id": "manager",
        },
    )
    assert put_response.status_code == 200
    put_body = put_response.json()
    assert put_body["content"] == "Strong month across the board."
    assert put_body["author_id"] == "manager"
    assert put_body["is_ai_generated"] is False

    get_response = await api_client.get(
        f"/api/areas/{area_id}/commentary", params={"period": "2024-12-01"}
    )
    get_body = get_response.json()
    assert get_body["content"] == "Strong month across the board."
    assert get_body["author_id"] == "manager"
    assert get_body["is_ai_generated"] is False


async def test_put_updates_existing_commentary_for_same_period(
    migrated_test_db, db_conn, api_client
):
    await run()
    area_id = await _get_area_id(db_conn, "Technology")

    await api_client.put(
        f"/api/areas/{area_id}/commentary",
        json={"period": "2024-12-01", "content": "First draft.", "author_id": "manager"},
    )
    second = await api_client.put(
        f"/api/areas/{area_id}/commentary",
        json={"period": "2024-12-01", "content": "Revised note.", "author_id": "executive"},
    )

    assert second.status_code == 200
    body = second.json()
    assert body["content"] == "Revised note."
    assert body["author_id"] == "executive"

    rows = await db_conn.fetch(
        "SELECT content FROM area_commentaries WHERE area_id = $1 AND period = $2",
        uuid.UUID(area_id),
        date(2024, 12, 1),
    )
    assert len(rows) == 1
    assert rows[0]["content"] == "Revised note."


async def test_commentary_is_independent_of_indicator_level_commentary(
    migrated_test_db, db_conn, api_client
):
    await run()
    area_id = await _get_area_id(db_conn, "Technology")

    await api_client.put(
        "/api/indicators/FIN_OCR/commentary",
        json={
            "period": "2024-12-01",
            "content": "Indicator-level note.",
            "author_id": "manager",
        },
    )
    await api_client.put(
        f"/api/areas/{area_id}/commentary",
        json={
            "period": "2024-12-01",
            "content": "Area-level note.",
            "author_id": "manager",
        },
    )

    area_response = await api_client.get(
        f"/api/areas/{area_id}/commentary", params={"period": "2024-12-01"}
    )
    indicator_response = await api_client.get(
        "/api/indicators/FIN_OCR/commentary", params={"period": "2024-12-01"}
    )

    assert area_response.json()["content"] == "Area-level note."
    assert indicator_response.json()["content"] == "Indicator-level note."


async def test_get_and_put_unknown_area_id_returns_404(migrated_test_db, api_client):
    await run()

    unknown_id = uuid.uuid4()
    get_response = await api_client.get(
        f"/api/areas/{unknown_id}/commentary", params={"period": "2024-12-01"}
    )
    put_response = await api_client.put(
        f"/api/areas/{unknown_id}/commentary",
        json={"period": "2024-12-01", "content": "x", "author_id": "manager"},
    )

    assert get_response.status_code == 404
    assert put_response.status_code == 404

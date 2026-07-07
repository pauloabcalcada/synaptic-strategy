"""Seam: GET /api/graph/strategy-map HTTP endpoint, against the real seeded DB."""

import pytest

from app.seed.run import run

pytestmark = pytest.mark.asyncio


async def test_strategy_map_returns_node_per_active_indicator_and_9_seeded_edges(
    migrated_test_db, db_conn, api_client
):
    await run()

    active_indicator_count = await db_conn.fetchval(
        "SELECT count(*) FROM indicators WHERE active IS TRUE"
    )

    response = await api_client.get("/api/graph/strategy-map")

    assert response.status_code == 200
    body = response.json()
    assert len(body["nodes"]) == active_indicator_count

    edges = body["edges"]
    assert len(edges) == 9

    expected_edge = {"source": "FIN_OCR", "target": "FIN_EBITDA", "label": "impacts"}
    assert expected_edge in edges

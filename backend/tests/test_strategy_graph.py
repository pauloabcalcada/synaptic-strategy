"""Seam: GET /api/graph/strategy-map HTTP endpoint, against the real seeded DB."""

import uuid

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


async def test_strategy_map_node_carries_department_grade_weight_result_target(
    migrated_test_db, db_conn, api_client
):
    await run()

    seeded = await db_conn.fetchrow(
        """
        SELECT a.name AS department, ds.score, ds.grade, id.weight,
               ir.result, ir.target
        FROM indicators i
        JOIN indicator_departments id ON id.indicator_id = i.id AND id.is_primary_owner = TRUE
        JOIN areas a ON a.id = id.area_id
        JOIN department_scores ds ON ds.area_id = a.id
        JOIN indicator_results ir ON ir.indicator_id = i.id AND ir.period = ds.period
        WHERE i.code = 'FIN_OCR'
        ORDER BY ds.period DESC
        LIMIT 1
        """
    )

    response = await api_client.get("/api/graph/strategy-map")

    body = response.json()
    node = next(node for node in body["nodes"] if node["id"] == "FIN_OCR")

    assert node["department"] == seeded["department"] == "Finance"
    assert node["grade"] == seeded["grade"]
    assert node["weight"] == pytest.approx(float(seeded["weight"])) == pytest.approx(0.30)
    assert node["score"] == pytest.approx(float(seeded["score"]))
    assert node["result"] == pytest.approx(float(seeded["result"]))
    assert node["target"] == pytest.approx(float(seeded["target"]))


async def test_strategy_map_flags_active_diagnostic_for_latest_period_only(
    migrated_test_db, db_conn, api_client
):
    await run()

    latest_period = await db_conn.fetchval("SELECT max(period) FROM indicator_results")
    indicator_id = await db_conn.fetchval(
        "SELECT id FROM indicators WHERE code = 'FIN_OCR'"
    )
    await db_conn.execute(
        """
        INSERT INTO ai_diagnostics (id, indicator_id, period, pattern, confidence, description, suggested_focus)
        VALUES ($1, $2, $3, 'sudden_drop', 'high', 'seeded for test', 'seeded for test')
        """,
        uuid.uuid4(),
        indicator_id,
        latest_period,
    )

    response = await api_client.get("/api/graph/strategy-map")
    body = response.json()

    diagnosed_node = next(node for node in body["nodes"] if node["id"] == "FIN_OCR")
    other_nodes = [node for node in body["nodes"] if node["id"] != "FIN_OCR"]

    assert diagnosed_node["active_diagnostic"] is True
    assert all(node["active_diagnostic"] is False for node in other_nodes)

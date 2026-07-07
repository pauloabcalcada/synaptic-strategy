"""Seam: POST /api/ai/chat HTTP endpoint, against the real seeded DB.

All requests use dry_run=True so no test ever contacts OpenAI.
"""

import pytest

from app.seed.run import run

pytestmark = pytest.mark.asyncio


async def test_unknown_indicator_code_returns_404(migrated_test_db, api_client):
    await run()

    response = await api_client.post(
        "/api/ai/chat",
        json={
            "code": "NOPE_404",
            "role": "manager",
            "messages": [{"role": "user", "content": "Why did this drop?"}],
            "dry_run": True,
        },
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Indicator not found"


async def test_chat_streams_answer_referencing_result_and_target(
    migrated_test_db, db_conn, api_client
):
    await run()

    latest = await db_conn.fetchrow(
        """
        SELECT ir.result, ir.target FROM indicator_results ir
        JOIN indicators i ON i.id = ir.indicator_id
        WHERE i.code = 'FIN_OCR'
        ORDER BY ir.period DESC
        LIMIT 1
        """
    )

    async with api_client.stream(
        "POST",
        "/api/ai/chat",
        json={
            "code": "FIN_OCR",
            "role": "manager",
            "messages": [{"role": "user", "content": "Why did this drop?"}],
            "dry_run": True,
        },
    ) as response:
        assert response.status_code == 200
        frames = [line async for line in response.aiter_lines() if line.startswith("data: ")]

    assert len(frames) > 1

    answer = "".join(frame.removeprefix("data: ") for frame in frames)
    assert answer.strip()
    assert str(latest["result"]) in answer
    assert str(latest["target"]) in answer

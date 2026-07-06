"""Seam: GET /api/meta HTTP endpoint, against the real seeded DB."""

import httpx
import pytest

from app.main import app
from app.seed.run import run

pytestmark = pytest.mark.asyncio


async def test_meta_returns_max_seeded_period_as_current_period(migrated_test_db, db_conn):
    await run()

    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.get("/api/meta")

    assert response.status_code == 200
    # Seed generates exactly 24 months starting 2023-01-01, so the last
    # (max) period is known independently of the query implementation.
    assert response.json()["current_period"] == "2024-12-01"


async def test_meta_returns_grade_brackets(migrated_test_db, db_conn):
    await run()

    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.get("/api/meta")

    assert response.json()["grade_brackets"] == {"A": 85.0, "B": 70.0, "C": 50.0, "D": 0.0}


async def test_meta_returns_status_tolerance(migrated_test_db, db_conn):
    await run()

    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.get("/api/meta")

    assert response.json()["status_tolerance"] == 0.10

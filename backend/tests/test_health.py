"""Seam A: GET /health HTTP endpoint."""

import pytest
import httpx

from app.main import app


@pytest.mark.asyncio
async def test_health_returns_200():
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.get("/health")

    assert response.status_code == 200


@pytest.mark.asyncio
async def test_health_body_contains_status_ok():
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.get("/health")

    assert response.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_cors_preflight_allows_vite_origin():
    vite_origin = "http://localhost:5173"
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.options(
            "/health",
            headers={
                "Origin": vite_origin,
                "Access-Control-Request-Method": "GET",
            },
        )

    assert response.headers.get("access-control-allow-origin") == vite_origin

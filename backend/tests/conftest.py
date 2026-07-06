"""Shared fixtures for tests that need a real migrated Postgres database."""

import os
import subprocess
import sys
from pathlib import Path

import asyncpg
import httpx
import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

BACKEND_DIR = Path(__file__).parent.parent

POSTGRES_ADMIN_DSN = "postgresql://synaptic:synaptic@localhost:5432/postgres"


def _run_alembic(db_url: str, *args: str) -> subprocess.CompletedProcess:
    env = {**os.environ, "DATABASE_URL": db_url}
    return subprocess.run(
        [sys.executable, "-m", "alembic", *args],
        cwd=BACKEND_DIR,
        env=env,
        capture_output=True,
        text=True,
    )


@pytest.fixture(scope="module")
async def migrated_test_db():
    """Create a fresh, fully-migrated Postgres database for the test module.

    Yields the asyncpg DSN and the asyncpg+asyncio DATABASE_URL; sets
    DATABASE_URL in the environment for the duration so code under test
    (which reads it lazily) targets this database.
    """
    db_name = "synaptic_strategy_seed_test"
    dsn = f"postgresql://synaptic:synaptic@localhost:5432/{db_name}"
    db_url = f"postgresql+asyncpg://synaptic:synaptic@localhost:5432/{db_name}"

    admin = await asyncpg.connect(POSTGRES_ADMIN_DSN)
    await admin.execute(
        "SELECT pg_terminate_backend(pid) "
        f"FROM pg_stat_activity WHERE datname = '{db_name}'"
    )
    await admin.execute(f'DROP DATABASE IF EXISTS "{db_name}"')
    await admin.execute(f'CREATE DATABASE "{db_name}"')
    await admin.close()

    result = _run_alembic(db_url, "upgrade", "head")
    assert result.returncode == 0, (
        f"alembic upgrade head failed:\nstdout: {result.stdout}\nstderr: {result.stderr}"
    )

    previous = os.environ.get("DATABASE_URL")
    os.environ["DATABASE_URL"] = db_url

    yield {"dsn": dsn, "url": db_url}

    if previous is None:
        os.environ.pop("DATABASE_URL", None)
    else:
        os.environ["DATABASE_URL"] = previous

    admin = await asyncpg.connect(POSTGRES_ADMIN_DSN)
    await admin.execute(
        "SELECT pg_terminate_backend(pid) "
        f"FROM pg_stat_activity WHERE datname = '{db_name}'"
    )
    await admin.execute(f'DROP DATABASE IF EXISTS "{db_name}"')
    await admin.close()


@pytest.fixture
async def db_conn(migrated_test_db):
    conn = await asyncpg.connect(migrated_test_db["dsn"])
    yield conn
    await conn.close()


@pytest.fixture
async def api_client(migrated_test_db):
    """An httpx client whose requests are served against the migrated test DB.

    `app.core.database.get_session` binds an engine at import time, before
    this fixture can point DATABASE_URL at the test DB, so requests must be
    rerouted explicitly via a dependency override.
    """
    from app.core.database import get_session
    from app.main import app

    engine = create_async_engine(migrated_test_db["url"], echo=False)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async def _get_test_session():
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_session] = _get_test_session

    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        yield client

    app.dependency_overrides.pop(get_session, None)
    await engine.dispose()

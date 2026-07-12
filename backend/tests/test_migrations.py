"""Seam D: alembic upgrade head / downgrade base round-trip against live Postgres."""

import os
import subprocess
import sys
from pathlib import Path

import asyncpg
import pytest

BACKEND_DIR = Path(__file__).parent.parent

TEST_DB = "synaptic_strategy_test"
POSTGRES_ADMIN_DSN = "postgresql://synaptic:synaptic@localhost:5432/postgres"
TEST_DSN = f"postgresql://synaptic:synaptic@localhost:5432/{TEST_DB}"
TEST_DB_URL = f"postgresql+asyncpg://synaptic:synaptic@localhost:5432/{TEST_DB}"

EXPECTED_TABLES = {
    "strategic_pillars",
    "areas",
    "indicators",
    "indicator_departments",
    "indicator_results",
    "department_scores",
    "commentaries",
    "area_commentaries",
    "action_plans",
    "ai_diagnostics",
    "rag_documents",
}


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------


def _run_alembic(*args: str) -> subprocess.CompletedProcess:
    env = {**os.environ, "DATABASE_URL": TEST_DB_URL}
    return subprocess.run(
        [sys.executable, "-m", "alembic", *args],
        cwd=BACKEND_DIR,
        env=env,
        capture_output=True,
        text=True,
    )


async def _public_tables(dsn: str) -> set[str]:
    conn = await asyncpg.connect(dsn)
    rows = await conn.fetch(
        "SELECT tablename FROM pg_tables WHERE schemaname = 'public'"
    )
    await conn.close()
    return {row["tablename"] for row in rows}


async def _extensions(dsn: str) -> set[str]:
    conn = await asyncpg.connect(dsn)
    rows = await conn.fetch("SELECT extname FROM pg_extension")
    await conn.close()
    return {row["extname"] for row in rows}


async def _column_info(dsn: str, table: str, column: str):
    conn = await asyncpg.connect(dsn)
    row = await conn.fetchrow(
        "SELECT data_type, is_nullable FROM information_schema.columns "
        "WHERE table_name = $1 AND column_name = $2",
        table,
        column,
    )
    await conn.close()
    return row


async def _unique_constraint_columns(dsn: str, table: str) -> set[frozenset]:
    conn = await asyncpg.connect(dsn)
    rows = await conn.fetch(
        """
        SELECT array_agg(a.attname) AS cols
        FROM pg_constraint c
        JOIN unnest(c.conkey) AS k(attnum) ON true
        JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum
        WHERE c.conrelid = $1::regclass AND c.contype = 'u'
        GROUP BY c.oid
        """,
        table,
    )
    await conn.close()
    return {frozenset(row["cols"]) for row in rows}


# ---------------------------------------------------------------------------
# fixture
# ---------------------------------------------------------------------------


@pytest.fixture
async def fresh_test_db():
    """Create an empty test database; drop it after the test."""
    admin = await asyncpg.connect(POSTGRES_ADMIN_DSN)
    await admin.execute(
        "SELECT pg_terminate_backend(pid) "
        f"FROM pg_stat_activity WHERE datname = '{TEST_DB}'"
    )
    await admin.execute(f'DROP DATABASE IF EXISTS "{TEST_DB}"')
    await admin.execute(f'CREATE DATABASE "{TEST_DB}"')
    await admin.close()

    yield

    admin = await asyncpg.connect(POSTGRES_ADMIN_DSN)
    await admin.execute(
        "SELECT pg_terminate_backend(pid) "
        f"FROM pg_stat_activity WHERE datname = '{TEST_DB}'"
    )
    await admin.execute(f'DROP DATABASE IF EXISTS "{TEST_DB}"')
    await admin.close()


# ---------------------------------------------------------------------------
# tests
# ---------------------------------------------------------------------------


async def test_upgrade_head_creates_vector_extension_and_all_tables(fresh_test_db):
    result = _run_alembic("upgrade", "head")
    assert result.returncode == 0, (
        f"alembic upgrade head failed:\nstdout: {result.stdout}\nstderr: {result.stderr}"
    )

    exts = await _extensions(TEST_DSN)
    assert "vector" in exts, f"pgvector extension not found; installed: {exts}"

    tables = await _public_tables(TEST_DSN)
    missing = EXPECTED_TABLES - tables
    assert not missing, f"Missing tables after upgrade head: {missing}"


async def test_downgrade_base_then_upgrade_head_roundtrips(fresh_test_db):
    # Bring the DB to head first so downgrade has something to undo.
    up = _run_alembic("upgrade", "head")
    assert up.returncode == 0, f"setup upgrade failed:\n{up.stderr}"

    down = _run_alembic("downgrade", "base")
    assert down.returncode == 0, (
        f"alembic downgrade base failed:\nstdout: {down.stdout}\nstderr: {down.stderr}"
    )

    tables = await _public_tables(TEST_DSN)
    still_present = EXPECTED_TABLES & tables
    assert not still_present, f"Tables still present after downgrade base: {still_present}"

    up2 = _run_alembic("upgrade", "head")
    assert up2.returncode == 0, (
        f"alembic upgrade head (re-run) failed:\nstdout: {up2.stdout}\nstderr: {up2.stderr}"
    )

    tables = await _public_tables(TEST_DSN)
    missing = EXPECTED_TABLES - tables
    assert not missing, f"Missing tables after re-upgrade: {missing}"


async def test_action_plans_author_id_is_text_and_unique_per_indicator_period(
    fresh_test_db,
):
    result = _run_alembic("upgrade", "head")
    assert result.returncode == 0, (
        f"alembic upgrade head failed:\nstdout: {result.stdout}\nstderr: {result.stderr}"
    )

    author_id_col = await _column_info(TEST_DSN, "action_plans", "author_id")
    assert author_id_col is not None, "action_plans.author_id column not found"
    assert author_id_col["data_type"] == "text"

    indicator_id_col = await _column_info(TEST_DSN, "action_plans", "indicator_id")
    assert indicator_id_col["is_nullable"] == "NO"

    unique_sets = await _unique_constraint_columns(TEST_DSN, "action_plans")
    assert frozenset({"indicator_id", "period"}) in unique_sets

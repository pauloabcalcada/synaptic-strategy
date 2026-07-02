# Synaptic Strategy — Dev Environment Setup

Companion checklist to `synaptic-strategy-handoff.md`. Covers everything needed before Phase 1 implementation starts. Backend-only for now (poetry); frontend/npm setup is deferred to when Phase 2 frontend work begins.

---

## 1. GitHub Repository

- [ ] Create repo: **`synaptic-strategy`**, public
- [ ] Initialize locally in this folder (`SynaptiqStrategy/`) and set `origin` to the new repo
- [ ] Add `.gitignore` (Python + Node + `.env` + `__pycache__` + `.venv`)
- [ ] First commit: handoff doc + this setup doc

```bash
git init
gh repo create synaptic-strategy --public --source=. --remote=origin
git add synaptic-strategy-handoff.md SETUP.md .gitignore
git commit -m "docs: project handoff and setup"
git push -u origin main
```

## 2. Backend Scaffolding (`backend/`)

Per the handoff's project structure (Section 6): `backend/app/{api,models,schemas,services,core}`, `alembic/`, `tests/`, `pyproject.toml`, `Dockerfile`.

```bash
mkdir -p backend
cd backend
poetry init --name synaptic-strategy-backend --python "^3.11"
```

### 2.1 Core dependencies

```bash
poetry add fastapi "uvicorn[standard]" "sqlalchemy[asyncio]" alembic \
  asyncpg pydantic-settings python-dotenv
```

### 2.2 AI layer

```bash
poetry add openai langchain langchain-openai langchain-community langchain-postgres
```

### 2.3 Async jobs (diagnostics/action plans run off the request path)

```bash
poetry add celery redis
```

### 2.4 RAG document generation (seed PDFs)

```bash
poetry add reportlab
```

### 2.5 Dev/test dependencies

```bash
poetry add --group dev pytest pytest-asyncio httpx ruff
```

> **Dependency safety policy (global CLAUDE.md):** before adding any package above, verify its latest version on PyPI is more than 7 days old. If a package was published/updated within 7 days, pin to the prior stable release or flag it before installing — do not add a package whose only versions are all <7 days old.

## 3. Local Services

```bash
# docker-compose.yml at repo root: postgres (or Supabase local), redis
docker compose up -d
```

- [ ] Supabase project created (or local Postgres 15 for early dev)
- [ ] `CREATE EXTENSION IF NOT EXISTS vector;` run as the **first** migration (pgvector), per handoff Section 13
- [ ] Redis reachable at `REDIS_URL`

## 4. Environment Variables

Copy the template from handoff Section 11 into `backend/.env` (gitignored):

```env
DATABASE_URL=postgresql+asyncpg://...
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=...
OPENAI_API_KEY=sk-...
REDIS_URL=redis://localhost:6379
ENVIRONMENT=development
```

Also create `.env.example` at the repo root (no real secrets) for anyone cloning the repo.

## 5. Verify the Environment

```bash
cd backend
poetry install
poetry run uvicorn app.main:app --reload   # once app/main.py exists with a health route
poetry run pytest
poetry run ruff check .
```

## 6. Claude Code Skills Relevant to This Build

These are already available in this session (via `superpowers`) and will be invoked as the project progresses — no separate install step needed, just noting when each applies:

| Skill | When it's used here |
|---|---|
| `superpowers:brainstorming` | Before scaffolding Phase 1 code — confirming architecture choices (monorepo layout, scoring service boundaries) before writing anything |
| `superpowers:writing-plans` | Turning each Phase (1–5) from the handoff into a concrete implementation plan |
| `superpowers:test-driven-development` | Backend logic with clear correctness contracts — `compute_kpi_score`, department score aggregation, strategy graph traversal |
| `superpowers:using-git-worktrees` | Isolating feature branches (e.g. AI features vs. core CRUD) from the main working tree |
| `superpowers:executing-plans` / `superpowers:subagent-driven-development` | Running the phased implementation once a plan exists |
| `superpowers:requesting-code-review` / `code-review` | Before merging each phase |
| `superpowers:verification-before-completion` | Before declaring any phase "done" — run tests, hit the health endpoint, confirm migrations applied |

Per handoff Section 13: also follow the `AGENTS.md` convention for any subagent/tool definitions introduced during backend AI service work — create this file when the AI services (`services/ai/`) are scaffolded in Phase 3.

## 7. Next Step

Once the above is checked off, move to **Phase 1** exactly as specified in `synaptic-strategy-handoff.md` (Section 10): monorepo scaffolding, Alembic schema migration, FastAPI health check + CORS, React base, and the NovaPay seed script.

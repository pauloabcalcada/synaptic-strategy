# Synaptic Strategy

A portfolio demo showing how a corporate strategy cascades into department KPIs, scores, and AI-generated insight — built around a fictional company, NovaPay, with a fully seeded 24-month dataset across 5 departments and 17 indicators.

## Prerequisites

- Docker (with Docker Compose)
- Node.js 20+
- Python 3.11+ with [Poetry](https://python-poetry.org/)

## Quick start

From a clean checkout:

```bash
# 1. Copy env files
cp .env.example backend/.env
cp .env.example frontend/.env.local   # then trim to just the VITE_ vars

# 2. Start Postgres (with pgvector) and Redis
docker compose up -d postgres redis

# 3. Install backend dependencies
cd backend
poetry install

# 4. Run migrations (enables pgvector, creates the full schema)
#    Alembic reads DATABASE_URL from the environment, not from backend/.env,
#    so export it for this command:
export DATABASE_URL=postgresql+asyncpg://synaptic:synaptic@localhost:5432/synaptic_strategy
poetry run alembic upgrade head

# 5. Seed the NovaPay dataset (areas, indicators, 24mo of results, department
#    scores, and knowledge-base/meeting-minutes PDFs)
poetry run python -m app.seed.run

# 6. Start the backend
poetry run uvicorn app.main:app --reload
# — or, to run it containerized instead —
docker compose up backend

# 7. In a separate terminal, start the frontend
cd frontend
npm install
npm run dev
```

The backend serves on `http://localhost:8000` (`/health` for a liveness check) and the frontend on `http://localhost:5173`.

## Project structure

```
backend/          FastAPI + SQLAlchemy + Alembic backend
  app/api/routes/   Route modules (only /health is registered in Phase 1)
  app/models/       SQLAlchemy models mirroring the 10-table schema
  app/services/     Pure business logic (e.g. KPI/department scoring)
  app/seed/         NovaPay seed data, scoring, and PDF generation
  alembic/          Migrations (pgvector extension is its own first migration)
  tests/            Pytest suite

frontend/         Vite + React + TypeScript + Tailwind + shadcn/ui
  src/pages/        Route-level pages (Landing, Executive, StrategyGraph, ...)
  src/store/        Zustand store for role-simulation state
  src/lib/          API client and shared utilities

docker-compose.yml  postgres, redis, backend services
prototype/          Design inspiration for frontend UI (not a literal template)
```

## Deliberate decisions

- **Local Postgres, not Supabase, for now.** `docker compose`'s `postgres` service (`pgvector/pgvector:pg15`) is the dev-time `DATABASE_URL` target. Supabase adoption is deferred to a later deploy-time decision — this is intentional, not an oversight.
- **Frontend runs outside Docker Compose.** `npm run dev` is run natively for better HMR performance rather than through a `frontend` compose service. A containerized frontend service is deferred to a later deploy-prep phase.

## Phase status

**Phase 1 (foundation) is complete**: schema/migrations, scoring service, seeded NovaPay dataset and PDFs, FastAPI skeleton, and frontend skeleton are all in place.

Phase 2 and beyond (real API routes, AI features, RAG ingestion, full page content, dark mode, deploy) are **pending**.

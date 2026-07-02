# Synaptic Strategy — Project Handoff Document

> **Purpose:** This document serves as the complete briefing for Claude Code to initiate the Synaptic Strategy project from scratch. It covers product vision, architecture decisions, feature specifications, AI integration points, tech stack, and suggested implementation order.

---

## 1. Product Overview

**Synaptic Strategy** is a web-based strategic performance management platform designed to help organizations cascade their strategy across business units, track KPI results against targets, and leverage AI to generate insights, diagnostics, and action plans — all from a single, accessible interface for every area manager.

### Core Problem It Solves

Large organizations often define a corporate strategy that never truly reaches operational teams. Managers track metrics in isolation, without understanding how their indicators connect to broader company goals. Monthly reviews become bureaucratic rituals rather than moments of real decision-making.

Synaptic Strategy makes the strategy visible, measurable, and conversational — with AI acting as an embedded analyst for every manager.

### Target Users

- **Executive leadership** — strategic overview across all areas
- **Area managers** — responsible for their own KPI panels and monthly commentary
- **Business intelligence / strategy teams** — platform administrators who configure indicators and structure

---

## 2. Core Functional Modules

### 2.1 Indicator Registry

Each indicator (KPI) is a structured entity with:

| Field | Description |
|---|---|
| `name` | Display name |
| `code` | Unique identifier (e.g., `TURN_001`) |
| `unit` | Percentage, absolute number, currency, days, etc. |
| `polarity` | Higher is better / Lower is better |
| `calculation_method` | How the result is computed (formula or description) |
| `composition` | What sub-metrics compose this indicator |
| `accumulation_type` | Last value / average / sum |
| `target` | Monthly or annual target value |
| `owner_area` | Which business area owns this KPI |
| `strategic_pillar` | Which strategic pillar this KPI supports |
| `kpi_type` | `numerical` or `milestone` (milestone KPIs are binary: achieved / not achieved) |
| `department_impact` | Free-text description of how this KPI impacts the owning department's goals |
| `strategy_impact` | Which corporate strategy objective this KPI directly supports |
| `related_kpis` | Array of KPI codes that this indicator causally influences (upstream/downstream) |
| `active` | Boolean |

### 2.2 Results Entry & Historical Tracking

- Monthly result entry per indicator
- Automatic calculation of variance (actual vs. target), both absolute and percentage
- Color-coded status: on track (green), at risk (yellow), off track (red) — based on a configurable tolerance threshold
- Historical time series storage (36-month rolling window minimum)

### 2.3 KPI Scoring System

Each KPI result is converted to a normalized score from 0 to 100, independent of unit. This allows comparison and aggregation across heterogeneous indicators.

**Score curve logic (configurable per KPI):**

| Achievement vs. Target | Score |
|---|---|
| ≥ 110–115% of target | 100 (capped) |
| 100% of target (exact) | 70 |
| 90% of target | 40 |
| 80% of target | 20 |
| < 70% of target | 0 |

The curve between breakpoints is linear interpolation. For `lower_is_better` polarity, the logic is inverted (achieving 90% of a cost target means exceeding it, so the score is higher).

For `milestone` type KPIs, scoring is binary: 100 if achieved, 0 if not — no interpolation.

**Score formula (stored per result):**
```python
def compute_kpi_score(result, target, polarity, kpi_type, over_achievement_threshold=0.10):
    if kpi_type == "milestone":
        return 100 if result >= target else 0
    achievement_ratio = result / target if polarity == "higher_is_better" else target / result
    if achievement_ratio >= (1 + over_achievement_threshold):
        return 100
    elif achievement_ratio >= 1.0:
        # Linear interpolation from 70 to 100 between 100% and 110%
        return 70 + (achievement_ratio - 1.0) / over_achievement_threshold * 30
    elif achievement_ratio >= 0.7:
        # Linear interpolation from 0 to 70 between 70% and 100%
        return (achievement_ratio - 0.7) / 0.3 * 70
    else:
        return 0
```

**Department Score:**

Each department has a composite score computed as the weighted average of its KPIs' individual scores. The weight for each KPI within a department is stored in the `indicator_departments` join table (not on the indicator itself, since the same KPI can participate in multiple departments with different weights). Weights within a given department must sum to 1.0.

```
department_score = Σ (kpi_score_i × weight_i)  for all KPIs linked to the department via indicator_departments
```

The department score is displayed as a number (0–100) with a letter grade bracket:
- **A** (85–100): Excellent
- **B** (70–84): On track
- **C** (50–69): At risk
- **D** (0–49): Critical

### 2.4 Strategy Relationship Graph

A dedicated visualization page (accessible from the Executive Overview) renders the causal network of KPIs across the organization. Each KPI is a node; `related_kpis` relationships define directed edges.

**Visual design:**
- Nodes colored by department, sized by KPI weight
- Node border colored by current score bracket (A/B/C/D)
- Directed edges show causal direction (e.g., "Headcount → Sales Volume → Revenue")
- Edge labels describe the relationship type (e.g., "enables", "drives", "impacts")
- Hovering a node shows a tooltip with current score, result, and target
- Clicking a node navigates to that KPI's detail page

**Library:** React Flow (`reactflow`) — purpose-built for node-edge graphs in React.

**Backend:** The `related_kpis` array on each indicator is traversed to build the graph payload:
```json
{
  "nodes": [{ "id": "REV_001", "label": "Total Revenue", "department": "Finance", "score": 78 }],
  "edges": [{ "source": "SALES_002", "target": "REV_001", "label": "drives" }]
}
```

**API endpoint:** `GET /api/graph/strategy-map`

### 2.6 Area Dashboards

Each business area has a dedicated dashboard showing:

- Department score badge (0–100 + letter grade) at the top
- Summary scorecard (all indicators, their current status, MoM trend, and individual score)
- Individual indicator cards with sparkline chart + current month result
- Full historical chart (line chart with target line overlay)
- Monthly commentary field (editable by the area manager)
- AI-generated summary panel (described in Section 4)

### 2.7 Executive Overview

- Cross-area strategic map: KPIs grouped by strategic pillar
- Department score cards for all areas (score + grade + trend arrow)
- Heat map of performance across the organization
- Link to the Strategy Relationship Graph
- Navigation to any area dashboard

### 2.8 Landing Page

The public-facing entry point of the application. Before reaching the role selector or any dashboard, visitors land here first. Its purpose is to explain the project to anyone who discovers it — a recruiter, a technical reviewer, or a curious peer.

**Content sections:**

- **Hero** — project name, one-line pitch ("An AI-powered KPI management platform built to cascade corporate strategy across departments"), and a "Explore the Platform" CTA that scrolls down or navigates to the role selector
- **What this project is** — 2–3 sentences explaining the real-world problem it solves (strategy not reaching operational teams) and how it was inspired by actual work experience
- **How it works** — a brief visual flow: Company Strategy → Departments → KPIs → Scores → AI Insights
- **AI Features** — one card per AI feature (3 cards total), each with a name, icon, and 2-sentence description of what it does and why it's useful:
  - **Deviation Diagnostic** — automatically classifies why an off-track KPI is underperforming (sudden drop, gradual decline, seasonal, or persistent)
  - **Action Plan Generator** — proposes a structured recovery plan with probable causes, suggested actions, and deadline types
  - **Indicator Chat** — a conversational assistant that answers analytical questions about any KPI using its full history as context
- **Tech stack badges** — small visual chips listing the key technologies used
- **Role Selector** — the bottom section of the landing page (not a separate route), presenting the three role profile cards for the visitor to choose from

**Design note:** The landing page is the primary showcase for portfolio purposes. It should feel polished and intentional — not a placeholder. The AI feature cards in particular should be clear enough that a non-technical reviewer understands the value without reading code.

### 2.9 Department Selector

Embedded at the bottom of the landing page (not a separate route). Presents one card per role profile:

- Role name (Sales Manager, People Manager, etc.) and department icon
- Current department score and grade
- Number of KPIs and their status breakdown
- "Enter as [Role]" button

Clicking sets `{ role, area_id }` in the Zustand store and navigates to that role's starting page.

### 2.10 Contextual Information Buttons

Every section and data element across all routes has an inline **info button** (an `ⓘ` icon) that opens a tooltip or slide-over panel explaining what that section shows, how values are calculated, and what the user should do with it.

**Coverage — every route must have info buttons for:**

| Route | Sections with info buttons |
|---|---|
| Area Dashboard | Department score formula, grade brackets, KPI status thresholds, MoM trend arrow, chart reading guide |
| Indicator Detail | Calculation method, composition, polarity, accumulation type, score curve explanation, deviation badge |
| AI Diagnostic card | What the pattern types mean (sudden drop vs. gradual vs. seasonal vs. persistent), confidence levels |
| Action Plan panel | What each deadline type means (short / mid / long term), how to use the editable form |
| AI Chat panel | What data the AI has access to, scope limitations by role, example questions |
| Executive Overview | How department scores are aggregated, what the heat map colors mean, pillar grouping logic |
| Strategy Graph | How to read directed edges, what node size/color encodes, relationship type labels |

**Implementation:**

- Use a single reusable `<InfoButton content={...} />` component that accepts a title and body string
- Content strings live in a dedicated `src/content/infoTexts.ts` file — never hardcoded inline in components
- Tooltip for short explanations (under 3 sentences); slide-over panel for longer ones (calculation formulas, multi-step logic)
- Info button style: small ghost icon button, visually subtle, positioned top-right of each section header

### 2.11 Commentary & Narrative Module

Each indicator result for each period can have:

- A free-text comment written by the manager
- An AI-generated draft that the manager can accept, edit, or discard
- Comment history (versioned by month)

---

## 3. Tech Stack

### Frontend

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Charts | Recharts |
| State management | Zustand |
| Routing | React Router v6 |
| HTTP client | Axios |
| Form handling | React Hook Form + Zod |
| Graph visualization | React Flow (`reactflow`) |

### Backend

| Layer | Technology |
|---|---|
| Framework | FastAPI (Python 3.11+) |
| ORM | SQLAlchemy 2.0 (async) |
| Migrations | Alembic |
| Auth | None (no login — role simulation is frontend-only) |
| Task queue | Celery + Redis (for async AI jobs) |
| API docs | Auto-generated Swagger/OpenAPI |

### Database

| Layer | Technology |
|---|---|
| Primary DB | Supabase (PostgreSQL 15) |
| Cache | Redis |
| File storage | Supabase Storage (future: report exports) |

### AI Layer

| Component | Technology |
|---|---|
| LLM | OpenAI API (`gpt-4o-mini`) |
| Orchestration | LangChain (`langchain`, `langchain-openai`) |
| Agent framework | `create_react_agent` (LangChain) — used only for the Indicator Chat tool calling |
| RAG | LangChain + pgvector (Supabase) + OpenAI `text-embedding-3-small` |
| Prompt management | Structured prompt templates in Python (versioned) |
| Context injection | Dynamic — historical data + indicator metadata injected per request |

### Infrastructure & DevOps

| Layer | Technology |
|---|---|
| Frontend deploy | Vercel |
| Backend deploy | Railway or Render |
| CI/CD | GitHub Actions |
| Containerization | Docker + Docker Compose (local dev) |
| Env management | `.env` + python-dotenv |
| Secrets | Vercel Env (frontend) + Railway Env (backend) |

---

## 4. AI Integration Specifications

This section describes the three AI features included in v1.0, ordered by implementation complexity.

---

### AI Feature 1 — Deviation Diagnostic

**What it does:** When an indicator falls below target, the AI classifies the deviation pattern and provides a short diagnostic. It distinguishes between: sudden drop, gradual deterioration, seasonal pattern, or persistent underperformance.

**Trigger:** Automatic — runs when a result is saved with status = "off track". The result is stored and surfaced as a badge on the indicator card ("AI Diagnostic Available").

**Input context:**
```
- Indicator name, unit, polarity, strategic pillar
- Target and result for current month
- Last 24 months of results
- Area name
```

**Expected output (structured JSON):**
```json
{
  "pattern": "gradual_deterioration | sudden_drop | seasonal | persistent",
  "confidence": "high | medium | low",
  "description": "Two-sentence explanation of the pattern detected.",
  "suggested_focus": "One sentence on where attention should be directed."
}
```

**Implementation note:** Use JSON mode in the API call. Render the diagnostic as a collapsible card inside the indicator detail view.

**API endpoint:** `POST /api/ai/diagnose-deviation`

---

### AI Feature 2 — Action Plan Generator

**What it does:** For any indicator that is off track, the AI proposes a structured action plan draft with probable root causes, suggested actions, recommended responsible parties, and a proposed deadline framework.

**Trigger:** Manual — button "Suggest Action Plan" available only on off-track indicators.

**Input context:**
```
- Indicator name, calculation method, composition, strategic pillar
- Historical results (12 months)
- Deviation pattern (from AI Feature 1, if available)
- Any existing commentary from this period
```

**Expected output (structured JSON rendered as a form):**
```json
{
  "probable_causes": ["Cause 1", "Cause 2"],
  "actions": [
    {
      "action": "Description of the action",
      "responsible": "Suggested role or department",
      "deadline_type": "short_term | mid_term | long_term"
    }
  ],
  "monitoring_suggestion": "How to track progress on this plan."
}
```

**Implementation note:** Render this as an editable form that the user can refine and save. Saved action plans are stored in the DB and linked to the indicator + period.

**API endpoint:** `POST /api/ai/generate-action-plan`

---

### AI Feature 3 — Indicator Chat Assistant

**What it does:** A conversational interface where the user can ask questions about a specific indicator (or across an entire area) and receive data-informed answers. The LLM has access to the full indicator context and history via the system prompt.

**Trigger:** "Chat with this Indicator" button on any indicator detail page. A slide-over panel opens with a chat interface.

**Input context (system prompt):**
```
You are a business performance analyst with full access to the following indicator data:

Indicator: {name}
Owner Area: {area}
Strategic Pillar: {pillar}
Calculation Method: {method}
Composition: {composition}
Polarity: {polarity}
Target (current year): {target}

Historical monthly results (last 36 months):
{history_table}

Answer the user's questions analytically and concisely. Reference specific data points when relevant.
```

**Example user questions:**
- "When was the last time this indicator beat the target for 3+ consecutive months?"
- "Is there a seasonal pattern here?"
- "How does our trend compare to what we'd need to hit the annual target?"
- "What months had the biggest drops?"

**Architecture:** Multi-turn conversation stored in frontend state. Each user message appends to conversation history before calling the API. Uses LangChain's `create_react_agent` with two tools: `get_indicator_data` (fetches any indicator's history by code) and `get_area_summary` (fetches all KPIs for an area). For the Deviation Diagnostic and Action Plan features, the OpenAI SDK is called directly — no LangChain needed. The active role scope (manager, executive, admin) is passed in the API call to limit which areas' data the LLM tool can access.

**API endpoint:** `POST /api/ai/chat` (streaming, SSE)

---

### AI Feature 4 — Indicator Knowledge Base (RAG)

**What it does:** Answers questions about the methodology, history, and strategic rationale behind any indicator by retrieving relevant excerpts from a curated set of internal documents — things like the indicator methodology manual, benchmark references, and revision history records. This surfaces institutional knowledge that lives in documents rather than in the database.

**Trigger:** "Search Knowledge Base" button on the indicator detail page. Opens a dedicated query panel (separate from the chat assistant, which operates on structured data).

**Simulated documents (seed content for NovaPay):**
- `novapay-indicator-manual-v2.pdf` — full methodology guide for all 17 KPIs (calculation formulas, composition rules, data sources, revision history)
- `strategic-review-2024-q3.pdf` — quarterly strategic review with target revisions and rationale
- `kpi-benchmark-report-2024.pdf` — industry benchmarks for fintech KPIs (churn, conversion rate, uptime, etc.)

**RAG pipeline:**
1. On startup (or admin trigger), documents are chunked and embedded using OpenAI `text-embedding-3-small`
2. Embeddings stored in **pgvector** (Supabase extension — no separate vector DB needed)
3. On user query, the query is embedded and a similarity search retrieves the top-k relevant chunks
4. Retrieved chunks are injected into the LLM prompt alongside the user question
5. LLM synthesizes an answer grounded in the retrieved content, citing the source document

**Example user questions:**
- "Why was the churn rate target revised in Q3 2024?"
- "What data source feeds the EBITDA margin calculation?"
- "How does our conversion rate target compare to industry benchmarks?"
- "What changed in the headcount growth methodology in v2?"

**Input context (prompt structure):**
```
You are a business analyst with access to NovaPay's internal knowledge base.

Indicator in context: {indicator_name}

Relevant excerpts retrieved from internal documents:
{retrieved_chunks}

Answer the user's question based strictly on the excerpts above.
If the answer is not found in the documents, say so explicitly — do not infer.
Cite the source document for each claim.
```

**Stack additions:**
- `pgvector` extension enabled on Supabase
- `langchain-community` for document loaders (PDF)
- `langchain` text splitter (RecursiveCharacterTextSplitter, chunk size 500, overlap 50)
- `openai` embeddings (`text-embedding-3-small`)
- `PGVector` as the LangChain vector store

**API endpoints:**
- `POST /api/rag/ingest` — admin-only: ingest and embed documents
- `POST /api/rag/knowledge-query` — query the knowledge base for a given question + indicator context

---

### AI Feature 5 — Meeting Minutes Search (RAG)

**What it does:** Allows users to search across all monthly results-review meeting minutes to find what was discussed, decided, or flagged about any indicator in past meetings. This closes the loop between the platform's data and the management conversations that happen around it — making the platform a true operational memory for the monthly review cycle.

**Trigger:** "Search Meeting Minutes" button available on the indicator detail page and on the area dashboard. Opens a query panel with a free-text search field.

**Simulated documents (seed content for NovaPay):**
- One PDF per month per area for the last 12 months (e.g., `minutes-sales-2024-03.pdf`, `minutes-finance-2024-03.pdf`)
- Each document follows a consistent structure: attendees, KPI results reviewed, discussion highlights, decisions made, action items, next steps
- At least 2–3 minutes should reference cross-area dependencies (e.g., "Sales flagged that People's delayed hiring is impacting conversion capacity")

**RAG pipeline:** Same as Feature 4 (pgvector + OpenAI embeddings). Documents are stored in a separate collection/namespace so knowledge base and minutes searches can be scoped independently.

**Metadata stored per chunk:**
```json
{
  "source": "minutes-sales-2024-03.pdf",
  "area": "Sales",
  "period": "2024-03",
  "document_type": "meeting_minutes"
}
```

Metadata filtering ensures that when a user is viewing the Sales dashboard, the default search scope is Sales minutes — but they can optionally search across all areas.

**Example user questions:**
- "What was discussed about churn rate in the last 3 meetings?"
- "Were there any decisions made about the conversion rate target?"
- "When did the team first flag the headcount bottleneck as a risk?"
- "What action items were assigned to Finance in Q1 2025?"

**Input context (prompt structure):**
```
You are reviewing NovaPay's monthly management meeting records.

User is currently viewing: {area_name} dashboard, indicator: {indicator_name}

Relevant excerpts from meeting minutes:
{retrieved_chunks}

Answer the user's question based on the meeting records above.
Include the meeting date and area for each reference.
If nothing relevant was found, say so explicitly.
```

**UX note:** Results should display the source document (area + month) alongside each answer so the user can trace back to the original meeting context. Consider rendering matched chunks as expandable cards below the AI-generated answer.

**API endpoints:**
- `POST /api/rag/ingest-minutes` — admin-only: ingest and embed a new month's minutes
- `POST /api/rag/minutes-query` — query meeting minutes for a given question + optional area/period filter

---

```sql
-- Strategic structure
CREATE TABLE strategic_pillars (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE areas (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  pillar_id UUID REFERENCES strategic_pillars(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- KPI ownership and weights per department
-- A KPI can appear in more than one department with a different weight in each.
-- Weights within a given area_id must sum to 1.0 (enforced at application level).
CREATE TABLE indicator_departments (
  id UUID PRIMARY KEY,
  indicator_id UUID REFERENCES indicators(id),
  area_id UUID REFERENCES areas(id),
  weight NUMERIC NOT NULL CHECK (weight > 0 AND weight <= 1),
  is_primary_owner BOOLEAN DEFAULT false,  -- marks the department with main accountability
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(indicator_id, area_id)
);

-- Indicator definition
CREATE TABLE indicators (
  id UUID PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  unit TEXT NOT NULL,
  polarity TEXT CHECK (polarity IN ('higher_is_better', 'lower_is_better')),
  calculation_method TEXT,
  composition TEXT,
  accumulation_type TEXT CHECK (accumulation_type IN ('last', 'average', 'sum')),
  area_id UUID REFERENCES areas(id),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Results
CREATE TABLE indicator_results (
  id UUID PRIMARY KEY,
  indicator_id UUID REFERENCES indicators(id),
  period DATE NOT NULL,               -- always first day of the month
  result NUMERIC,
  target NUMERIC,
  status TEXT CHECK (status IN ('on_track', 'at_risk', 'off_track')),
  kpi_score NUMERIC,                  -- computed 0–100 score for this result
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(indicator_id, period)
);

-- Department Scores (computed monthly)
CREATE TABLE department_scores (
  id UUID PRIMARY KEY,
  area_id UUID REFERENCES areas(id),
  period DATE NOT NULL,
  score NUMERIC,                      -- weighted average of KPI scores (0–100)
  grade TEXT CHECK (grade IN ('A', 'B', 'C', 'D')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(area_id, period)
);

-- Commentaries
CREATE TABLE commentaries (
  id UUID PRIMARY KEY,
  indicator_id UUID REFERENCES indicators(id),
  period DATE NOT NULL,
  content TEXT,
  is_ai_generated BOOLEAN DEFAULT false,
  author_id UUID,                     -- FK to auth users
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Action Plans
CREATE TABLE action_plans (
  id UUID PRIMARY KEY,
  indicator_id UUID REFERENCES indicators(id),
  period DATE NOT NULL,
  content JSONB,                      -- stores AI-generated + edited structure
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- AI Diagnostics (cached)
CREATE TABLE ai_diagnostics (
  id UUID PRIMARY KEY,
  indicator_id UUID REFERENCES indicators(id),
  period DATE NOT NULL,
  pattern TEXT,
  confidence TEXT,
  description TEXT,
  suggested_focus TEXT,
  generated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(indicator_id, period)
);

-- RAG: document metadata (chunks stored via pgvector / LangChain)
-- Enable pgvector extension first: CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE rag_documents (
  id UUID PRIMARY KEY,
  filename TEXT NOT NULL,
  document_type TEXT CHECK (document_type IN ('knowledge_base', 'meeting_minutes')),
  area_id UUID REFERENCES areas(id),  -- NULL for company-wide documents
  period DATE,                         -- NULL for non-period documents
  ingested_at TIMESTAMPTZ DEFAULT now()
);
-- Note: the actual embedding chunks are stored in the LangChain-managed
-- pgvector collection table (created automatically on first ingest).
```

---

## 6. Project Structure

```
synaptic-strategy/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/               # shadcn/ui base components
│   │   │   ├── charts/           # Recharts wrappers
│   │   │   ├── indicators/       # IndicatorCard, IndicatorDetail, IndicatorChart
│   │   │   ├── ai/               # AIChat, AIDiagnosticBadge, ActionPlanForm
│   │   │   ├── dashboard/        # AreaDashboard, ExecutiveOverview
│   │   │   ├── info/             # InfoButton, InfoTooltip, InfoSlideOver
│   │   │   └── layout/           # Sidebar, Header
│   │   ├── pages/
│   │   │   ├── Landing.tsx             # Landing page + AI feature cards + role selector
│   │   │   ├── Executive.tsx
│   │   │   ├── StrategyGraph.tsx
│   │   │   ├── AreaDashboard.tsx
│   │   │   └── IndicatorDetail.tsx
│   │   ├── content/
│   │   │   └── infoTexts.ts            # All info button copy, keyed by section
│   │   ├── store/                # Zustand stores
│   │   ├── hooks/                # useIndicator, useAI, useArea
│   │   ├── services/             # API call functions
│   │   └── types/                # TypeScript interfaces
│   ├── package.json
│   └── tailwind.config.ts
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── routes/
│   │   │   │   ├── indicators.py
│   │   │   │   ├── results.py
│   │   │   │   ├── areas.py
│   │   │   │   ├── commentaries.py
│   │   │   │   ├── graph.py          # Strategy map endpoint
│   │   │   │   ├── ai.py             # Diagnostic, action plan, chat endpoints
│   │   │   │   └── rag.py            # Ingest + knowledge base + minutes endpoints
│   │   │   └── deps.py           # DB session dependencies
│   │   ├── models/               # SQLAlchemy models
│   │   ├── schemas/              # Pydantic schemas (request/response)
│   │   ├── services/
│   │   │   ├── ai/
│   │   │   │   ├── prompts.py        # All prompt templates
│   │   │   │   ├── diagnostic.py     # Deviation diagnostic (OpenAI SDK direct)
│   │   │   │   ├── action_plan.py    # Action plan generator (OpenAI SDK direct)
│   │   │   │   ├── chat.py           # LangChain ReAct agent + tools
│   │   │   │   └── rag/
│   │   │   │       ├── ingest.py         # Document loading, chunking, embedding
│   │   │   │       ├── knowledge_base.py # Knowledge base query pipeline
│   │   │   │       └── minutes.py        # Meeting minutes query pipeline
│   │   │   ├── scoring.py        # KPI score + department score computation
│   │   │   ├── graph.py          # Strategy map builder
│   │   │   └── indicators.py     # Business logic
│   │   ├── core/
│   │   │   ├── config.py         # Settings / env vars
│   │   │   └── database.py       # Async SQLAlchemy engine
│   │   └── main.py
│   ├── alembic/
│   ├── tests/
│   ├── pyproject.toml
│   └── Dockerfile
│
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## 7. Visual Design Direction

### Aesthetic

Synaptic Strategy targets senior managers and executives. The UI should feel **precise, data-dense, and quietly confident** — not dashboardy or noisy. Think Bloomberg terminal meets modern SaaS: information-first, with purposeful use of color only to signal performance status.

### Color Palette

| Name | Hex | Use |
|---|---|---|
| Deep Navy | `#0D1B2A` | Primary background, sidebar |
| Surface Dark | `#1A2A3A` | Card backgrounds |
| Surface Light | `#F5F7FA` | Light mode background |
| Electric Teal | `#00C9B1` | Brand accent, AI features, active states |
| Signal Green | `#22C55E` | On-track status |
| Signal Amber | `#F59E0B` | At-risk status |
| Signal Red | `#EF4444` | Off-track status |
| Text Primary | `#E8EDF2` | Main text (dark mode) |
| Text Muted | `#8A9BB0` | Supporting text |

### Typography

- **Display / Headings:** `Inter` (tight tracking, medium weight) — functional, no personality noise
- **Data values:** `JetBrains Mono` — for KPI results, percentages, and numeric data to create instant visual distinction between numbers and labels
- **Body / UI:** `Inter` regular

### Signature Design Element

The **AI panel** (wherever AI features surface) uses a subtle animated gradient border in Electric Teal — a thin glow effect that signals "this is machine-generated, not human." This creates a consistent visual language for AI across all six features without being intrusive.

---

## 8. Role Simulation (No Login Required)

There is no authentication system. The platform is a portfolio demo — all data is public and read-only by design. Instead of login, the **Department Selector landing page** presents role profiles that the visitor can click to adopt. Selecting a profile sets a role context in the frontend state (Zustand store) that persists for the session.

### How It Works

The Department Selector shows one card per role profile. Each card displays the role name, a short description of what that perspective sees, and a "Enter as [Role]" button. Clicking it sets `{ role, area_id }` in the global store and redirects to the appropriate starting page.

No credentials. No JWT. No backend auth middleware. The role is purely a frontend state value used to:
- Control which navigation items are visible
- Scope the data fetched (e.g., manager sees only their area's KPIs by default)
- Scope the AI chat tool set (passed as a parameter in the API call)
- Control which action buttons are rendered (e.g., "Suggest Action Plan" only renders for manager and admin profiles)

### Role Profiles

| Profile | Starting Page | Scope |
|---|---|---|
| `manager` | Their area's dashboard | Own area KPIs, commentary, action plans, AI Features 1 & 2 |
| `executive` | Executive Overview | All areas read-only, Strategy Graph, AI Feature 3 (chat, all areas) |
| `admin` | Admin panel + all dashboards | Full access: all KPIs, all AI features, indicator metadata |

Each role profile is instantiated once per department in the seed data. For example, there will be a "Sales Manager", "People Manager", etc. — each pre-configured with their `area_id`.

### Backend Implications

- No auth middleware needed on any route
- All API endpoints are public (appropriate for a portfolio demo)
- The `role` and `area_id` values sent in AI API calls are trusted client inputs — used only to scope LLM context, not to guard data
- The `author_id` field on commentaries and action plans stores the selected profile name as a string (e.g., `"Sales Manager"`) rather than a user UUID

---

## 9. Seed Data Scenario

The seed script must instantiate a coherent company story so that every UI component has realistic, narratively consistent data from day one. Do not use random or placeholder data — the story should be visible and make sense to a portfolio reviewer who doesn't know the project.

### Company: NovaPay (fictional fintech)

**Corporate Strategy (current year):** Increase product sales volume by 30% YoY, driven by headcount growth and improved conversion rates.

### Departments & KPIs

Weights below are stored in `indicator_departments` and represent each KPI's contribution to that department's composite score. All weights within a department must sum to 1.0.

**Finance (4 KPIs)**
- Total Revenue (weight: 0.40) — target: R$12M/month
- Operating Cost Ratio (weight: 0.30, lower_is_better) — target: ≤ 62%
- EBITDA Margin (weight: 0.20) — target: 18%
- Average Revenue per User (weight: 0.10) — target: R$48

**Sales (4 KPIs)**
- Sales per Salesperson/month (weight: 0.35) — target: 40 sales
- Active Customer Base (weight: 0.30) — target: 15,000
- Churn Rate (weight: 0.20, lower_is_better) — target: ≤ 3.5%
- Conversion Rate (weight: 0.15) — target: 22%

**People (3 KPIs)**
- Headcount Growth (weight: 0.40) — target: +8 hires/month
- Turnover Rate (weight: 0.35, lower_is_better) — target: ≤ 4%
- Time to Fill Open Positions (weight: 0.25, lower_is_better, milestone) — target: ≤ 30 days

**Governance (3 KPIs)**
- SLA Compliance (weight: 0.40) — target: ≥ 98%
- Regulatory Filing On-Time Rate (weight: 0.40, milestone) — target: 100%
- Audit Finding Resolution Time (weight: 0.20, lower_is_better) — target: ≤ 15 days

**Technology (3 KPIs)**
- Platform Uptime (weight: 0.50) — target: ≥ 99.5%
- Mean Time to Recovery (weight: 0.30, lower_is_better) — target: ≤ 2 hours
- Feature Delivery Cycle Time (weight: 0.20, lower_is_better) — target: ≤ 14 days

### Strategy Relationship Map (seed edges)

```
People: Headcount Growth → Sales: Sales per Salesperson (enables)
People: Headcount Growth → Sales: Active Customer Base (enables)
Sales: Conversion Rate → Sales: Active Customer Base (drives)
Sales: Active Customer Base → Finance: Total Revenue (drives)
Sales: Churn Rate → Finance: Total Revenue (impacts)
Finance: Operating Cost Ratio → Finance: EBITDA Margin (impacts)
Technology: Platform Uptime → Sales: Churn Rate (impacts)
Technology: Platform Uptime → Finance: Total Revenue (impacts)
Governance: SLA Compliance → Sales: Churn Rate (impacts)
```

### Seed Time Range

Generate 24 months of results with realistic variation:
- First 12 months: gradual growth narrative with 2–3 off-track dips
- Last 12 months: performance improvements with occasional setbacks
- At least one indicator should show a clear seasonal pattern
- At least one indicator should show a sudden drop (to demonstrate the Deviation Diagnostic feature)

---

## 10. Implementation Order

Follow this sequence to build incrementally and have something demonstrable at each milestone.

### Phase 1 — Foundation (Week 1–2)
- [ ] Project scaffolding: monorepo structure, Docker Compose, GitHub repo
- [ ] Supabase project creation, schema migration (Alembic), enable `pgvector` extension
- [ ] FastAPI base: health check, CORS (no auth middleware — all routes public)
- [ ] React base: routing, role simulation store (Zustand), layout skeleton (sidebar + header)
- [ ] Seed script: implement the full NovaPay scenario from Section 9 (5 departments, 17 KPIs, 24 months of results with narrative variation)
- [ ] Create seed PDF documents: `novapay-indicator-manual-v2.pdf`, `strategic-review-2024-q3.pdf`, `kpi-benchmark-report-2024.pdf`, and 12 months of area meeting minutes (5 areas × 12 months = 60 PDFs, can be generated programmatically)

### Phase 2 — Core Features (Week 3–4)
- [ ] Landing page: hero, project explanation, AI feature cards (3), tech stack badges, role selector section
- [ ] `InfoButton` component + `infoTexts.ts` content file (populate copy for all routes)
- [ ] Area dashboard with info buttons on all sections
- [ ] Individual indicator detail page with full historical chart (Recharts) + info buttons
- [ ] KPI score computation (0–100) and department weighted score on the backend
- [ ] Score badges and grade labels rendered on indicator cards and area dashboard header
- [ ] Status computation (on_track / at_risk / off_track) on the backend
- [ ] Commentary CRUD (create, edit, view per indicator per period)

### Phase 3 — AI Features (Week 5–6)
- [ ] AI Feature 1: Deviation Diagnostic (structured JSON output, cached in DB)
- [ ] AI Feature 2: Action Plan Generator (editable form output)
- [ ] AI Feature 3: Indicator Chat (streaming, multi-turn, LangChain ReAct agent, role-scoped tool sets)

### Phase 4 — Executive Layer, Graph & RAG (Week 7–8)
- [ ] Executive Overview: cross-area scorecard, strategic pillar heat map, department scores
- [ ] Strategy Relationship Graph (React Flow, seed edges from Section 9)
- [ ] Role simulation UI: profile cards on landing page, role context propagation throughout app
- [ ] AI Feature 4: Knowledge Base RAG — ingest pipeline, pgvector setup, query endpoint, UI panel on indicator detail page
- [ ] AI Feature 5: Meeting Minutes RAG — ingest pipeline (area + period scoped), query endpoint, UI panel on area dashboard and indicator detail page

### Phase 5 — Polish & Portfolio Prep (Week 9–10)
- [ ] Dark/light mode toggle
- [ ] Export: area dashboard PDF report (monthly)
- [ ] Mobile responsive audit
- [ ] README, architecture diagram, demo video
- [ ] Deploy: Vercel (frontend) + Railway (backend) + Supabase (DB)

---

## 11. Environment Variables Reference

```env
# Backend (.env)
DATABASE_URL=postgresql+asyncpg://...
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=...
OPENAI_API_KEY=sk-...
REDIS_URL=redis://localhost:6379
ENVIRONMENT=development

# Frontend (.env.local)
VITE_API_BASE_URL=http://localhost:8000
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=...
```

---

## 12. Key Design Decisions & Rationale

**Why FastAPI over Django/Node?**
Paulo's primary language is Python, FastAPI aligns with his existing AI/data stack (pandas, LangChain), and async support is critical for non-blocking AI streaming responses.

**Why Supabase over a managed RDS?**
Supabase provides auth, storage, and PostgreSQL in one — reducing infrastructure complexity for a portfolio project while remaining production-capable if the project scales.

**Why LangChain for the chat feature, and not LangGraph?**
LangGraph excels at multi-agent state machines with loops and conditional branching. The Indicator Chat only needs a single ReAct agent with two tools — `create_react_agent` from LangChain handles this cleanly without the overhead of defining a graph. The other two AI features (Deviation Diagnostic, Action Plan Generator) are single API calls and use the OpenAI SDK directly, with no framework needed.

**Why store AI diagnostics in the DB?**
AI inference is slow and costs money. Diagnostics should be computed once per indicator per period and cached. Managers should see instant results on page load — the AI job runs asynchronously when a result is saved.

**Why JetBrains Mono for data values?**
Monospaced fonts make numeric values visually distinct from labels and allow columnar alignment in tables without custom CSS — a subtle but important data readability choice.

---

**Why React Flow for the Strategy Graph?**
The strategy relationship map requires directed edges, node positioning, zoom/pan, and click interactions — React Flow handles all of this out of the box. Building it with SVG from scratch would take 3–4x the time with less quality.

**Why a 0–100 score system instead of RAG status only?**
RAG (red/amber/green) is binary and doesn't allow ranking or weighting across KPIs. A normalized 0–100 score makes weighted department averages mathematically meaningful, and enables the portfolio viewer to understand nuance — a 68 and a 45 are both "red" in RAG, but they communicate very differently in a score system.

**Why no login and simulated roles instead of real auth?**
This is a portfolio project. Real auth (Supabase Auth, JWTs, protected routes) adds infrastructure complexity that obscures the actual product value. Simulated roles let a reviewer experience three distinct perspectives instantly, without signup friction. It also demonstrates understanding of RBAC concepts without the overhead of implementing them in full.

---

## 13. Notes for Claude Code

- Start with `Phase 1` exactly as described. Do not jump to AI features before the data layer is solid.
- All AI prompt templates should live in `backend/app/services/ai/prompts.py` as versioned string templates — never hardcoded inline in route handlers.
- The `OPENAI_API_KEY` must always come from environment variables, never hardcoded.
- Every AI endpoint should have a `dry_run` query param that returns a mock response without calling the API — useful for UI development without burning tokens.
- Seed data is critical: build a comprehensive seed script early so every UI component has realistic data to render from day one.
- The frontend `useAI` hook should handle loading, error, and streaming states consistently across all three AI features.
- Follow the `AGENTS.md` convention for any subagent or tool definitions within Claude Code.
- The KPI scoring function (`compute_kpi_score`) must be in `backend/app/services/scoring.py` and called both when saving results and when recomputing historical scores after a target change.
- Department scores should be recomputed automatically whenever any KPI result for that area and period is saved or updated.
- The Strategy Graph endpoint (`GET /api/graph/strategy-map`) must resolve the full graph from `related_kpis` fields recursively — do not hardcode edges.
- There is no authentication. All FastAPI routes are public. Do not implement JWT middleware, Supabase Auth, or any login flow. Role simulation is frontend-only state (Zustand).
- The `InfoButton` component must be reusable and accept `title` and `body` props. All copy lives in `src/content/infoTexts.ts` — never hardcode explanation strings inline in components. Use tooltip mode for short copy (≤ 3 sentences) and slide-over mode for anything with formulas or multi-step logic.
- Enable `pgvector` on Supabase before running any migration: `CREATE EXTENSION IF NOT EXISTS vector;`. This must be the first migration step, not an afterthought.
- The RAG ingest pipeline (`ingest.py`) must handle both document types (knowledge base and meeting minutes) and tag every chunk with metadata (`document_type`, `area_id`, `period`) so queries can be filtered by scope.
- Seed PDF documents can be generated programmatically using `reportlab` or `fpdf2` — do not create them manually. The seed script should generate and ingest all documents in one pass.
- Knowledge base and meeting minutes use separate pgvector collections (different `collection_name` values in LangChain's `PGVector`) so queries are always scoped to the correct source type. This value is passed as a body parameter in AI API calls to scope LLM context — it is not a security boundary.

---

*Document version: 4.0 — July 2026*
*Author: Paulo (Senior Data Analyst / AI Engineering)*
*Platform: Synaptic Strategy*

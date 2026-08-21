# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

This is not a git repository.

```
sellerops-ai/
  backend/    FastAPI + SQLite
  frontend/   React + Vite + TypeScript
  docs/       reference docs (platform API capability notes, etc.)
```

The parent directory (one level up from here) holds `WizAI - AI Builder Challenge - Option 2 Architecture.md`, the product/architecture writeup for this project (AI Builder Challenge, Option 2: an ops/productivity layer for Indonesian online sellers on Shopee, TikTok Shop, and Instagram). Read it first for the *why* behind the product and stack choices — it explains the four modules (Unified Inbox, Order Management, Inventory Sync, AI Content Studio) and the deliberate scoping decisions (SQLite instead of MySQL, no Celery/RabbitMQ, mock platform adapters instead of real Shopee/TikTok/Instagram integrations).

## Commands

### Backend (`backend/`)

```bash
python -m venv .venv
.venv\Scripts\activate          # Windows
pip install -r requirements.txt
copy .env.example .env          # then set LLM_API_KEY (Groq)

python -m app.seed              # seed demo seller/products/orders/messages
uvicorn app.main:app --reload   # http://localhost:8000, docs at /docs
python -m app.simulate shopee   # simulate an incoming order/message (server must be running)
```

There is no backend test suite or lint config yet.

### Frontend (`frontend/`)

```bash
npm install
npm run dev       # http://localhost:5173, calls API at http://localhost:8000 (override via VITE_API_BASE)
npm run build      # tsc -b && vite build — type-checks the whole project
npm run lint       # oxlint
npm run preview
```

There is no frontend test suite.

## Architecture

### Backend

FastAPI app (`app/main.py`) registering one router per module under `app/routers/`: `orders.py`, `inventory.py`, `inbox.py`, `content.py`, `products.py`, `webhooks.py`. SQLAlchemy models (`app/models.py`) map directly to the doc's data model: `sellers`, `products`, `inventory`, `orders`, `messages`, `content_assets`. `app/database.py` wires a SQLite engine (`DATABASE_URL` env var); `Base.metadata.create_all` runs at import time in `main.py`, so schema changes require deleting `sellerops.db` and re-running `app.seed` (no migration tooling).

**No message broker.** This was a deliberate scoping decision (see the architecture doc §3): instead of Celery/RabbitMQ, async work (webhook ingestion, AI content generation) runs via FastAPI's in-process `BackgroundTasks`, opening its own `SessionLocal()` DB session per task (see `app/routers/webhooks.py::_ingest_task` and `app/routers/content.py::_generate_content_task` for the pattern).

**Platform adapters** (`app/services/adapters/`): `base.py` defines the `PlatformAdapter` interface (`fetch_new_orders`, `fetch_new_messages`, `push_inventory_update`) that a real Shopee/TikTok/Instagram integration would implement. `shopee.py` is a working mock that returns randomized fixture data in the real API's shape; `tiktok.py` and `instagram.py` are stubs. `POST /webhooks/simulate/{platform}` drives this — it's how the demo simulates "a new order/chat comes in." Instagram has no order concept (not a marketplace), so its adapter's `fetch_new_orders` is intentionally always empty — see `docs/platform-api-capabilities.md` for what each real platform API actually supports and what's gated behind approval.

**LLM layer** (`app/services/llm.py`): calls **Groq** (`openai/gpt-oss-120b` by default, via the `groq` Python SDK), not Anthropic/OpenAI — this is the actual configured provider (`LLM_API_KEY`/`LLM_MODEL` in `.env`), despite the architecture doc mentioning "Claude/Qwen" as an example. The provider is isolated to this one file. Two entry points:
- `draft_reply(db, seller_id, customer_message)` — builds RAG context by directly querying that seller's `products` + `orders` (no embeddings, direct SQL query — sufficient at this data scale), then asks the LLM for a JSON response containing the drafted reply plus a `risk` tag (`auto_safe` vs `needs_review`). This risk tag is the mechanism behind the whole "AI drafts, human approves" design principle stated in the architecture doc.
- `generate_content(product, platform)` — per-platform system prompt (Shopee SEO description, TikTok/Instagram caption+hashtags), returns JSON `{"body": "..."}`.

Both call sites wrap the LLM call in `try/except` and store a `[AI ... failed: ...]` string as the draft body on failure rather than raising, so a broken LLM call never drops a queued background job.

The **risk tag flows through to auto-send**: `messages.risk` is a DB column, surfaced via `/inbox` and used by the frontend to decide whether to auto-approve a draft (see Frontend below).

### Frontend

React 19 + Vite + TypeScript, no state management or routing library — `App.tsx` holds all top-level state (`active` tab, `refreshKey` for forcing page remounts after a demo "simulate" action, `autoReplyEnabled` persisted to `localStorage`) and switches between pages manually. `src/lib/api.ts` is a single typed `fetch` wrapper client — every backend endpoint has a corresponding method there; add new ones there rather than calling `fetch` directly from a page.

Pages live in `src/pages/`: `Dashboard.tsx` (default/landing page — client-side-derived stats from the same list endpoints the other pages use, no dedicated summary endpoint), `Inbox.tsx`, `Orders.tsx`, `Inventory.tsx`, `Content.tsx`. `src/components/Sidebar.tsx` + `icons.tsx` provide left-nav navigation (hand-rolled inline SVG icons, no icon library dependency).

**Design system**: tokens live in `src/index.css` (`--bg`, `--text`, `--accent` etc. — white background, magenta accent `#E6007A`, flat/no-shadow), shared component classes (buttons, tables, divider rows, status pills, the pill-shaped toggle switch, form fields) live in `src/App.css`. Prefer these existing classes over new inline styles or new CSS files.

**Auto-reply automation** (`Inbox.tsx`): when the "Automate safe replies" toggle is on, a `useEffect` watches the message list and auto-PATCHes any `ai_draft`/`status: draft`/`risk: auto_safe` message to `status: sent`. Anything tagged `needs_review` always waits for manual Approve/Send — this is the "controlled automation" behavior described in the architecture doc, implemented entirely client-side (the risk tag is computed once, backend-side, at draft-generation time).

### Cross-cutting pattern

The doc's "AI drafts, human approves" principle shows up in both `messages` and `content_assets`: both have a `status` lifecycle (`draft` → `approved`/`sent`/`published`) and both are edited via a `PATCH` endpoint that accepts an optional body override plus the new status (`app/routers/inbox.py`, `app/routers/content.py`). When adding a new AI-generated-and-approved artifact type, follow this same shape rather than inventing a new one.

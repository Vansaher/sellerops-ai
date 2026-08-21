# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

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

FastAPI app (`app/main.py`) registering one router per module under `app/routers/`: `orders.py`, `inventory.py`, `inbox.py`, `content.py`, `products.py`, `webhooks.py`, `broadcast.py`, `dashboard.py`, `admin.py`. SQLAlchemy models (`app/models.py`) map directly to the doc's data model: `sellers`, `products`, `product_photos`, `inventory`, `orders`, `messages`, `content_assets`. `app/database.py` wires a SQLite engine (`DATABASE_URL` env var); `Base.metadata.create_all` runs at import time in `main.py`, so schema changes require deleting `sellerops.db` and re-running `app.seed` (no migration tooling). `main.py` also mounts `uploads/` (product photos) as static files at `/uploads`.

**`admin.py`**: demo-support endpoints, not seller-facing — `POST /admin/reset-db` (drop/recreate + reseed), `POST /admin/fill-inventory`, and `POST /admin/simulate-delayed-order` / `POST /admin/simulate-low-stock`, which backdate/underfill data on demand so the order-anomaly and low-stock-alert demos don't require waiting out real thresholds (`DELAY_THRESHOLD_HOURS`, `LOW_STOCK_THRESHOLD` in `models.py`).

**Order anomaly detection** (`orders.py` + `app/services/inventory_sync.py`): orders past `DELAY_THRESHOLD_HOURS` while still `pending` get a `flag_reason`, surfaced via `GET /orders/anomalies`; `POST /orders/{id}/draft-resolution` calls `llm.draft_order_resolution` to draft a customer-facing message (plus an internal note) that gets approved/sent through the same draft→sent lifecycle as inbox messages, cross-linking Orders into the Inbox. `sync_product_inventory` mirrors `stock_qty` out to per-platform `Inventory` rows and each adapter's `push_inventory_update` — the real wiring behind what a low-stock trigger then broadcasts through `broadcast.py` (`POST /broadcast/generate` → `llm.draft_broadcast_message`, stored as a `ContentAsset` with `type="broadcast"`). `Order.status` is one of `pending` | `completed` | `failed`; `flag_reason` only ever fires on `pending`.

**Orders are linked to a product** via `Order.product_id` (nullable FK) — every order-creation path resolves it: the seed data assigns it directly, `ShopeeAdapter.fetch_new_orders` returns a `sku` picked from the seller's real catalog (matching `app/seed.py`'s SKUs) which `webhooks.py::_ingest_task` resolves to a `product_id` by SKU lookup, and `admin.py::simulate_delayed_order` picks a random real product. This is what lets Orders/Dashboard show which product an order was for.

**Product photo → per-platform repurposing** (`products.py` + `app/services/image_repurpose.py`): `POST /products/{id}/photo` uploads a product photo, saves it under `uploads/products/{id}/<uuid>.jpg` (unique filename per upload — a product can have many), records it in the `product_photos` gallery table (`ProductPhoto` model), and sets it as the product's active photo (`Product.image_path` — always the most recently uploaded one). `GET /products/{id}/photos` lists the gallery; `DELETE /products/{id}/photos/{photo_id}` removes one (deletes the file too, and if it was the active photo, falls back to the next-most-recent remaining one, or `None`). `PATCH /products/{id}` edits name/description/price/sku (never `stock_qty` — that's add-only via `POST /inventory/{id}/restock`, a deliberate invariant). `POST /content/repurpose` then, per platform, deterministically center-crops the *active* photo to the platform's real aspect ratio (`crop_for_platform` — Shopee 1:1, TikTok 9:16, Instagram 4:5, no AI involved) and asks a vision-capable model (`llm.draft_repurposed_caption`, separate `LLM_VISION_MODEL`/`DEFAULT_VISION_MODEL`) to draft a caption grounded in the actual photo, saved as a `ContentAsset` with `type="repurpose"` and its own `image_path`.

**Discarding an AI draft**: `DELETE /content/{asset_id}` removes a `ContentAsset` outright (used by both Content Studio's and Broadcast's "Cancel" buttons on an unapproved draft) — canceling deletes it rather than setting some `dismissed` status, since an abandoned draft has no reason to linger in history views that filter on `status != "draft"`.

**Manual seller messages**: `POST /inbox/send` creates a `sender="seller"`, `status="sent"` message directly in a thread — the escape hatch for when the seller wants to type something themselves instead of using `draft-reply`.

**Dashboard digest** (`dashboard.py`): `POST /dashboard/digest` re-queries the same flagged-order/low-stock/needs-review signals used by Orders, Inventory, and Inbox and asks `llm.draft_dashboard_digest` for a short Indonesian-language bullet summary — a read-only AI rollup, not its own stored/approved artifact like messages or content_assets.

**No message broker.** This was a deliberate scoping decision (see the architecture doc §3): instead of Celery/RabbitMQ, async work (webhook ingestion, AI content generation) runs via FastAPI's in-process `BackgroundTasks`, opening its own `SessionLocal()` DB session per task (see `app/routers/webhooks.py::_ingest_task` and `app/routers/content.py::_generate_content_task` for the pattern).

**Platform adapters** (`app/services/adapters/`): `base.py` defines the `PlatformAdapter` interface (`fetch_new_orders`, `fetch_new_messages`, `push_inventory_update`) that a real Shopee/TikTok/Instagram integration would implement. `shopee.py` is a working mock that returns randomized fixture data in the real API's shape; `tiktok.py` and `instagram.py` are stubs. `POST /webhooks/simulate/{platform}` drives this — it's how the demo simulates "a new order/chat comes in." Instagram has no order concept (not a marketplace), so its adapter's `fetch_new_orders` is intentionally always empty — see `docs/platform-api-capabilities.md` for what each real platform API actually supports and what's gated behind approval.

**LLM layer** (`app/services/llm.py`): calls **Groq** (`openai/gpt-oss-120b` by default, via the `groq` Python SDK), not Anthropic/OpenAI — this is the actual configured provider (`LLM_API_KEY`/`LLM_MODEL` in `.env`), despite the architecture doc mentioning "Claude/Qwen" as an example. A separate vision-capable model (`LLM_VISION_MODEL`/`DEFAULT_VISION_MODEL`, e.g. `qwen/qwen3.6-27b`) is used only for image-grounded captioning. The provider is isolated to this one file. Entry points:
- `draft_reply(db, seller_id, customer_message)` — builds RAG context by directly querying that seller's `products` + `orders` (no embeddings, direct SQL query — sufficient at this data scale), then asks the LLM for a JSON response containing the drafted reply plus a `risk` tag (`auto_safe` vs `needs_review`). This risk tag is the mechanism behind the whole "AI drafts, human approves" design principle stated in the architecture doc.
- `generate_content(product, platform)` — per-platform system prompt (Shopee SEO description, TikTok/Instagram caption+hashtags), returns JSON `{"body": "..."}`.
- `draft_order_resolution(order)` — drafts a customer-facing resolution message plus an internal note for a flagged/anomalous order.
- `draft_broadcast_message(product, platform, context)` — drafts a broadcast/announcement message (e.g. for a low-stock/reorder alert) for a given product+platform.
- `draft_repurposed_caption(product, platform, image_path)` — sends the actual product photo (base64 data URL) to `vision_model` via `complete_json_with_image` and returns a caption grounded in what's visible in the photo.
- `draft_dashboard_digest(flagged_orders, low_stock_products, needs_review_messages, product_names)` — summarizes those three signal lists into a short Indonesian bullet digest; returns a canned "all clear" string without calling the LLM if all three are empty.

All call sites wrap the LLM call in `try/except` and store a `[AI ... failed: ...]` string as the draft body on failure rather than raising, so a broken LLM call never drops a queued background job.

The **risk tag flows through to auto-send**: `messages.risk` is a DB column, surfaced via `/inbox` and used by the frontend to decide whether to auto-approve a draft (see Frontend below).

### Frontend

React 19 + Vite + TypeScript, no state management or routing library — `App.tsx` holds all top-level state (`active` tab, `refreshKey` for forcing page remounts after a demo "simulate" action, `autoReplyEnabled` persisted to `localStorage`, plus cross-page navigation hints like `chatPlatformHint`/`broadcastHint`) and switches between pages manually via a `TabKey` union + `renderPage()` switch. `src/lib/api.ts` is a single typed `fetch` wrapper client — every backend endpoint has a corresponding method there; add new ones there rather than calling `fetch` directly from a page.

Pages live in `src/pages/`: `Dashboard.tsx` (default/landing page — KPI tiles, an AI digest fetched on demand from `POST /dashboard/digest`, an order-success donut, a sales-over-time chart, and a top-products/recent-activity rail, all derived client-side from the same list endpoints the other pages use, filterable by platform), `Inbox.tsx` (per-platform chat threads; wide editable card for the active AI draft plus a manual compose bar for sending a message directly), `Orders.tsx` (product/platform/status filters + sort, platform-tinted rows), `Inventory.tsx` (photo thumbnail, price, description columns; inline Add/Edit product form with photo upload), `Broadcast.tsx` (AI draft card + filterable/sortable history table, both platform-tinted), `Content.tsx` (Content Studio — one 3-column grid, one column per platform, combining the text-caption and photo-repurpose flows into a single per-platform draft rather than two separate sections). `src/components/Sidebar.tsx` supports one level of nesting (`SidebarEntry` discriminated union: flat `item`s vs. a non-clickable `group` header with indented sub-items) — used for the "Messaging" group (Chat + Broadcast); `icons.tsx` has the rest of the hand-rolled nav SVGs.

**Platform branding** (`src/lib/platforms.tsx`): the single source of truth for per-platform label, icon (`ShopeeIcon`/`TikTokIcon`/`InstagramIcon`), and color (`solidColor`, `tintBg` — a low-opacity brand tint, `isGradient` for Instagram's gradient mark) via `PLATFORM_META`. Reused everywhere a platform needs to look consistent: chat tabs, `PlatformFilter.tsx`, platform-tinted table rows (Orders, Broadcast history), and Content Studio's per-platform cards.

**Design system**: tokens live in `src/index.css` (`--bg`, `--text`, `--accent` etc. — white background, magenta accent `#E6007A`, flat/no-shadow), shared component classes (buttons, tables, divider rows, status pills, the pill-shaped toggle switch, form fields) live in `src/App.css`. `.card` (bordered, rounded, padded box — see `src/components/DashboardCard.tsx` for the dashboard's version with a title/subtitle) is the standard container for a filter row + table, or a drafted-item list — wrap new grouped content in it rather than leaving controls/tables floating directly in the page. Prefer these existing classes over new inline styles or new CSS files.

**Auto-reply automation** (`Inbox.tsx`): when the "Automate safe replies" toggle is on, a `useEffect` watches the message list and auto-PATCHes any `ai_draft`/`status: draft`/`risk: auto_safe` message to `status: sent`. Anything tagged `needs_review` always waits for manual Approve/Send — this is the "controlled automation" behavior described in the architecture doc, implemented entirely client-side (the risk tag is computed once, backend-side, at draft-generation time).

### Cross-cutting pattern

The doc's "AI drafts, human approves" principle shows up in both `messages` and `content_assets`: both have a `status` lifecycle (`draft` → `approved`/`sent`/`published`) and both are edited via a `PATCH` endpoint that accepts an optional body override plus the new status (`app/routers/inbox.py`, `app/routers/content.py`). When adding a new AI-generated-and-approved artifact type, follow this same shape rather than inventing a new one. A still-`draft` row can also be discarded outright via `DELETE` (`content_assets` today) rather than PATCHed to some `dismissed` status — prefer deletion for anything that was never approved.

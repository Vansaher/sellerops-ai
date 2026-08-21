# SellerOps AI

Unified operations copilot for Indonesian online sellers running Shopee, TikTok Shop, and Instagram. See `../WizAI - AI Builder Challenge - Option 2 Architecture.md` for the full product/architecture writeup.

## Modules

- **Dashboard** — KPI tiles, an on-demand AI digest ("what needs attention today," pulled from flagged orders/low stock/messages awaiting review), an order-success rate donut, a sales-over-time chart, and top-products/recent-activity — all filterable by platform.
- **Unified Inbox (Chat)** — per-platform customer chat threads. AI drafts a reply and tags it `auto_safe` (auto-sendable) or `needs_review` (always waits for a human); a manual compose bar lets the seller type and send directly.
- **Broadcast** — AI-drafted announcement messages to followers about a product (e.g. a low-stock alert), with a filterable/sortable send history. No platform here supports real bulk-send, so this drafts text to copy into each platform's own tools.
- **Order Management** — order status across platforms in one table (product/platform/status filters, sort by date or amount), with age-based anomaly flagging and an AI-drafted customer-facing resolution message for flagged orders.
- **Inventory Sync** — single source of truth for stock, synced out to per-platform listings; add/edit products (including a multi-photo gallery per product), low-stock alerts, add-only restocking.
- **AI Content Studio** — one product photo + description becomes platform-adapted variants (Shopee SEO description, TikTok/Instagram caption+hashtags) for Shopee, TikTok Shop, and Instagram side by side; when a photo is uploaded, captions are grounded in what's actually in the photo, and it's auto-cropped to each platform's real aspect ratio.

Every AI-drafted artifact (reply, order resolution, broadcast, content) goes through the same draft → approve/publish lifecycle — a human always signs off before anything customer-facing goes out.

## Backend (FastAPI + SQLite)

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate      # Windows
pip install -r requirements.txt
copy .env.example .env      # then fill in LLM_API_KEY (and optionally LLM_MODEL / LLM_VISION_MODEL)

python -m app.seed          # seed demo seller/products/orders/messages
uvicorn app.main:app --reload
```

API docs at http://localhost:8000/docs.

Simulate a new order/message arriving (needs the server running):

```bash
python -m app.simulate shopee
```

## Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
```

Dashboard at http://localhost:5173, calls the API at http://localhost:8000 (override with `VITE_API_BASE`).

## Demo script

New order comes in → chat comes in → AI drafts reply → you approve → order sits pending past the threshold and gets flagged (or use `POST /admin/simulate-delayed-order`) → AI drafts a resolution message → you send it → stock runs low (or use `POST /admin/simulate-low-stock`) → AI drafts a broadcast to followers → upload a product photo and generate Content Studio variants for all three platforms → check the Dashboard digest for a rollup of what still needs attention.

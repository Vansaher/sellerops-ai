# SellerOps AI

Unified operations copilot for Indonesian online sellers running Shopee, TikTok Shop, and Instagram. See `../WizAI - AI Builder Challenge - Option 2 Architecture.md` for the full product/architecture writeup.

## Backend (FastAPI + SQLite)

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate      # Windows
pip install -r requirements.txt
copy .env.example .env      # then fill in LLM_API_KEY

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

## Demo script (MVP build order step 7)

New order comes in → chat comes in → AI drafts reply → you approve → stock auto-adjusts → low-stock alert fires → content studio generates a listing.

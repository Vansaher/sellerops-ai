import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

load_dotenv()

from app.database import Base, engine  # noqa: E402
from app.routers import admin, broadcast, content, dashboard, inbox, inventory, orders, products, webhooks  # noqa: E402
from app.seed import seed  # noqa: E402

Base.metadata.create_all(bind=engine)
seed()  # no-op if a seller already exists — safe to call on every boot

UPLOADS_DIR = Path("uploads")
UPLOADS_DIR.mkdir(exist_ok=True)

app = FastAPI(title="SellerOps AI")

# FRONTEND_ORIGINS: comma-separated list of allowed origins (e.g. a Netlify
# URL in production). Always includes the local Vite dev server.
_extra_origins = [o.strip() for o in os.getenv("FRONTEND_ORIGINS", "").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", *_extra_origins],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

app.include_router(orders.router)
app.include_router(inventory.router)
app.include_router(inbox.router)
app.include_router(content.router)
app.include_router(products.router)
app.include_router(webhooks.router)
app.include_router(broadcast.router)
app.include_router(dashboard.router)

# Demo/admin tools — safe to remove this router (and backend/app/routers/admin.py) entirely for production
app.include_router(admin.router)


@app.get("/health")
def health():
    return {"status": "ok"}

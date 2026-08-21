from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

load_dotenv()

from app.database import Base, engine  # noqa: E402
from app.routers import admin, broadcast, content, inbox, inventory, orders, products, webhooks  # noqa: E402

Base.metadata.create_all(bind=engine)

UPLOADS_DIR = Path("uploads")
UPLOADS_DIR.mkdir(exist_ok=True)

app = FastAPI(title="SellerOps AI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
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

# Demo/admin tools — safe to remove this router (and backend/app/routers/admin.py) entirely for production
app.include_router(admin.router)


@app.get("/health")
def health():
    return {"status": "ok"}

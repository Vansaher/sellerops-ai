from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

from app.database import Base, engine  # noqa: E402
from app.routers import content, inbox, inventory, orders, products, webhooks  # noqa: E402

Base.metadata.create_all(bind=engine)

app = FastAPI(title="SellerOps AI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(orders.router)
app.include_router(inventory.router)
app.include_router(inbox.router)
app.include_router(content.router)
app.include_router(products.router)
app.include_router(webhooks.router)


@app.get("/health")
def health():
    return {"status": "ok"}

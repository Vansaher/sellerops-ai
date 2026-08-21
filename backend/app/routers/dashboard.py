from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.services import llm

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.post("/digest", response_model=schemas.DashboardDigest)
def generate_digest(seller_id: int = 1, db: Session = Depends(get_db)):
    orders = db.query(models.Order).filter(models.Order.seller_id == seller_id).all()
    flagged_orders = [o for o in orders if o.flag_reason is not None]

    products = db.query(models.Product).filter(models.Product.seller_id == seller_id).all()
    low_stock_products = [p for p in products if p.low_stock_reason is not None]

    needs_review_messages = (
        db.query(models.Message)
        .filter(
            models.Message.seller_id == seller_id,
            models.Message.risk == "needs_review",
            models.Message.status == "draft",
        )
        .all()
    )

    product_names = {p.id: p.name for p in products}
    digest = llm.draft_dashboard_digest(flagged_orders, low_stock_products, needs_review_messages, product_names)
    return schemas.DashboardDigest(digest=digest, generated_at=datetime.now(timezone.utc))

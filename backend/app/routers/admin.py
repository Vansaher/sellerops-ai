import random
from datetime import timedelta

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import Base, SessionLocal, engine, get_db
from app.models import DELAY_THRESHOLD_HOURS, utcnow
from app.seed import _populate
from app.services.inventory_sync import sync_product_inventory

router = APIRouter(prefix="/admin", tags=["admin"])


@router.post("/reset-db")
def reset_db() -> dict:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        _populate(db)
        db.commit()
    finally:
        db.close()
    return {"status": "ok"}


@router.post("/fill-inventory")
def fill_inventory(seller_id: int = 1, db: Session = Depends(get_db)) -> dict:
    products = db.query(models.Product).filter(models.Product.seller_id == seller_id).all()
    for product in products:
        product.stock_qty = 12
        sync_product_inventory(db, product)
    db.commit()
    return {"status": "ok", "updated": len(products)}


@router.post("/simulate-delayed-order", response_model=schemas.OrderOut)
def simulate_delayed_order(seller_id: int = 1, db: Session = Depends(get_db)) -> models.Order:
    """Creates a still-pending order backdated past the anomaly-detection
    threshold, so it shows up flagged immediately — lets the order anomaly
    detection demo be triggered on demand instead of waiting 48h for real."""
    order = models.Order(
        seller_id=seller_id,
        platform=random.choice(["shopee", "tiktok"]),  # Instagram has no order concept
        platform_order_id=f"DEMO-{random.randint(100000, 999999)}",
        status="pending",
        customer_ref=f"cust_{random.randint(1000, 9999)}",
        amount=round(random.uniform(50_000, 500_000), 2),
        created_at=utcnow() - timedelta(hours=DELAY_THRESHOLD_HOURS + 24),
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return order

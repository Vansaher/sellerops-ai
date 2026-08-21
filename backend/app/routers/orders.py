from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db

router = APIRouter(prefix="/orders", tags=["orders"])


@router.get("", response_model=list[schemas.OrderOut])
def list_orders(seller_id: int = 1, db: Session = Depends(get_db)):
    return db.query(models.Order).filter(models.Order.seller_id == seller_id).all()


@router.get("/{order_id}", response_model=schemas.OrderOut)
def get_order(order_id: int, db: Session = Depends(get_db)):
    return db.get(models.Order, order_id)

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db

router = APIRouter(prefix="/products", tags=["products"])


@router.get("", response_model=list[schemas.ProductOut])
def list_products(seller_id: int = 1, db: Session = Depends(get_db)):
    return db.query(models.Product).filter(models.Product.seller_id == seller_id).all()

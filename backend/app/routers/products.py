from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.services.inventory_sync import sync_product_inventory

router = APIRouter(prefix="/products", tags=["products"])


@router.get("", response_model=list[schemas.ProductOut])
def list_products(seller_id: int = 1, db: Session = Depends(get_db)):
    return db.query(models.Product).filter(models.Product.seller_id == seller_id).all()


@router.post("", response_model=schemas.ProductOut)
def create_product(body: schemas.ProductCreate, seller_id: int = 1, db: Session = Depends(get_db)):
    product = models.Product(seller_id=seller_id, **body.model_dump())
    db.add(product)
    db.flush()
    sync_product_inventory(db, product)
    db.commit()
    db.refresh(product)
    return product

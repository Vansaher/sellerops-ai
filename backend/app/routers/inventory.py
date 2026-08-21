from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.services.inventory_sync import sync_product_inventory

router = APIRouter(prefix="/inventory", tags=["inventory"])


@router.get("", response_model=list[schemas.InventoryOut])
def list_inventory(db: Session = Depends(get_db)):
    return db.query(models.Inventory).all()


@router.get("/low-stock", response_model=list[schemas.InventoryOut])
def low_stock(threshold: int = 5, db: Session = Depends(get_db)):
    return db.query(models.Inventory).filter(models.Inventory.stock_qty <= threshold).all()


@router.post("/{product_id}/restock", response_model=schemas.ProductOut)
def restock(product_id: int, body: schemas.RestockRequest, db: Session = Depends(get_db)):
    product = db.get(models.Product, product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    product.stock_qty += body.amount
    sync_product_inventory(db, product)
    db.commit()
    db.refresh(product)
    return product

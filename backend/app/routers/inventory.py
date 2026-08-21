from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db

router = APIRouter(prefix="/inventory", tags=["inventory"])


@router.get("", response_model=list[schemas.InventoryOut])
def list_inventory(db: Session = Depends(get_db)):
    return db.query(models.Inventory).all()


@router.get("/low-stock", response_model=list[schemas.InventoryOut])
def low_stock(threshold: int = 5, db: Session = Depends(get_db)):
    return db.query(models.Inventory).filter(models.Inventory.stock_qty <= threshold).all()

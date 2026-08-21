from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from PIL import Image
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


@router.post("/{product_id}/photo", response_model=schemas.ProductOut)
async def upload_photo(product_id: int, file: UploadFile, db: Session = Depends(get_db)):
    product = db.get(models.Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    folder = Path("uploads/products") / str(product_id)
    folder.mkdir(parents=True, exist_ok=True)
    dest = folder / "original.jpg"
    with Image.open(file.file) as img:
        img.convert("RGB").save(dest, "JPEG", quality=90)

    product.image_path = f"/uploads/products/{product_id}/original.jpg"
    db.commit()
    db.refresh(product)
    return product

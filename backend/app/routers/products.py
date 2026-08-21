import uuid
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


@router.patch("/{product_id}", response_model=schemas.ProductOut)
def update_product(product_id: int, body: schemas.ProductUpdate, db: Session = Depends(get_db)):
    product = db.get(models.Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(product, field, value)

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
    dest = folder / f"{uuid.uuid4().hex}.jpg"
    with Image.open(file.file) as img:
        img.convert("RGB").save(dest, "JPEG", quality=90)

    image_path = f"/uploads/products/{product_id}/{dest.name}"
    db.add(models.ProductPhoto(product_id=product_id, image_path=image_path))
    # Most recently uploaded photo becomes the active one used for repurposing.
    product.image_path = image_path
    db.commit()
    db.refresh(product)
    return product


@router.get("/{product_id}/photos", response_model=list[schemas.ProductPhotoOut])
def list_photos(product_id: int, db: Session = Depends(get_db)):
    return (
        db.query(models.ProductPhoto)
        .filter(models.ProductPhoto.product_id == product_id)
        .order_by(models.ProductPhoto.created_at.desc())
        .all()
    )


@router.delete("/{product_id}/photos/{photo_id}", response_model=schemas.ProductOut)
def delete_photo(product_id: int, photo_id: int, db: Session = Depends(get_db)):
    product = db.get(models.Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    photo = db.get(models.ProductPhoto, photo_id)
    if not photo or photo.product_id != product_id:
        raise HTTPException(status_code=404, detail="Photo not found")

    was_active = product.image_path == photo.image_path

    file_path = Path(photo.image_path.lstrip("/"))
    if file_path.exists():
        file_path.unlink()
    db.delete(photo)
    db.flush()

    if was_active:
        next_photo = (
            db.query(models.ProductPhoto)
            .filter(models.ProductPhoto.product_id == product_id)
            .order_by(models.ProductPhoto.created_at.desc())
            .first()
        )
        product.image_path = next_photo.image_path if next_photo else None

    db.commit()
    db.refresh(product)
    return product

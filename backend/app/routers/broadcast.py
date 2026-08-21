from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.services import llm

router = APIRouter(prefix="/broadcast", tags=["broadcast"])


@router.post("/generate", response_model=schemas.ContentAssetOut)
def generate_broadcast(request: schemas.BroadcastGenerateRequest, db: Session = Depends(get_db)):
    product = db.get(models.Product, request.product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    body = llm.draft_broadcast_message(product, request.platform, request.context)
    asset = models.ContentAsset(
        seller_id=product.seller_id,
        product_id=product.id,
        platform=request.platform,
        type="broadcast",
        body=body,
        status="draft",
    )
    db.add(asset)
    db.commit()
    db.refresh(asset)
    return asset

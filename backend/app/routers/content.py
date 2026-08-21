from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import SessionLocal, get_db
from app.services import llm

router = APIRouter(prefix="/content", tags=["content"])

_ASSET_TYPE_BY_PLATFORM = {
    "shopee": "description",
    "tiktok": "caption",
    "instagram": "caption",
}


@router.get("", response_model=list[schemas.ContentAssetOut])
def list_content_assets(product_id: int | None = None, db: Session = Depends(get_db)):
    query = db.query(models.ContentAsset)
    if product_id is not None:
        query = query.filter(models.ContentAsset.product_id == product_id)
    return query.all()


def _generate_content_task(product_id: int, platforms: list[str]) -> None:
    """Runs in-process (FastAPI BackgroundTasks) — no broker. Generates
    per-platform copy via the LLM and writes ContentAsset rows as drafts.
    """
    db = SessionLocal()
    try:
        product = db.get(models.Product, product_id)
        if not product:
            return

        for platform in platforms:
            try:
                body = llm.generate_content(product, platform)
            except Exception as exc:  # noqa: BLE001 — record the failure as a draft, don't drop the job
                body = f"[AI generation failed: {exc}]"

            db.add(
                models.ContentAsset(
                    seller_id=product.seller_id,
                    product_id=product.id,
                    platform=platform,
                    type=_ASSET_TYPE_BY_PLATFORM.get(platform, "description"),
                    body=body,
                    status="draft",
                )
            )
        db.commit()
    finally:
        db.close()


@router.post("/generate", status_code=202)
def generate_content(request: schemas.ContentGenerateRequest, background_tasks: BackgroundTasks):
    background_tasks.add_task(_generate_content_task, request.product_id, request.platforms)
    return {"status": "queued", "product_id": request.product_id, "platforms": request.platforms}


@router.patch("/{asset_id}", response_model=schemas.ContentAssetOut)
def update_content_asset(asset_id: int, update: schemas.ContentAssetUpdate, db: Session = Depends(get_db)):
    asset = db.get(models.ContentAsset, asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Content asset not found")
    if update.body is not None:
        asset.body = update.body
    asset.status = update.status
    db.commit()
    db.refresh(asset)
    return asset

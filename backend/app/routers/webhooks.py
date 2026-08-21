from fastapi import APIRouter, BackgroundTasks

from app import models
from app.database import SessionLocal
from app.services import llm
from app.services.adapters.instagram import InstagramAdapter
from app.services.adapters.shopee import ShopeeAdapter
from app.services.adapters.tiktok import TikTokAdapter

router = APIRouter(prefix="/webhooks", tags=["webhooks"])

_ADAPTERS = {
    "shopee": ShopeeAdapter(),
    "tiktok": TikTokAdapter(),
    "instagram": InstagramAdapter(),
}


def _ingest_task(platform: str, seller_id: int) -> None:
    """Runs in-process (FastAPI BackgroundTasks) — no broker. Pulls new
    orders/messages from the mock adapter and writes them to the DB.
    """
    adapter = _ADAPTERS[platform]
    db = SessionLocal()
    try:
        for order in adapter.fetch_new_orders():
            db.add(models.Order(seller_id=seller_id, platform=platform, **order))

        for message in adapter.fetch_new_messages():
            incoming = models.Message(seller_id=seller_id, platform=platform, **message)
            db.add(incoming)
            db.flush()

            body, risk = llm.draft_reply(db, seller_id, incoming.body)
            db.add(
                models.Message(
                    seller_id=seller_id,
                    platform=platform,
                    thread_id=incoming.thread_id,
                    sender="ai_draft",
                    body=body,
                    status="draft",
                    risk=risk,
                )
            )

        db.commit()
    finally:
        db.close()


@router.post("/simulate/{platform}", status_code=202)
def simulate_incoming(platform: str, background_tasks: BackgroundTasks, seller_id: int = 1):
    if platform not in _ADAPTERS:
        return {"error": f"unknown platform {platform!r}"}
    background_tasks.add_task(_ingest_task, platform, seller_id)
    return {"status": "queued", "platform": platform}

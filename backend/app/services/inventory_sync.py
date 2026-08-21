from sqlalchemy.orm import Session

from app import models
from app.models import utcnow
from app.services.adapters.shopee import ShopeeAdapter
from app.services.adapters.tiktok import TikTokAdapter

INVENTORY_PLATFORMS = ("shopee", "tiktok")  # Instagram has no inventory API — excluded

_ADAPTERS = {
    "shopee": ShopeeAdapter(),
    "tiktok": TikTokAdapter(),
}


def sync_product_inventory(db: Session, product: models.Product) -> None:
    """Mirrors product.stock_qty out to the Shopee+TikTok Inventory rows
    (create-if-missing, else update) and calls each adapter's
    push_inventory_update — the real wiring for what was previously a dead
    mock method. Does not commit — caller is responsible for that.
    """
    existing = {inv.platform: inv for inv in product.inventory if inv.platform in INVENTORY_PLATFORMS}
    for platform in INVENTORY_PLATFORMS:
        _ADAPTERS[platform].push_inventory_update(product.sku, product.stock_qty)
        inv = existing.get(platform)
        if inv is None:
            db.add(
                models.Inventory(
                    product_id=product.id,
                    platform=platform,
                    stock_qty=product.stock_qty,
                    last_synced_at=utcnow(),
                )
            )
        else:
            inv.stock_qty = product.stock_qty
            inv.last_synced_at = utcnow()

"""Seed SQLite with a demo seller, products, and sample orders/messages
across all 3 platforms. Run with: python -m app.seed
"""
from dotenv import load_dotenv

load_dotenv()

from sqlalchemy.orm import Session  # noqa: E402

from app.database import Base, SessionLocal, engine  # noqa: E402
from app import models  # noqa: E402
from app.services.inventory_sync import sync_product_inventory  # noqa: E402

PLATFORMS = ["shopee", "tiktok", "instagram"]


def _populate(db: Session) -> models.Seller:
    """Inserts the baseline demo dataset (seller, products, inventory, one
    order, six messages). Does not commit — caller is responsible for that.
    """
    seller = models.Seller(name="Toko Bunga Sejahtera", platforms_connected=PLATFORMS)
    db.add(seller)
    db.flush()

    products = [
        models.Product(
            seller_id=seller.id,
            name="Rangkaian Bunga Mawar",
            description="Rangkaian bunga mawar segar untuk hadiah spesial.",
            price=150000,
            sku="FLR-ROSE-01",
            stock_qty=12,
        ),
        models.Product(
            seller_id=seller.id,
            name="Buket Bunga Matahari",
            description="Buket bunga matahari cerah, cocok untuk ucapan selamat.",
            price=120000,
            sku="FLR-SUN-01",
            stock_qty=12,
        ),
    ]
    db.add_all(products)
    db.flush()

    for product in products:
        sync_product_inventory(db, product)

    db.add(
        models.Order(
            seller_id=seller.id,
            platform="shopee",
            platform_order_id="SHP-100234",
            status="pending",
            customer_ref="cust_1001",
            amount=150000,
        )
    )
    messages = [
        # Shopee — Siti Amalia (2 messages)
        dict(
            platform="shopee",
            thread_id="SHP-THREAD-1001",
            customer_name="Siti Amalia",
            sender="customer",
            body="Halo kak, pesanan saya kapan dikirim ya?",
            status="draft",
        ),
        dict(
            platform="shopee",
            thread_id="SHP-THREAD-1001",
            customer_name="Siti Amalia",
            sender="seller",
            body="Halo kak Siti, pesanannya sedang dikemas dan akan dikirim hari ini ya.",
            status="sent",
        ),
        # Shopee — Budi Santoso (2 messages)
        dict(
            platform="shopee",
            thread_id="SHP-THREAD-1002",
            customer_name="Budi Santoso",
            sender="customer",
            body="Apakah stok warna hitam masih ada?",
            status="draft",
        ),
        dict(
            platform="shopee",
            thread_id="SHP-THREAD-1002",
            customer_name="Budi Santoso",
            sender="seller",
            body="Masih ada kak, stok warna hitam tersedia.",
            status="sent",
        ),
        # TikTok — Dewi Lestari
        dict(
            platform="tiktok",
            thread_id="TT-THREAD-2001",
            customer_name="Dewi Lestari",
            sender="customer",
            body="Kak, status pesanan aku udah sampai mana ya?",
            status="draft",
        ),
        # Instagram — Nadia Kusuma
        dict(
            platform="instagram",
            thread_id="IG-THREAD-3001",
            customer_name="Nadia Kusuma",
            sender="customer",
            body="Ready stock buket wisuda hari ini kak?",
            status="draft",
        ),
    ]
    for message in messages:
        db.add(models.Message(seller_id=seller.id, **message))

    return seller


def seed() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.query(models.Seller).first():
            print("Already seeded — skipping.")
            return

        seller = _populate(db)
        db.commit()
        print(f"Seeded seller_id={seller.id} with {len(seller.products)} products.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()

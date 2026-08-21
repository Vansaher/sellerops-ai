"""Seed SQLite with a demo seller, products, and sample orders/messages
across all 3 platforms. Run with: python -m app.seed
"""
from dotenv import load_dotenv

load_dotenv()

from app.database import Base, SessionLocal, engine  # noqa: E402
from app import models  # noqa: E402

PLATFORMS = ["shopee", "tiktok", "instagram"]


def seed() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.query(models.Seller).first():
            print("Already seeded — skipping.")
            return

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
            ),
            models.Product(
                seller_id=seller.id,
                name="Buket Bunga Matahari",
                description="Buket bunga matahari cerah, cocok untuk ucapan selamat.",
                price=120000,
                sku="FLR-SUN-01",
            ),
        ]
        db.add_all(products)
        db.flush()

        for product in products:
            for platform in PLATFORMS:
                db.add(
                    models.Inventory(
                        product_id=product.id,
                        platform=platform,
                        stock_qty=12,
                    )
                )

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
        db.add(
            models.Message(
                seller_id=seller.id,
                platform="shopee",
                thread_id="SHP-THREAD-1001",
                sender="customer",
                body="Halo kak, pesanan saya kapan dikirim ya?",
                status="draft",
            )
        )

        db.commit()
        print(f"Seeded seller_id={seller.id} with {len(products)} products.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()

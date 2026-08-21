"""Seed SQLite with a demo seller, products, and sample orders/messages
across all 3 platforms. Run with: python -m app.seed
"""
from dotenv import load_dotenv

load_dotenv()

from datetime import timedelta  # noqa: E402

from sqlalchemy.orm import Session  # noqa: E402

from app.database import Base, SessionLocal, engine  # noqa: E402
from app import models  # noqa: E402
from app.models import utcnow  # noqa: E402
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
        models.Product(
            seller_id=seller.id,
            name="Karangan Bunga Papan Ucapan",
            description="Karangan bunga papan untuk ucapan selamat, duka cita, atau pembukaan usaha.",
            price=450000,
            sku="FLR-BOARD-01",
            stock_qty=8,
        ),
        models.Product(
            seller_id=seller.id,
            name="Buket Anggrek Bulan",
            description="Buket anggrek bulan elegan, cocok untuk hadiah spesial atau acara resmi.",
            price=225000,
            sku="FLR-ORCHID-01",
            stock_qty=10,
        ),
        models.Product(
            seller_id=seller.id,
            name="Bunga Tabur Duka Cita",
            description="Rangkaian bunga tabur untuk acara belasungkawa.",
            price=95000,
            sku="FLR-CONDOL-01",
            stock_qty=15,
        ),
    ]
    db.add_all(products)
    db.flush()

    for product in products:
        sync_product_inventory(db, product)

    rose, sun, board, orchid, condol = products

    # Still-open orders, dated "now" so they show up as fresh/pending.
    open_orders = [
        dict(platform="shopee", product=rose, platform_order_id="SHP-100234", customer_ref="cust_1001", amount=150000, days_ago=0),
        dict(platform="tiktok", product=board, platform_order_id="TT-200145", customer_ref="cust_2001", amount=450000, days_ago=0),
    ]

    # Completed sales spread across the past ~6 weeks. Order count per day
    # varies (1-3 orders on order days, some days skipped entirely) instead
    # of a flat one-order-per-day cadence, so the sales chart's order-count
    # line actually moves like a real storefront instead of a flat line.
    completed_schedule = [
        (42, [rose]),
        (39, [sun, orchid]),
        (36, [board]),
        (33, [condol, rose, sun]),
        (29, [orchid]),
        (26, [rose, board]),
        (22, [condol]),
        (19, [sun]),
        (17, [rose, orchid, board]),
        (14, [condol]),
        (11, [sun, rose]),
        (8, [orchid]),
        (6, [board, condol, rose]),
        (3, [sun]),
        (1, [orchid, rose]),
    ]
    completed_orders = []
    shopee_seq, tiktok_seq = 0, 0
    for i, (days_ago, day_products) in enumerate(completed_schedule):
        for j, product in enumerate(day_products):
            platform = "shopee" if (i + j) % 2 == 0 else "tiktok"
            if platform == "shopee":
                order_id = f"SHP-{100901 + shopee_seq}"
                shopee_seq += 1
            else:
                order_id = f"TT-{200901 + tiktok_seq}"
                tiktok_seq += 1
            n = len(completed_orders)
            completed_orders.append(dict(
                platform=platform,
                product=product,
                platform_order_id=order_id,
                customer_ref=f"cust_{3001 + n}",
                amount=product.price,
                days_ago=days_ago,
            ))

    # A handful of failed orders (payment/cancellation failures) — kept rare,
    # like a real storefront, not evenly mixed in with the completed sales.
    failed_orders = [
        dict(platform="shopee", product=sun, platform_order_id="SHP-100950", customer_ref="cust_4001", amount=120000, days_ago=20),
        dict(platform="tiktok", product=board, platform_order_id="TT-200950", customer_ref="cust_4002", amount=450000, days_ago=8),
    ]

    for order in open_orders:
        product = order.pop("product")
        days_ago = order.pop("days_ago")
        db.add(models.Order(
            seller_id=seller.id, product_id=product.id, status="pending",
            created_at=utcnow() - timedelta(days=days_ago), **order,
        ))
    for order in completed_orders:
        product = order.pop("product")
        days_ago = order.pop("days_ago")
        db.add(models.Order(
            seller_id=seller.id, product_id=product.id, status="completed",
            created_at=utcnow() - timedelta(days=days_ago), **order,
        ))
    for order in failed_orders:
        product = order.pop("product")
        days_ago = order.pop("days_ago")
        db.add(models.Order(
            seller_id=seller.id, product_id=product.id, status="failed",
            created_at=utcnow() - timedelta(days=days_ago), **order,
        ))
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

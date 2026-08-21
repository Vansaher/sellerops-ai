from datetime import datetime, timezone

from sqlalchemy import JSON, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Seller(Base):
    __tablename__ = "sellers"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    platforms_connected: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(default=utcnow)

    products: Mapped[list["Product"]] = relationship(back_populates="seller")
    orders: Mapped[list["Order"]] = relationship(back_populates="seller")
    messages: Mapped[list["Message"]] = relationship(back_populates="seller")
    content_assets: Mapped[list["ContentAsset"]] = relationship(back_populates="seller")


class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(primary_key=True)
    seller_id: Mapped[int] = mapped_column(ForeignKey("sellers.id"))
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(String(2000), default="")
    price: Mapped[float] = mapped_column(Numeric(12, 2))
    sku: Mapped[str] = mapped_column(String(64))

    seller: Mapped["Seller"] = relationship(back_populates="products")
    inventory: Mapped[list["Inventory"]] = relationship(back_populates="product")


class Inventory(Base):
    __tablename__ = "inventory"

    id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"))
    platform: Mapped[str] = mapped_column(String(32))
    stock_qty: Mapped[int] = mapped_column(default=0)
    last_synced_at: Mapped[datetime] = mapped_column(default=utcnow)

    product: Mapped["Product"] = relationship(back_populates="inventory")


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(primary_key=True)
    seller_id: Mapped[int] = mapped_column(ForeignKey("sellers.id"))
    platform: Mapped[str] = mapped_column(String(32))
    platform_order_id: Mapped[str] = mapped_column(String(64))
    status: Mapped[str] = mapped_column(String(32), default="pending")
    customer_ref: Mapped[str] = mapped_column(String(128))
    amount: Mapped[float] = mapped_column(Numeric(12, 2))
    created_at: Mapped[datetime] = mapped_column(default=utcnow)

    seller: Mapped["Seller"] = relationship(back_populates="orders")


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[int] = mapped_column(primary_key=True)
    seller_id: Mapped[int] = mapped_column(ForeignKey("sellers.id"))
    platform: Mapped[str] = mapped_column(String(32))
    thread_id: Mapped[str] = mapped_column(String(64))
    sender: Mapped[str] = mapped_column(String(16))  # customer | seller | ai_draft
    body: Mapped[str] = mapped_column(String(4000))
    status: Mapped[str] = mapped_column(String(16), default="draft")  # draft | approved | sent
    risk: Mapped[str | None] = mapped_column(String(16), default=None)  # auto_safe | needs_review
    created_at: Mapped[datetime] = mapped_column(default=utcnow)

    seller: Mapped["Seller"] = relationship(back_populates="messages")


class ContentAsset(Base):
    __tablename__ = "content_assets"

    id: Mapped[int] = mapped_column(primary_key=True)
    seller_id: Mapped[int] = mapped_column(ForeignKey("sellers.id"))
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"))
    platform: Mapped[str] = mapped_column(String(32))
    type: Mapped[str] = mapped_column(String(32))  # description | caption | hashtags
    body: Mapped[str] = mapped_column(String(4000))
    status: Mapped[str] = mapped_column(String(16), default="draft")  # draft | approved | published

    seller: Mapped["Seller"] = relationship(back_populates="content_assets")

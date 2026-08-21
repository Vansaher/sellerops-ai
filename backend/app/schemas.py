from datetime import datetime

from pydantic import BaseModel, ConfigDict


class OrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    platform: str
    platform_order_id: str
    status: str
    customer_ref: str
    amount: float
    created_at: datetime


class InventoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    platform: str
    stock_qty: int
    last_synced_at: datetime


class MessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    platform: str
    thread_id: str
    sender: str
    body: str
    status: str
    risk: str | None = None
    created_at: datetime


class MessageDraftUpdate(BaseModel):
    body: str | None = None
    status: str  # approved | sent


class ContentAssetOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    platform: str
    type: str
    body: str
    status: str


class ContentAssetUpdate(BaseModel):
    body: str | None = None
    status: str  # approved | published


class ContentGenerateRequest(BaseModel):
    product_id: int
    platforms: list[str] = ["shopee", "tiktok", "instagram"]


class ProductOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str
    price: float
    sku: str

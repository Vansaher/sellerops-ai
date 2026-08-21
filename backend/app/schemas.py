from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class OrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int | None = None
    platform: str
    platform_order_id: str
    status: str
    customer_ref: str
    amount: float
    created_at: datetime
    flag_reason: str | None = None
    resolution_draft: str | None = None
    resolution_status: str | None = None


class OrderResolutionDraft(OrderOut):
    internal_note: str | None = None  # seller-facing only, never persisted, never sent to the customer


class OrderResolutionUpdate(BaseModel):
    status: str  # dismissed


class OrderMessageSend(BaseModel):
    body: str = Field(min_length=1)


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
    customer_name: str | None = None
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
    image_path: str | None = None
    status: str
    created_at: datetime


class ContentAssetUpdate(BaseModel):
    body: str | None = None
    status: str  # approved | published


class ContentGenerateRequest(BaseModel):
    product_id: int
    platforms: list[str] = ["shopee", "tiktok", "instagram"]


class RepurposeRequest(BaseModel):
    product_id: int
    platforms: list[str] = ["shopee", "tiktok", "instagram"]


class DashboardDigest(BaseModel):
    digest: str
    generated_at: datetime


class ProductOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str
    price: float
    sku: str
    stock_qty: int
    low_stock_reason: str | None = None
    image_path: str | None = None


class ProductCreate(BaseModel):
    name: str
    description: str = ""
    price: float
    sku: str
    stock_qty: int = 0


class ProductUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    price: float | None = None
    sku: str | None = None


class RestockRequest(BaseModel):
    amount: int = Field(gt=0)


class BroadcastGenerateRequest(BaseModel):
    product_id: int
    platform: str  # shopee | tiktok | instagram
    context: str | None = None  # optional trigger context, e.g. a low-stock reason

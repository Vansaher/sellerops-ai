from abc import ABC, abstractmethod
from typing import TypedDict


class OrderPayload(TypedDict):
    platform_order_id: str
    status: str
    customer_ref: str
    amount: float


class MessagePayload(TypedDict):
    thread_id: str
    customer_name: str
    sender: str
    body: str


class PlatformAdapter(ABC):
    """Common interface every platform adapter implements.

    Real adapters would call Shopee Open Platform / TikTok Shop Partner API /
    Instagram Graph API. Mock adapters return seeded fixture data in the same
    shape, so swapping in a real adapter later only touches this layer.
    """

    platform: str

    @abstractmethod
    def fetch_new_orders(self) -> list[OrderPayload]:
        ...

    @abstractmethod
    def fetch_new_messages(self) -> list[MessagePayload]:
        ...

    @abstractmethod
    def push_inventory_update(self, sku: str, stock_qty: int) -> bool:
        ...

from app.services.adapters.base import MessagePayload, OrderPayload, PlatformAdapter


class InstagramAdapter(PlatformAdapter):
    """Mock Instagram Graph API adapter — stub, same interface as
    ShopeeAdapter. Fill in fixture data following that pattern. Instagram has
    no native order object, so fetch_new_orders stays empty here.
    """

    platform = "instagram"

    def fetch_new_orders(self) -> list[OrderPayload]:
        return []

    def fetch_new_messages(self) -> list[MessagePayload]:
        return []

    def push_inventory_update(self, sku: str, stock_qty: int) -> bool:
        return True

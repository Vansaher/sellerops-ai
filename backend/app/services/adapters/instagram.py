import random

from app.services.adapters.base import MessagePayload, OrderPayload, PlatformAdapter

_CUSTOMERS = [
    {"thread_id": "IG-THREAD-3001", "name": "Nadia Kusuma"},
    {"thread_id": "IG-THREAD-3002", "name": "Rizky Ramadhan"},
    {"thread_id": "IG-THREAD-3003", "name": "Lina Marlina"},
]

_FIXTURE_MESSAGES = [
    "Ready stock buket wisuda hari ini kak?",
    "Bisa custom warna pink pastel nggak?",
    "Kak boleh minta harga untuk buket ukuran besar?",
    "Kalau order sekarang bisa same day delivery nggak ya?",
]


class InstagramAdapter(PlatformAdapter):
    """Mock Instagram Graph API adapter — seeded fixture data, same payload
    shape a real adapter would return, no network calls. Instagram has no
    native order object, so fetch_new_orders stays empty here.
    """

    platform = "instagram"

    def fetch_new_orders(self) -> list[OrderPayload]:
        return []

    def fetch_new_messages(self) -> list[MessagePayload]:
        n = random.randint(0, 2)
        messages = []
        for _ in range(n):
            customer = random.choice(_CUSTOMERS)
            messages.append(
                {
                    "thread_id": customer["thread_id"],
                    "customer_name": customer["name"],
                    "sender": "customer",
                    "body": random.choice(_FIXTURE_MESSAGES),
                }
            )
        return messages

    def push_inventory_update(self, sku: str, stock_qty: int) -> bool:
        return True

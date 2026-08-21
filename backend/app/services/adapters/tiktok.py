import random

from app.services.adapters.base import MessagePayload, OrderPayload, PlatformAdapter

_CUSTOMERS = [
    {"thread_id": "TT-THREAD-2001", "name": "Dewi Lestari"},
    {"thread_id": "TT-THREAD-2002", "name": "Farhan Maulana"},
    {"thread_id": "TT-THREAD-2003", "name": "Putri Anggraini"},
]

_FIXTURE_MESSAGES = [
    "Kak, status pesanan aku udah sampai mana ya?",
    "Buat acara nikahan bisa pesan dalam jumlah besar nggak kak?",
    "Estimasi sampainya kapan ya kalau order hari ini?",
    "Bunganya kemarin sampai udah agak layu, boleh minta solusinya kak?",
]


class TikTokAdapter(PlatformAdapter):
    """Mock TikTok Shop Partner API adapter — seeded fixture data, same
    payload shape a real adapter would return, no network calls.
    """

    platform = "tiktok"

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

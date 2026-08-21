import random

from app.services.adapters.base import MessagePayload, OrderPayload, PlatformAdapter

_FIXTURE_MESSAGES = [
    "Halo kak, pesanan saya kapan dikirim ya?",
    "Apakah stok warna hitam masih ada?",
    "Barangnya sudah sampai, terima kasih!",
    "Bisa minta tolong resi pengirimannya?",
]


class ShopeeAdapter(PlatformAdapter):
    """Mock Shopee Open Platform adapter — seeded fixture data, same payload
    shape a real adapter would return (order/message fields), no network calls.
    """

    platform = "shopee"

    def fetch_new_orders(self) -> list[OrderPayload]:
        n = random.randint(0, 2)
        return [
            {
                "platform_order_id": f"SHP-{random.randint(100000, 999999)}",
                "status": "pending",
                "customer_ref": f"cust_{random.randint(1000, 9999)}",
                "amount": round(random.uniform(50_000, 500_000), 2),
            }
            for _ in range(n)
        ]

    def fetch_new_messages(self) -> list[MessagePayload]:
        n = random.randint(0, 2)
        return [
            {
                "thread_id": f"SHP-THREAD-{random.randint(1000, 9999)}",
                "sender": "customer",
                "body": random.choice(_FIXTURE_MESSAGES),
            }
            for _ in range(n)
        ]

    def push_inventory_update(self, sku: str, stock_qty: int) -> bool:
        # Real adapter: PUT to Shopee's item stock endpoint. Mock: no-op success.
        return True

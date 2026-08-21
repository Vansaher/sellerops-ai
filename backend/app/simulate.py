"""Simulate a new order/message arriving from a platform, by calling the
running API's /webhooks/simulate/{platform} endpoint. Useful for the demo
video's "new order comes in / chat comes in" beat.

Usage: python -m app.simulate shopee
"""
import sys

import httpx

API_BASE = "http://localhost:8000"


def simulate(platform: str) -> None:
    response = httpx.post(f"{API_BASE}/webhooks/simulate/{platform}")
    response.raise_for_status()
    print(response.json())


if __name__ == "__main__":
    platform = sys.argv[1] if len(sys.argv) > 1 else "shopee"
    simulate(platform)

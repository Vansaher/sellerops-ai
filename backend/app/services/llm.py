import base64
import json
import os

from groq import Groq
from sqlalchemy.orm import Session

from app import models

DEFAULT_MODEL = "openai/gpt-oss-120b"
DEFAULT_VISION_MODEL = "qwen/qwen3.6-27b"


class LLMClient:
    """Thin wrapper around the Groq chat completions call."""

    def __init__(self) -> None:
        self.model = os.getenv("LLM_MODEL", DEFAULT_MODEL)
        self.vision_model = os.getenv("LLM_VISION_MODEL", DEFAULT_VISION_MODEL)
        api_key = os.getenv("LLM_API_KEY")
        self._client = Groq(api_key=api_key) if api_key else None

    def complete_json(self, system: str, prompt: str) -> dict:
        if self._client is None:
            raise RuntimeError("LLM_API_KEY not configured — set it in .env")

        response = self._client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": prompt},
            ],
            response_format={"type": "json_object"},
        )
        return json.loads(response.choices[0].message.content)

    def complete_json_with_image(self, system: str, prompt: str, image_data_url: str) -> dict:
        if self._client is None:
            raise RuntimeError("LLM_API_KEY not configured — set it in .env")

        response = self._client.chat.completions.create(
            model=self.vision_model,
            messages=[
                {"role": "system", "content": system},
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": image_data_url}},
                    ],
                },
            ],
            response_format={"type": "json_object"},
        )
        return json.loads(response.choices[0].message.content)


def build_reply_context(db: Session, seller_id: int) -> str:
    """RAG context for drafting a reply: seller's product catalog + order
    history. Direct query is enough context at this seller's data scale.
    """
    products = db.query(models.Product).filter(models.Product.seller_id == seller_id).all()
    orders = db.query(models.Order).filter(models.Order.seller_id == seller_id).all()

    catalog = "\n".join(f"- {p.name} (SKU {p.sku}, Rp{p.price}): {p.description}" for p in products)
    order_history = "\n".join(
        f"- Order {o.platform_order_id} ({o.platform}): {o.status}" for o in orders
    )
    return f"Product catalog:\n{catalog}\n\nOrder history:\n{order_history}"


REPLY_SYSTEM_PROMPT = (
    "You are a seller assistant drafting a reply to a customer message for an "
    "Indonesian online seller. Ground your answer in the provided catalog and "
    "order history. Reply in the same language as the customer message. "
    'Respond only with JSON: {"reply": "<drafted reply>", "risk": "auto_safe" | "needs_review"}. '
    "Tag auto_safe only if the reply is a deterministic lookup with no judgment "
    "call (e.g. confirming an order status found in the order history verbatim). "
    "Tag needs_review for anything involving refunds, complaints, promises, or "
    "information not present in the catalog/order history."
)


def draft_reply(db: Session, seller_id: int, customer_message: str) -> tuple[str, str]:
    """Returns (draft_body, risk_tag). risk_tag is 'auto_safe' or 'needs_review'."""
    context = build_reply_context(db, seller_id)
    prompt = f"{context}\n\nCustomer message:\n{customer_message}"

    client = LLMClient()
    try:
        result = client.complete_json(REPLY_SYSTEM_PROMPT, prompt)
        reply = str(result.get("reply", "")).strip()
        risk = result.get("risk") if result.get("risk") in ("auto_safe", "needs_review") else "needs_review"
        if not reply:
            raise ValueError("empty reply from model")
        return reply, risk
    except Exception as exc:  # noqa: BLE001 — surface as a needs_review draft, don't crash the request
        return f"[AI draft failed: {exc}]", "needs_review"


CONTENT_SYSTEM_PROMPTS = {
    "shopee": (
        "Write a Shopee product description in Indonesian, SEO-friendly with "
        "relevant keywords, 3-5 short paragraphs or bullet points."
    ),
    "tiktok": (
        "Write a short, punchy TikTok Shop caption in Indonesian (1-2 sentences) "
        "plus a list of 5-8 relevant hashtags."
    ),
    "instagram": (
        "Write an engaging Instagram caption in Indonesian with emojis and a "
        "list of 8-12 relevant hashtags."
    ),
}

CONTENT_JSON_INSTRUCTION = (
    'Respond only with JSON: {"body": "<the generated copy>"}.'
)


RESOLUTION_SYSTEM_PROMPT = (
    "You are a seller operations assistant for an Indonesian online seller. An order "
    "has been flagged as delayed. Produce two distinct pieces of text:\n"
    "1. internal_note — a short internal note (under 3 sentences, in Indonesian) for "
    "the seller's own eyes only, describing the likely cause and the recommended next "
    "action (e.g. contact the courier, check stock). This is NEVER sent to the customer.\n"
    "2. customer_message — a short, apologetic message (1-2 sentences, in Indonesian, "
    "written in the first person as the seller speaking directly to the customer) "
    "about the delay — e.g. apologizing for the wait and explaining that shipment "
    "confirmation hasn't come through yet. Do not include any internal reasoning, "
    "next-step instructions, or seller-facing language in this message — it is sent "
    "verbatim to the customer.\n"
    'Respond only with JSON: {"internal_note": "<...>", "customer_message": "<...>"}.'
)


def draft_order_resolution(order: models.Order) -> tuple[str, str]:
    """Returns (internal_note, customer_message). internal_note is seller-facing
    only and should never be sent to a customer; customer_message is the text
    meant to actually be sent.
    """
    prompt = (
        f"Order {order.platform_order_id} on {order.platform}\n"
        f"Status: {order.status}\n"
        f"Created: {order.created_at.isoformat()}\n"
        f"Amount: Rp{order.amount}\n"
        f"Flag reason: {order.flag_reason}\n"
    )
    client = LLMClient()
    try:
        result = client.complete_json(RESOLUTION_SYSTEM_PROMPT, prompt)
        internal_note = str(result.get("internal_note", "")).strip()
        customer_message = str(result.get("customer_message", "")).strip()
        if not customer_message:
            raise ValueError("empty customer_message from model")
        return internal_note, customer_message
    except Exception as exc:  # noqa: BLE001 — surface as a stored failure string, don't crash the request
        failure = f"[AI draft failed: {exc}]"
        return failure, failure


BROADCAST_SYSTEM_PROMPTS = {
    "shopee": (
        "Write a short Shopee broadcast/announcement message in Indonesian to notify "
        "followers about this product. 1-3 sentences, friendly and direct."
    ),
    "tiktok": (
        "Write a short, punchy TikTok Shop broadcast message in Indonesian to notify "
        "followers about this product. 1-2 sentences, energetic tone."
    ),
    "instagram": (
        "Write an Instagram broadcast-channel message in Indonesian to notify "
        "followers about this product, with emojis. 1-3 sentences."
    ),
}

OUT_OF_STOCK_BROADCAST_SYSTEM_PROMPTS = {
    "shopee": (
        "Write a short Shopee broadcast message in Indonesian telling followers this "
        "product is currently out of stock. Apologetic but positive tone, invite them "
        "to check back soon for restock. 1-2 sentences. Do not invite them to buy now."
    ),
    "tiktok": (
        "Write a short TikTok Shop broadcast message in Indonesian telling followers "
        "this product is currently out of stock. Apologetic but positive tone, invite "
        "them to check back soon for restock. 1-2 sentences. Do not invite them to buy now."
    ),
    "instagram": (
        "Write an Instagram broadcast-channel message in Indonesian, with emojis, "
        "telling followers this product is currently out of stock. Apologetic but "
        "positive tone, invite them to check back soon for restock. 1-2 sentences. "
        "Do not invite them to buy now."
    ),
}


def draft_broadcast_message(product: models.Product, platform: str, context: str | None = None) -> str:
    prompts = OUT_OF_STOCK_BROADCAST_SYSTEM_PROMPTS if product.stock_qty <= 0 else BROADCAST_SYSTEM_PROMPTS
    system = prompts.get(platform, prompts["shopee"])
    context_line = f"\nContext: {context}" if context else ""
    prompt = (
        f"Product: {product.name}\n"
        f"Price: Rp{product.price}\n"
        f"Stock: {product.stock_qty}{context_line}\n\n"
        'Respond only with JSON: {"body": "<the broadcast message>"}.'
    )
    client = LLMClient()
    try:
        result = client.complete_json(system, prompt)
        body = str(result.get("body", "")).strip()
        if not body:
            raise ValueError("empty broadcast from model")
        return body
    except Exception as exc:  # noqa: BLE001 — surface as a stored failure string, don't crash the request
        return f"[AI draft failed: {exc}]"


REPURPOSE_SYSTEM_PROMPTS = {
    "shopee": (
        "You are looking at a product photo for an Indonesian online seller. Write a short "
        "Shopee listing caption in Indonesian (1-3 sentences) that references what's actually "
        "visible in the photo — color, style, setting. Do not invent details not visible."
    ),
    "tiktok": (
        "You are looking at a product photo for an Indonesian online seller. Write a short, "
        "punchy TikTok Shop caption in Indonesian (1-2 sentences) that references what's "
        "actually visible in the photo — color, style, setting. Do not invent details not visible."
    ),
    "instagram": (
        "You are looking at a product photo for an Indonesian online seller. Write an engaging "
        "Instagram caption in Indonesian with emojis (1-3 sentences) that references what's "
        "actually visible in the photo — color, style, setting. Do not invent details not visible."
    ),
}


def draft_repurposed_caption(product: models.Product, platform: str, image_path: str) -> str:
    system = REPURPOSE_SYSTEM_PROMPTS.get(platform, REPURPOSE_SYSTEM_PROMPTS["shopee"])
    prompt = (
        f"Product: {product.name}\nPrice: Rp{product.price}\n\n"
        'Respond only with JSON: {"body": "<the caption>"}.'
    )
    client = LLMClient()
    try:
        with open(image_path, "rb") as f:
            b64 = base64.b64encode(f.read()).decode()
        result = client.complete_json_with_image(system, prompt, f"data:image/jpeg;base64,{b64}")
        body = str(result.get("body", "")).strip()
        if not body:
            raise ValueError("empty caption from model")
        return body
    except Exception as exc:  # noqa: BLE001 — surface as a stored failure string, don't crash the request
        return f"[AI draft failed: {exc}]"


DIGEST_SYSTEM_PROMPT = (
    "You are a seller operations assistant for an Indonesian online seller. You are given "
    "three lists of already-flagged signals: delayed orders, low-stock products, and customer "
    "messages awaiting human review. Write a short digest in Indonesian (3-5 short bullet "
    "points, no preamble) summarizing what needs attention today. Do not invent anything not "
    "in the provided lists. If a list is empty, don't mention it.\n"
    'Respond only with JSON: {"digest": "<the digest text, bullets separated by newlines>"}.'
)


def draft_dashboard_digest(
    flagged_orders: list[models.Order],
    low_stock_products: list[models.Product],
    needs_review_messages: list[models.Message],
    product_names: dict[int, str] | None = None,
) -> str:
    if not flagged_orders and not low_stock_products and not needs_review_messages:
        return "Semua lancar — tidak ada yang perlu perhatian khusus saat ini."

    product_names = product_names or {}
    lines = []
    for o in flagged_orders:
        product = product_names.get(o.product_id, "produk tidak diketahui") if o.product_id else "produk tidak diketahui"
        lines.append(f"- Order {o.platform_order_id} ({o.platform}, {product}): {o.flag_reason}")
    for p in low_stock_products:
        lines.append(f"- Product {p.name} (SKU {p.sku}): {p.low_stock_reason}")
    for m in needs_review_messages:
        lines.append(f'- Message from {m.customer_name or "customer"} on {m.platform}: "{m.body}"')
    prompt = "\n".join(lines)

    client = LLMClient()
    try:
        result = client.complete_json(DIGEST_SYSTEM_PROMPT, prompt)
        digest = str(result.get("digest", "")).strip()
        if not digest:
            raise ValueError("empty digest from model")
        return digest
    except Exception as exc:  # noqa: BLE001 — surface as a stored failure string, don't crash the request
        return f"[AI digest failed: {exc}]"


def generate_content(product: models.Product, platform: str) -> str:
    system = CONTENT_SYSTEM_PROMPTS.get(platform, CONTENT_SYSTEM_PROMPTS["shopee"])
    prompt = (
        f"Product: {product.name}\n"
        f"Price: Rp{product.price}\n"
        f"Existing description: {product.description}\n\n"
        f"{CONTENT_JSON_INSTRUCTION}"
    )

    client = LLMClient()
    result = client.complete_json(system, prompt)
    return str(result.get("body", "")).strip()

# Platform API capabilities (Shopee / TikTok Shop / Instagram)

This is a reference for what the real platform APIs can and can't do, mapped against SellerOps AI's four modules. This project only implements **mock adapters** (`backend/app/services/adapters/`) against these shapes — no real platform integration is built or planned for this prototype/MVP. This doc exists so the mock adapters and product scope stay honest about what a real integration would actually require later.

## Summary

| Module | Shopee | TikTok Shop | Instagram |
|---|---|---|---|
| Inbox (chats) | ✅ Chat API | ⚠️ Customer Service API — high approval bar | ⚠️ DMs via Graph API — restricted messaging window |
| Orders | ✅ Order module | ✅ Order/Fulfillment API | ❌ No commerce object — not a marketplace |
| Inventory | ✅ Product/Stock module | ✅ Inventory sync API | ❌ Same as Orders |
| Content Studio | ✅ Product module | ✅ Product listing API | ✅ Content Publishing API |

## Inbox (chats)

**Shopee — supported.** The Chat API lets you list conversations, read message history, and send replies. Messaging is a *separate OAuth scope* from the base Order/Product APIs — not every approved partner gets it automatically, and Shopee's partner team can restrict access further if automated/bulk messaging is suspected.

**TikTok Shop — supported, but gated.** A dedicated Customer Service API (`GET /customer_service/202309/conversations/{id}/messages`) exists for buyer↔seller chat. To get approved you must already have a working in-app chat UI plus Order/Fulfillment/After-Sales integrations built, *and* show either 1,000 authorized sellers or 1M API calls/day. That's an enterprise-scale bar — out of reach for a prototype or small integration.

**Instagram — supported, conditionally.** DMs go through the Graph API (built on Messenger Platform). You can only message a user *after they've messaged you first* — no cold outreach. You get a 24-hour free-form reply window, then only "human agent" support messages for up to 7 more days. Requires the `instagram_business_manage_messages` permission via Meta App Review (typically weeks to months).

## Orders

**Shopee — supported.** Full Order module: list, detail, status, shipping sync. Standard partner approval, no unusual gating.

**TikTok Shop — supported.** Order retrieval, fulfillment, shipping labels, tracking, returns/refunds, order webhooks. Same partner + per-shop authorization gate as chat, but this tier is the *baseline* — much easier to get approved for than the Customer Service (chat) API.

**Instagram — not applicable.** Instagram has no native commerce/order object; it's not a marketplace. There's nothing to fetch here — confirmed by the empty `InstagramAdapter.fetch_new_orders()` stub in this codebase.

## Inventory

**Shopee — supported.** Real-time stock sync per SKU via the Product/Stock module.

**TikTok Shop — supported.** Inventory sync endpoints, same access tier as orders.

**Instagram — not applicable.** Same reasoning as Orders — no inventory concept.

## Content Studio

**Shopee — supported.** Product module supports create/update/delete listings (name, description, price, images).

**TikTok Shop — supported.** Product listing management is part of the standard product API tier.

**Instagram — supported.** Content Publishing API (part of the Graph API) supports scheduling/publishing feed posts, carousels, Reels, and Stories. Requires a Business or Creator account (personal accounts have no API access), usually linked to a Facebook Page.

## Takeaway for scoping

TikTok Shop's chat API is the real outlier — not just "needs approval" like the others, but gated behind a scale requirement (1,000 sellers or 1M calls/day) that's structurally unreachable at prototype stage. Orders/inventory/product APIs on Shopee and TikTok Shop are comparatively easy (standard partner approval, days not months). Instagram has no orders/inventory at all by design — Unified Inbox and Content Studio are its only real integration surfaces.

This is why the mock adapter layer (`backend/app/services/adapters/`) exists: it lets the prototype demonstrate the full product flow across all three platforms without needing to clear any of the above approval gates.

## Sources

- [Shopee API Guide (2026): Open Platform, Seller API & Integration](https://api2cart.com/api-technology/shopee-api/)
- [TikTok Shop Customer Service API Approval: Eligibility Checklist for 2026](https://www.unifyport.ai/blog/tiktok-shop-customer-service-api-approval-checklist/)
- [TikTok Shop Partner Center — Create Conversation](https://partner.tiktokshop.com/docv2/page/create-conversation-202309)
- [Available TikTok Shop APIs – Celigo Help Center](https://docs.celigo.com/hc/en-us/articles/18704697472667-Available-TikTok-Shop-APIs)
- [Instagram APIs | Facebook for Developers](https://developers.facebook.com/products/instagram/apis/)
- [The Ultimate Guide to the Instagram Graph API (2025)](https://instantdm.com/post/technical-integration-api-mastery/the-ultimate-guide-to-the-instagram-graph-api-2025/)
- [Shopee API Essential Guide - Rollout](https://rollout.com/integration-guides/shopee/api-essentials)

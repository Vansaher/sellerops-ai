import { useEffect, useState } from "react";
import { api, type ContentAsset, type Message, type Order, type Product } from "../lib/api";

export default function Dashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [contentAssets, setContentAssets] = useState<ContentAsset[]>([]);
  const [digest, setDigest] = useState<string | null>(null);
  const [digestGeneratedAt, setDigestGeneratedAt] = useState<string | null>(null);
  const [generatingDigest, setGeneratingDigest] = useState(false);

  useEffect(() => {
    api.listOrders().then(setOrders).catch(console.error);
    api.listProducts().then(setProducts).catch(console.error);
    api.listMessages().then(setMessages).catch(console.error);
    api.listContentAssets().then(setContentAssets).catch(console.error);
  }, []);

  const handleGenerateDigest = async () => {
    setGeneratingDigest(true);
    try {
      const result = await api.getDashboardDigest();
      setDigest(result.digest);
      setDigestGeneratedAt(result.generated_at);
    } finally {
      setGeneratingDigest(false);
    }
  };

  const pendingOrders = orders.filter((o) => o.status === "pending").length;
  const lowStock = products.filter((p) => p.low_stock_reason).length;
  const draftsAwaitingReview = messages.filter((m) => m.sender === "ai_draft" && m.status === "draft").length;
  const contentAwaitingApproval = contentAssets.filter((c) => c.status === "draft").length;

  const productName = (productId: number | null) =>
    productId === null ? "—" : products.find((p) => p.id === productId)?.name ?? "—";

  const recentOrders = [...orders].sort((a, b) => b.id - a.id).slice(0, 3);
  const recentMessages = [...messages].sort((a, b) => b.id - a.id).slice(0, 3);

  return (
    <section>
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Here's what's happening across your Shopee, TikTok Shop, and Instagram storefronts.</p>
      </div>

      <div className="row-item" style={{ marginBottom: 24 }}>
        <div className="row-meta">AI digest</div>
        {digest ? (
          <div>
            {digest.split("\n").filter(Boolean).map((line, i) => (
              <p key={i} style={{ margin: "4px 0" }}>
                {line}
              </p>
            ))}
            {digestGeneratedAt && (
              <div className="row-meta">Generated {new Date(digestGeneratedAt).toLocaleTimeString()}</div>
            )}
          </div>
        ) : (
          <p>Click below to generate a summary of what needs attention across orders, inventory, and inbox.</p>
        )}
        <div className="btn-row">
          <button type="button" className="btn btn-primary" disabled={generatingDigest} onClick={handleGenerateDigest}>
            {generatingDigest ? "Generating…" : digest ? "Refresh digest" : "Generate digest"}
          </button>
        </div>
      </div>

      <div className="stat-row">
        <div className="stat">
          <div className="stat-value">{pendingOrders}</div>
          <div className="stat-label">Pending orders</div>
        </div>
        <div className="stat">
          <div className="stat-value">{lowStock}</div>
          <div className="stat-label">Low-stock items</div>
        </div>
        <div className="stat">
          <div className="stat-value">{draftsAwaitingReview}</div>
          <div className="stat-label">Drafts awaiting review</div>
        </div>
        <div className="stat">
          <div className="stat-value">{contentAwaitingApproval}</div>
          <div className="stat-label">Content awaiting approval</div>
        </div>
      </div>

      <h2>Recent orders</h2>
      <div className="row-list" style={{ marginBottom: 32 }}>
        {recentOrders.length === 0 && <p>No orders yet.</p>}
        {recentOrders.map((order) => (
          <div key={order.id} className="row-item">
            {order.platform} · {order.platform_order_id} · {productName(order.product_id)}
            <span className="pill">{order.status}</span>
          </div>
        ))}
      </div>

      <h2>Recent messages</h2>
      <div className="row-list">
        {recentMessages.length === 0 && <p>No messages yet.</p>}
        {recentMessages.map((message) => (
          <div key={message.id} className="row-item">
            {message.platform} · {message.sender}: {message.body}
            <span className="pill">{message.status}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

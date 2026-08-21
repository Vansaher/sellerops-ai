import { useEffect, useState } from "react";
import { api, type ContentAsset, type InventoryItem, type Message, type Order } from "../lib/api";

const LOW_STOCK_THRESHOLD = 5;

export default function Dashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [contentAssets, setContentAssets] = useState<ContentAsset[]>([]);

  useEffect(() => {
    api.listOrders().then(setOrders).catch(console.error);
    api.listInventory().then(setInventory).catch(console.error);
    api.listMessages().then(setMessages).catch(console.error);
    api.listContentAssets().then(setContentAssets).catch(console.error);
  }, []);

  const pendingOrders = orders.filter((o) => o.status === "pending").length;
  const lowStock = inventory.filter((i) => i.stock_qty <= LOW_STOCK_THRESHOLD).length;
  const draftsAwaitingReview = messages.filter((m) => m.sender === "ai_draft" && m.status === "draft").length;
  const contentAwaitingApproval = contentAssets.filter((c) => c.status === "draft").length;

  const recentOrders = [...orders].sort((a, b) => b.id - a.id).slice(0, 3);
  const recentMessages = [...messages].sort((a, b) => b.id - a.id).slice(0, 3);

  return (
    <section>
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Here's what's happening across your Shopee, TikTok Shop, and Instagram storefronts.</p>
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
            {order.platform} · {order.platform_order_id}
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

import { useEffect, useMemo, useState } from "react";
import { api, type Order, type Product } from "../lib/api";
import { PLATFORM_META, type Platform } from "../lib/platforms";

type SortOption = "date_desc" | "date_asc" | "amount_desc" | "amount_asc";

interface OrdersProps {
  onNavigateToInbox: (platform: string) => void;
}

export default function Orders({ onNavigateToInbox }: OrdersProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [internalNotes, setInternalNotes] = useState<Record<number, string | null>>({});
  const [busy, setBusy] = useState<number | null>(null);
  const [platformFilter, setPlatformFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState<SortOption>("date_desc");

  const load = () => api.listOrders().then(setOrders).catch(console.error);

  useEffect(() => {
    load();
    api.listProducts().then(setProducts).catch(console.error);
  }, []);

  const productName = (productId: number | null) =>
    productId === null ? "—" : products.find((p) => p.id === productId)?.name ?? "—";

  const visibleOrders = useMemo(() => {
    let result = orders;
    if (platformFilter !== "all") result = result.filter((o) => o.platform === platformFilter);
    if (statusFilter !== "all") result = result.filter((o) => o.status === statusFilter);

    result = [...result];
    switch (sortBy) {
      case "date_desc":
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case "date_asc":
        result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case "amount_desc":
        result.sort((a, b) => b.amount - a.amount);
        break;
      case "amount_asc":
        result.sort((a, b) => a.amount - b.amount);
        break;
    }
    return result;
  }, [orders, platformFilter, statusFilter, sortBy]);

  const handleDraftResolution = async (orderId: number) => {
    setBusy(orderId);
    try {
      const result = await api.draftResolution(orderId);
      setInternalNotes((n) => ({ ...n, [orderId]: result.internal_note }));
      await load();
    } finally {
      setBusy(null);
    }
  };

  const dismissNote = (orderId: number) => {
    setInternalNotes((n) => ({ ...n, [orderId]: null }));
  };

  const handleSend = async (order: Order) => {
    const body = drafts[order.id] ?? order.resolution_draft ?? "";
    if (!body.trim()) return;
    setBusy(order.id);
    try {
      await api.sendOrderMessage(order.id, body);
      await load();
    } finally {
      setBusy(null);
    }
  };

  const handleDismiss = async (orderId: number) => {
    setBusy(orderId);
    try {
      await api.updateOrderResolution(orderId, "dismissed");
      await load();
    } finally {
      setBusy(null);
    }
  };

  return (
    <section>
      <div className="page-header">
        <h1>Order Management</h1>
        <p>Order status across platforms in one table.</p>
      </div>
      <div className="card" style={{ marginBottom: 27 }}>
        <div className="simulate-row">
          <select className="select" value={platformFilter} onChange={(e) => setPlatformFilter(e.target.value)}>
            <option value="all">All platforms</option>
            <option value="shopee">Shopee</option>
            <option value="tiktok">TikTok Shop</option>
          </select>
          <select className="select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
          <select className="select" value={sortBy} onChange={(e) => setSortBy(e.target.value as SortOption)}>
            <option value="date_desc">Newest first</option>
            <option value="date_asc">Oldest first</option>
            <option value="amount_desc">Amount: high to low</option>
            <option value="amount_asc">Amount: low to high</option>
          </select>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Platform</th>
              <th>Order ID</th>
              <th>Product</th>
              <th>Status</th>
              <th>Amount</th>
              <th>Flag</th>
            </tr>
          </thead>
          <tbody>
            {visibleOrders.length === 0 && (
              <tr>
                <td colSpan={6}>No orders match these filters.</td>
              </tr>
            )}
            {visibleOrders.map((o) => (
              <tr key={o.id} style={{ background: PLATFORM_META[o.platform as Platform]?.tintBg }}>
                <td>{o.platform}</td>
                <td>{o.platform_order_id}</td>
                <td>{productName(o.product_id)}</td>
                <td>
                  <span className="pill">{o.status}</span>
                </td>
                <td>{o.amount}</td>
                <td>
                  {o.resolution_status === "sent" ? (
                    <div>
                      <span className="pill">sent to customer</span>
                      <div className="btn-row">
                        <button type="button" className="btn" onClick={() => onNavigateToInbox(o.platform)}>
                          View in Chat
                        </button>
                      </div>
                    </div>
                  ) : o.resolution_status === "dismissed" ? (
                    <span className="pill">dismissed</span>
                  ) : o.flag_reason ? (
                    <div>
                      <span className="pill pill-warning">{o.flag_reason}</span>
                      {internalNotes[o.id] && (
                        <div className="note-popup">
                          <p>{internalNotes[o.id]}</p>
                          <button type="button" className="note-popup-close" onClick={() => dismissNote(o.id)} aria-label="Dismiss">
                            ×
                          </button>
                        </div>
                      )}
                      <textarea
                        className="field"
                        placeholder="Write a message to the customer, or draft one with AI…"
                        value={drafts[o.id] ?? o.resolution_draft ?? ""}
                        onChange={(e) => setDrafts((d) => ({ ...d, [o.id]: e.target.value }))}
                      />
                      <div className="btn-row">
                        <button type="button" className="btn" disabled={busy === o.id} onClick={() => handleDraftResolution(o.id)}>
                          {busy === o.id ? "Drafting…" : "Draft with AI"}
                        </button>
                        <button
                          type="button"
                          className="btn btn-primary"
                          disabled={busy === o.id || !(drafts[o.id] ?? o.resolution_draft ?? "").trim()}
                          onClick={() => handleSend(o)}
                        >
                          Send to customer
                        </button>
                        <button type="button" className="btn" disabled={busy === o.id} onClick={() => handleDismiss(o.id)}>
                          Dismiss
                        </button>
                      </div>
                    </div>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

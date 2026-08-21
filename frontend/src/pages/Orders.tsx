import { useEffect, useState } from "react";
import { api, type Order, type Product } from "../lib/api";

interface OrdersProps {
  onNavigateToInbox: (platform: string) => void;
}

export default function Orders({ onNavigateToInbox }: OrdersProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [internalNotes, setInternalNotes] = useState<Record<number, string | null>>({});
  const [busy, setBusy] = useState<number | null>(null);

  const load = () => api.listOrders().then(setOrders).catch(console.error);

  useEffect(() => {
    load();
    api.listProducts().then(setProducts).catch(console.error);
  }, []);

  const productName = (productId: number | null) =>
    productId === null ? "—" : products.find((p) => p.id === productId)?.name ?? "—";

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
          {orders.map((o) => (
            <tr key={o.id}>
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
    </section>
  );
}

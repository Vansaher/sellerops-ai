import { useEffect, useState } from "react";
import { api, type InventoryItem, type Product } from "../lib/api";

const emptyForm = { name: "", description: "", price: "", sku: "", stockQty: "" };

export default function Inventory() {
  const [products, setProducts] = useState<Product[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [view, setView] = useState<"list" | "add">("list");
  const [restockingId, setRestockingId] = useState<number | null>(null);
  const [restockAmount, setRestockAmount] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const loadAll = () =>
    Promise.all([api.listProducts(), api.listInventory()]).then(([p, i]) => {
      setProducts(p);
      setInventory(i);
    });

  useEffect(() => {
    loadAll().catch(console.error);
  }, []);

  const handleRestock = async (productId: number) => {
    const amount = Number(restockAmount);
    if (!Number.isFinite(amount) || amount <= 0) return;
    setSaving(true);
    try {
      await api.restockProduct(productId, amount);
      await loadAll();
      setRestockingId(null);
      setRestockAmount("");
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!form.name || !form.sku || !form.price) return;
    setSaving(true);
    try {
      await api.createProduct({
        name: form.name,
        description: form.description,
        price: Number(form.price),
        sku: form.sku,
        stock_qty: Number(form.stockQty) || 0,
      });
      await loadAll();
      setForm(emptyForm);
      setView("list");
    } finally {
      setSaving(false);
    }
  };

  if (view === "add") {
    return (
      <section>
        <div className="page-header">
          <h1>Add product</h1>
          <p>New products are automatically listed on Shopee and TikTok Shop. Instagram stock isn't tracked.</p>
        </div>
        <div className="product-form">
          <input
            className="field"
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <textarea
            className="field"
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
          <input
            className="field"
            type="number"
            step="0.01"
            placeholder="Price"
            value={form.price}
            onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
          />
          <input
            className="field"
            placeholder="SKU"
            value={form.sku}
            onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
          />
          <input
            className="field"
            type="number"
            min={0}
            placeholder="Initial stock"
            value={form.stockQty}
            onChange={(e) => setForm((f) => ({ ...f, stockQty: e.target.value }))}
          />
          <div className="btn-row">
            <button type="button" className="btn btn-primary" disabled={saving} onClick={handleSave}>
              Save
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => {
                setForm(emptyForm);
                setView("list");
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="page-header">
        <h1>Inventory Sync</h1>
        <p>Single source of truth for stock, synced across all connected platform listings.</p>
      </div>

      <div className="btn-row" style={{ marginBottom: 16 }}>
        <button type="button" className="btn btn-primary" onClick={() => setView("add")}>
          + Add product
        </button>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>Stock</th>
            <th>Shopee</th>
            <th>TikTok Shop</th>
            <th>Instagram</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => {
            const productInventory = inventory.filter((i) => i.product_id === product.id);
            const shopeeInv = productInventory.find((i) => i.platform === "shopee");
            const tiktokInv = productInventory.find((i) => i.platform === "tiktok");

            return (
              <tr key={product.id}>
                <td>
                  {product.name}
                  <div className="row-meta">{product.sku}</div>
                </td>
                <td>
                  <strong>{product.stock_qty}</strong>
                </td>
                <td>
                  {shopeeInv ? (
                    <span className="pill pill-accent">
                      {shopeeInv.stock_qty} · {new Date(shopeeInv.last_synced_at).toLocaleString()}
                    </span>
                  ) : (
                    <span className="pill">not synced</span>
                  )}
                </td>
                <td>
                  {tiktokInv ? (
                    <span className="pill pill-accent">
                      {tiktokInv.stock_qty} · {new Date(tiktokInv.last_synced_at).toLocaleString()}
                    </span>
                  ) : (
                    <span className="pill">not synced</span>
                  )}
                </td>
                <td>
                  <span className="inventory-ig-note">Not tracked — manage stock directly in Instagram.</span>
                </td>
                <td>
                  {restockingId === product.id ? (
                    <div className="confirm-row">
                      <input
                        type="number"
                        min={1}
                        className="field"
                        style={{ width: 80, minHeight: "unset" }}
                        value={restockAmount}
                        onChange={(e) => setRestockAmount(e.target.value)}
                        autoFocus
                      />
                      <button
                        type="button"
                        className="btn btn-primary"
                        disabled={saving}
                        onClick={() => handleRestock(product.id)}
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        className="btn"
                        onClick={() => {
                          setRestockingId(null);
                          setRestockAmount("");
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="btn"
                      onClick={() => {
                        setRestockingId(product.id);
                        setRestockAmount("");
                      }}
                    >
                      Restock
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

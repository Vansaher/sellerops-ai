import { useEffect, useState } from "react";
import { api, type InventoryItem } from "../lib/api";

export default function Inventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);

  useEffect(() => {
    api.listInventory().then(setItems).catch(console.error);
  }, []);

  return (
    <section>
      <div className="page-header">
        <h1>Inventory Sync</h1>
        <p>Single source of truth for stock, synced across all connected platform listings.</p>
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>Product ID</th>
            <th>Platform</th>
            <th>Stock</th>
            <th>Last Synced</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.id}>
              <td>{i.product_id}</td>
              <td>{i.platform}</td>
              <td>{i.stock_qty}</td>
              <td>{new Date(i.last_synced_at).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

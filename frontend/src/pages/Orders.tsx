import { useEffect, useState } from "react";
import { api, type Order } from "../lib/api";

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    api.listOrders().then(setOrders).catch(console.error);
  }, []);

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
            <th>Status</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id}>
              <td>{o.platform}</td>
              <td>{o.platform_order_id}</td>
              <td>
                <span className="pill">{o.status}</span>
              </td>
              <td>{o.amount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

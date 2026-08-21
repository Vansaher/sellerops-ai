import { useEffect, useState } from "react";
import { api, type ContentAsset, type Message, type Order, type Product } from "../lib/api";
import DashboardCard from "../components/DashboardCard";
import KpiGrid from "../components/KpiGrid";
import OrderSuccessDonut from "../components/OrderSuccessDonut";
import OrdersTrendChart, { type OrdersTrendPoint } from "../components/OrdersTrendChart";
import PlatformFilter from "../components/PlatformFilter";
import SalesChart, { type SalesDataPoint } from "../components/SalesChart";
import SummaryRail, { type ActivityItem, type TopProduct } from "../components/SummaryRail";
import type { Platform } from "../lib/platforms";

const formatPrice = (n: number) => `Rp${n.toLocaleString("id-ID")}`;

export default function Dashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [contentAssets, setContentAssets] = useState<ContentAsset[]>([]);
  const [digest, setDigest] = useState<string | null>(null);
  const [digestGeneratedAt, setDigestGeneratedAt] = useState<string | null>(null);
  const [generatingDigest, setGeneratingDigest] = useState(false);
  const [platformFilter, setPlatformFilter] = useState<"all" | Platform>("all");

  useEffect(() => {
    api.listOrders().then(setOrders).catch(console.error);
    api.listProducts().then(setProducts).catch(console.error);
    api.listMessages().then(setMessages).catch(console.error);
    api.listContentAssets().then(setContentAssets).catch(console.error);
  }, []);

  const activePlatform = platformFilter === "all" ? undefined : platformFilter;

  const filteredOrders = platformFilter === "all" ? orders : orders.filter((o) => o.platform === platformFilter);
  const filteredMessages = platformFilter === "all" ? messages : messages.filter((m) => m.platform === platformFilter);
  const filteredContentAssets =
    platformFilter === "all" ? contentAssets : contentAssets.filter((c) => c.platform === platformFilter);

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

  const productName = (productId: number | null) =>
    productId === null ? "—" : products.find((p) => p.id === productId)?.name ?? "—";

  const pendingOrders = filteredOrders.filter((o) => o.status === "pending").length;
  const lowStock = products.filter((p) => p.low_stock_reason).length;
  const draftsAwaitingReview = filteredMessages.filter((m) => m.sender === "ai_draft" && m.status === "draft").length;
  const contentAwaitingApproval = filteredContentAssets.filter((c) => c.status === "draft").length;
  const ordersNeedingAttention = filteredOrders.filter((o) => o.flag_reason && !o.resolution_status).length;

  const completedOrders = filteredOrders.filter((o) => o.status === "completed");
  const pendingOrdersList = filteredOrders.filter((o) => o.status === "pending");
  const failedOrdersList = filteredOrders.filter((o) => o.status === "failed");
  const completedRevenue = completedOrders.reduce((sum, o) => sum + o.amount, 0);
  const pendingRevenue = pendingOrdersList.reduce((sum, o) => sum + o.amount, 0);

  const salesByDay = new Map<string, SalesDataPoint>();
  for (const order of completedOrders) {
    const date = new Date(order.created_at).toISOString().slice(0, 10);
    const point = salesByDay.get(date) ?? { date, revenueByPlatform: {}, orders: 0 };
    point.revenueByPlatform[order.platform] = (point.revenueByPlatform[order.platform] ?? 0) + order.amount;
    point.orders += 1;
    salesByDay.set(date, point);
  }
  const salesData = [...salesByDay.values()].sort((a, b) => a.date.localeCompare(b.date));

  const ordersByDay = new Map<string, OrdersTrendPoint>();
  for (const order of filteredOrders) {
    const date = new Date(order.created_at).toISOString().slice(0, 10);
    const point = ordersByDay.get(date) ?? { date, totalOrders: 0, successfulOrders: 0 };
    point.totalOrders += 1;
    if (order.status === "completed") point.successfulOrders += 1;
    ordersByDay.set(date, point);
  }
  const ordersTrendData = [...ordersByDay.values()].sort((a, b) => a.date.localeCompare(b.date));

  const productStats = new Map<number, { unitsSold: number; revenue: number }>();
  for (const order of completedOrders) {
    if (order.product_id === null) continue;
    const stats = productStats.get(order.product_id) ?? { unitsSold: 0, revenue: 0 };
    stats.unitsSold += 1;
    stats.revenue += order.amount;
    productStats.set(order.product_id, stats);
  }
  const topProducts: TopProduct[] = [...productStats.entries()]
    .map(([productId, stats]) => ({ id: productId, name: productName(productId), ...stats }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const recentOrders = [...filteredOrders].sort((a, b) => b.id - a.id).slice(0, 3);
  const recentMessages = [...filteredMessages].sort((a, b) => b.id - a.id).slice(0, 3);
  const recentActivity: ActivityItem[] = [
    ...recentOrders.map((order) => ({
      id: `order-${order.id}`,
      label: productName(order.product_id),
      meta: order.status,
      timestamp: order.created_at,
      platform: order.platform as Platform,
    })),
    ...recentMessages.map((message) => ({
      id: `message-${message.id}`,
      label: `${message.sender}: ${message.body}`,
      meta: message.status,
      timestamp: message.created_at,
      platform: message.platform as Platform,
    })),
  ]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 6);

  return (
    <section>
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Here's what's happening across your Shopee, TikTok Shop, and Instagram storefronts.</p>
        <PlatformFilter value={platformFilter} onChange={setPlatformFilter} />
      </div>

      <div className="dashboard-layout">
        <div className="dashboard-main">
          <DashboardCard title="AI digest">
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
          </DashboardCard>

          <KpiGrid
            items={[
              { label: "Pending orders", value: String(pendingOrders) },
              {
                label: "Low-stock items",
                value: String(lowStock),
                tone: lowStock > 0 ? "warning" : "default",
                sublabel: platformFilter !== "all" ? "All platforms" : undefined,
              },
              { label: "Drafts awaiting review", value: String(draftsAwaitingReview) },
              { label: "Content awaiting approval", value: String(contentAwaitingApproval) },
              {
                label: "Orders needing attention",
                value: String(ordersNeedingAttention),
                tone: ordersNeedingAttention > 0 ? "accent" : "default",
              },
            ]}
          />

          <div className="chart-row">
            <DashboardCard title="Order success rate" subtitle="Completed vs pending orders">
              <OrderSuccessDonut
                completed={completedOrders.length}
                pending={pendingOrdersList.length}
                failed={failedOrdersList.length}
                platform={activePlatform}
              />
            </DashboardCard>
            <DashboardCard title="Sales over time" subtitle="Revenue and order count by day">
              <SalesChart data={salesData} formatPrice={formatPrice} />
            </DashboardCard>
          </div>

          <DashboardCard title="Orders" subtitle="Total orders vs successful orders by day">
            <OrdersTrendChart data={ordersTrendData} platform={activePlatform} />
          </DashboardCard>
        </div>

        <SummaryRail
          completedRevenue={completedRevenue}
          pendingRevenue={pendingRevenue}
          recentActivity={recentActivity}
          topProducts={topProducts}
          formatPrice={formatPrice}
          platform={activePlatform}
        />
      </div>
    </section>
  );
}

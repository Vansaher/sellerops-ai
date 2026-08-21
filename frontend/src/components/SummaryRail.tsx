import DashboardCard from "./DashboardCard";
import PlatformBadge from "./PlatformBadge";
import { PLATFORM_META, type Platform } from "../lib/platforms";

export interface ActivityItem {
  id: string;
  label: string;
  meta: string;
  timestamp: string;
  platform?: Platform;
}

export interface TopProduct {
  id: number;
  name: string;
  unitsSold: number;
  revenue: number;
}

interface SummaryRailProps {
  completedRevenue: number;
  pendingRevenue: number;
  recentActivity: ActivityItem[];
  topProducts: TopProduct[];
  formatPrice: (n: number) => string;
  platform?: Platform;
}

export default function SummaryRail({
  completedRevenue,
  pendingRevenue,
  recentActivity,
  topProducts,
  formatPrice,
  platform,
}: SummaryRailProps) {
  const heroStyle = platform ? { background: PLATFORM_META[platform].color } : undefined;
  const heroLabel = platform ? `Revenue from ${PLATFORM_META[platform].label}` : "Revenue from sold products";

  return (
    <aside className="summary-rail">
      <div className="summary-hero" style={heroStyle}>
        <div className="summary-hero-label">{heroLabel}</div>
        <div className="summary-hero-value">{formatPrice(completedRevenue)}</div>
        <div className="summary-delta-row">
          <div className="summary-delta-item">
            <div className="summary-hero-label">Completed</div>
            <div>{formatPrice(completedRevenue)}</div>
          </div>
          <div className="summary-delta-item">
            <div className="summary-hero-label">Pending</div>
            <div>{formatPrice(pendingRevenue)}</div>
          </div>
        </div>
      </div>

      <DashboardCard title="Activity" subtitle="Recent orders and messages">
        <div className="activity-list row-list">
          {recentActivity.length === 0 && <p className="row-meta">No activity yet.</p>}
          {recentActivity.map((item) => (
            <div key={item.id} className="row-item">
              <div className="activity-item-label">
                {item.platform && <PlatformBadge platform={item.platform} />}
                {item.label}
              </div>
              <div className="row-meta">
                {item.meta} · <span className="activity-item-time">{new Date(item.timestamp).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      </DashboardCard>

      <DashboardCard title="Top Products" subtitle="Ranked by revenue">
        <div className="top-products-list">
          {topProducts.length === 0 && <p className="row-meta">No completed orders yet.</p>}
          {topProducts.map((product, i) => (
            <div key={product.id} className="top-product-row">
              <div className="top-product-rank">{i + 1}</div>
              <div className="top-product-name">{product.name}</div>
              <div className="top-product-stat">
                {product.unitsSold} units
                <br />
                {formatPrice(product.revenue)}
              </div>
            </div>
          ))}
        </div>
      </DashboardCard>
    </aside>
  );
}

export interface KpiItem {
  label: string;
  value: string;
  sublabel?: string;
  tone?: "default" | "accent" | "warning";
}

interface KpiGridProps {
  items: KpiItem[];
}

export default function KpiGrid({ items }: KpiGridProps) {
  return (
    <div className="kpi-grid">
      {items.map((item) => (
        <div key={item.label} className={`kpi-tile${item.tone && item.tone !== "default" ? ` kpi-tile--${item.tone}` : ""}`}>
          <div className="stat-value">{item.value}</div>
          <div className="stat-label">{item.label}</div>
          {item.sublabel && <div className="row-meta">{item.sublabel}</div>}
        </div>
      ))}
    </div>
  );
}

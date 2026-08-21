import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PLATFORMS, PLATFORM_META } from "../lib/platforms";

export interface SalesDataPoint {
  date: string;
  orders: number;
  revenueByPlatform: Record<string, number>;
}

interface SalesChartProps {
  data: SalesDataPoint[];
  formatPrice: (n: number) => string;
}

// TikTok's brand black reads too dark against the Orders line in the chart, so soften it to grey here only.
const CHART_BAR_COLOR_OVERRIDES: Partial<Record<(typeof PLATFORMS)[number], string>> = {
  tiktok: "#8a8a8a",
};

export default function SalesChart({ data, formatPrice }: SalesChartProps) {
  if (data.length === 0) {
    return (
      <div className="trend-body" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p className="row-meta">No completed orders yet.</p>
      </div>
    );
  }

  const chartData = data.map((point) => {
    const row: Record<string, number | string> = { date: point.date, orders: point.orders };
    for (const platform of PLATFORMS) {
      row[platform] = point.revenueByPlatform[platform] ?? 0;
    }
    return row;
  });

  return (
    <div className="trend-body">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis
            yAxisId="revenue"
            stroke="var(--text-muted)"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatPrice}
          />
          <YAxis
            yAxisId="orders"
            orientation="right"
            stroke="var(--text-muted)"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
            formatter={(value, name) => (name === "orders" ? value : formatPrice(Number(value)))}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: "var(--text-muted)" }} />
          {PLATFORMS.map((platform) => {
            const meta = PLATFORM_META[platform];
            return (
              <Bar
                key={platform}
                yAxisId="revenue"
                dataKey={platform}
                name={meta.label}
                stackId="revenue"
                fill={CHART_BAR_COLOR_OVERRIDES[platform] ?? meta.solidColor}
                radius={platform === PLATFORMS[PLATFORMS.length - 1] ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                barSize={24}
                isAnimationActive={false}
              />
            );
          })}
          <Line
            yAxisId="orders"
            dataKey="orders"
            name="Orders"
            stroke="var(--text)"
            strokeWidth={2}
            dot={{ r: 3, fill: "var(--text)" }}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

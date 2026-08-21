import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PLATFORM_META, type Platform } from "../lib/platforms";

export interface OrdersTrendPoint {
  date: string;
  totalOrders: number;
  successfulOrders: number;
}

interface OrdersTrendChartProps {
  data: OrdersTrendPoint[];
  platform?: Platform;
}

export default function OrdersTrendChart({ data, platform }: OrdersTrendChartProps) {
  const successfulColor = platform ? PLATFORM_META[platform].solidColor : "var(--accent)";
  if (data.length === 0) {
    return (
      <div className="trend-body" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p className="row-meta">No orders yet.</p>
      </div>
    );
  }

  return (
    <div className="trend-body">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip
            contentStyle={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: "var(--text-muted)" }} />
          <Line
            name="Total orders"
            dataKey="totalOrders"
            stroke="#c98b1f"
            strokeWidth={2}
            dot={{ r: 3, fill: "#c98b1f" }}
            isAnimationActive={false}
          />
          <Line
            name="Successful orders"
            dataKey="successfulOrders"
            stroke={successfulColor}
            strokeWidth={2}
            dot={{ r: 3, fill: successfulColor }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

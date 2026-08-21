import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { PLATFORM_META, type Platform } from "../lib/platforms";

interface OrderSuccessDonutProps {
  completed: number;
  pending: number;
  failed: number;
  platform?: Platform;
}

export default function OrderSuccessDonut({ completed, pending, failed, platform }: OrderSuccessDonutProps) {
  const total = completed + pending + failed;
  const successRate = total === 0 ? 0 : Math.round((completed / total) * 100);
  const completedColor = platform ? PLATFORM_META[platform].solidColor : "var(--accent)";
  const data = [
    { name: "Completed", value: completed || (total === 0 ? 1 : 0) },
    { name: "Pending", value: pending },
    { name: "Failed", value: failed },
  ];

  return (
    <div className="donut-body" style={{ position: "relative" }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            innerRadius="70%"
            outerRadius="100%"
            startAngle={90}
            endAngle={-270}
            stroke="none"
            isAnimationActive={false}
          >
            <Cell fill={total === 0 ? "var(--border)" : completedColor} />
            <Cell fill="var(--border)" />
            <Cell fill="var(--danger, #d64545)" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="donut-center-label">
        <div className="stat-value">{successRate}%</div>
        <div className="stat-label">Success rate</div>
      </div>
    </div>
  );
}

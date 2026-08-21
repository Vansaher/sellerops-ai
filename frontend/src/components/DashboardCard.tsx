import type { ReactNode } from "react";

interface DashboardCardProps {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}

export default function DashboardCard({ title, subtitle, action, className, children }: DashboardCardProps) {
  return (
    <div className={`card${className ? ` ${className}` : ""}`}>
      {(title || subtitle || action) && (
        <div className="card-header">
          <div>
            {title && <div className="card-title">{title}</div>}
            {subtitle && <div className="card-subtitle">{subtitle}</div>}
          </div>
          {action}
        </div>
      )}
      <div className="card-body">{children}</div>
    </div>
  );
}

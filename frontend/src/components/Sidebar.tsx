import type { ReactNode } from "react";

export interface SidebarItem<T extends string> {
  key: T;
  label: string;
  icon: ReactNode;
}

export type SidebarEntry<T extends string> =
  | ({ type: "item" } & SidebarItem<T>)
  | { type: "group"; label: string; icon: ReactNode; items: { key: T; label: string }[] };

interface SidebarProps<T extends string> {
  items: SidebarEntry<T>[];
  active: T;
  onSelect: (key: T) => void;
}

export default function Sidebar<T extends string>({ items, active, onSelect }: SidebarProps<T>) {
  return (
    <aside className="sidebar">
      <div className="sidebar-title">SellerOps AI</div>
      <nav className="sidebar-nav">
        {items.map((entry) =>
          entry.type === "group" ? (
            <div key={entry.label}>
              <div className="sidebar-group-label">
                {entry.icon}
                {entry.label}
              </div>
              <div className="sidebar-subnav">
                {entry.items.map((sub) => (
                  <button
                    key={sub.key}
                    type="button"
                    className={`sidebar-link sidebar-sublink${sub.key === active ? " active" : ""}`}
                    onClick={() => onSelect(sub.key)}
                  >
                    {sub.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <button
              key={entry.key}
              type="button"
              className={`sidebar-link${entry.key === active ? " active" : ""}`}
              onClick={() => onSelect(entry.key)}
            >
              {entry.icon}
              {entry.label}
            </button>
          )
        )}
      </nav>
    </aside>
  );
}

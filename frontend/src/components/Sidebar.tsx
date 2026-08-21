import type { ReactNode } from "react";

export interface SidebarItem<T extends string> {
  key: T;
  label: string;
  icon: ReactNode;
}

interface SidebarProps<T extends string> {
  items: SidebarItem<T>[];
  active: T;
  onSelect: (key: T) => void;
}

export default function Sidebar<T extends string>({ items, active, onSelect }: SidebarProps<T>) {
  return (
    <aside className="sidebar">
      <div className="sidebar-title">SellerOps AI</div>
      <nav className="sidebar-nav">
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`sidebar-link${item.key === active ? " active" : ""}`}
            onClick={() => onSelect(item.key)}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}

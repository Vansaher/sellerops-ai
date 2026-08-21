import { useState } from "react";
import Sidebar, { type SidebarItem } from "./components/Sidebar";
import { ContentIcon, DashboardIcon, InboxIcon, InventoryIcon, OrdersIcon } from "./components/icons";
import Content from "./pages/Content";
import Dashboard from "./pages/Dashboard";
import Inbox from "./pages/Inbox";
import Inventory from "./pages/Inventory";
import Orders from "./pages/Orders";
import "./App.css";

type TabKey = "dashboard" | "inbox" | "orders" | "inventory" | "content";

const NAV_ITEMS: SidebarItem<TabKey>[] = [
  { key: "dashboard", label: "Dashboard", icon: <DashboardIcon /> },
  { key: "inbox", label: "Inbox", icon: <InboxIcon /> },
  { key: "orders", label: "Orders", icon: <OrdersIcon /> },
  { key: "inventory", label: "Inventory", icon: <InventoryIcon /> },
  { key: "content", label: "Content Studio", icon: <ContentIcon /> },
];

const AUTO_REPLY_STORAGE_KEY = "sellerops.autoReplyEnabled";

function App() {
  const [active, setActive] = useState<TabKey>("dashboard");
  const [refreshKey, setRefreshKey] = useState(0);
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(
    () => localStorage.getItem(AUTO_REPLY_STORAGE_KEY) === "true"
  );

  const bumpRefresh = () => setRefreshKey((k) => k + 1);

  const handleToggleAutoReply = (enabled: boolean) => {
    setAutoReplyEnabled(enabled);
    localStorage.setItem(AUTO_REPLY_STORAGE_KEY, String(enabled));
  };

  const renderPage = () => {
    switch (active) {
      case "dashboard":
        return <Dashboard key={refreshKey} onSimulated={bumpRefresh} />;
      case "inbox":
        return <Inbox key={refreshKey} autoReplyEnabled={autoReplyEnabled} onToggleAutoReply={handleToggleAutoReply} />;
      case "orders":
        return <Orders key={refreshKey} />;
      case "inventory":
        return <Inventory key={refreshKey} />;
      case "content":
        return <Content key={refreshKey} />;
    }
  };

  return (
    <div className="shell">
      <Sidebar items={NAV_ITEMS} active={active} onSelect={setActive} />
      <main className="main">{renderPage()}</main>
    </div>
  );
}

export default App;

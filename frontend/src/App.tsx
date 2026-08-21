import { useState } from "react";
import DemoTools from "./components/DemoTools";
import Sidebar, { type SidebarItem } from "./components/Sidebar";
import { ContentIcon, DashboardIcon, InboxIcon, InventoryIcon, OrdersIcon } from "./components/icons";
import Content from "./pages/Content";
import Dashboard from "./pages/Dashboard";
import Inbox, { type Platform } from "./pages/Inbox";
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
  const [inboxPlatformHint, setInboxPlatformHint] = useState<Platform | null>(null);

  const bumpRefresh = () => setRefreshKey((k) => k + 1);

  const handleNavigateToInbox = (platform: string) => {
    setInboxPlatformHint(platform as Platform);
    setActive("inbox");
  };

  const handleToggleAutoReply = (enabled: boolean) => {
    setAutoReplyEnabled(enabled);
    localStorage.setItem(AUTO_REPLY_STORAGE_KEY, String(enabled));
  };

  const renderPage = () => {
    switch (active) {
      case "dashboard":
        return <Dashboard key={refreshKey} />;
      case "inbox":
        return (
          <Inbox
            key={refreshKey}
            autoReplyEnabled={autoReplyEnabled}
            onToggleAutoReply={handleToggleAutoReply}
            initialPlatform={inboxPlatformHint}
            onConsumedInitialPlatform={() => setInboxPlatformHint(null)}
          />
        );
      case "orders":
        return <Orders key={refreshKey} onNavigateToInbox={handleNavigateToInbox} />;
      case "inventory":
        return <Inventory key={refreshKey} />;
      case "content":
        return <Content key={refreshKey} />;
    }
  };

  return (
    <>
      <div className="shell">
        <Sidebar items={NAV_ITEMS} active={active} onSelect={setActive} />
        <main className="main">{renderPage()}</main>
      </div>
      <DemoTools onAction={bumpRefresh} />
    </>
  );
}

export default App;

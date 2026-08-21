import { useState } from "react";
import DemoTools from "./components/DemoTools";
import Sidebar, { type SidebarEntry } from "./components/Sidebar";
import { ContentIcon, DashboardIcon, InboxIcon, InventoryIcon, OrdersIcon } from "./components/icons";
import Broadcast from "./pages/Broadcast";
import Content from "./pages/Content";
import Dashboard from "./pages/Dashboard";
import Inbox, { type Platform } from "./pages/Inbox";
import Inventory from "./pages/Inventory";
import Orders from "./pages/Orders";
import "./App.css";

type TabKey = "dashboard" | "chat" | "broadcast" | "orders" | "inventory" | "content";

const NAV_ITEMS: SidebarEntry<TabKey>[] = [
  { type: "item", key: "dashboard", label: "Dashboard", icon: <DashboardIcon /> },
  {
    type: "group",
    label: "Messaging",
    icon: <InboxIcon />,
    items: [
      { key: "chat", label: "Chat" },
      { key: "broadcast", label: "Broadcast" },
    ],
  },
  { type: "item", key: "orders", label: "Orders", icon: <OrdersIcon /> },
  { type: "item", key: "inventory", label: "Inventory", icon: <InventoryIcon /> },
  { type: "item", key: "content", label: "Content Studio", icon: <ContentIcon /> },
];

const AUTO_REPLY_STORAGE_KEY = "sellerops.autoReplyEnabled";

function App() {
  const [active, setActive] = useState<TabKey>("dashboard");
  const [refreshKey, setRefreshKey] = useState(0);
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(
    () => localStorage.getItem(AUTO_REPLY_STORAGE_KEY) === "true"
  );
  const [chatPlatformHint, setChatPlatformHint] = useState<Platform | null>(null);
  const [broadcastHint, setBroadcastHint] = useState<{ productId: number; context?: string } | null>(null);

  const bumpRefresh = () => setRefreshKey((k) => k + 1);

  const handleNavigateToChat = (platform: string) => {
    setChatPlatformHint(platform as Platform);
    setActive("chat");
  };

  const handleNavigateToBroadcast = (productId: number, context?: string) => {
    setBroadcastHint({ productId, context });
    setActive("broadcast");
  };

  const handleToggleAutoReply = (enabled: boolean) => {
    setAutoReplyEnabled(enabled);
    localStorage.setItem(AUTO_REPLY_STORAGE_KEY, String(enabled));
  };

  const renderPage = () => {
    switch (active) {
      case "dashboard":
        return <Dashboard key={refreshKey} />;
      case "chat":
        return (
          <Inbox
            key={refreshKey}
            autoReplyEnabled={autoReplyEnabled}
            onToggleAutoReply={handleToggleAutoReply}
            initialPlatform={chatPlatformHint}
            onConsumedInitialPlatform={() => setChatPlatformHint(null)}
          />
        );
      case "broadcast":
        return (
          <Broadcast
            key={refreshKey}
            initialProductId={broadcastHint?.productId}
            initialContext={broadcastHint?.context}
            onConsumedInitialHint={() => setBroadcastHint(null)}
          />
        );
      case "orders":
        return <Orders key={refreshKey} onNavigateToInbox={handleNavigateToChat} />;
      case "inventory":
        return <Inventory key={refreshKey} onNavigateToBroadcast={handleNavigateToBroadcast} />;
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

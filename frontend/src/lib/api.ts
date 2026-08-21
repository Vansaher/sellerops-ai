const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!response.ok) {
    throw new Error(`${init?.method ?? "GET"} ${path} failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export interface Order {
  id: number;
  platform: string;
  platform_order_id: string;
  status: string;
  customer_ref: string;
  amount: number;
  created_at: string;
}

export interface InventoryItem {
  id: number;
  product_id: number;
  platform: string;
  stock_qty: number;
  last_synced_at: string;
}

export interface Message {
  id: number;
  platform: string;
  thread_id: string;
  sender: string;
  body: string;
  status: string;
  risk: string | null;
  created_at: string;
}

export interface ContentAsset {
  id: number;
  product_id: number;
  platform: string;
  type: string;
  body: string;
  status: string;
}

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  sku: string;
}

export const api = {
  listOrders: () => request<Order[]>("/orders"),
  listInventory: () => request<InventoryItem[]>("/inventory"),
  listProducts: () => request<Product[]>("/products"),
  listMessages: () => request<Message[]>("/inbox"),
  draftReply: (messageId: number) =>
    request<Message>(`/inbox/${messageId}/draft-reply`, { method: "POST" }),
  updateMessage: (id: number, body: { body?: string; status: string }) =>
    request<Message>(`/inbox/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  listContentAssets: (productId?: number) =>
    request<ContentAsset[]>(`/content${productId ? `?product_id=${productId}` : ""}`),
  generateContent: (productId: number, platforms: string[]) =>
    request<{ status: string }>("/content/generate", {
      method: "POST",
      body: JSON.stringify({ product_id: productId, platforms }),
    }),
  updateContentAsset: (id: number, body: { body?: string; status: string }) =>
    request<ContentAsset>(`/content/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  simulateIncoming: (platform: string) =>
    request<{ status: string }>(`/webhooks/simulate/${platform}`, { method: "POST" }),
};

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
  product_id: number | null;
  platform: string;
  platform_order_id: string;
  status: string;
  customer_ref: string;
  amount: number;
  created_at: string;
  flag_reason: string | null;
  resolution_draft: string | null;
  resolution_status: string | null;
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
  customer_name: string | null;
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
  image_path: string | null;
  status: string;
  created_at: string;
}

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  sku: string;
  stock_qty: number;
  low_stock_reason: string | null;
  image_path: string | null;
}

export interface ProductPhoto {
  id: number;
  product_id: number;
  image_path: string;
  created_at: string;
}

export const assetUrl = (path: string) => `${API_BASE}${path}`;

export const api = {
  listOrders: () => request<Order[]>("/orders"),
  draftResolution: (orderId: number) =>
    request<Order & { internal_note: string | null }>(`/orders/${orderId}/draft-resolution`, { method: "POST" }),
  updateOrderResolution: (orderId: number, status: string) =>
    request<Order>(`/orders/${orderId}/resolution`, { method: "PATCH", body: JSON.stringify({ status }) }),
  sendOrderMessage: (orderId: number, body: string) =>
    request<Order>(`/orders/${orderId}/send-message`, { method: "POST", body: JSON.stringify({ body }) }),
  listInventory: () => request<InventoryItem[]>("/inventory"),
  listProducts: () => request<Product[]>("/products"),
  createProduct: (body: { name: string; description: string; price: number; sku: string; stock_qty: number }) =>
    request<Product>("/products", { method: "POST", body: JSON.stringify(body) }),
  updateProduct: (productId: number, body: { name?: string; description?: string; price?: number; sku?: string }) =>
    request<Product>(`/products/${productId}`, { method: "PATCH", body: JSON.stringify(body) }),
  restockProduct: (productId: number, amount: number) =>
    request<Product>(`/inventory/${productId}/restock`, { method: "POST", body: JSON.stringify({ amount }) }),
  uploadProductPhoto: async (productId: number, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch(`${API_BASE}/products/${productId}/photo`, { method: "POST", body: formData });
    if (!response.ok) throw new Error(`POST /products/${productId}/photo failed: ${response.status}`);
    return response.json() as Promise<Product>;
  },
  listProductPhotos: (productId: number) => request<ProductPhoto[]>(`/products/${productId}/photos`),
  deleteProductPhoto: (productId: number, photoId: number) =>
    request<Product>(`/products/${productId}/photos/${photoId}`, { method: "DELETE" }),
  listMessages: () => request<Message[]>("/inbox"),
  draftReply: (messageId: number) =>
    request<Message>(`/inbox/${messageId}/draft-reply`, { method: "POST" }),
  updateMessage: (id: number, body: { body?: string; status: string }) =>
    request<Message>(`/inbox/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  sendMessage: (body: { platform: string; thread_id: string; customer_name?: string | null; body: string }) =>
    request<Message>("/inbox/send", { method: "POST", body: JSON.stringify(body) }),
  listContentAssets: (productId?: number) =>
    request<ContentAsset[]>(`/content${productId ? `?product_id=${productId}` : ""}`),
  generateContent: (productId: number, platforms: string[]) =>
    request<{ status: string }>("/content/generate", {
      method: "POST",
      body: JSON.stringify({ product_id: productId, platforms }),
    }),
  updateContentAsset: (id: number, body: { body?: string; status: string }) =>
    request<ContentAsset>(`/content/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteContentAsset: async (id: number) => {
    const response = await fetch(`${API_BASE}/content/${id}`, { method: "DELETE" });
    if (!response.ok) throw new Error(`DELETE /content/${id} failed: ${response.status}`);
  },
  repurposeContent: (productId: number, platforms: string[]) =>
    request<{ status: string }>("/content/repurpose", {
      method: "POST",
      body: JSON.stringify({ product_id: productId, platforms }),
    }),
  getDashboardDigest: () =>
    request<{ digest: string; generated_at: string }>("/dashboard/digest", { method: "POST" }),
  simulateIncoming: (platform: string) =>
    request<{ status: string }>(`/webhooks/simulate/${platform}`, { method: "POST" }),
  resetDb: () => request<{ status: string }>("/admin/reset-db", { method: "POST" }),
  fillInventory: () =>
    request<{ status: string; updated: number }>("/admin/fill-inventory", { method: "POST" }),
  simulateDelayedOrder: () =>
    request<Order>("/admin/simulate-delayed-order", { method: "POST" }),
  simulateLowStock: () => request<Product>("/admin/simulate-low-stock", { method: "POST" }),
  generateBroadcast: (productId: number, platform: string, context?: string) =>
    request<ContentAsset>("/broadcast/generate", {
      method: "POST",
      body: JSON.stringify({ product_id: productId, platform, context }),
    }),
};

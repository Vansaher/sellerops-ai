import { useEffect, useMemo, useState } from "react";
import { api, type ContentAsset, type Product } from "../lib/api";

const PLATFORMS = ["shopee", "tiktok", "instagram"];

interface BroadcastProps {
  initialProductId?: number | null;
  initialContext?: string | null;
  onConsumedInitialHint?: () => void;
}

export default function Broadcast({ initialProductId, initialContext, onConsumedInitialHint }: BroadcastProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [assets, setAssets] = useState<ContentAsset[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(initialProductId ?? null);
  const [platform, setPlatform] = useState(PLATFORMS[0]);
  const [context, setContext] = useState(initialContext ?? "");
  const [edits, setEdits] = useState<Record<number, string>>({});
  const [generating, setGenerating] = useState(false);
  const [busy, setBusy] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  useEffect(() => {
    if (initialProductId) onConsumedInitialHint?.();
  }, []);

  useEffect(() => {
    api.listProducts().then((products) => {
      setProducts(products);
      setSelectedProductId((current) => current ?? products[0]?.id ?? null);
    });
  }, []);

  const loadAssets = () => api.listContentAssets().then(setAssets).catch(console.error);

  useEffect(() => {
    loadAssets();
  }, []);

  const currentDrafts = useMemo(
    () =>
      assets
        .filter((a) => a.type === "broadcast" && a.product_id === selectedProductId && a.status === "draft")
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [assets, selectedProductId]
  );

  const broadcastHistory = useMemo(
    () =>
      assets
        .filter((a) => a.type === "broadcast" && a.status !== "draft")
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [assets]
  );

  const productName = (productId: number) => products.find((p) => p.id === productId)?.name ?? `Product #${productId}`;

  const handleGenerate = async () => {
    if (selectedProductId === null) return;
    setGenerating(true);
    try {
      await api.generateBroadcast(selectedProductId, platform, context || undefined);
      await loadAssets();
    } finally {
      setGenerating(false);
    }
  };

  const handleSetStatus = async (asset: ContentAsset, status: "approved" | "published") => {
    setBusy(asset.id);
    try {
      await api.updateContentAsset(asset.id, { body: edits[asset.id] ?? asset.body, status });
      await loadAssets();
    } finally {
      setBusy(null);
    }
  };

  const handleCopy = async (asset: ContentAsset) => {
    await navigator.clipboard.writeText(edits[asset.id] ?? asset.body);
    setCopiedId(asset.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <section>
      <div className="page-header">
        <h1>Broadcast</h1>
        <p>Draft a message to notify followers about a product. No platform here supports real bulk-send — copy the text and post it via each platform's own tools.</p>
      </div>

      <div className="simulate-row">
        <select className="select" value={selectedProductId ?? ""} onChange={(e) => setSelectedProductId(Number(e.target.value))}>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select className="select" value={platform} onChange={(e) => setPlatform(e.target.value)}>
          {PLATFORMS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <input
          className="field"
          style={{ minHeight: "unset", width: 240 }}
          placeholder="Optional context (e.g. low stock)"
          value={context}
          onChange={(e) => setContext(e.target.value)}
        />
        <button type="button" className="btn btn-primary" disabled={generating || selectedProductId === null} onClick={handleGenerate}>
          {generating ? "Drafting…" : "Draft with AI"}
        </button>
      </div>

      <h2>AI draft</h2>
      <div className="row-list" style={{ marginBottom: 32 }}>
        {currentDrafts.length === 0 && <p>No draft yet — click "Draft with AI" above.</p>}
        {currentDrafts.map((asset) => (
          <div key={asset.id} className="row-item">
            <div className="row-meta">
              {productName(asset.product_id)} · {asset.platform} · status: {asset.status} ·{" "}
              {new Date(asset.created_at).toLocaleString()}
            </div>
            <textarea
              className="field"
              value={edits[asset.id] ?? asset.body}
              onChange={(e) => setEdits((d) => ({ ...d, [asset.id]: e.target.value }))}
            />
            <div className="btn-row">
              <button type="button" className="btn" disabled={busy === asset.id} onClick={() => handleSetStatus(asset, "approved")}>
                Approve
              </button>
              <button type="button" className="btn btn-primary" disabled={busy === asset.id} onClick={() => handleSetStatus(asset, "published")}>
                Approve &amp; Publish
              </button>
              <button type="button" className="btn" onClick={() => handleCopy(asset)}>
                {copiedId === asset.id ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
        ))}
      </div>

      <h2>Broadcast history</h2>
      <table className="data-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>Platform</th>
            <th>Status</th>
            <th>Date</th>
            <th>Message</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {broadcastHistory.length === 0 && (
            <tr>
              <td colSpan={6}>No broadcasts sent yet.</td>
            </tr>
          )}
          {broadcastHistory.map((asset) => (
            <tr key={asset.id}>
              <td>{productName(asset.product_id)}</td>
              <td>{asset.platform}</td>
              <td>
                <span className="pill">{asset.status}</span>
              </td>
              <td>{new Date(asset.created_at).toLocaleString()}</td>
              <td>{asset.body}</td>
              <td>
                {asset.status === "approved" && (
                  <button type="button" className="btn btn-primary" disabled={busy === asset.id} onClick={() => handleSetStatus(asset, "published")}>
                    Approve &amp; Publish
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

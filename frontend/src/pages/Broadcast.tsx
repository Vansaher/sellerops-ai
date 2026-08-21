import { useEffect, useMemo, useState } from "react";
import { api, type ContentAsset, type Product } from "../lib/api";
import { PLATFORM_META, type Platform } from "../lib/platforms";

const PLATFORMS = ["shopee", "tiktok", "instagram"];

type HistorySortOption = "newest" | "oldest";

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
  const [historyPlatformFilter, setHistoryPlatformFilter] = useState("all");
  const [historyStatusFilter, setHistoryStatusFilter] = useState("all");
  const [historySort, setHistorySort] = useState<HistorySortOption>("newest");

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

  const broadcastHistory = useMemo(() => {
    let result = assets.filter((a) => a.type === "broadcast" && a.status !== "draft");
    if (historyPlatformFilter !== "all") result = result.filter((a) => a.platform === historyPlatformFilter);
    if (historyStatusFilter !== "all") result = result.filter((a) => a.status === historyStatusFilter);

    result = [...result].sort((a, b) => {
      const diff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      return historySort === "newest" ? diff : -diff;
    });
    return result;
  }, [assets, historyPlatformFilter, historyStatusFilter, historySort]);

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

  const handleCancelDraft = async (asset: ContentAsset) => {
    setBusy(asset.id);
    try {
      await api.deleteContentAsset(asset.id);
      setEdits((d) => {
        const { [asset.id]: _discarded, ...rest } = d;
        return rest;
      });
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

      <h2 style={{ marginTop: 20 }}>AI draft</h2>
      {currentDrafts.length === 0 ? (
        <p>No draft yet — click "Draft with AI" above.</p>
      ) : (
        <div className="card" style={{ marginBottom: 27 }}>
          <div className="row-list">
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
                  <button type="button" className="btn" disabled={busy === asset.id} onClick={() => handleCancelDraft(asset)}>
                    Cancel
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <h2>Broadcast history</h2>
      <div className="card" >
        <div className="simulate-row">
          <select className="select" value={historyPlatformFilter} onChange={(e) => setHistoryPlatformFilter(e.target.value)}>
            <option value="all">All platforms</option>
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <select className="select" value={historyStatusFilter} onChange={(e) => setHistoryStatusFilter(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="approved">Approved</option>
            <option value="published">Published</option>
          </select>
          <select className="select" value={historySort} onChange={(e) => setHistorySort(e.target.value as HistorySortOption)}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>
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
                <td colSpan={6}>No broadcasts match these filters.</td>
              </tr>
            )}
            {broadcastHistory.map((asset) => (
              <tr key={asset.id} style={{ background: PLATFORM_META[asset.platform as Platform]?.tintBg }}>
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
      </div>
    </section>
  );
}

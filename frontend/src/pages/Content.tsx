import { useEffect, useMemo, useState } from "react";
import { api, assetUrl, type ContentAsset, type Product } from "../lib/api";

const PLATFORMS = ["shopee", "tiktok", "instagram"];

export default function Content() {
  const [products, setProducts] = useState<Product[]>([]);
  const [assets, setAssets] = useState<ContentAsset[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [edits, setEdits] = useState<Record<number, string>>({});
  const [generating, setGenerating] = useState(false);
  const [repurposing, setRepurposing] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [busy, setBusy] = useState<number | null>(null);

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

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId) ?? null,
    [products, selectedProductId]
  );

  const assetsForSelectedProduct = useMemo(
    () => assets.filter((a) => a.product_id === selectedProductId && a.type !== "repurpose"),
    [assets, selectedProductId]
  );

  const repurposedAssets = useMemo(
    () => assets.filter((a) => a.product_id === selectedProductId && a.type === "repurpose"),
    [assets, selectedProductId]
  );

  const handleGenerate = async () => {
    if (selectedProductId === null) return;
    setGenerating(true);
    try {
      await api.generateContent(selectedProductId, PLATFORMS);
      await new Promise((resolve) => setTimeout(resolve, 4000)); // give the background task time to finish
      await loadAssets();
    } finally {
      setGenerating(false);
    }
  };

  const handleRepurpose = async () => {
    if (selectedProductId === null) return;
    setRepurposing(true);
    try {
      await api.repurposeContent(selectedProductId, PLATFORMS);
      await new Promise((resolve) => setTimeout(resolve, 4000)); // give the background task time to finish
      await loadAssets();
    } finally {
      setRepurposing(false);
    }
  };

  const handleUploadPhoto = async (file: File) => {
    if (selectedProductId === null) return;
    setUploadingPhoto(true);
    try {
      const updated = await api.uploadProductPhoto(selectedProductId, file);
      setProducts((ps) => ps.map((p) => (p.id === updated.id ? updated : p)));
    } finally {
      setUploadingPhoto(false);
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

  return (
    <section>
      <div className="page-header">
        <h1>AI Content Studio</h1>
        <p>One product description becomes platform-adapted variants for Shopee, TikTok Shop, and Instagram.</p>
      </div>

      <div className="simulate-row">
        <select className="select" value={selectedProductId ?? ""} onChange={(e) => setSelectedProductId(Number(e.target.value))}>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <button type="button" className="btn btn-primary" disabled={generating || selectedProductId === null} onClick={handleGenerate}>
          {generating ? "Generating…" : "Generate for all platforms"}
        </button>
      </div>

      <div className="row-list">
        {assetsForSelectedProduct.map((asset) => (
          <div key={asset.id} className="row-item">
            <div className="row-meta">
              {asset.platform} · {asset.type} · status: {asset.status}
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
            </div>
          </div>
        ))}
      </div>

      <h2>Repurpose photo</h2>
      <p>Upload one product photo — AI crops it to each platform's native size and drafts a caption grounded in what's actually in the photo.</p>

      <div className="simulate-row">
        {selectedProduct?.image_path ? (
          <img
            src={assetUrl(selectedProduct.image_path)}
            alt={selectedProduct.name}
            style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 4 }}
          />
        ) : (
          <span className="pill">No photo uploaded</span>
        )}
        <input
          type="file"
          accept="image/*"
          disabled={uploadingPhoto || selectedProductId === null}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUploadPhoto(file);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          className="btn btn-primary"
          disabled={repurposing || !selectedProduct?.image_path}
          onClick={handleRepurpose}
        >
          {repurposing ? "Repurposing…" : "Repurpose photo"}
        </button>
      </div>

      <div className="row-list">
        {repurposedAssets.map((asset) => (
          <div key={asset.id} className="row-item">
            <div className="row-meta">
              {asset.platform} · {asset.type} · status: {asset.status}
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              {asset.image_path && (
                <img
                  src={assetUrl(asset.image_path)}
                  alt={`${asset.platform} crop`}
                  style={{ width: 100, borderRadius: 4, flexShrink: 0 }}
                />
              )}
              <textarea
                className="field"
                style={{ flex: 1 }}
                value={edits[asset.id] ?? asset.body}
                onChange={(e) => setEdits((d) => ({ ...d, [asset.id]: e.target.value }))}
              />
            </div>
            <div className="btn-row">
              <button type="button" className="btn" disabled={busy === asset.id} onClick={() => handleSetStatus(asset, "approved")}>
                Approve
              </button>
              <button type="button" className="btn btn-primary" disabled={busy === asset.id} onClick={() => handleSetStatus(asset, "published")}>
                Approve &amp; Publish
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

import { useEffect, useMemo, useState } from "react";
import { api, assetUrl, type ContentAsset, type Product, type ProductPhoto } from "../lib/api";
import { PLATFORM_META, PLATFORMS, type Platform } from "../lib/platforms";

// Matches backend/app/services/image_repurpose.py's PLATFORM_CROPS — reserves
// the right amount of visual space per platform even before a photo exists.
const PLATFORM_ASPECT: Record<Platform, string> = {
  shopee: "1 / 1",
  tiktok: "9 / 16",
  instagram: "4 / 5",
};

export default function Content() {
  const [products, setProducts] = useState<Product[]>([]);
  const [assets, setAssets] = useState<ContentAsset[]>([]);
  const [photos, setPhotos] = useState<ProductPhoto[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [edits, setEdits] = useState<Record<number, string>>({});
  const [generating, setGenerating] = useState(false);
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

  const loadPhotos = (productId: number) => api.listProductPhotos(productId).then(setPhotos).catch(console.error);

  useEffect(() => {
    if (selectedProductId === null) {
      setPhotos([]);
      return;
    }
    loadPhotos(selectedProductId);
  }, [selectedProductId]);

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId) ?? null,
    [products, selectedProductId]
  );

  const latestByPlatform = (type: "text" | "repurpose") =>
    Object.fromEntries(
      PLATFORMS.map((platform) => {
        const candidates = assets
          .filter((a) => a.product_id === selectedProductId && a.platform === platform)
          .filter((a) => (type === "repurpose" ? a.type === "repurpose" : a.type !== "repurpose" && a.type !== "broadcast"))
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        return [platform, candidates[0] ?? null];
      })
    ) as Record<Platform, ContentAsset | null>;

  const textAssets = useMemo(() => latestByPlatform("text"), [assets, selectedProductId]);
  const photoAssets = useMemo(() => latestByPlatform("repurpose"), [assets, selectedProductId]);

  const handleGenerate = async () => {
    if (selectedProductId === null) return;
    setGenerating(true);
    try {
      // A photo-grounded caption is strictly better than a generic text-only
      // one, so only fall back to plain text generation when there's no
      // photo to repurpose — avoids two competing drafts per platform.
      if (selectedProduct?.image_path) {
        await api.repurposeContent(selectedProductId, [...PLATFORMS]);
      } else {
        await api.generateContent(selectedProductId, [...PLATFORMS]);
      }
      await new Promise((resolve) => setTimeout(resolve, 4000)); // give the background task time to finish
      await loadAssets();
    } finally {
      setGenerating(false);
    }
  };

  const handleUploadPhoto = async (file: File) => {
    if (selectedProductId === null) return;
    setUploadingPhoto(true);
    try {
      const updated = await api.uploadProductPhoto(selectedProductId, file);
      setProducts((ps) => ps.map((p) => (p.id === updated.id ? updated : p)));
      await loadPhotos(selectedProductId);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleDeletePhoto = async (photo: ProductPhoto) => {
    if (selectedProductId === null) return;
    const updated = await api.deleteProductPhoto(selectedProductId, photo.id);
    setProducts((ps) => ps.map((p) => (p.id === updated.id ? updated : p)));
    await loadPhotos(selectedProductId);
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

  return (
    <section>
      <div className="page-header">
        <h1>Content Studio</h1>
        <p>One product photo and description become platform-adapted variants for Shopee, TikTok Shop, and Instagram.</p>
      </div>

      <div className="simulate-row">
        <select className="select" value={selectedProductId ?? ""} onChange={(e) => setSelectedProductId(Number(e.target.value))}>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

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

        <button type="button" className="btn btn-primary" disabled={generating || selectedProductId === null} onClick={handleGenerate}>
          {generating ? "Generating…" : "Generate for all platforms"}
        </button>
      </div>

      <div className="photo-gallery">
        {photos.length === 0 && <span className="row-meta">No photos uploaded yet — the active one is used for repurposing.</span>}
        {photos.map((photo) => (
          <div key={photo.id} className="photo-gallery-item">
            <img src={assetUrl(photo.image_path)} alt="Product" />
            {selectedProduct?.image_path === photo.image_path && <span className="pill pill-accent photo-gallery-active">Active</span>}
            <button type="button" className="photo-gallery-remove" onClick={() => handleDeletePhoto(photo)} aria-label="Remove photo">
              ×
            </button>
          </div>
        ))}
      </div>
      {!selectedProduct?.image_path && (
        <p className="row-meta">Upload a photo above to also generate platform-sized crops alongside the text.</p>
      )}

      <div className="content-platform-grid">
        {PLATFORMS.map((platform) => {
          const meta = PLATFORM_META[platform];
          const photoAsset = photoAssets[platform];
          // Photo-grounded caption wins when both exist — one draft per platform, not two.
          const primaryAsset = photoAsset ?? textAssets[platform];

          return (
            <div key={platform} className="content-platform-card" style={{ background: meta.tintBg }}>
              <div className="content-platform-header">
                <meta.Icon size={18} />
                {meta.label}
              </div>

              <div className="content-photo-slot" style={{ aspectRatio: PLATFORM_ASPECT[platform] }}>
                {photoAsset?.image_path ? (
                  <img src={assetUrl(photoAsset.image_path)} alt={`${meta.label} crop`} />
                ) : (
                  <span className="row-meta">No photo yet</span>
                )}
              </div>

              {primaryAsset ? (
                <div className="content-asset-block">
                  <div className="row-meta">
                    {primaryAsset.type} · status: {primaryAsset.status}
                  </div>
                  <textarea
                    className="field"
                    value={edits[primaryAsset.id] ?? primaryAsset.body}
                    onChange={(e) => setEdits((d) => ({ ...d, [primaryAsset.id]: e.target.value }))}
                  />
                  <div className="btn-row">
                    <button
                      type="button"
                      className="btn"
                      disabled={busy === primaryAsset.id}
                      onClick={() => handleSetStatus(primaryAsset, "approved")}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={busy === primaryAsset.id}
                      onClick={() => handleSetStatus(primaryAsset, "published")}
                    >
                      Approve &amp; Publish
                    </button>
                    {primaryAsset.status === "draft" && (
                      <button
                        type="button"
                        className="btn"
                        disabled={busy === primaryAsset.id}
                        onClick={() => handleCancelDraft(primaryAsset)}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <p className="row-meta">No caption yet — click "Generate for all platforms" above.</p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

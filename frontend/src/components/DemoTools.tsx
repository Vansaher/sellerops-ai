import { useState } from "react";
import { api } from "../lib/api";
import "./DemoTools.css";

const SIMULATE_PLATFORMS = ["shopee", "tiktok", "instagram"];

function ToolsIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a4 4 0 0 1-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 1 5.4-5.4l-2.5 2.5-2-2 2.5-2.5Z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

interface DemoToolsProps {
  onAction: () => void;
}

export default function DemoTools({ onAction }: DemoToolsProps) {
  const [open, setOpen] = useState(false);
  const [simulating, setSimulating] = useState<string | null>(null);
  const [resetPending, setResetPending] = useState(false);
  const [filling, setFilling] = useState(false);
  const [simulatingDelay, setSimulatingDelay] = useState(false);
  const [simulatingLowStock, setSimulatingLowStock] = useState(false);

  const toggleOpen = () => {
    setOpen((o) => !o);
    setResetPending(false);
  };

  const handleSimulate = async (platform: string) => {
    setSimulating(platform);
    try {
      await api.simulateIncoming(platform);
      await new Promise((resolve) => setTimeout(resolve, 4000)); // let background task + AI draft finish
      onAction();
    } finally {
      setSimulating(null);
    }
  };

  const handleResetConfirm = async () => {
    await api.resetDb();
    onAction();
    setResetPending(false);
  };

  const handleFillInventory = async () => {
    setFilling(true);
    try {
      await api.fillInventory();
      onAction();
    } finally {
      setFilling(false);
    }
  };

  const handleSimulateDelayedOrder = async () => {
    setSimulatingDelay(true);
    try {
      await api.simulateDelayedOrder();
      onAction();
    } finally {
      setSimulatingDelay(false);
    }
  };

  const handleSimulateLowStock = async () => {
    setSimulatingLowStock(true);
    try {
      await api.simulateLowStock();
      onAction();
    } finally {
      setSimulatingLowStock(false);
    }
  };

  return (
    <>
      <button type="button" className="demo-tools-fab" onClick={toggleOpen} aria-label="Demo tools">
        <ToolsIcon />
      </button>

      {open && (
        <div className="demo-tools-panel">
          <div className="demo-tools-header">
            <span>Demo Tools</span>
            <button type="button" className="demo-tools-close" onClick={toggleOpen} aria-label="Close">
              <CloseIcon />
            </button>
          </div>

          <div className="demo-tools-section">
            <span className="demo-tools-section-label">Simulate chat</span>
            <div className="demo-tools-btn-row">
              {SIMULATE_PLATFORMS.map((platform) => (
                <button
                  key={platform}
                  type="button"
                  className="btn"
                  disabled={simulating !== null}
                  onClick={() => handleSimulate(platform)}
                >
                  {simulating === platform ? "…" : platform}
                </button>
              ))}
            </div>
          </div>

          <div className="demo-tools-section">
            <span className="demo-tools-section-label">Reset database</span>
            {resetPending ? (
              <div className="demo-tools-confirm-row">
                <span>Confirm reset?</span>
                <button type="button" className="demo-tools-confirm-yes" onClick={handleResetConfirm}>
                  Yes
                </button>
                <button type="button" className="btn" onClick={() => setResetPending(false)}>
                  Cancel
                </button>
              </div>
            ) : (
              <button type="button" className="btn" onClick={() => setResetPending(true)}>
                Reset database
              </button>
            )}
          </div>

          <div className="demo-tools-section">
            <span className="demo-tools-section-label">Fill inventory</span>
            <button type="button" className="btn" disabled={filling} onClick={handleFillInventory}>
              {filling ? "…" : "Fill inventory"}
            </button>
          </div>

          <div className="demo-tools-section">
            <span className="demo-tools-section-label">Order anomaly</span>
            <button type="button" className="btn" disabled={simulatingDelay} onClick={handleSimulateDelayedOrder}>
              {simulatingDelay ? "…" : "Simulate delayed order"}
            </button>
          </div>

          <div className="demo-tools-section">
            <span className="demo-tools-section-label">Low stock</span>
            <button type="button" className="btn" disabled={simulatingLowStock} onClick={handleSimulateLowStock}>
              {simulatingLowStock ? "…" : "Simulate low stock"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

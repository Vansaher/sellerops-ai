import type { CSSProperties } from "react";
import { PLATFORMS, PLATFORM_META, type Platform } from "../lib/platforms";

interface PlatformFilterProps {
  value: "all" | Platform;
  onChange: (value: "all" | Platform) => void;
}

export default function PlatformFilter({ value, onChange }: PlatformFilterProps) {
  return (
    <div className="platform-filter">
      <button
        type="button"
        className={`platform-chip${value === "all" ? " active" : ""}`}
        onClick={() => onChange("all")}
      >
        All
      </button>
      {PLATFORMS.map((platform) => {
        const meta = PLATFORM_META[platform];
        const isActive = value === platform;
        const style: CSSProperties = meta.isGradient
          ? ({ "--chip-gradient": meta.color } as CSSProperties)
          : ({ "--chip-color": meta.color, "--chip-tint-bg": meta.tintBg } as CSSProperties);

        return (
          <button
            key={platform}
            type="button"
            className={`platform-chip${meta.isGradient ? " platform-chip--gradient" : ""}${isActive ? " active" : ""}`}
            style={style}
            onClick={() => onChange(platform)}
          >
            <span className="platform-chip-icon">
              <meta.Icon size={14} />
            </span>
            {meta.label}
          </button>
        );
      })}
    </div>
  );
}

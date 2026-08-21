export const PLATFORMS = ["shopee", "tiktok", "instagram"] as const;
export type Platform = (typeof PLATFORMS)[number];

export interface PlatformMeta {
  label: string;
  color: string;
  solidColor: string;
  tintBg: string;
  isGradient: boolean;
  Icon: React.ComponentType<{ size?: number }>;
}

const INSTAGRAM_GRADIENT_ID = "instagram-icon-gradient";

function BagHandle({ x, color }: { x: number; color: string }) {
  return (
    <path
      d={`M${x} 9V8a1.7 2 0 0 1 3.4 0v1`}
      stroke={color}
      strokeWidth="1.3"
      strokeLinecap="round"
      fill="none"
    />
  );
}

const BAG_BODY_PATH = "M6 9h12l1 10.2c.1 1-.6 1.8-1.6 1.8H6.6c-1 0-1.7-.8-1.6-1.8L6 9Z";

export function ShopeeIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <BagHandle x={8.5} color="#EE4D2D" />
      <BagHandle x={12.1} color="#EE4D2D" />
      <path d={BAG_BODY_PATH} fill="#EE4D2D" />
      <text x="12" y="18.3" textAnchor="middle" fontSize="7.5" fontWeight="700" fontFamily="Arial, sans-serif" fill="#fff">
        S
      </text>
    </svg>
  );
}

const TIKTOK_NOTE_PATH =
  "M13 3v10.8a2.6 2.6 0 1 1-2-2.53V9.2a5 5 0 1 0 4.6 4.98V9.9a6.8 6.8 0 0 0 3.9 1.23V8.6a4.3 4.3 0 0 1-2.9-1.3A4.3 4.3 0 0 1 15.4 4H13Z";

export function TikTokIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <BagHandle x={8.5} color="#111111" />
      <BagHandle x={12.1} color="#111111" />
      <path d={BAG_BODY_PATH} fill="#111111" />
      <g transform="translate(6.2 11.4) scale(0.38)">
        <path d={TIKTOK_NOTE_PATH} fill="#25F4EE" transform="translate(-0.5, 0.4)" />
        <path d={TIKTOK_NOTE_PATH} fill="#FE2C55" transform="translate(0.5, -0.4)" />
        <path d={TIKTOK_NOTE_PATH} fill="#fff" />
      </g>
    </svg>
  );
}

export function InstagramIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id={INSTAGRAM_GRADIENT_ID} x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#833AB4" />
          <stop offset="55%" stopColor="#E1306C" />
          <stop offset="100%" stopColor="#F77737" />
        </linearGradient>
      </defs>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" fill={`url(#${INSTAGRAM_GRADIENT_ID})`} />
      <circle cx="12" cy="12" r="4.2" fill="none" stroke="#fff" strokeWidth="1.6" />
      <circle cx="17" cy="7" r="1.1" fill="#fff" />
    </svg>
  );
}

export const PLATFORM_META: Record<Platform, PlatformMeta> = {
  shopee: {
    label: "Shopee",
    color: "#EE4D2D",
    solidColor: "#EE4D2D",
    tintBg: "rgba(238, 77, 45, 0.10)",
    isGradient: false,
    Icon: ShopeeIcon,
  },
  tiktok: {
    label: "TikTok Shop",
    color: "#111111",
    solidColor: "#111111",
    tintBg: "rgba(17, 17, 17, 0.06)",
    isGradient: false,
    Icon: TikTokIcon,
  },
  instagram: {
    label: "Instagram",
    color: "linear-gradient(135deg, #833AB4, #E1306C, #F77737)",
    solidColor: "#E1306C",
    tintBg: "",
    isGradient: true,
    Icon: InstagramIcon,
  },
};

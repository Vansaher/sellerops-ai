import { PLATFORM_META, type Platform } from "../lib/platforms";

interface PlatformBadgeProps {
  platform: Platform;
}

export default function PlatformBadge({ platform }: PlatformBadgeProps) {
  const meta = PLATFORM_META[platform];
  return (
    <span className="activity-platform-badge">
      <meta.Icon size={13} />
      {meta.label}
    </span>
  );
}

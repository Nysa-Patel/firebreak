"use client";

type IconProps = { size?: number; className?: string };

const base = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export function ShieldCheckIcon({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

export function InfoCircleIcon({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8v.01" />
    </svg>
  );
}

export function WarningTriangleIcon({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M12 4l9 15H3L12 4Z" />
      <path d="M12 10v4M12 17v.01" />
    </svg>
  );
}

export function HazardIcon({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M12 2l10 10-10 10L2 12 12 2Z" />
      <path d="M12 8v5M12 15.5v.01" />
    </svg>
  );
}

export const RISK_ICON: Record<string, (p: IconProps) => React.JSX.Element> = {
  low: ShieldCheckIcon,
  moderate: InfoCircleIcon,
  high: WarningTriangleIcon,
  very_high: HazardIcon,
};

export function SunIcon({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2 12h2M20 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
    </svg>
  );
}

export function HazeIcon({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M4 8h11M4 12h16M4 16h11" />
    </svg>
  );
}

export function SmokeIcon({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M5 20c1-1.5 3-1 4-2.5S7 14 8.5 12 11 9 9.5 6" />
      <path d="M13 20c1-1.5 3-1 4-2.5S14 14 15.5 12 18 9 16.5 6" />
    </svg>
  );
}

export const DENSITY_ICON: Record<string, (p: IconProps) => React.JSX.Element> = {
  clear: SunIcon,
  hazy: HazeIcon,
  heavy: SmokeIcon,
};

export function LibraryIcon({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M4 19V6l4-2 4 2 4-2 4 2v13" />
      <path d="M4 19h16M8 4v15M12 6v13M16 4v15" />
    </svg>
  );
}

export function CommunityIcon({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M4 21V10l8-6 8 6v11" />
      <path d="M9 21v-6h6v6" />
    </svg>
  );
}

export const LOCATION_ICON: Record<string, (p: IconProps) => React.JSX.Element> = {
  library: LibraryIcon,
  community_center: CommunityIcon,
};

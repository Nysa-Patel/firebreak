import type { AqiCategory, DensityClass } from "./types";

export const AQI_CATEGORY_LABEL: Record<AqiCategory, string> = {
  good: "Good",
  moderate: "Moderate",
  unhealthy_sensitive: "Unhealthy for Sensitive Groups",
  unhealthy: "Unhealthy",
  very_unhealthy: "Very Unhealthy",
  hazardous: "Hazardous",
};

// Mapped onto the fixed status palette (good/warning/serious/critical) via
// CSS custom properties in globals.css -- never a raw hex here, so light/dark
// and any future palette swap stay in one place.
export const AQI_CATEGORY_COLOR: Record<AqiCategory, string> = {
  good: "var(--status-good)",
  moderate: "var(--status-good)",
  unhealthy_sensitive: "var(--status-warning)",
  unhealthy: "var(--status-serious)",
  very_unhealthy: "var(--status-critical)",
  hazardous: "var(--status-critical)",
};

export const DENSITY_LABEL: Record<DensityClass, string> = {
  clear: "Clear",
  hazy: "Hazy",
  heavy: "Heavy smoke",
};

export const DENSITY_COLOR: Record<DensityClass, string> = {
  clear: "var(--status-good)",
  hazy: "var(--status-warning)",
  heavy: "var(--status-critical)",
};

export const RISK_LEVEL_LABEL: Record<string, string> = {
  low: "Low risk",
  moderate: "Moderate risk",
  high: "High risk",
  very_high: "Very high risk",
};

export const RISK_LEVEL_COLOR: Record<string, string> = {
  low: "var(--status-good)",
  moderate: "var(--status-warning)",
  high: "var(--status-serious)",
  very_high: "var(--status-critical)",
};

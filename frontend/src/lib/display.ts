import type { AqiCategory, DensityClass } from "./types";

export const AQI_CATEGORY_LABEL: Record<AqiCategory, string> = {
  good: "Good",
  moderate: "Moderate",
  unhealthy_sensitive: "Unhealthy for Sensitive Groups",
  unhealthy: "Unhealthy",
  very_unhealthy: "Very Unhealthy",
  hazardous: "Hazardous",
};

export const AQI_CATEGORY_COLOR: Record<AqiCategory, string> = {
  good: "#22c55e",
  moderate: "#eab308",
  unhealthy_sensitive: "#f97316",
  unhealthy: "#ef4444",
  very_unhealthy: "#a855f7",
  hazardous: "#7f1d1d",
};

export const DENSITY_LABEL: Record<DensityClass, string> = {
  clear: "Clear",
  hazy: "Hazy",
  heavy: "Heavy smoke",
};

export const DENSITY_COLOR: Record<DensityClass, string> = {
  clear: "#22c55e",
  hazy: "#f97316",
  heavy: "#7f1d1d",
};

export const RISK_LEVEL_LABEL: Record<string, string> = {
  low: "Low risk",
  moderate: "Moderate risk",
  high: "High risk",
  very_high: "Very high risk",
};

export const RISK_LEVEL_COLOR: Record<string, string> = {
  low: "#22c55e",
  moderate: "#eab308",
  high: "#ef4444",
  very_high: "#7f1d1d",
};

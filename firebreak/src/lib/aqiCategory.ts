import type { AqiCategory } from "./types";

// Mirrors backend/app/services/aqi_utils.py's EPA breakpoints -- used
// client-side only for coloring chart points by category, not as a source
// of truth (the backend already returns the authoritative category).
export function aqiToCategory(aqi: number): AqiCategory {
  if (aqi <= 50) return "good";
  if (aqi <= 100) return "moderate";
  if (aqi <= 150) return "unhealthy_sensitive";
  if (aqi <= 200) return "unhealthy";
  if (aqi <= 300) return "very_unhealthy";
  return "hazardous";
}

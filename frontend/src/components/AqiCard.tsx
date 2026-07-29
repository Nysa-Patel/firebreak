"use client";

import { AQI_CATEGORY_COLOR, AQI_CATEGORY_LABEL } from "@/lib/display";
import type { AqiResponse } from "@/lib/types";

export function AqiCard({ aqi, loading }: { aqi: AqiResponse | null; loading: boolean }) {
  if (loading) {
    return (
      <div className="rounded-xl border border-black/10 dark:border-white/15 p-4 animate-pulse">
        Loading nearby AQI...
      </div>
    );
  }
  if (!aqi) {
    return (
      <div className="rounded-xl border border-black/10 dark:border-white/15 p-4 text-sm opacity-70">
        Couldn&apos;t load AQI data right now.
      </div>
    );
  }

  const color = AQI_CATEGORY_COLOR[aqi.category];

  return (
    <div className="rounded-xl border border-black/10 dark:border-white/15 p-4 space-y-2">
      <h2 className="font-semibold text-sm uppercase tracking-wide opacity-70">Official air quality</h2>
      <div className="flex items-center gap-3">
        <span
          className="size-3 rounded-full shrink-0"
          style={{ backgroundColor: color }}
          aria-hidden
        />
        <span className="text-2xl font-bold">{aqi.aqi ?? "--"}</span>
        <span className="text-sm">{AQI_CATEGORY_LABEL[aqi.category]}</span>
      </div>
      {aqi.source === "stub" && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          Demo data -- no AirNow API key configured yet.
        </p>
      )}
      {aqi.station_distance_km != null && (
        <p className="text-xs opacity-60">Nearest official station ~{aqi.station_distance_km} km away.</p>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { getTrend } from "@/lib/api";
import { useGeolocation } from "@/lib/useGeolocation";
import type { TrendResponse } from "@/lib/types";
import { TrendChart } from "@/components/TrendChart";
import { StatTile } from "@/components/StatTile";

const WINDOWS = [
  { hours: 6, label: "6h" },
  { hours: 24, label: "24h" },
  { hours: 48, label: "48h" },
];

const DIRECTION_ARROW: Record<TrendResponse["direction"], string> = {
  improving: "↓",
  steady: "→",
  worsening: "↑",
};

export default function TrendsPage() {
  const { lat, lon } = useGeolocation();
  const [windowHours, setWindowHours] = useState(24);
  const [trend, setTrend] = useState<TrendResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (lat == null || lon == null) return;
    setLoading(true);
    getTrend(lat, lon, windowHours)
      .then(setTrend)
      .catch(() => setTrend(null))
      .finally(() => setLoading(false));
  }, [lat, lon, windowHours]);

  const values = trend?.readings.map((r) => r.aqi) ?? [];
  const min = values.length ? Math.min(...values) : null;
  const max = values.length ? Math.max(...values) : null;
  const projectedIn3h = trend?.forecast.find((f) => f.hours_ahead === 3)?.aqi ?? null;

  return (
    <main className="max-w-5xl mx-auto w-full px-4 py-8 space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">AQI trend</h1>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Projected from AQI readings this app has logged for your area using Holt&apos;s linear
          smoothing (a standard time-series forecasting technique) -- a real short-term statistical
          forecast, not a predictive atmospheric model.
        </p>
      </header>

      <div className="flex items-center gap-2">
        {WINDOWS.map((w) => (
          <button
            key={w.hours}
            onClick={() => setWindowHours(w.hours)}
            className="text-sm px-3 py-1.5 rounded-full transition-colors"
            style={{
              background: windowHours === w.hours ? "#e5e7eb" : "var(--surface-2)",
              color: windowHours === w.hours ? "#111827" : "var(--text-secondary)",
              fontWeight: windowHours === w.hours ? 600 : 400,
            }}
          >
            {w.label}
          </button>
        ))}
      </div>

      <div className="card p-5">
        {loading ? (
          <div className="h-[220px] animate-pulse" style={{ background: "var(--surface-2)", borderRadius: 8 }} />
        ) : trend ? (
          <TrendChart readings={trend.readings} forecast={trend.forecast} windowHours={windowHours} method={trend.method} />
        ) : (
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Couldn&apos;t load trend data right now.
          </p>
        )}
      </div>

      {trend && (
        <>
          <div className="grid sm:grid-cols-4 gap-4">
            <StatTile
              label="Direction"
              value={`${DIRECTION_ARROW[trend.direction]} ${trend.direction}`}
              sub={`over the last ${windowHours}h`}
            />
            <StatTile label="Lowest AQI" value={min != null ? String(min) : "--"} sub={`last ${windowHours}h`} />
            <StatTile label="Highest AQI" value={max != null ? String(max) : "--"} sub={`last ${windowHours}h`} />
            <StatTile
              label="Projected"
              value={projectedIn3h != null ? String(Math.round(projectedIn3h)) : "--"}
              sub="in 3h (forecast)"
            />
          </div>

          <div className="card p-5">
            <p className="text-sm">{trend.basis}</p>
            <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
              {trend.disclaimer}
            </p>
          </div>
        </>
      )}
    </main>
  );
}

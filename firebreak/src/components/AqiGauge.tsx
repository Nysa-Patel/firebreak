"use client";

import type { AqiResponse } from "@/lib/types";
import { AQI_CATEGORY_LABEL } from "@/lib/display";

const GAUGE_MAX = 300; // clamp display scale; hazardous (301+) pins to the right edge

// Same status palette as the risk badge -- good/warning/serious/critical --
// stretched across the 0-300 AQI scale as a gradient track rather than 6
// discrete EPA bands, since a meter reads better as a continuum than steps.
const TRACK_GRADIENT =
  "linear-gradient(90deg, var(--status-good) 0%, var(--status-warning) 33%, var(--status-serious) 66%, var(--status-critical) 100%)";

interface Props {
  aqi: AqiResponse | null;
  status?: "loading" | "ready" | "error";
}

export function AqiGauge({ aqi, status = "ready" }: Props) {
  if (status === "loading") {
    return (
      <div className="card p-5 animate-pulse">
        <SectionLabel>Official air quality</SectionLabel>
        <p className="text-sm mt-2" style={{ color: "var(--text-muted)" }}>
          Loading -- if the backend has been idle it can take up to a minute
          to wake back up.
        </p>
      </div>
    );
  }

  if (status === "error" || !aqi) {
    return (
      <div className="card p-5">
        <SectionLabel>Official air quality</SectionLabel>
        <p className="text-sm mt-2" style={{ color: "var(--text-secondary)" }}>
          Couldn&apos;t load AQI data right now.
        </p>
      </div>
    );
  }

  if (aqi.aqi == null) {
    // The fetch succeeded -- this isn't a failure, AirNow just has no station
    // within range here. That's a real monitoring desert, not an error, so
    // say so plainly instead of showing a generic "couldn't load" message.
    return (
      <div className="card p-5">
        <SectionLabel>Official air quality</SectionLabel>
        <p className="text-sm mt-2" style={{ color: "var(--text-secondary)" }}>
          No official AQI station is reporting near this location -- this looks like a monitoring
          desert. Try the sky photo tool below, or check the coverage map for nearby crowd reports.
        </p>
      </div>
    );
  }

  const pct = Math.min(100, Math.max(0, (aqi.aqi / GAUGE_MAX) * 100));

  return (
    <div className="card p-5">
      <div className="flex items-baseline justify-between">
        <SectionLabel>Official air quality</SectionLabel>
        {aqi.source === "stub" && (
          <span className="text-xs" style={{ color: "var(--status-warning)" }}>
            demo data
          </span>
        )}
      </div>

      <div className="flex items-end gap-3 mt-2">
        <span className="font-semibold leading-none" style={{ fontSize: "48px", fontVariantNumeric: "proportional-nums" }}>
          {aqi.aqi}
        </span>
        <span className="text-base mb-1" style={{ color: "var(--text-secondary)" }}>
          {AQI_CATEGORY_LABEL[aqi.category]}
        </span>
      </div>

      <div className="mt-4 relative h-2.5 rounded-full" style={{ background: TRACK_GRADIENT }}>
        <div
          className="absolute top-1/2 rounded-full"
          style={{
            left: `${pct}%`,
            width: 3,
            height: 16,
            transform: "translate(-50%, -50%)",
            background: "var(--text-primary)",
            boxShadow: "0 0 0 2px var(--surface-1)",
          }}
          aria-hidden
        />
      </div>
      <div className="flex justify-between text-xs mt-1" style={{ color: "var(--text-muted)" }}>
        <span>0</span>
        <span>150</span>
        <span>300+</span>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        {aqi.pm25 != null && (
          <div>
            <dt style={{ color: "var(--text-muted)" }}>PM2.5</dt>
            <dd className="font-medium">{aqi.pm25} µg/m³</dd>
          </div>
        )}
        {aqi.station_distance_km != null && (
          <div>
            <dt style={{ color: "var(--text-muted)" }}>Nearest station</dt>
            <dd className="font-medium">{aqi.station_distance_km} km away</dd>
          </div>
        )}
      </dl>
    </div>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
      {children}
    </h2>
  );
}

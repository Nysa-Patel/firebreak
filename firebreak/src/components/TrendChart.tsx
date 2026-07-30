"use client";

import { useMemo, useState } from "react";
import type { TrendReading } from "@/lib/types";
import { AQI_CATEGORY_COLOR } from "@/lib/display";
import { aqiToCategory } from "@/lib/aqiCategory";

const WIDTH = 640;
const HEIGHT = 220;
const PAD_LEFT = 36;
const PAD_RIGHT = 12;
const PAD_TOP = 12;
const PAD_BOTTOM = 28;

function niceMax(value: number): number {
  if (value <= 50) return 50;
  if (value <= 100) return 100;
  if (value <= 150) return 150;
  if (value <= 200) return 200;
  if (value <= 300) return 300;
  return Math.ceil(value / 100) * 100;
}

export function TrendChart({ readings, windowHours }: { readings: TrendReading[]; windowHours: number }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const plot = useMemo(() => {
    if (readings.length < 2) return null;

    const times = readings.map((r) => new Date(r.recorded_at).getTime());
    const values = readings.map((r) => r.aqi);
    const t0 = times[0];
    const t1 = times[times.length - 1];
    const tRange = t1 - t0 || 1;
    const yMax = niceMax(Math.max(...values, 50));

    const plotWidth = WIDTH - PAD_LEFT - PAD_RIGHT;
    const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;

    const points = readings.map((r, i) => {
      const x = PAD_LEFT + ((times[i] - t0) / tRange) * plotWidth;
      const y = PAD_TOP + plotHeight - (r.aqi / yMax) * plotHeight;
      return { x, y, aqi: r.aqi, time: times[i] };
    });

    const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

    const yTicks = [0, yMax / 2, yMax];
    const xTicks = [t0, (t0 + t1) / 2, t1];

    return { points, line, yMax, yTicks, xTicks, plotWidth, plotHeight };
  }, [readings]);

  if (!plot) {
    return (
      <div className="flex items-center justify-center h-[220px] text-sm" style={{ color: "var(--text-muted)" }}>
        Not enough logged readings yet over the last {windowHours}h to chart -- check back after this
        area has had a few more AQI lookups.
      </div>
    );
  }

  const { points, line, yTicks, xTicks, plotHeight } = plot;
  const hovered = hoverIndex != null ? points[hoverIndex] : null;

  function handleMouseMove(e: React.MouseEvent<SVGRectElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * WIDTH;
    let closest = 0;
    let closestDist = Infinity;
    points.forEach((p, i) => {
      const d = Math.abs(p.x - mouseX);
      if (d < closestDist) {
        closestDist = d;
        closest = i;
      }
    });
    setHoverIndex(closest);
  }

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      width="100%"
      style={{ maxWidth: WIDTH }}
      role="img"
      aria-label={`AQI trend over the last ${windowHours} hours`}
    >
      {yTicks.map((t) => {
        const y = PAD_TOP + plotHeight - (t / plot.yMax) * plotHeight;
        return (
          <g key={t}>
            <line x1={PAD_LEFT} x2={WIDTH - PAD_RIGHT} y1={y} y2={y} stroke="var(--gridline)" strokeWidth={1} />
            <text x={PAD_LEFT - 6} y={y + 4} textAnchor="end" fontSize={11} fill="var(--text-muted)">
              {Math.round(t)}
            </text>
          </g>
        );
      })}

      {xTicks.map((t, i) => {
        const p = points.find((pt) => pt.time >= t) ?? points[points.length - 1];
        const label = new Date(t).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
        return (
          <text key={i} x={p.x} y={HEIGHT - 8} textAnchor="middle" fontSize={11} fill="var(--text-muted)">
            {label}
          </text>
        );
      })}

      <path d={line} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

      {hovered && (
        <>
          <line
            x1={hovered.x}
            x2={hovered.x}
            y1={PAD_TOP}
            y2={PAD_TOP + plotHeight}
            stroke="var(--text-muted)"
            strokeWidth={1}
            strokeDasharray="3,3"
          />
          <circle cx={hovered.x} cy={hovered.y} r={4} fill={AQI_CATEGORY_COLOR[aqiToCategory(hovered.aqi)]} stroke="var(--surface-1)" strokeWidth={2} />
        </>
      )}

      <rect
        x={PAD_LEFT}
        y={PAD_TOP}
        width={WIDTH - PAD_LEFT - PAD_RIGHT}
        height={plotHeight}
        fill="transparent"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverIndex(null)}
      />

      {hovered && (
        <g>
          <rect
            x={Math.min(Math.max(hovered.x - 46, PAD_LEFT), WIDTH - PAD_RIGHT - 92)}
            y={PAD_TOP + 2}
            width={92}
            height={34}
            rx={6}
            fill="var(--surface-2)"
            stroke="var(--border)"
          />
          <text
            x={Math.min(Math.max(hovered.x - 46, PAD_LEFT), WIDTH - PAD_RIGHT - 92) + 8}
            y={PAD_TOP + 16}
            fontSize={12}
            fontWeight={600}
            fill="var(--text-primary)"
          >
            AQI {hovered.aqi}
          </text>
          <text
            x={Math.min(Math.max(hovered.x - 46, PAD_LEFT), WIDTH - PAD_RIGHT - 92) + 8}
            y={PAD_TOP + 29}
            fontSize={11}
            fill="var(--text-muted)"
          >
            {new Date(hovered.time).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
          </text>
        </g>
      )}
    </svg>
  );
}

"use client";

import { useMemo, useState } from "react";
import type { ForecastPoint, TrendReading } from "@/lib/types";
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

export function TrendChart({
  readings,
  forecast = [],
  windowHours,
  method,
}: {
  readings: TrendReading[];
  forecast?: ForecastPoint[];
  windowHours: number;
  method?: string;
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const plot = useMemo(() => {
    if (readings.length < 1) return null;

    const times = readings.map((r) => new Date(r.recorded_at).getTime());
    const values = readings.map((r) => r.aqi);
    const t0 = times[0];
    const lastActualTime = times[times.length - 1];
    const forecastTimes = forecast.map((f) => lastActualTime + f.hours_ahead * 3_600_000);
    const t1 = forecastTimes.length ? forecastTimes[forecastTimes.length - 1] : lastActualTime;
    const tRange = t1 - t0 || 1;
    const yMax = niceMax(Math.max(...values, ...forecast.map((f) => f.aqi), 50));

    const plotWidth = WIDTH - PAD_LEFT - PAD_RIGHT;
    const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;

    const toXY = (time: number, aqi: number) => ({
      x: PAD_LEFT + ((time - t0) / tRange) * plotWidth,
      y: PAD_TOP + plotHeight - (aqi / yMax) * plotHeight,
    });

    const points = readings.map((r, i) => ({ ...toXY(times[i], r.aqi), aqi: r.aqi, time: times[i] }));
    const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

    const lastPoint = points[points.length - 1];
    const forecastPoints = forecast.map((f, i) => ({
      ...toXY(forecastTimes[i], f.aqi),
      aqi: f.aqi,
      hoursAhead: f.hours_ahead,
    }));
    const forecastLine = forecastPoints.length
      ? [lastPoint, ...forecastPoints].map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")
      : null;

    const yTicks = [0, yMax / 2, yMax];
    const xTicks = t0 === lastActualTime ? [t0] : [t0, (t0 + lastActualTime) / 2, lastActualTime];

    return { points, line, forecastPoints, forecastLine, yMax, yTicks, xTicks, plotWidth, plotHeight };
  }, [readings, forecast]);

  if (!plot) {
    return (
      <div className="flex items-center justify-center h-[220px] text-sm" style={{ color: "var(--text-muted)" }}>
        No AQI lookups logged yet for this area over the last {windowHours}h -- checking the current
        AQI for it will log the first reading.
      </div>
    );
  }

  const { points, line, forecastPoints, forecastLine, yTicks, xTicks, plotHeight } = plot;
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
      aria-label={`AQI trend over the last ${windowHours} hours, with a short-term forecast`}
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

      <path d={line} fill="none" stroke="#e5e7eb" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

      {forecastLine && (
        <path
          d={forecastLine}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={2}
          strokeDasharray="5,4"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.6}
        />
      )}

      {forecastPoints.map((p) => (
        <circle
          key={p.hoursAhead}
          cx={p.x}
          cy={p.y}
          r={3.5}
          fill="var(--surface-1)"
          stroke="#e5e7eb"
          strokeWidth={2}
          opacity={0.85}
        />
      ))}

      {forecastPoints.length > 0 && (
        <text x={WIDTH - PAD_RIGHT} y={PAD_TOP + 10} textAnchor="end" fontSize={10} fill="var(--text-muted)">
          {method === "persistence_baseline" ? "- - flat baseline, not a real trend" : "- - projected (Holt's smoothing)"}
        </text>
      )}

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

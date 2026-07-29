"use client";

import type { TrendResponse } from "@/lib/types";
import { SectionLabel } from "@/components/AqiGauge";

const ARROW: Record<TrendResponse["direction"], string> = {
  improving: "↓",
  steady: "→",
  worsening: "↑",
};

const DIRECTION_COLOR: Record<TrendResponse["direction"], string> = {
  improving: "var(--status-good)",
  steady: "var(--text-secondary)",
  worsening: "var(--status-critical)",
};

const WIDTH = 240;
const HEIGHT = 48;
const PADDING = 4;

function buildPath(values: number[]): { line: string; points: [number, number][] } {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points: [number, number][] = values.map((v, i) => {
    const x = values.length === 1 ? WIDTH / 2 : (i / (values.length - 1)) * (WIDTH - PADDING * 2) + PADDING;
    const y = HEIGHT - PADDING - ((v - min) / range) * (HEIGHT - PADDING * 2);
    return [x, y];
  });

  const line = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  return { line, points };
}

export function TrendSparkline({ trend }: { trend: TrendResponse | null }) {
  if (!trend) return null;

  const values = (trend.readings ?? []).map((r) => r.aqi);
  const hasSeries = values.length >= 2;

  return (
    <div className="card p-5">
      <SectionLabel>Short-term trend</SectionLabel>
      <div className="flex items-center gap-2 mt-2">
        <span className="text-2xl font-semibold" style={{ color: DIRECTION_COLOR[trend.direction] }}>
          {ARROW[trend.direction]}
        </span>
        <span className="text-lg font-medium capitalize">{trend.direction}</span>
      </div>

      {hasSeries && (
        <svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="mt-3" role="img" aria-label="Recent AQI trend">
          {(() => {
            const { line, points } = buildPath(values);
            const [lastX, lastY] = points[points.length - 1];
            return (
              <>
                <path d={line} fill="none" stroke="var(--text-muted)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                <circle cx={lastX} cy={lastY} r={4} fill={DIRECTION_COLOR[trend.direction]} stroke="var(--surface-1)" strokeWidth={2} />
              </>
            );
          })()}
        </svg>
      )}

      <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
        {trend.basis}
      </p>
      <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
        {trend.disclaimer}
      </p>
    </div>
  );
}

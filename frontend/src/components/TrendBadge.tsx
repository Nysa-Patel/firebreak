"use client";

import type { TrendResponse } from "@/lib/types";

const ARROW: Record<TrendResponse["direction"], string> = {
  improving: "↓",
  steady: "→",
  worsening: "↑",
};

export function TrendBadge({ trend }: { trend: TrendResponse | null }) {
  if (!trend) return null;

  return (
    <div className="rounded-xl border border-black/10 dark:border-white/15 p-4 space-y-1">
      <h2 className="font-semibold text-sm uppercase tracking-wide opacity-70">Short-term trend</h2>
      <p className="text-lg font-bold">
        {ARROW[trend.direction]} {trend.direction}
      </p>
      <p className="text-xs opacity-60">{trend.basis}</p>
      <p className="text-xs opacity-50">{trend.disclaimer}</p>
    </div>
  );
}

"use client";

import { RISK_LEVEL_COLOR, RISK_LEVEL_LABEL } from "@/lib/display";
import { RISK_ICON } from "@/components/icons";
import type { RiskScoreResponse } from "@/lib/types";

export function RecommendationCard({ result }: { result: RiskScoreResponse | null }) {
  if (!result) {
    return (
      <div className="card p-6 animate-pulse">
        <div className="h-4 w-32 rounded" style={{ background: "var(--surface-2)" }} />
        <div className="h-8 w-48 rounded mt-3" style={{ background: "var(--surface-2)" }} />
      </div>
    );
  }

  const color = RISK_LEVEL_COLOR[result.risk_level];
  const Icon = RISK_ICON[result.risk_level] ?? RISK_ICON.low;

  return (
    <div className="card p-6" style={{ borderColor: `color-mix(in srgb, ${color} 40%, var(--border))` }}>
      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
        For you, right now
      </p>

      <div className="flex items-center gap-3 mt-2">
        <span
          className="inline-flex items-center justify-center rounded-full shrink-0"
          style={{ width: 40, height: 40, background: `color-mix(in srgb, ${color} 16%, transparent)`, color }}
        >
          <Icon size={22} />
        </span>
        <span className="font-semibold" style={{ fontSize: "28px", color }}>
          {RISK_LEVEL_LABEL[result.risk_level]}
        </span>
      </div>

      <p className="text-[15px] mt-3 leading-relaxed">{result.recommendation}</p>

      {result.contributing_factors.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {result.contributing_factors.map((factor) => (
            <span
              key={factor}
              className="text-xs px-2 py-1 rounded-full"
              style={{ background: "var(--surface-2)", color: "var(--text-secondary)" }}
            >
              {factor}
            </span>
          ))}
        </div>
      )}

      <p className="text-xs mt-4 pt-3" style={{ color: "var(--text-muted)", borderTop: "1px solid var(--border)" }}>
        Not a medical device -- if you have a serious respiratory condition, follow your doctor&apos;s
        guidance over this estimate.
      </p>
    </div>
  );
}

"use client";

import { RISK_LEVEL_COLOR } from "@/lib/display";
import { RiskDial } from "@/components/RiskDial";
import type { RiskScoreResponse } from "@/lib/types";

export function RecommendationCard({ result }: { result: RiskScoreResponse | null }) {
  if (!result) {
    return (
      <div className="card p-6 animate-pulse">
        <div className="h-4 w-32 rounded" style={{ background: "var(--surface-2)" }} />
        <div className="h-24 w-full rounded mt-3" style={{ background: "var(--surface-2)" }} />
      </div>
    );
  }

  const color = RISK_LEVEL_COLOR[result.risk_level];

  return (
    <div
      className="card p-6"
      style={{
        borderColor: `color-mix(in srgb, ${color} 45%, var(--border))`,
        borderWidth: 2,
        background: `linear-gradient(160deg, color-mix(in srgb, ${color} 8%, var(--surface-1)), var(--surface-1) 55%)`,
      }}
    >
      <p className="text-xs font-bold uppercase tracking-wide font-display" style={{ color }}>
        For you, right now
      </p>

      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 mt-2">
        <RiskDial level={result.risk_level} />

        <div className="flex-1 min-w-0">
          <p className="text-[15px] leading-relaxed">{result.recommendation}</p>

          {result.contributing_factors.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {result.contributing_factors.map((factor) => (
                <span
                  key={factor}
                  className="text-xs px-2 py-1 rounded-full"
                  style={{ background: "var(--surface-2)", color: "var(--text-secondary)", border: `1px solid color-mix(in srgb, ${color} 35%, var(--border))` }}
                >
                  {factor}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <p className="text-xs mt-4 pt-3" style={{ color: "var(--text-muted)", borderTop: "1px solid var(--border)" }}>
        Not a medical device -- if you have a serious respiratory condition, follow your doctor&apos;s
        guidance over this estimate.
      </p>
    </div>
  );
}

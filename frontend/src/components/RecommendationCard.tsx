"use client";

import { RISK_LEVEL_COLOR, RISK_LEVEL_LABEL } from "@/lib/display";
import type { RiskScoreResponse } from "@/lib/types";

export function RecommendationCard({ result }: { result: RiskScoreResponse | null }) {
  if (!result) {
    return (
      <div className="rounded-xl border border-black/10 dark:border-white/15 p-4 text-sm opacity-70">
        Recommendation will appear here once AQI data loads.
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border p-4 space-y-2"
      style={{ borderColor: RISK_LEVEL_COLOR[result.risk_level] }}
    >
      <h2 className="font-semibold text-sm uppercase tracking-wide opacity-70">For you, right now</h2>
      <p className="font-bold" style={{ color: RISK_LEVEL_COLOR[result.risk_level] }}>
        {RISK_LEVEL_LABEL[result.risk_level]}
      </p>
      <p className="text-sm">{result.recommendation}</p>
      {result.contributing_factors.length > 0 && (
        <p className="text-xs opacity-60">Factors: {result.contributing_factors.join(", ")}</p>
      )}
      <p className="text-xs opacity-50 pt-1">
        Not a medical device -- if you have a serious respiratory condition, follow your doctor&apos;s
        guidance over this estimate.
      </p>
    </div>
  );
}

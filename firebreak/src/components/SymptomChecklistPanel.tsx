"use client";

import { useEffect, useRef, useState } from "react";
import { evaluateSymptomFlag, getSymptomChecklist } from "@/lib/api";
import { appendSymptomChecklistLog } from "@/lib/localSymptomLog";
import { SectionLabel } from "@/components/AqiGauge";
import type {
  ConditionBucket,
  DensityClass,
  RiskProfile,
  SymptomChecklistResponse,
  SymptomFlagLevel,
  SymptomFlagResponse,
} from "@/lib/types";

interface Props {
  profile: RiskProfile;
  aqi: number | null;
  densityClass: DensityClass | null;
  onFlagChange: (level: SymptomFlagLevel) => void;
  /** Changes when switching between "my profile" and a persona preview --
   * resets the checklist so one persona's answers don't leak into another's. */
  resetKey: string;
}

const BUCKET_LABEL: Record<ConditionBucket, string> = {
  general: "General",
  asthma_copd: "Asthma / COPD",
  cardiovascular: "Cardiovascular",
  pregnancy: "Pregnancy",
};

const LEVEL_COLOR: Record<SymptomFlagLevel, string> = {
  none: "var(--text-muted)",
  mild: "var(--text-secondary)",
  elevated: "var(--status-warning)",
  urgent: "var(--status-critical)",
  emergency: "var(--status-critical)",
};

// Small neutral tag marking a feature as a fixed rule table rather than a
// trained model -- deliberately unobtrusive (no accent/status color) since
// it's a provenance label, not a severity signal.
function RuleTag() {
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full shrink-0"
      style={{ background: "var(--surface-2)", color: "var(--text-muted)", fontWeight: 600 }}
    >
      Rule-based
    </span>
  );
}

function activeConditionsFor(profile: RiskProfile): ConditionBucket[] {
  const buckets: ConditionBucket[] = ["general"];
  if (profile.has_respiratory_condition) buckets.push("asthma_copd");
  if (profile.has_cardiovascular_condition) buckets.push("cardiovascular");
  if (profile.is_pregnant) buckets.push("pregnancy");
  return buckets;
}

export function SymptomChecklistPanel({ profile, aqi, densityClass, onFlagChange, resetKey }: Props) {
  const [checklist, setChecklist] = useState<SymptomChecklistResponse | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  const [flagResult, setFlagResult] = useState<SymptomFlagResponse | null>(null);

  const activeConditions = activeConditionsFor(profile);
  const hasDeclaredCondition = activeConditions.length > 1;
  const hadDeclaredCondition = useRef(hasDeclaredCondition);

  useEffect(() => {
    getSymptomChecklist()
      .then(setChecklist)
      .catch(() => setChecklist(null));
  }, []);

  useEffect(() => {
    setCheckedIds([]);
    setFlagResult(null);
    onFlagChange("none");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only resetKey should trigger this, not onFlagChange identity
  }, [resetKey]);

  // Auto-expand the moment a condition becomes declared -- never auto-collapse,
  // so a user who opens it manually (with no condition) isn't fought with.
  useEffect(() => {
    if (hasDeclaredCondition && !hadDeclaredCondition.current) {
      setExpanded(true);
    }
    hadDeclaredCondition.current = hasDeclaredCondition;
  }, [hasDeclaredCondition]);

  async function handleToggle(symptomId: string, checked: boolean) {
    const nextChecked = checked ? [...checkedIds, symptomId] : checkedIds.filter((id) => id !== symptomId);
    setCheckedIds(nextChecked);

    try {
      const result = await evaluateSymptomFlag(nextChecked);
      setFlagResult(result);
      onFlagChange(result.level);
      appendSymptomChecklistLog({
        logged_at: new Date().toISOString(),
        checked_symptom_ids: nextChecked,
        active_conditions: activeConditions,
        flag_level: result.level,
        flag_message: result.message,
        aqi,
        density_class: densityClass,
      });
    } catch {
      // best-effort -- if the flag call fails, the checklist state still reflects
      // what the user checked, it just won't have escalated the recommendation this round
    }
  }

  if (!checklist) return null;

  return (
    <div className="p-5" style={{ borderTop: "1px solid var(--border)" }}>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between text-left"
      >
        <div>
          <SectionLabel>Symptom check</SectionLabel>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            {hasDeclaredCondition
              ? "Log symptoms tied to your declared condition(s) to get a more specific recommendation."
              : "Optional -- log how smoke exposure is affecting you today."}
          </p>
        </div>
        <span className="text-sm shrink-0 ml-3" style={{ color: "var(--text-muted)" }}>
          {expanded ? "Hide" : "Show"}
        </span>
      </button>

      {expanded && (
        <div className="mt-4 space-y-4">
          <div
            className="text-sm rounded-lg px-4 py-3"
            style={{
              background: "color-mix(in srgb, var(--status-critical) 10%, var(--surface-2))",
              border: "1px solid var(--status-critical)",
              color: "var(--text-primary)",
              fontWeight: 500,
            }}
          >
            {checklist.disclaimer}
          </div>

          {activeConditions.map((bucket) => {
            const items = checklist.conditions[bucket];
            if (!items || items.length === 0) return null;
            return (
              <div key={bucket}>
                <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--text-muted)" }}>
                  {BUCKET_LABEL[bucket]}
                </p>
                {items.map((item, i, arr) => (
                  <label
                    key={item.id}
                    className="flex items-center justify-between gap-4 py-2 text-sm"
                    style={{ borderBottom: i === arr.length - 1 ? "none" : "1px solid var(--gridline)" }}
                  >
                    {item.label}
                    <input
                      type="checkbox"
                      checked={checkedIds.includes(item.id)}
                      onChange={(e) => handleToggle(item.id, e.target.checked)}
                      className="size-4 shrink-0"
                      style={{ accentColor: "#6b7280" }}
                    />
                  </label>
                ))}
              </div>
            );
          })}

          {flagResult && flagResult.level !== "none" && (
            <p
              className="text-sm rounded-lg px-4 py-3"
              style={{
                background: "var(--surface-2)",
                color: LEVEL_COLOR[flagResult.level],
                fontWeight: flagResult.level === "emergency" || flagResult.level === "urgent" ? 600 : 400,
              }}
            >
              {flagResult.message}
            </p>
          )}

          {flagResult && (
            <div className="rounded-lg px-4 py-3 space-y-2" style={{ border: "1px solid var(--border)" }}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold">Symptom Pattern Match — Educational</p>
                <RuleTag />
              </div>

              {flagResult.pattern_match.matched ? (
                <>
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    Closest resemblance: <strong>{BUCKET_LABEL[flagResult.pattern_match.pattern!]}</strong>{" "}
                    ({flagResult.pattern_match.score}% overlap)
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {flagResult.pattern_match.matched_symptoms.map((label) => (
                      <span
                        key={label}
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: "var(--surface-2)", color: "var(--text-secondary)" }}
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  No clear pattern -- {flagResult.pattern_match.reason}
                </p>
              )}

              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                This is a pattern comparison, not a diagnosis. If you&apos;re concerned about your
                symptoms, talk to a healthcare provider.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

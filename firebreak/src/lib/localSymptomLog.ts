import type { ConditionBucket, DensityClass, SymptomFlagLevel } from "./types";

const STORAGE_KEY = "firebreak_symptom_checklist_log";
const MAX_ENTRIES = 500; // keep the log bounded -- this is browser storage, not a database

export interface SymptomChecklistLogEntry {
  logged_at: string;
  checked_symptom_ids: string[];
  active_conditions: ConditionBucket[];
  flag_level: SymptomFlagLevel;
  flag_message: string;
  aqi: number | null;
  density_class: DensityClass | null;
}

/** Same privacy model as the risk profile (useRiskProfile.ts) -- browser-only,
 * no account, never sent to a server. Kept so a later personalization/trend
 * feature has real exposure+symptom history to work from without this
 * feature itself needing any backend storage of its own. */
export function appendSymptomChecklistLog(entry: SymptomChecklistLogEntry): void {
  if (typeof window === "undefined") return;
  const existing = readSymptomChecklistLog();
  const updated = [...existing, entry].slice(-MAX_ENTRIES);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export function readSymptomChecklistLog(): SymptomChecklistLogEntry[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as SymptomChecklistLogEntry[];
  } catch {
    return [];
  }
}

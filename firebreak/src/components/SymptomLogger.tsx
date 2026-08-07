"use client";

import { useEffect, useState } from "react";
import { getDeviceId } from "@/lib/deviceId";
import { getPersonalThreshold, getSymptomLogs, logSymptom } from "@/lib/api";
import type { PersonalThresholdResponse, SymptomSeverity } from "@/lib/types";
import { SectionLabel } from "@/components/AqiGauge";

const SEVERITY_OPTIONS: { key: SymptomSeverity; label: string }[] = [
  { key: "none", label: "Fine" },
  { key: "mild", label: "Mild" },
  { key: "moderate", label: "Moderate" },
  { key: "severe", label: "Severe" },
];

function isToday(iso: string): boolean {
  return new Date(iso).toDateString() === new Date().toDateString();
}

export function SymptomLogger({ aqi }: { aqi: number | null }) {
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [threshold, setThreshold] = useState<PersonalThresholdResponse | null>(null);
  const [loggedToday, setLoggedToday] = useState(false);
  const [status, setStatus] = useState<"idle" | "logging" | "error">("idle");

  useEffect(() => {
    const id = getDeviceId();
    setDeviceId(id);
    getPersonalThreshold(id)
      .then(setThreshold)
      .catch(() => setThreshold(null));
    getSymptomLogs(id)
      .then((logs) => setLoggedToday(logs.some((l) => isToday(l.logged_at))))
      .catch(() => {
        /* best-effort -- worst case someone can log twice in a day */
      });
  }, []);

  async function handleLog(severity: SymptomSeverity) {
    if (deviceId == null || aqi == null) return;
    setStatus("logging");
    try {
      await logSymptom(deviceId, severity, aqi);
      setLoggedToday(true);
      setStatus("idle");
      getPersonalThreshold(deviceId)
        .then(setThreshold)
        .catch(() => {});
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="p-5">
      <SectionLabel>How are you feeling today?</SectionLabel>
      <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
        Log a few days and this learns your own symptom threshold from real AQI readings --
        instead of a generic age/condition bucket.
      </p>

      {aqi == null ? (
        <p className="text-sm mt-4" style={{ color: "var(--text-muted)" }}>
          Waiting for today&apos;s AQI reading before you can log.
        </p>
      ) : loggedToday ? (
        <p className="text-sm mt-4" style={{ color: "var(--success-text)" }}>
          Logged for today -- thanks. Come back tomorrow.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2 mt-4">
          {SEVERITY_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => handleLog(opt.key)}
              disabled={status === "logging"}
              className="text-sm font-medium rounded-full px-4 py-2 disabled:opacity-50"
              style={{ background: "var(--surface-2)", color: "var(--text-primary)" }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {status === "error" && (
        <p className="text-xs mt-3" style={{ color: "var(--status-critical)" }}>
          Couldn&apos;t save that -- try again in a moment.
        </p>
      )}

      {threshold?.has_enough_data ? (
        <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
          <p className="text-xs uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
            Your personal threshold
          </p>
          <p className="text-2xl font-semibold mt-1">AQI {Math.round(threshold.threshold_aqi ?? 0)}</p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            {threshold.message}
          </p>
        </div>
      ) : threshold ? (
        <p className="text-xs mt-4" style={{ color: "var(--text-muted)" }}>
          {threshold.message} ({threshold.logs_count}/{threshold.min_required})
        </p>
      ) : null}
    </div>
  );
}

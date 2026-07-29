"use client";

import { useState } from "react";
import { classifySmoke, submitPhoto } from "@/lib/api";
import { DENSITY_COLOR, DENSITY_LABEL } from "@/lib/display";
import type { ClassifySmokeResponse } from "@/lib/types";

interface Props {
  lat: number | null;
  lon: number | null;
  onClassified: (result: ClassifySmokeResponse | null) => void;
}

export function PhotoClassifier({ lat, lon, onClassified }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ClassifySmokeResponse | null>(null);
  const [status, setStatus] = useState<"idle" | "classifying" | "submitting" | "submitted" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleFile(selected: File) {
    setFile(selected);
    setStatus("classifying");
    setErrorMessage(null);
    try {
      const classification = await classifySmoke(selected);
      setResult(classification);
      onClassified(classification);
      setStatus("idle");
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Classification failed.");
    }
  }

  async function handleShareToMap() {
    if (!file || lat == null || lon == null) return;
    setStatus("submitting");
    try {
      await submitPhoto(lat, lon, new Date(), file);
      setStatus("submitted");
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Submission failed.");
    }
  }

  return (
    <div className="rounded-xl border border-black/10 dark:border-white/15 p-4 space-y-3">
      <h2 className="font-semibold text-sm uppercase tracking-wide opacity-70">Sky photo</h2>
      <p className="text-xs opacity-60">
        Take a photo of the sky to estimate local smoke density -- more precise than a distant
        station, especially in areas with sparse official monitoring.
      </p>

      <input
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        className="text-sm"
      />

      {status === "classifying" && <p className="text-sm opacity-70">Analyzing photo...</p>}

      {result && (
        <div className="flex items-center gap-3">
          <span
            className="size-3 rounded-full shrink-0"
            style={{ backgroundColor: DENSITY_COLOR[result.density_class] }}
            aria-hidden
          />
          <span className="font-medium">{DENSITY_LABEL[result.density_class]}</span>
          <span className="text-xs opacity-60">{Math.round(result.confidence * 100)}% confidence</span>
        </div>
      )}

      {result?.model_source === "unavailable_stub" && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          Trained CV model not deployed yet -- this is a placeholder heuristic estimate.
        </p>
      )}

      {result && lat != null && lon != null && status !== "submitted" && (
        <button
          onClick={handleShareToMap}
          disabled={status === "submitting"}
          className="text-sm rounded-md bg-foreground text-background px-3 py-1.5 disabled:opacity-50"
        >
          {status === "submitting" ? "Sharing..." : "Share to community map"}
        </button>
      )}
      {status === "submitted" && (
        <p className="text-sm text-green-600 dark:text-green-400">
          Shared -- thanks for helping fill in the coverage gap.
        </p>
      )}
      {status === "error" && errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}
    </div>
  );
}

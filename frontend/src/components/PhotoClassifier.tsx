"use client";

import { useEffect, useState } from "react";
import { classifySmoke, submitPhoto } from "@/lib/api";
import { DENSITY_COLOR, DENSITY_LABEL } from "@/lib/display";
import { DENSITY_ICON } from "@/components/icons";
import { SectionLabel } from "@/components/AqiGauge";
import type { ClassifySmokeResponse } from "@/lib/types";

interface Props {
  lat: number | null;
  lon: number | null;
  onClassified: (result: ClassifySmokeResponse | null) => void;
}

export function PhotoClassifier({ lat, lon, onClassified }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<ClassifySmokeResponse | null>(null);
  const [status, setStatus] = useState<"idle" | "classifying" | "submitting" | "submitted" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function handleFile(selected: File) {
    setFile(selected);
    setResult(null);
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

  const Icon = result ? DENSITY_ICON[result.density_class] : null;
  const color = result ? DENSITY_COLOR[result.density_class] : undefined;

  return (
    <div className="card p-5">
      <SectionLabel>Sky photo</SectionLabel>
      <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
        Take a photo of the sky to estimate local smoke density -- more precise than a distant
        station, especially in areas with sparse official monitoring.
      </p>

      <div className="flex items-start gap-4 mt-4">
        <label
          className="shrink-0 flex items-center justify-center rounded-lg overflow-hidden cursor-pointer"
          style={{ width: 84, height: 84, background: "var(--surface-2)", border: "1px dashed var(--border)" }}
        >
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- local object URL, not a remote asset worth next/image's optimization
            <img src={previewUrl} alt="Uploaded sky photo preview" className="w-full h-full object-cover" />
          ) : (
            <span className="text-xs text-center px-1" style={{ color: "var(--text-muted)" }}>
              Upload
            </span>
          )}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            className="hidden"
          />
        </label>

        <div className="flex-1 min-w-0">
          {status === "classifying" && (
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Analyzing photo...
            </p>
          )}

          {result && Icon && (
            <>
              <div className="flex items-center gap-2">
                <span style={{ color }}>
                  <Icon size={20} />
                </span>
                <span className="font-semibold">{DENSITY_LABEL[result.density_class]}</span>
              </div>
              <div className="mt-2 h-1.5 rounded-full max-w-[160px]" style={{ background: "var(--surface-2)" }}>
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.round(result.confidence * 100)}%`, background: color }}
                />
              </div>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                {Math.round(result.confidence * 100)}% confidence
              </p>
            </>
          )}

          {!result && status === "idle" && (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              No photo yet.
            </p>
          )}
        </div>
      </div>

      {result?.model_source === "unavailable_stub" && (
        <p className="text-xs mt-3" style={{ color: "var(--status-warning)" }}>
          Trained CV model not deployed yet -- this is a placeholder heuristic estimate.
        </p>
      )}

      {result && lat != null && lon != null && status !== "submitted" && (
        <button
          onClick={handleShareToMap}
          disabled={status === "submitting"}
          className="text-sm rounded-full px-4 py-2 mt-4 font-medium disabled:opacity-50"
          style={{ background: "var(--accent)", color: "#fff" }}
        >
          {status === "submitting" ? "Sharing..." : "Share to community map"}
        </button>
      )}
      {status === "submitted" && (
        <p className="text-sm mt-3" style={{ color: "var(--success-text)" }}>
          Shared -- thanks for helping fill in the coverage gap.
        </p>
      )}
      {status === "error" && errorMessage && (
        <p className="text-sm mt-3" style={{ color: "var(--status-critical)" }}>
          {errorMessage}
        </p>
      )}
    </div>
  );
}

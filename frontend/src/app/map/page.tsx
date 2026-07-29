"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { getCleanAirLocations, listSubmissions } from "@/lib/api";
import { useGeolocation } from "@/lib/useGeolocation";
import { DENSITY_COLOR, DENSITY_LABEL } from "@/lib/display";
import type { CleanAirLocationOut, DensityClass, SubmissionOut } from "@/lib/types";

// Leaflet touches `window` at import time, so it can only run client-side --
// SSR-ing it throws immediately in the App Router.
const SmokeMap = dynamic(() => import("@/components/SmokeMap").then((m) => m.SmokeMap), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center text-sm" style={{ color: "var(--text-muted)" }}>
      Loading map...
    </div>
  ),
});

const LEGEND_DENSITIES: DensityClass[] = ["clear", "hazy", "heavy"];

export default function MapPage() {
  const { lat, lon } = useGeolocation();
  const [submissions, setSubmissions] = useState<SubmissionOut[]>([]);
  const [locations, setLocations] = useState<CleanAirLocationOut[]>([]);

  useEffect(() => {
    listSubmissions().then(setSubmissions).catch(() => setSubmissions([]));
    if (lat != null && lon != null) {
      getCleanAirLocations(lat, lon, 50).then(setLocations).catch(() => setLocations([]));
    }
  }, [lat, lon]);

  return (
    <main className="max-w-5xl mx-auto w-full px-4 py-8 space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Community coverage map</h1>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Positions are fuzzed to a ~1km cell to protect submitters&apos; exact location. Marker size and
          opacity scale with each submission&apos;s trust score.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-4 text-sm">
        {LEGEND_DENSITIES.map((d) => (
          <span key={d} className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full" style={{ background: DENSITY_COLOR[d] }} aria-hidden />
            {DENSITY_LABEL[d]}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full" style={{ background: "#0ea5e9" }} aria-hidden />
          Clean-air location
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full" style={{ background: "var(--accent)" }} aria-hidden />
          You
        </span>
      </div>

      {/* Leaflet needs a container with a definite (non-percentage) height --
          relying on flex-grow to size it collapsed to 0px in some browser
          engines, so this uses an explicit viewport-relative height instead. */}
      <div className="h-[65vh] min-h-[400px] rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
        {lat != null && lon != null && (
          <SmokeMap center={[lat, lon]} submissions={submissions} cleanAirLocations={locations} />
        )}
      </div>
    </main>
  );
}

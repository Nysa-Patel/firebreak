"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getCleanAirLocations, listSubmissions } from "@/lib/api";
import { useGeolocation } from "@/lib/useGeolocation";
import type { CleanAirLocationOut, SubmissionOut } from "@/lib/types";

// Leaflet touches `window` at import time, so it can only run client-side --
// SSR-ing it throws immediately in the App Router.
const SmokeMap = dynamic(() => import("@/components/SmokeMap").then((m) => m.SmokeMap), {
  ssr: false,
  loading: () => <div className="h-full w-full flex items-center justify-center text-sm opacity-60">Loading map...</div>,
});

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
    <main className="max-w-4xl mx-auto w-full px-4 py-8 space-y-4">
      <header className="space-y-1">
        <Link href="/" className="text-sm underline underline-offset-4">
          ← Back to your risk
        </Link>
        <h1 className="text-2xl font-bold">Community coverage map</h1>
        <p className="text-sm opacity-70">
          Blue markers are seeded clean-air locations. Colored markers are recent community sky-photo
          submissions -- larger and more opaque means a higher trust score. Positions are fuzzed to a
          ~1km cell to protect submitters&apos; exact location.
        </p>
      </header>

      {/* Leaflet needs a container with a definite (non-percentage) height --
          relying on flex-grow to size it collapsed to 0px in some browser
          engines, so this uses an explicit viewport-relative height instead. */}
      <div className="h-[70vh] min-h-[400px] rounded-xl overflow-hidden border border-black/10 dark:border-white/15">
        {lat != null && lon != null && (
          <SmokeMap center={[lat, lon]} submissions={submissions} cleanAirLocations={locations} />
        )}
      </div>
    </main>
  );
}

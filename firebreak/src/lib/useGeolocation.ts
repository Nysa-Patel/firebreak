"use client";

import { useEffect, useState } from "react";
import { DEMO_REGION as FALLBACK } from "./demoRegion";
import { getLocationOverride, LOCATION_OVERRIDE_EVENT } from "./locationOverride";

interface GeoState {
  lat: number | null;
  lon: number | null;
  error: string | null;
  loading: boolean;
  /** Human-readable name when using a manual override or the demo fallback -- null when using real device geolocation. */
  label: string | null;
}

export function useGeolocation() {
  const [state, setState] = useState<GeoState>({ lat: null, lon: null, error: null, loading: true, label: null });

  useEffect(() => {
    function resolve() {
      // A manual override (see locationOverride.ts) always wins -- it skips
      // the real Geolocation API entirely, so switching to a picked city
      // doesn't need a fresh permission prompt and never races with it.
      const override = getLocationOverride();
      if (override) {
        setState({ lat: override.lat, lon: override.lon, error: null, loading: false, label: override.label });
        return;
      }

      if (!("geolocation" in navigator)) {
        setState({
          ...FALLBACK,
          error: "Geolocation not supported -- using demo region.",
          loading: false,
          label: "Chico, CA (demo)",
        });
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setState({ lat: pos.coords.latitude, lon: pos.coords.longitude, error: null, loading: false, label: null });
        },
        () => {
          setState({
            ...FALLBACK,
            error: "Location permission denied -- using demo region.",
            loading: false,
            label: "Chico, CA (demo)",
          });
        },
        { timeout: 8000, maximumAge: 0, enableHighAccuracy: true }
      );
    }

    resolve();
    window.addEventListener(LOCATION_OVERRIDE_EVENT, resolve);
    return () => window.removeEventListener(LOCATION_OVERRIDE_EVENT, resolve);
  }, []);

  return state;
}

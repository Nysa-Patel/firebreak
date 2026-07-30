"use client";

import { useEffect, useState } from "react";
import { DEMO_REGION as FALLBACK } from "./demoRegion";

interface GeoState {
  lat: number | null;
  lon: number | null;
  error: string | null;
  loading: boolean;
}

export function useGeolocation() {
  const [state, setState] = useState<GeoState>({ lat: null, lon: null, error: null, loading: true });

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setState({ ...FALLBACK, error: "Geolocation not supported -- using demo region.", loading: false });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setState({ lat: pos.coords.latitude, lon: pos.coords.longitude, error: null, loading: false });
      },
      () => {
        setState({ ...FALLBACK, error: "Location permission denied -- using demo region.", loading: false });
      },
      { timeout: 8000 }
    );
  }, []);

  return state;
}

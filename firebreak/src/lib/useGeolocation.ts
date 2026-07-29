"use client";

import { useEffect, useState } from "react";

interface GeoState {
  lat: number | null;
  lon: number | null;
  error: string | null;
  loading: boolean;
}

// Default fallback: Chico, CA (demo region) -- used when geolocation is
// denied or unavailable so the app is still usable, not blocked.
const FALLBACK = { lat: 39.7285, lon: -121.8375 };

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

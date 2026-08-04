export interface LocationOverride {
  lat: number;
  lon: number;
  label: string;
}

const STORAGE_KEY = "firebreak_location_override";

/** Fired whenever the override changes, so useGeolocation instances already
 * mounted on other pages/components (e.g. the Header's picker vs. the
 * Dashboard) pick up the change without a full page reload. */
export const LOCATION_OVERRIDE_EVENT = "firebreak:location-override-changed";

export function getLocationOverride(): LocationOverride | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as LocationOverride;
  } catch {
    return null;
  }
}

export function setLocationOverride(override: LocationOverride): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(override));
  window.dispatchEvent(new Event(LOCATION_OVERRIDE_EVENT));
}

export function clearLocationOverride(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event(LOCATION_OVERRIDE_EVENT));
}

import type { AqiResponse } from "./types";
import { DEMO_REGION } from "./demoRegion";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

// Deliberately short and non-retrying, unlike lib/api.ts's client-side
// apiFetch -- this runs during the page's server render, so a cold Render
// backend must fail fast here (falling through to null) rather than holding
// up the whole page response for up to a minute. The client-side fetch (with
// its own retry/backoff) still runs after hydration and will fill in real
// data if this fast-path missed it.
const SERVER_FETCH_TIMEOUT_MS = 4_000;

async function serverFetch<T>(path: string): Promise<T | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SERVER_FETCH_TIMEOUT_MS);
    const res = await fetch(`${API_BASE}${path}`, { signal: controller.signal, cache: "no-store" });
    clearTimeout(timer);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export interface InitialDashboardData {
  aqi: AqiResponse | null;
}

/** Best-effort server-side snapshot of the demo region, used only to seed
 * the dashboard's first paint -- see page.tsx for why. Never throws; a
 * cold/unreachable backend just means the client-side fetch (which always
 * runs anyway) carries the full load, same as before this existed. */
export async function fetchInitialDashboardData(): Promise<InitialDashboardData> {
  const { lat, lon } = DEMO_REGION;
  const aqi = await serverFetch<AqiResponse>(`/api/aqi?lat=${lat}&lon=${lon}`);
  return { aqi };
}

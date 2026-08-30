import { Dashboard } from "@/components/Dashboard";
import { fetchInitialDashboardData } from "@/lib/serverFetch";

// Server-rendered so the dashboard's first paint (the demo region's real
// AQI reading) is already in the initial HTML -- a live demo on unfamiliar
// wifi, or a cold Render backend, shouldn't have to sit on a loading
// skeleton for its most important screen. Client-side fetching
// (with retry/backoff) still runs after hydration and takes over once the
// viewer's real geolocation resolves; this is purely a faster/safer first
// paint, not a replacement for that.
export default async function Home() {
  const initial = await fetchInitialDashboardData();
  return <Dashboard initial={initial} />;
}

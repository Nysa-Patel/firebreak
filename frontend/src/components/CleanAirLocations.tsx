"use client";

import type { CleanAirLocationOut } from "@/lib/types";

export function CleanAirLocations({ locations }: { locations: CleanAirLocationOut[] }) {
  if (locations.length === 0) {
    return (
      <div className="rounded-xl border border-black/10 dark:border-white/15 p-4 text-sm opacity-70">
        No seeded clean-air locations near you yet -- this demo dataset currently only covers the
        Chico/Butte County, CA area.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-black/10 dark:border-white/15 p-4 space-y-3">
      <h2 className="font-semibold text-sm uppercase tracking-wide opacity-70">Nearby clean-air spaces</h2>
      <ul className="space-y-2">
        {locations.map((loc) => (
          <li key={loc.id} className="text-sm flex justify-between gap-2">
            <div>
              <p className="font-medium">{loc.name}</p>
              <p className="text-xs opacity-60">{loc.address}</p>
            </div>
            <span className="text-xs opacity-60 whitespace-nowrap">{loc.distance_km} km</span>
          </li>
        ))}
      </ul>
      <p className="text-xs opacity-50">
        Seeded demo dataset -- expandable to a community-maintained open dataset post-competition.
      </p>
    </div>
  );
}

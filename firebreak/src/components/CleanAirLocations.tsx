"use client";

import type { CleanAirLocationOut } from "@/lib/types";
import { LOCATION_ICON, LibraryIcon } from "@/components/icons";
import { SectionLabel } from "@/components/AqiGauge";

const MAX_SHOWN = 10;

export function CleanAirLocations({ locations }: { locations: CleanAirLocationOut[] }) {
  const shown = locations.slice(0, MAX_SHOWN);

  if (locations.length === 0) {
    return (
      <div className="card p-5">
        <SectionLabel>Nearby clean-air spaces</SectionLabel>
        <p className="text-sm mt-2" style={{ color: "var(--text-secondary)" }}>
          No libraries or community centers found in our dataset within 200km of this location --
          real coverage gaps like this can happen in less densely-mapped areas.
        </p>
      </div>
    );
  }

  return (
    <div className="card p-5">
      <SectionLabel>Nearby clean-air spaces</SectionLabel>
      <ul className="mt-3 divide-y" style={{ borderColor: "var(--gridline)" }}>
        {shown.map((loc) => {
          const Icon = LOCATION_ICON[loc.category] ?? LibraryIcon;
          return (
            <li key={loc.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0" style={{ borderColor: "var(--gridline)" }}>
              <span
                className="inline-flex items-center justify-center rounded-full shrink-0"
                style={{ width: 36, height: 36, background: "var(--surface-2)", color: "var(--text-secondary)" }}
              >
                <Icon size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{loc.name}</p>
                <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                  {loc.address}
                </p>
              </div>
              <span className="text-xs shrink-0 font-medium" style={{ color: "var(--text-secondary)" }}>
                {loc.distance_km} km
              </span>
            </li>
          );
        })}
      </ul>
      <p className="text-xs mt-3 pt-3" style={{ color: "var(--text-muted)", borderTop: "1px solid var(--border)" }}>
        {locations.length > MAX_SHOWN
          ? `Showing the ${MAX_SHOWN} closest of ${locations.length} nearby -- `
          : ""}
        Seeded demo dataset -- expandable to a community-maintained open dataset post-competition.
      </p>
    </div>
  );
}

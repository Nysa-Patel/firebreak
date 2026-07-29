"use client";

import type { RiskProfile } from "@/lib/types";
import { SectionLabel } from "@/components/AqiGauge";

interface Props {
  profile: RiskProfile;
  onChange: (profile: RiskProfile) => void;
}

export function RiskProfileForm({ profile, onChange }: Props) {
  return (
    <div className="card p-5">
      <SectionLabel>Your risk profile</SectionLabel>
      <p className="text-sm mt-1 mb-4" style={{ color: "var(--text-secondary)" }}>
        Stored only in this browser -- no account, no server-side profile. Used to personalize the
        recommendation above.
      </p>

      <label className="flex items-center justify-between gap-4 py-2.5 text-sm" style={{ borderBottom: "1px solid var(--gridline)" }}>
        Age
        <input
          type="number"
          min={0}
          max={120}
          value={profile.age}
          onChange={(e) => onChange({ ...profile, age: Number(e.target.value) })}
          className="w-20 rounded-md px-2 py-1 text-right"
          style={{ border: "1px solid var(--border)", background: "var(--surface-2)" }}
        />
      </label>

      {(
        [
          ["has_respiratory_condition", "Asthma / respiratory condition"],
          ["is_pregnant", "Pregnant"],
          ["has_outdoor_occupation", "Outdoor occupation"],
        ] as const
      ).map(([key, label], i, arr) => (
        <label
          key={key}
          className="flex items-center justify-between gap-4 py-2.5 text-sm"
          style={{ borderBottom: i === arr.length - 1 ? "none" : "1px solid var(--gridline)" }}
        >
          {label}
          <input
            type="checkbox"
            checked={profile[key]}
            onChange={(e) => onChange({ ...profile, [key]: e.target.checked })}
            className="size-4"
            style={{ accentColor: "var(--accent)" }}
          />
        </label>
      ))}
    </div>
  );
}

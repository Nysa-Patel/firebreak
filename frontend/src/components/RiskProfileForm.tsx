"use client";

import type { RiskProfile } from "@/lib/types";

interface Props {
  profile: RiskProfile;
  onChange: (profile: RiskProfile) => void;
}

export function RiskProfileForm({ profile, onChange }: Props) {
  return (
    <div className="rounded-xl border border-black/10 dark:border-white/15 p-4 space-y-3">
      <h2 className="font-semibold text-sm uppercase tracking-wide opacity-70">Your risk profile</h2>
      <p className="text-xs opacity-60">
        Stored only in this browser -- no account, no server-side profile. Used to personalize the
        recommendation below.
      </p>

      <label className="flex items-center justify-between gap-4 text-sm">
        Age
        <input
          type="number"
          min={0}
          max={120}
          value={profile.age}
          onChange={(e) => onChange({ ...profile, age: Number(e.target.value) })}
          className="w-20 rounded border border-black/20 dark:border-white/20 bg-transparent px-2 py-1"
        />
      </label>

      {(
        [
          ["has_respiratory_condition", "Asthma / respiratory condition"],
          ["is_pregnant", "Pregnant"],
          ["has_outdoor_occupation", "Outdoor occupation"],
        ] as const
      ).map(([key, label]) => (
        <label key={key} className="flex items-center justify-between gap-4 text-sm">
          {label}
          <input
            type="checkbox"
            checked={profile[key]}
            onChange={(e) => onChange({ ...profile, [key]: e.target.checked })}
            className="size-4"
          />
        </label>
      ))}
    </div>
  );
}

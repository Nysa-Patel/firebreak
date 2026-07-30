"use client";

import type { SubmissionOut } from "@/lib/types";
import { DENSITY_COLOR, DENSITY_LABEL } from "@/lib/display";
import { DENSITY_ICON } from "@/components/icons";
import { SectionLabel } from "@/components/AqiGauge";
import { timeAgo } from "@/lib/timeAgo";
import { haversineMiles } from "@/lib/distance";

interface Props {
  submissions: SubmissionOut[];
  viewerLat?: number | null;
  viewerLon?: number | null;
}

export function RecentSubmissions({ submissions, viewerLat, viewerLon }: Props) {
  if (submissions.length === 0) {
    return (
      <div className="card p-5">
        <SectionLabel>Recent community reports</SectionLabel>
        <p className="text-sm mt-2" style={{ color: "var(--text-secondary)" }}>
          No sky-photo reports in the last 6 hours yet. Upload one from the dashboard to help fill in
          this map.
        </p>
      </div>
    );
  }

  return (
    <div className="card p-5">
      <SectionLabel>Recent community reports</SectionLabel>
      <ul className="mt-3 divide-y" style={{ borderColor: "var(--gridline)" }}>
        {submissions.map((s) => {
          const Icon = DENSITY_ICON[s.density_class];
          const color = DENSITY_COLOR[s.density_class];
          const distance =
            viewerLat != null && viewerLon != null
              ? haversineMiles(viewerLat, viewerLon, s.fuzzed_lat, s.fuzzed_lon)
              : null;
          return (
            <li key={s.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0" style={{ borderColor: "var(--gridline)" }}>
              <span
                className="inline-flex items-center justify-center rounded-full shrink-0"
                style={{ width: 36, height: 36, background: `color-mix(in srgb, ${color} 16%, transparent)`, color }}
              >
                <Icon size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{DENSITY_LABEL[s.density_class]}</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {timeAgo(s.created_at)}
                  {distance != null && ` -- ${distance.toFixed(1)} mi away`}
                </p>
              </div>
              <span className="text-xs shrink-0 font-medium" style={{ color: "var(--text-secondary)" }}>
                {Math.round(s.trust_score * 100)}% trust
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

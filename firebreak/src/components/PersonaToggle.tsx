"use client";

import { PERSONAS } from "@/lib/personas";

interface Props {
  activeKey: string | null;
  onSelect: (key: string | null) => void;
}

const PERSONA_COLORS = ["var(--accent-2)", "var(--accent-3)", "var(--accent-4)", "var(--accent)"];

export function PersonaToggle({ activeKey, onSelect }: Props) {
  return (
    <div className="card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--text-muted)" }}>
        See this as
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onSelect(null)}
          className="text-sm px-3 py-1.5 rounded-full transition-all"
          style={{
            background: activeKey === null ? "var(--accent)" : "var(--surface-2)",
            color: activeKey === null ? "#fff" : "var(--text-secondary)",
            fontWeight: activeKey === null ? 700 : 500,
            boxShadow: activeKey === null ? "0 4px 14px -4px color-mix(in srgb, var(--accent) 60%, transparent)" : "none",
          }}
        >
          My profile
        </button>
        {PERSONAS.map((p, i) => {
          const color = PERSONA_COLORS[i % PERSONA_COLORS.length];
          const active = activeKey === p.key;
          return (
            <button
              key={p.key}
              onClick={() => onSelect(p.key)}
              className="text-sm px-3 py-1.5 rounded-full transition-all"
              style={{
                background: active ? color : "var(--surface-2)",
                color: active ? "#fff" : "var(--text-secondary)",
                fontWeight: active ? 700 : 500,
                boxShadow: active ? `0 4px 14px -4px color-mix(in srgb, ${color} 60%, transparent)` : "none",
              }}
            >
              {p.label}
            </button>
          );
        })}
      </div>
      {activeKey && (
        <p className="text-xs mt-2" style={{ color: "var(--status-warning)" }}>
          Previewing as &quot;{PERSONAS.find((p) => p.key === activeKey)?.label}&quot; -- your saved profile is
          unchanged.
        </p>
      )}
    </div>
  );
}

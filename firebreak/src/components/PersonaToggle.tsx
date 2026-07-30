"use client";

import { PERSONAS } from "@/lib/personas";

interface Props {
  activeKey: string | null;
  onSelect: (key: string | null) => void;
}

export function PersonaToggle({ activeKey, onSelect }: Props) {
  return (
    <div className="card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--text-muted)" }}>
        See this as
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onSelect(null)}
          className="text-sm px-3 py-1.5 rounded-full transition-colors"
          style={{
            background: activeKey === null ? "var(--accent)" : "var(--surface-2)",
            color: activeKey === null ? "#fff" : "var(--text-secondary)",
            fontWeight: activeKey === null ? 600 : 400,
          }}
        >
          My profile
        </button>
        {PERSONAS.map((p) => (
          <button
            key={p.key}
            onClick={() => onSelect(p.key)}
            className="text-sm px-3 py-1.5 rounded-full transition-colors"
            style={{
              background: activeKey === p.key ? "var(--accent)" : "var(--surface-2)",
              color: activeKey === p.key ? "#fff" : "var(--text-secondary)",
              fontWeight: activeKey === p.key ? 600 : 400,
            }}
          >
            {p.label}
          </button>
        ))}
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

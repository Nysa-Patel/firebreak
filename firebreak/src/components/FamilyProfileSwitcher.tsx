"use client";

import { useState } from "react";
import { PERSONAS } from "@/lib/personas";
import type { FamilyMember } from "@/lib/useFamilyMembers";

interface Props {
  members: FamilyMember[];
  activeId: string;
  personaKey: string | null;
  onSelectMember: (id: string) => void;
  onSelectPersona: (key: string | null) => void;
  onAddMember: (name: string) => void;
  onRenameMember: (id: string, name: string) => void;
  onRemoveMember: (id: string) => void;
}

const PERSONA_COLORS = ["var(--accent-2)", "var(--accent-3)", "var(--accent-4)", "var(--accent)"];

function pillStyle(active: boolean, color = "var(--accent)") {
  return {
    background: active ? color : "var(--surface-2)",
    color: active ? "#fff" : "var(--text-secondary)",
    fontWeight: active ? 700 : 500,
    boxShadow: active ? `0 4px 14px -4px color-mix(in srgb, ${color} 60%, transparent)` : "none",
  } as const;
}

export function FamilyProfileSwitcher({
  members,
  activeId,
  personaKey,
  onSelectMember,
  onSelectPersona,
  onAddMember,
  onRenameMember,
  onRemoveMember,
}: Props) {
  const [adding, setAdding] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const activeMember = members.find((m) => m.id === activeId);
  const viewingMember = personaKey === null;

  function confirmAdd() {
    const name = draftName.trim();
    if (name) onAddMember(name);
    setDraftName("");
    setAdding(false);
  }

  function startEdit(member: FamilyMember) {
    setEditingId(member.id);
    setEditName(member.name);
  }

  function confirmEdit() {
    const name = editName.trim();
    if (editingId && name) onRenameMember(editingId, name);
    setEditingId(null);
  }

  return (
    <div className="card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--text-muted)" }}>
        Household
      </p>
      <div className="flex flex-wrap gap-2 items-center">
        {members.map((member) => {
          if (editingId === member.id) {
            return (
              <input
                key={member.id}
                autoFocus
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={confirmEdit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") confirmEdit();
                  if (e.key === "Escape") setEditingId(null);
                }}
                className="text-sm px-3 py-1.5 rounded-full w-28"
                style={{ border: "1px solid var(--border)", background: "var(--surface-2)" }}
              />
            );
          }
          const active = viewingMember && activeId === member.id;
          return (
            <button
              key={member.id}
              onClick={() => onSelectMember(member.id)}
              onDoubleClick={() => startEdit(member)}
              className="text-sm px-3 py-1.5 rounded-full transition-all"
              style={pillStyle(active)}
            >
              {member.name}
            </button>
          );
        })}

        {adding ? (
          <span className="flex items-center gap-1.5">
            <input
              autoFocus
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") confirmAdd();
                if (e.key === "Escape") setAdding(false);
              }}
              placeholder="Name"
              className="text-sm px-3 py-1.5 rounded-full w-28"
              style={{ border: "1px solid var(--border)", background: "var(--surface-2)" }}
            />
            <button
              onClick={confirmAdd}
              className="text-sm font-semibold px-2.5 py-1.5 rounded-full"
              style={{ background: "var(--accent)", color: "#fff" }}
            >
              Add
            </button>
          </span>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="text-sm px-3 py-1.5 rounded-full transition-all"
            style={{ background: "var(--surface-2)", color: "var(--text-muted)", border: "1px dashed var(--border)" }}
          >
            + Add member
          </button>
        )}
      </div>

      {viewingMember && activeMember && (
        <div className="flex gap-3 mt-2 text-xs">
          <button onClick={() => startEdit(activeMember)} style={{ color: "var(--text-muted)" }}>
            Rename
          </button>
          {members.length > 1 && (
            <button onClick={() => onRemoveMember(activeMember.id)} style={{ color: "var(--text-muted)" }}>
              Remove
            </button>
          )}
        </div>
      )}

      <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
        <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--text-muted)" }}>
          Or preview a demo persona
        </p>
        <div className="flex flex-wrap gap-2">
          {PERSONAS.map((p, i) => (
            <button
              key={p.key}
              onClick={() => onSelectPersona(p.key)}
              className="text-sm px-3 py-1.5 rounded-full transition-all"
              style={pillStyle(personaKey === p.key, PERSONA_COLORS[i % PERSONA_COLORS.length])}
            >
              {p.label}
            </button>
          ))}
        </div>
        {personaKey && (
          <p className="text-xs mt-2" style={{ color: "var(--status-warning)" }}>
            Previewing as &quot;{PERSONAS.find((p) => p.key === personaKey)?.label}&quot; -- your household
            profiles are unchanged.
          </p>
        )}
      </div>
    </div>
  );
}

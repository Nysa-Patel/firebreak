"use client";

import { useEffect, useState } from "react";
import type { RiskProfile } from "./types";

const STORAGE_KEY = "wildfire-family-members";
const LEGACY_PROFILE_KEY = "wildfire-risk-profile";

export interface FamilyMember {
  id: string;
  name: string;
  profile: RiskProfile;
}

const DEFAULT_PROFILE: RiskProfile = {
  age: 30,
  has_respiratory_condition: false,
  has_cardiovascular_condition: false,
  is_pregnant: false,
  has_outdoor_occupation: false,
};

function defaultMembers(): FamilyMember[] {
  // Carry over a profile saved before family members existed, so returning
  // users don't lose the age/conditions they already entered.
  let profile = DEFAULT_PROFILE;
  const legacy = window.localStorage.getItem(LEGACY_PROFILE_KEY);
  if (legacy) {
    try {
      profile = JSON.parse(legacy);
    } catch {
      // ignore corrupt storage, keep default
    }
  }
  return [{ id: "me", name: "Me", profile }];
}

// Short on purpose -- this gets appended to the device id (see SymptomLogger)
// to key each member's symptom logs on the backend, which caps device_id at
// 64 chars, so a full UUID here would overflow that budget.
function makeId(): string {
  const uuid = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  return uuid.replace(/-/g, "").slice(0, 10);
}

// Household members live only in the browser -- same no-accounts model as
// the original single-profile store, just extended to a named list so one
// device can check risk for each family member in turn.
export function useFamilyMembers() {
  const [members, setMembers] = useState<FamilyMember[]>([{ id: "me", name: "Me", profile: DEFAULT_PROFILE }]);
  const [activeId, setActiveId] = useState("me");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { members: FamilyMember[]; activeId: string };
        if (parsed.members?.length) {
          setMembers(parsed.members);
          setActiveId(parsed.activeId ?? parsed.members[0].id);
          setLoaded(true);
          return;
        }
      } catch {
        // ignore corrupt storage, fall through to defaults below
      }
    }
    const seeded = defaultMembers();
    setMembers(seeded);
    setActiveId(seeded[0].id);
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ members, activeId }));
    }
  }, [members, activeId, loaded]);

  function addMember(name: string) {
    const id = makeId();
    setMembers((prev) => [...prev, { id, name, profile: DEFAULT_PROFILE }]);
    setActiveId(id);
  }

  function removeMember(id: string) {
    setMembers((prev) => {
      const next = prev.filter((m) => m.id !== id);
      return next.length ? next : prev; // never drop the last member
    });
    setActiveId((prev) => (prev === id ? members.find((m) => m.id !== id)?.id ?? prev : prev));
  }

  function renameMember(id: string, name: string) {
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, name } : m)));
  }

  function updateMemberProfile(id: string, profile: RiskProfile) {
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, profile } : m)));
  }

  const activeMember = members.find((m) => m.id === activeId) ?? members[0];

  return {
    members,
    activeMember,
    activeId,
    setActiveId,
    addMember,
    removeMember,
    renameMember,
    updateMemberProfile,
    loaded,
  };
}

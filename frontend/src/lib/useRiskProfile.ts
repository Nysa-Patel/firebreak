"use client";

import { useEffect, useState } from "react";
import type { RiskProfile } from "./types";

const STORAGE_KEY = "wildfire-risk-profile";

const DEFAULT_PROFILE: RiskProfile = {
  age: 30,
  has_respiratory_condition: false,
  is_pregnant: false,
  has_outdoor_occupation: false,
};

// Profile lives only in the browser -- there are no user accounts, so this
// is the entire "backend" for personalization (see plan: no auth for MVP).
export function useRiskProfile() {
  const [profile, setProfile] = useState<RiskProfile>(DEFAULT_PROFILE);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        setProfile(JSON.parse(raw));
      } catch {
        // ignore corrupt storage, keep default
      }
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    }
  }, [profile, loaded]);

  return { profile, setProfile, loaded };
}

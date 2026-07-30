import type { RiskProfile } from "./types";

export interface Persona {
  key: string;
  label: string;
  profile: RiskProfile;
}

export const PERSONAS: Persona[] = [
  {
    key: "asthmatic_child",
    label: "Asthmatic child",
    profile: { age: 8, has_respiratory_condition: true, is_pregnant: false, has_outdoor_occupation: false },
  },
  {
    key: "outdoor_worker",
    label: "Outdoor worker",
    profile: { age: 35, has_respiratory_condition: false, is_pregnant: false, has_outdoor_occupation: true },
  },
  {
    key: "pregnant",
    label: "Pregnant",
    profile: { age: 29, has_respiratory_condition: false, is_pregnant: true, has_outdoor_occupation: false },
  },
];

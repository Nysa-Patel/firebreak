"""Symptom-flagging rules -- a deterministic, auditable threshold engine.

NOT an LLM call and not a diagnosis. This is a fixed lookup table: every
symptom this feature can ask about, and the exact rule for turning checked
boxes into a flag level, is defined right here in one file so it's easy to
point to and defend in a live Q&A -- nothing about this is buried in UI
logic or computed by a model.

Symptom tiers (modeled on CDC/EPA public guidance on wildfire-smoke exposure,
adapted into checklist form -- this is our own threshold table, not a
verbatim reproduction of any single document):
  - critical: on its own, treated as a "seek immediate medical care / call
    911" signal (e.g. severe difficulty breathing, chest pain, confusion --
    each of these is independently flagged as an emergency warning sign in
    smoke-exposure guidance, not just in combination).
  - moderate: a real symptom of exposure, but not itself an emergency. Two
    or more together is treated as "contact a provider soon."
  - mild: general irritation common to smoke exposure at any level. Noted,
    but doesn't itself escalate the flag.

Threshold rule (evaluate_symptoms below), in order:
  1. Any critical symptom checked -> "emergency"
  2. No critical, 2+ moderate checked -> "urgent"
  3. No critical, exactly 1 moderate checked -> "elevated"
  4. No critical/moderate, 1+ mild checked -> "mild"
  5. Nothing checked -> "none"
"""

from dataclasses import dataclass
from typing import Literal

SymptomTier = Literal["mild", "moderate", "critical"]
ConditionBucket = Literal["general", "asthma_copd", "cardiovascular", "pregnancy"]
FlagLevel = Literal["none", "mild", "elevated", "urgent", "emergency"]

DISCLAIMER = (
    "This is not a diagnosis. If you are experiencing severe symptoms -- "
    "trouble breathing, chest pain, confusion, or fainting -- seek medical "
    "care or call 911 now, regardless of what this tool says."
)


@dataclass(frozen=True)
class Symptom:
    id: str
    label: str
    tier: SymptomTier


# Shown to everyone once the checklist is expanded, regardless of declared condition.
GENERAL_SYMPTOMS: list[Symptom] = [
    Symptom("eye_throat_irritation", "Eye or throat irritation", "mild"),
    Symptom("headache", "Headache", "mild"),
    Symptom("cough", "Persistent cough", "mild"),
    Symptom("confusion_or_fainting", "Confusion, severe dizziness, or fainting", "critical"),
]

# Shown when the profile declares asthma / COPD / another respiratory condition.
ASTHMA_COPD_SYMPTOMS: list[Symptom] = [
    Symptom("wheeze", "Wheezing", "moderate"),
    Symptom("chest_tightness", "Chest tightness", "moderate"),
    Symptom("increased_inhaler_use", "Needing your rescue inhaler more than usual", "moderate"),
    Symptom("shortness_of_breath", "Shortness of breath at rest or with mild activity", "moderate"),
    Symptom("severe_breathing_difficulty", "Severe difficulty breathing / can't speak in full sentences", "critical"),
]

# Shown when the profile declares a cardiovascular condition.
CARDIOVASCULAR_SYMPTOMS: list[Symptom] = [
    Symptom("palpitations", "Heart palpitations (racing or pounding heartbeat)", "moderate"),
    Symptom("irregular_heartbeat", "Irregular heartbeat", "moderate"),
    Symptom("unusual_fatigue", "Unusual fatigue or weakness", "moderate"),
    Symptom("chest_pain", "Chest pain or pressure", "critical"),
]

# Shown when the profile declares pregnancy.
PREGNANCY_SYMPTOMS: list[Symptom] = [
    Symptom("reduced_fetal_movement", "Noticeably reduced or absent fetal movement", "critical"),
    Symptom("severe_headache_or_vision_changes", "Severe headache or vision changes", "critical"),
    Symptom("swelling", "Sudden swelling in face or hands", "moderate"),
    Symptom("shortness_of_breath_pregnancy", "Shortness of breath", "moderate"),
]

CHECKLISTS: dict[ConditionBucket, list[Symptom]] = {
    "general": GENERAL_SYMPTOMS,
    "asthma_copd": ASTHMA_COPD_SYMPTOMS,
    "cardiovascular": CARDIOVASCULAR_SYMPTOMS,
    "pregnancy": PREGNANCY_SYMPTOMS,
}

_ALL_SYMPTOMS: dict[str, Symptom] = {s.id: s for bucket in CHECKLISTS.values() for s in bucket}

MESSAGES: dict[FlagLevel, str] = {
    "emergency": "Seek immediate medical care or call 911 -- one or more reported symptoms are an emergency warning sign during smoke exposure.",
    "urgent": "Contact a healthcare provider today. Multiple exposure symptoms were reported -- don't wait for them to worsen.",
    "elevated": "Monitor your symptoms closely and consider limiting outdoor exposure. Contact your provider if this symptom worsens.",
    "mild": "Mild irritation reported -- consider reducing outdoor exposure and staying hydrated.",
    "none": "No symptoms reported.",
}


@dataclass(frozen=True)
class SymptomAssessment:
    level: FlagLevel
    message: str
    matched_critical: list[str]
    matched_moderate: list[str]
    matched_mild: list[str]


def evaluate_symptoms(checked_symptom_ids: list[str]) -> SymptomAssessment:
    critical, moderate, mild = [], [], []
    for symptom_id in checked_symptom_ids:
        symptom = _ALL_SYMPTOMS.get(symptom_id)
        if symptom is None:
            continue  # ignore unknown ids rather than error -- checklist is versioned by the frontend fetch
        if symptom.tier == "critical":
            critical.append(symptom.label)
        elif symptom.tier == "moderate":
            moderate.append(symptom.label)
        else:
            mild.append(symptom.label)

    if critical:
        level: FlagLevel = "emergency"
    elif len(moderate) >= 2:
        level = "urgent"
    elif len(moderate) == 1:
        level = "elevated"
    elif mild:
        level = "mild"
    else:
        level = "none"

    return SymptomAssessment(
        level=level,
        message=MESSAGES[level],
        matched_critical=critical,
        matched_moderate=moderate,
        matched_mild=mild,
    )

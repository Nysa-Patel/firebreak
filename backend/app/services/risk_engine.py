"""Rule-based personal risk engine.

This is a plain decision table on purpose, not a model. A handful of
well-understood risk factors (age, respiratory condition, pregnancy,
outdoor occupation) combined with the air quality signal is something
anyone can audit line by line, and there's no real training signal that
would justify swapping in ML here anyway. The CV model handles the harder
problem upstream (reading smoke density from a photo); this file just
turns that plus AQI into an actual decision.
"""

from app.models.schemas import (
    DensityClass,
    RiskProfile,
    RiskScoreRequest,
    RiskScoreResponse,
    AqiCategory,
    SymptomFlagLevel,
)
from app.services.symptom_rules import MESSAGES as SYMPTOM_MESSAGES

_LEVELS = ["low", "moderate", "high", "very_high"]

# Symptom flags from symptom_rules.py add to this score, they don't replace
# it, and only ever push the level up. "emergency" jumps by len(_LEVELS) so
# it always forces the ceiling no matter what AQI/profile alone computed.
# A real emergency sign overrides the ambient read; it doesn't average with it.
_SYMPTOM_ESCALATION: dict[SymptomFlagLevel, int] = {
    "none": 0,
    "mild": 0,
    "elevated": 1,
    "urgent": 2,
    "emergency": len(_LEVELS),
}

_AQI_LEVEL_INDEX: dict[AqiCategory, int] = {
    "good": 0,
    "moderate": 1,
    "unhealthy_sensitive": 1,
    "unhealthy": 2,
    "very_unhealthy": 3,
    "hazardous": 3,
}

_DENSITY_LEVEL_INDEX: dict[DensityClass, int] = {
    "clear": 0,
    "hazy": 1,
    "heavy": 2,
}

_RECOMMENDATIONS: dict[str, str] = {
    "low": "Air quality looks fine for general outdoor activity.",
    "moderate": "Smoke/AQI is at a level where sensitive groups should consider limiting prolonged outdoor exertion. Generally safe for everyone else.",
    "high": "Unhealthy conditions -- limit outdoor time where possible, and sensitive groups should stay indoors.",
    "very_high": "Hazardous conditions -- avoid outdoor activity and stay indoors with filtered air if you can.",
}


def score_risk(request: RiskScoreRequest) -> RiskScoreResponse:
    profile = request.profile
    factors: list[str] = []

    aqi_index = _AQI_LEVEL_INDEX[request.aqi_category]
    density_index = _DENSITY_LEVEL_INDEX.get(request.density_class, 0) if request.density_class else 0

    base_index = max(aqi_index, density_index)
    if request.density_class and density_index > aqi_index:
        factors.append(
            "your submitted sky photo shows more smoke than the nearest official station is reporting -- "
            "trusting the closer, local reading"
        )

    sensitive_factor_count = 0
    if profile.has_respiratory_condition:
        sensitive_factor_count += 1
        factors.append("asthma/respiratory condition")
    if profile.has_cardiovascular_condition:
        sensitive_factor_count += 1
        factors.append("cardiovascular condition")
    if profile.is_pregnant:
        sensitive_factor_count += 1
        factors.append("pregnancy")
    if profile.age < 5 or profile.age > 65:
        sensitive_factor_count += 1
        factors.append("age-related sensitivity")
    if profile.has_outdoor_occupation:
        sensitive_factor_count += 1
        factors.append("outdoor occupation (higher cumulative exposure)")

    # One level per sensitive factor, capped so we never escalate past
    # "very_high" (already the ceiling, nowhere left to go).
    escalation = min(sensitive_factor_count, len(_LEVELS) - 1 - base_index)
    final_index = base_index + max(escalation, 0)

    symptom_escalation = _SYMPTOM_ESCALATION[request.symptom_level]
    final_index = min(final_index + symptom_escalation, len(_LEVELS) - 1)
    risk_level = _LEVELS[final_index]

    recommendation = _RECOMMENDATIONS[risk_level]
    if sensitive_factor_count and risk_level in ("low", "moderate"):
        recommendation += " Because of your profile (" + ", ".join(factors[-sensitive_factor_count:]) + "), consider extra caution even at this level."

    if request.symptom_level in ("emergency", "urgent"):
        # This goes first. It's the most important line on the screen, not
        # a footnote tacked onto the AQI text.
        recommendation = SYMPTOM_MESSAGES[request.symptom_level] + " " + recommendation
        factors.append(f"self-reported symptoms ({request.symptom_level})")
    elif request.symptom_level in ("elevated", "mild"):
        recommendation += " " + SYMPTOM_MESSAGES[request.symptom_level]
        factors.append(f"self-reported symptoms ({request.symptom_level})")

    return RiskScoreResponse(
        risk_level=risk_level,
        recommendation=recommendation,
        contributing_factors=factors,
    )

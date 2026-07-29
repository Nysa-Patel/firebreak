"""Rule-based personal risk engine.

Deliberately a transparent decision table, not a model: combining a small
number of well-understood risk factors (age, respiratory condition,
pregnancy, outdoor occupation) with air-quality signals is easy to audit and
explain to judges/users, and there's no training signal that would justify an
ML model here. The CV model's job is upstream of this (estimating local smoke
density from a photo) -- this engine just turns that + AQI into a decision.
"""

from app.models.schemas import DensityClass, RiskProfile, RiskScoreRequest, RiskScoreResponse, AqiCategory

_LEVELS = ["low", "moderate", "high", "very_high"]

_AQI_LEVEL_INDEX: dict[AqiCategory, int] = {
    "good": 0,
    "moderate": 0,
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
    if profile.is_pregnant:
        sensitive_factor_count += 1
        factors.append("pregnancy")
    if profile.age < 5 or profile.age > 65:
        sensitive_factor_count += 1
        factors.append("age-related sensitivity")
    if profile.has_outdoor_occupation:
        sensitive_factor_count += 1
        factors.append("outdoor occupation (higher cumulative exposure)")

    # Escalate at most one level per sensitive factor present, but never
    # silently escalate past "very_high" -- that's already the ceiling.
    escalation = min(sensitive_factor_count, len(_LEVELS) - 1 - base_index)
    final_index = base_index + max(escalation, 0)
    risk_level = _LEVELS[final_index]

    recommendation = _RECOMMENDATIONS[risk_level]
    if sensitive_factor_count and risk_level in ("low", "moderate"):
        recommendation += " Because of your profile (" + ", ".join(factors[-sensitive_factor_count:]) + "), consider extra caution even at this level."

    return RiskScoreResponse(
        risk_level=risk_level,
        recommendation=recommendation,
        contributing_factors=factors,
    )

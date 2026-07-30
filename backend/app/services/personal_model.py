"""Per-device symptom-threshold model.

The rule-based risk engine (app.services.risk_engine) gives everyone in the
same bucket (e.g. "has asthma") the same static message -- honest, but the
same for every person in that bucket. Once a device has logged enough days
of self-reported symptoms alongside the AQI at the time, this fits a small
logistic regression -- symptomatic (yes/no) as a function of that day's AQI
-- for that one device only, and reports the AQI where the fitted curve
crosses 50% probability: this person's own apparent flare-up threshold,
rather than a population guideline.

No sklearn in production (see requirements.txt -- it's a training-only dep).
This is a single-feature logistic regression fit on at most a few dozen
points, so plain gradient descent in numpy is simpler than adding a
dependency for it.
"""

import numpy as np

from app.models.db_models import SymptomLog
from app.models.schemas import PersonalThresholdResponse

MIN_LOGS_REQUIRED = 6
_LEARNING_RATE = 0.1
_ITERATIONS = 2000
_L2 = 0.01  # small ridge penalty -- keeps the fit stable with few, noisy points
_MIN_SLOPE = 1e-3  # AQI->log-odds slope below this is noise, not a real threshold


def _fit_logistic_1d(x: np.ndarray, y: np.ndarray) -> tuple[float, float]:
    """Returns (weight, bias) for p(symptomatic) = sigmoid(weight * aqi + bias).
    x is standardized internally for numerically stable gradient descent, then
    the fit is converted back to raw AQI units before returning."""
    mean, std = x.mean(), x.std() or 1.0
    xs = (x - mean) / std

    w, b = 0.0, 0.0
    for _ in range(_ITERATIONS):
        p = 1 / (1 + np.exp(-(w * xs + b)))
        grad_w = np.mean((p - y) * xs) + _L2 * w
        grad_b = np.mean(p - y)
        w -= _LEARNING_RATE * grad_w
        b -= _LEARNING_RATE * grad_b

    # undo standardization: w*((aqi-mean)/std) + b = (w/std)*aqi + (b - w*mean/std)
    w_raw = w / std
    b_raw = b - w * mean / std
    return w_raw, b_raw


def _not_enough_data(logs_count: int, message: str) -> PersonalThresholdResponse:
    return PersonalThresholdResponse(
        has_enough_data=False,
        logs_count=logs_count,
        min_required=MIN_LOGS_REQUIRED,
        message=message,
    )


def compute_personal_threshold(logs: list[SymptomLog]) -> PersonalThresholdResponse:
    logs_count = len(logs)

    if logs_count < MIN_LOGS_REQUIRED:
        remaining = MIN_LOGS_REQUIRED - logs_count
        return _not_enough_data(
            logs_count, f"Log {remaining} more day{'s' if remaining != 1 else ''} to unlock your personal threshold."
        )

    x = np.array([log.aqi for log in logs], dtype=np.float64)
    y = np.array([0.0 if log.severity == "none" else 1.0 for log in logs], dtype=np.float64)

    if y.sum() == 0 or y.sum() == logs_count:
        return _not_enough_data(
            logs_count,
            "All logged days so far have the same outcome -- keep logging through a mix of "
            "good and bad air days to reveal your personal threshold.",
        )

    w, b = _fit_logistic_1d(x, y)

    if w <= _MIN_SLOPE:
        # The premise here is a positive AQI->symptom relationship. A flat or
        # inverted fit means the signal isn't there yet, not that higher AQI
        # protects this person -- report low confidence rather than a
        # backwards or wildly unstable threshold.
        return _not_enough_data(logs_count, "Not enough signal yet linking AQI to your symptoms -- keep logging.")

    threshold = float(np.clip(-b / w, 0, 500))
    confidence = "high" if logs_count >= 14 else "moderate"

    return PersonalThresholdResponse(
        has_enough_data=True,
        logs_count=logs_count,
        min_required=MIN_LOGS_REQUIRED,
        threshold_aqi=round(threshold, 1),
        confidence=confidence,
        message=(
            f"Based on {logs_count} logged days, your symptoms tend to start around AQI "
            f"{threshold:.0f} -- a personal logistic-regression fit, not a population guideline."
        ),
    )

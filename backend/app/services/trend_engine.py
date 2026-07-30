"""Short-term AQI trend + forecast.

Uses Holt's linear trend method (double exponential smoothing) -- a
standard, well-understood time-series forecasting technique, distinct from
both the CV classifier (image model) and the rule-based risk engine
(lookup table). It maintains a smoothed "level" and "trend" (AQI-per-hour)
and projects them forward to produce actual point forecasts, not just a
direction label.

Holt's method assumes evenly-spaced samples; AQI readings here are logged
opportunistically (whenever a lookup happens to occur), so the trend update
is normalized by the real elapsed hours between consecutive readings rather
than a fixed step -- readings that are far apart contribute proportionally
less momentum than readings that are close together. This is a direct,
honestly-documented adaptation, not a black box: alpha/beta are fixed
smoothing constants, and the disclaimer on TrendResponse always says this is
a statistical extrapolation, not an atmospheric forecast.
"""

import datetime as dt

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.db_models import AqiReading
from app.models.schemas import ForecastPoint, TrendReading, TrendResponse

_STEADY_THRESHOLD_AQI_PER_HOUR = 3.0
_ALPHA = 0.5  # level smoothing weight
_BETA = 0.3  # trend smoothing weight
_FORECAST_HORIZONS_HOURS = [1, 3, 6]

# The AirNow client already caches per lat/lon bucket for ~15 minutes, so any
# two readings closer together than this are the same underlying observation
# hit twice (e.g. two page loads in quick succession), not new signal. Feeding
# near-simultaneous timestamps into the trend update divides by a near-zero
# elapsed time and blows the momentum estimate up to nonsense -- collapse
# them before smoothing rather than clamping the output after the fact.
_MIN_GAP_HOURS = 0.1  # 6 minutes


def _dedupe_by_min_gap(xs: list[float], ys: list[float]) -> tuple[list[float], list[float]]:
    kept_xs, kept_ys = [xs[0]], [ys[0]]
    for x, y in zip(xs[1:], ys[1:]):
        if x - kept_xs[-1] >= _MIN_GAP_HOURS:
            kept_xs.append(x)
            kept_ys.append(y)
    return kept_xs, kept_ys


def _holt_linear_smoothing(xs: list[float], ys: list[float]) -> tuple[float, float]:
    """Returns (level, trend) at the last timestamp, trend in AQI/hour."""
    level = ys[0]
    trend = 0.0
    for i in range(1, len(xs)):
        elapsed_hours = xs[i] - xs[i - 1]
        predicted = level + trend * elapsed_hours
        prev_level = level
        level = _ALPHA * ys[i] + (1 - _ALPHA) * predicted
        trend = _BETA * ((level - prev_level) / elapsed_hours) + (1 - _BETA) * trend
    return level, trend


def compute_trend(db: Session, lat_bucket: float, lon_bucket: float, hours: int = 6) -> TrendResponse:
    cutoff = dt.datetime.utcnow() - dt.timedelta(hours=hours)
    rows = (
        db.execute(
            select(AqiReading)
            .where(
                AqiReading.lat_bucket == lat_bucket,
                AqiReading.lon_bucket == lon_bucket,
                AqiReading.recorded_at >= cutoff,
            )
            .order_by(AqiReading.recorded_at)
        )
        .scalars()
        .all()
    )

    readings = [TrendReading(recorded_at=r.recorded_at, aqi=r.aqi) for r in rows]

    if len(rows) < 2:
        return TrendResponse(
            direction="steady",
            basis="Not enough recent readings yet to estimate a trend.",
            readings=readings,
            forecast=[],
        )

    t0 = rows[0].recorded_at
    raw_xs = [(r.recorded_at - t0).total_seconds() / 3600 for r in rows]
    raw_ys = [float(r.aqi) for r in rows]
    xs, ys = _dedupe_by_min_gap(raw_xs, raw_ys)

    if len(xs) < 2:
        return TrendResponse(
            direction="steady",
            basis="Not enough distinct recent readings yet to estimate a trend.",
            readings=readings,
            forecast=[],
        )

    level, trend = _holt_linear_smoothing(xs, ys)

    if trend > _STEADY_THRESHOLD_AQI_PER_HOUR:
        direction = "worsening"
    elif trend < -_STEADY_THRESHOLD_AQI_PER_HOUR:
        direction = "improving"
    else:
        direction = "steady"

    forecast = [
        ForecastPoint(hours_ahead=h, aqi=round(max(level + trend * h, 0), 1)) for h in _FORECAST_HORIZONS_HOURS
    ]
    forecast_summary = ", ".join(f"+{f.hours_ahead}h: {f.aqi:.0f}" for f in forecast)

    return TrendResponse(
        direction=direction,
        basis=(
            f"Holt's linear smoothing over the last {len(rows)} readings ({xs[-1]:.1f}h window): "
            f"momentum {trend:+.1f} AQI/hr. Projected AQI -- {forecast_summary}."
        ),
        readings=readings,
        forecast=forecast,
    )

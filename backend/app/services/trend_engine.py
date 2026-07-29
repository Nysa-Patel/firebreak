"""Short-term AQI trend signal.

Deliberately simple and honestly labeled: a weighted linear slope over recent
logged readings, not an atmospheric forecast. Wind data (NOAA) can be folded
in later as an additional weighting term if there's time, but the disclaimer
in TrendResponse should stay regardless of how it's computed.
"""

import datetime as dt

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.db_models import AqiReading
from app.models.schemas import TrendResponse

_STEADY_THRESHOLD_AQI_PER_HOUR = 3.0


def compute_trend(db: Session, lat_bucket: float, lon_bucket: float) -> TrendResponse:
    cutoff = dt.datetime.utcnow() - dt.timedelta(hours=6)
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

    if len(rows) < 2:
        return TrendResponse(direction="steady", basis="Not enough recent readings yet to estimate a trend.")

    t0 = rows[0].recorded_at
    xs = [(r.recorded_at - t0).total_seconds() / 3600 for r in rows]
    ys = [float(r.aqi) for r in rows]

    n = len(xs)
    mean_x = sum(xs) / n
    mean_y = sum(ys) / n
    denom = sum((x - mean_x) ** 2 for x in xs)
    slope = sum((x - mean_x) * (y - mean_y) for x, y in zip(xs, ys)) / denom if denom else 0.0

    if slope > _STEADY_THRESHOLD_AQI_PER_HOUR:
        direction = "worsening"
    elif slope < -_STEADY_THRESHOLD_AQI_PER_HOUR:
        direction = "improving"
    else:
        direction = "steady"

    return TrendResponse(
        direction=direction,
        basis=f"AQI changing ~{slope:+.1f}/hr over the last {n} readings ({xs[-1]:.1f}h window).",
    )

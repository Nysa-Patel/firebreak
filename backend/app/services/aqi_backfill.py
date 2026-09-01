"""One-time historical backfill for a location's first trend lookup.

Holt's smoothing needs at least two readings to say anything, and a
brand-new location naturally starts with just the one live reading logged
the moment someone checks it. Rather than make them wait an hour for a
second data point, the first trend lookup for a location pulls its real
recent hourly history from AirNow and logs it, so there's a genuine
multi-point trend on the very first check.
"""

from sqlalchemy.orm import Session

from app.models.db_models import AqiReading
from app.services.airnow_client import get_historical_series

_TREND_BUCKET_DECIMALS = 2

# The backfill call is the expensive one (a bounding-box date-range query,
# not a single point lookup). Without this, two people checking the same
# brand-new city in the same instant would both see "not enough readings yet"
# and both fire it, burning AirNow quota for a location that only needed it
# fetched once. Process-lifetime only -- fine for a single backend instance,
# and the second request just proceeds without a backfill it doesn't need
# once the first one lands.
_in_progress: set[tuple[float, float]] = set()


async def backfill_new_location(db: Session, lat: float, lon: float) -> None:
    lat_bucket = round(lat, _TREND_BUCKET_DECIMALS)
    lon_bucket = round(lon, _TREND_BUCKET_DECIMALS)
    key = (lat_bucket, lon_bucket)

    if key in _in_progress:
        return
    _in_progress.add(key)

    try:
        series = await get_historical_series(lat, lon)
        if not series:
            return
        for recorded_at, aqi in series:
            db.add(AqiReading(lat_bucket=lat_bucket, lon_bucket=lon_bucket, aqi=aqi, recorded_at=recorded_at))
        db.commit()
    finally:
        _in_progress.discard(key)

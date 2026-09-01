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


async def backfill_new_location(db: Session, lat: float, lon: float) -> None:
    series = await get_historical_series(lat, lon)
    if not series:
        return

    lat_bucket = round(lat, _TREND_BUCKET_DECIMALS)
    lon_bucket = round(lon, _TREND_BUCKET_DECIMALS)
    for recorded_at, aqi in series:
        db.add(AqiReading(lat_bucket=lat_bucket, lon_bucket=lon_bucket, aqi=aqi, recorded_at=recorded_at))
    db.commit()

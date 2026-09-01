"""Hourly AQI trend seeder, running in-process.

Used to run as an external scheduled ping hitting /api/aqi once per location,
but that meant relying on some outside caller actually firing on schedule.
Doing it in-process means the same server that already talks to AirNow for
real user requests just also does it once an hour, for a fixed demo set plus
every location anyone has actually looked up recently -- so a trend, once it
exists for a city, keeps building instead of going stale the moment the
person who checked it moves on.
"""

import asyncio
import datetime as dt
import logging

from sqlalchemy import select

from app.database import SessionLocal
from app.models.db_models import AqiReading
from app.services.airnow_client import get_current_aqi

logger = logging.getLogger(__name__)

_SEED_LOCATIONS = [
    (40.8597878, -74.3872803),  # Parsippany, NJ
    (39.7285, -121.8375),  # Chico, CA
    (34.0522, -118.2437),  # Los Angeles, CA
    (39.7392, -104.9903),  # Denver, CO
    (45.5152, -122.6784),  # Portland, OR
    (40.7128, -74.006),  # New York, NY
]

_TREND_BUCKET_DECIMALS = 2
_SEED_INTERVAL_SECONDS = 60 * 60

# A location drops out of the hourly refresh if nobody's checked it in this
# long -- keeps the seeder from growing to re-ping every place ever looked up
# once, forever.
_ACTIVE_LOCATION_WINDOW_DAYS = 3


def _active_locations() -> list[tuple[float, float]]:
    cutoff = dt.datetime.utcnow() - dt.timedelta(days=_ACTIVE_LOCATION_WINDOW_DAYS)
    db = SessionLocal()
    try:
        rows = db.execute(
            select(AqiReading.lat_bucket, AqiReading.lon_bucket)
            .where(AqiReading.recorded_at >= cutoff)
            .distinct()
        ).all()
        return [(row.lat_bucket, row.lon_bucket) for row in rows]
    finally:
        db.close()


async def _seed_once() -> None:
    locations = set(_SEED_LOCATIONS) | set(_active_locations())
    for lat, lon in locations:
        try:
            result = await get_current_aqi(lat, lon)
        except Exception:
            logger.exception("AQI seed fetch failed for %s,%s", lat, lon)
            continue

        if result.aqi is None:
            continue

        db = SessionLocal()
        try:
            db.add(
                AqiReading(
                    lat_bucket=round(lat, _TREND_BUCKET_DECIMALS),
                    lon_bucket=round(lon, _TREND_BUCKET_DECIMALS),
                    aqi=result.aqi,
                )
            )
            db.commit()
        finally:
            db.close()


async def run_aqi_seeder_forever() -> None:
    while True:
        try:
            await _seed_once()
        except Exception:
            logger.exception("AQI seeder pass failed")
        await asyncio.sleep(_SEED_INTERVAL_SECONDS)

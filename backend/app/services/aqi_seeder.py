"""Hourly AQI trend seeder, running in-process.

Used to run as an external scheduled ping hitting /api/aqi once per location,
but that meant relying on some outside caller actually firing on schedule.
Doing it in-process means the same server that already talks to AirNow for
real user requests just also does it once an hour for a fixed set of
locations, so trend charts have something to show even for places nobody's
loaded recently.
"""

import asyncio
import logging

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


async def _seed_once() -> None:
    for lat, lon in _SEED_LOCATIONS:
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

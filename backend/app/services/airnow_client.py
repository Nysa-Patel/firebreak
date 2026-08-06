import datetime as dt
import time

import httpx

from app.config import settings
from app.models.schemas import AqiResponse
from app.services.aqi_utils import aqi_to_category
from app.services.geohash_utils import haversine_km

_AIRNOW_URL = "https://www.airnowapi.org/aq/observation/latLong/current/"

# In-memory TTL cache keyed by (rounded lat, rounded lon). Rounding to 2
# decimal places (~1.1km) means nearby requests share a cache entry, which
# matters because AirNow's free tier rate-limits by key, not by caller.
_cache: dict[tuple[float, float], tuple[float, AqiResponse]] = {}


def _stub_response() -> AqiResponse:
    return AqiResponse(
        aqi=75,
        pm25=22.4,
        category=aqi_to_category(75),
        source="stub",
        station_distance_km=None,
        observed_at=None,
    )


async def get_current_aqi(lat: float, lon: float) -> AqiResponse:
    if not settings.airnow_api_key:
        return _stub_response()

    cache_key = (round(lat, 2), round(lon, 2))
    cached = _cache.get(cache_key)
    if cached and time.time() - cached[0] < settings.airnow_cache_ttl_seconds:
        return cached[1]

    params = {
        "format": "application/json",
        "latitude": lat,
        "longitude": lon,
        "distance": 50,
        "API_KEY": settings.airnow_api_key,
    }

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(_AIRNOW_URL, params=params)
            resp.raise_for_status()
            observations = resp.json()
    except httpx.HTTPError:
        # AirNow being slow/unreachable for a given location shouldn't 500 the
        # whole endpoint -- fall back to the same clearly-labeled stub used
        # when no API key is configured, so the UI degrades instead of breaking.
        return _stub_response()

    if not observations:
        result = AqiResponse(aqi=None, pm25=None, category="good", source="airnow")
        _cache[cache_key] = (time.time(), result)
        return result

    pm25_obs = next((o for o in observations if o.get("ParameterName") == "PM2.5"), observations[0])
    station_distance = haversine_km(lat, lon, pm25_obs["Latitude"], pm25_obs["Longitude"])
    observed_at = dt.datetime.strptime(
        f"{pm25_obs['DateObserved']} {pm25_obs['HourObserved']}:00", "%Y-%m-%d %H:%M"
    )

    result = AqiResponse(
        aqi=pm25_obs["AQI"],
        pm25=pm25_obs["AQI"],  # AirNow reports AQI, not raw ug/m3, on this endpoint
        category=aqi_to_category(pm25_obs["AQI"]),
        source="airnow",
        station_distance_km=round(station_distance, 1),
        observed_at=observed_at,
    )
    _cache[cache_key] = (time.time(), result)
    return result

import datetime as dt
import time

import httpx

from app.config import settings
from app.models.schemas import AqiResponse
from app.services.aqi_utils import aqi_to_category
from app.services.geohash_utils import haversine_km

_AIRNOW_URL = "https://www.airnowapi.org/aq/observation/latLong/current/"
_DATA_URL = "https://www.airnowapi.org/aq/data/"

# Half-width of the bounding box sent to the data API, in degrees -- roughly
# matches the 50km "distance" radius the current-observation lookup already
# uses, just expressed as a box since /aq/data/ takes BBOX, not a radius.
_BACKFILL_BBOX_DEG = 0.5
_BACKFILL_WINDOW_HOURS = 24

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


def _unavailable_response() -> AqiResponse:
    # Distinct from _stub_response(): this is a real integration that failed
    # this one time (timeout/rate-limit/AirNow outage), not a demo running
    # without a key. Returning a fake-but-plausible AQI number here would
    # tell the risk engine (and the user) something we don't actually know --
    # aqi=None keeps it honest and lets the frontend say "temporarily
    # unavailable" instead of either a fabricated reading or "no coverage
    # here", which would be the wrong claim for a place that does have a
    # station, just not reachable this instant.
    return AqiResponse(aqi=None, pm25=None, category="good", source="unavailable")


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
        # whole endpoint, but it also shouldn't quietly hand back a fabricated
        # reading -- say plainly that this attempt failed instead.
        return _unavailable_response()

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


async def get_historical_series(lat: float, lon: float) -> list[tuple[dt.datetime, int]]:
    """Real recent hourly PM2.5 history for one location, used to backfill a
    brand-new location's trend on its first lookup.

    This is a different AirNow endpoint from get_current_aqi -- the obvious
    choice, /aq/observation/latLong/historical/, turned out (tested directly
    against the live API) to only ever return one same-day daily-summary
    value no matter which hour you ask for, so it can't actually backfill
    anything. /aq/data/ is built for date-range queries instead and returns
    genuine per-hour readings per monitor, which is what this needs.
    """
    if not settings.airnow_api_key:
        return []

    now = dt.datetime.utcnow()
    start = now - dt.timedelta(hours=_BACKFILL_WINDOW_HOURS)
    d = _BACKFILL_BBOX_DEG
    params = {
        "startDate": start.strftime("%Y-%m-%dT%H"),
        "endDate": now.strftime("%Y-%m-%dT%H"),
        "parameters": "PM25",
        "BBOX": f"{lon - d},{lat - d},{lon + d},{lat + d}",
        "dataType": "A",
        "format": "application/json",
        "verbose": 0,
        "monitorType": 2,
        "API_KEY": settings.airnow_api_key,
    }

    try:
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.get(_DATA_URL, params=params)
            resp.raise_for_status()
            rows = resp.json()
    except httpx.HTTPError:
        return []

    if not rows:
        return []

    # The bbox can catch several monitors -- keep only whichever one is
    # actually closest to the requested point, same station-choice logic
    # get_current_aqi already applies off the observation endpoint.
    stations = {(r["Latitude"], r["Longitude"]) for r in rows}
    nearest = min(stations, key=lambda s: haversine_km(lat, lon, s[0], s[1]))

    series = [
        (dt.datetime.strptime(r["UTC"], "%Y-%m-%dT%H:%M"), r["AQI"])
        for r in rows
        if (r["Latitude"], r["Longitude"]) == nearest
    ]
    series.sort(key=lambda p: p[0])
    return series

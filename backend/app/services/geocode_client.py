"""Free-text location search via OpenStreetMap's Nominatim -- the same free,
no-API-key service already used for the clean-air-locations fetch
(scripts/fetch_clean_air_locations.py). Proxied server-side (rather than
called directly from the browser) so it gets a proper descriptive
User-Agent per Nominatim's usage policy, and a short cache so repeat
searches for the same city don't hit their public server again.
"""

import time

import httpx

from app.models.schemas import GeocodeResult

_NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
_HEADERS = {"User-Agent": "firebreak-wildfire-app/0.1 (student competition project)"}
_CACHE_TTL_SECONDS = 300

_cache: dict[str, tuple[float, list[GeocodeResult]]] = {}


async def search_location(query: str) -> list[GeocodeResult]:
    cache_key = query.strip().lower()
    cached = _cache.get(cache_key)
    if cached and time.time() - cached[0] < _CACHE_TTL_SECONDS:
        return cached[1]

    async with httpx.AsyncClient(timeout=6) as client:
        resp = await client.get(
            _NOMINATIM_URL,
            params={"q": query, "format": "json", "limit": 5, "addressdetails": 0},
            headers=_HEADERS,
        )
        resp.raise_for_status()
        raw = resp.json()

    results = [GeocodeResult(label=r["display_name"], lat=float(r["lat"]), lon=float(r["lon"])) for r in raw]
    _cache[cache_key] = (time.time(), results)
    return results

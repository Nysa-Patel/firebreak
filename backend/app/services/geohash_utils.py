"""Minimal pure-Python geohash encoder.

Used to fuzz crowd-submission coordinates down to a coarse cell before
storage/display -- we deliberately never persist the exact lat/lon a user
submitted from. Precision 6 (~1.2km x 0.6km) is the default (see
app.config.settings.submission_geohash_precision).
"""

import math

_BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz"


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def encode(lat: float, lon: float, precision: int = 6) -> str:
    lat_range = (-90.0, 90.0)
    lon_range = (-180.0, 180.0)
    geohash = []
    bit = 0
    ch = 0
    even = True

    while len(geohash) < precision:
        if even:
            mid = (lon_range[0] + lon_range[1]) / 2
            if lon >= mid:
                ch |= 1 << (4 - bit)
                lon_range = (mid, lon_range[1])
            else:
                lon_range = (lon_range[0], mid)
        else:
            mid = (lat_range[0] + lat_range[1]) / 2
            if lat >= mid:
                ch |= 1 << (4 - bit)
                lat_range = (mid, lat_range[1])
            else:
                lat_range = (lat_range[0], mid)

        even = not even
        if bit < 4:
            bit += 1
        else:
            geohash.append(_BASE32[ch])
            bit = 0
            ch = 0

    return "".join(geohash)


def decode_center(geohash: str) -> tuple[float, float]:
    """Approximate center point of a geohash cell -- used for map display,
    never for anything requiring the submitter's real location."""
    lat_range = (-90.0, 90.0)
    lon_range = (-180.0, 180.0)
    even = True

    for char in geohash:
        idx = _BASE32.index(char)
        for shift in range(4, -1, -1):
            bit = (idx >> shift) & 1
            if even:
                mid = (lon_range[0] + lon_range[1]) / 2
                lon_range = (mid, lon_range[1]) if bit else (lon_range[0], mid)
            else:
                mid = (lat_range[0] + lat_range[1]) / 2
                lat_range = (mid, lat_range[1]) if bit else (lat_range[0], mid)
            even = not even

    return (lat_range[0] + lat_range[1]) / 2, (lon_range[0] + lon_range[1]) / 2

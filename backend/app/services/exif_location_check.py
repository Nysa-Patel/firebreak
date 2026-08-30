"""EXIF GPS cross-check -- a soft trust signal, not a fraud-proof.

Compares whatever GPS coordinates (if any) are embedded in a submitted
photo's EXIF metadata against the coordinates the submitter's device
reported for the submission itself. This can only ever be a soft signal:
EXIF GPS is easy to strip, easy to spoof, and frequently just absent (many
browsers and messaging apps strip it on upload/share by default) -- so
absence of EXIF GPS is treated as "no information," not suspicious. Only a
*present* EXIF GPS location that disagrees with the submitted location
pulls the trust score down, and even then it never crushes it to
near-zero on its own, since a real mismatch can also come from stale
device GPS or a photo taken while traveling, not just fraud.
"""

import io
import math
from dataclasses import dataclass

from PIL import Image

from app.services.geohash_utils import haversine_km

# Within this radius, EXIF GPS and the submitted location are treated as
# describing "the same area" -- matches the search radius already used for
# AQI station lookups and clean-air-location queries elsewhere in the app,
# so there's one shared notion of "local" throughout.
_CONSISTENT_RADIUS_KM = 50.0

# A mismatch beyond the consistent radius decays the penalty by inverse
# distance, but never below this floor -- EXIF GPS disagreeing with the
# submitted location is suspicious, not proof of fraud (stale device GPS,
# traveling between taking and uploading a photo, etc. are real
# explanations too), so this signal alone can never crush trust to
# near-zero.
_MIN_PENALTY = 0.3


@dataclass(frozen=True)
class ExifLocationCheck:
    has_gps: bool
    distance_km: float | None
    penalty: float
    reason: str


def _dms_to_decimal(dms: tuple, ref: str) -> float:
    degrees, minutes, seconds = (float(v) for v in dms)
    decimal = degrees + minutes / 60 + seconds / 3600
    return -decimal if ref in ("S", "W") else decimal


def _extract_exif_gps(raw: bytes) -> tuple[float, float] | None:
    try:
        image = Image.open(io.BytesIO(raw))
        exif = image.getexif()
        gps_ifd = exif.get_ifd(0x8825)  # GPSInfo IFD, per the EXIF spec
        if not gps_ifd:
            return None
        lat_dms, lat_ref = gps_ifd.get(2), gps_ifd.get(1)
        lon_dms, lon_ref = gps_ifd.get(4), gps_ifd.get(3)
        if not (lat_dms and lat_ref and lon_dms and lon_ref):
            return None
        lat = _dms_to_decimal(lat_dms, lat_ref)
        lon = _dms_to_decimal(lon_dms, lon_ref)
        if math.isnan(lat) or math.isnan(lon):
            return None
        return lat, lon
    except Exception:
        # Corrupt/unusual EXIF shouldn't ever fail a submission -- this is
        # a soft bonus signal, not a required one.
        return None


def check_exif_location(raw: bytes, submitted_lat: float, submitted_lon: float) -> ExifLocationCheck:
    gps = _extract_exif_gps(raw)
    if gps is None:
        return ExifLocationCheck(
            has_gps=False,
            distance_km=None,
            penalty=1.0,
            reason="No EXIF GPS data in the photo -- common (many apps strip it), not treated as suspicious.",
        )

    exif_lat, exif_lon = gps
    distance_km = haversine_km(submitted_lat, submitted_lon, exif_lat, exif_lon)

    if distance_km <= _CONSISTENT_RADIUS_KM:
        return ExifLocationCheck(
            has_gps=True,
            distance_km=round(distance_km, 1),
            penalty=1.0,
            reason=f"Photo's embedded GPS is {distance_km:.0f}km from the submitted location -- consistent.",
        )

    penalty = max(_MIN_PENALTY, _CONSISTENT_RADIUS_KM / distance_km)
    return ExifLocationCheck(
        has_gps=True,
        distance_km=round(distance_km, 1),
        penalty=round(penalty, 3),
        reason=f"Photo's embedded GPS is {distance_km:.0f}km from the submitted location -- flagged as a mismatch.",
    )

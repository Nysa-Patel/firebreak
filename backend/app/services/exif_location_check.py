"""EXIF GPS cross-check. A soft trust signal, not proof of fraud.

Compares whatever GPS coordinates (if any) are embedded in a submitted
photo's EXIF metadata against the coordinates the submitter's device
reported for the submission itself. It can only ever be a soft signal:
EXIF GPS is easy to strip, easy to spoof, and often just missing entirely,
since plenty of browsers and messaging apps strip it by default on upload.
So no EXIF GPS just means "no information," not suspicion. Only a location
that's actually present and disagrees pulls the trust score down, and even
then it never crushes it to near-zero on its own. A real mismatch could
just as easily be stale device GPS, or a photo taken while traveling.
"""

import io
import math
from dataclasses import dataclass

from PIL import Image

from app.services.geohash_utils import haversine_km

# Same radius already used for AQI station lookups and clean-air-location
# queries elsewhere, so "local" means the same thing everywhere in the app.
_CONSISTENT_RADIUS_KM = 50.0

# Past the consistent radius, the penalty decays by inverse distance but
# never drops below this floor. A disagreeing location is suspicious, sure,
# but not proof of fraud on its own -- so this signal alone shouldn't be
# able to tank trust to near zero.
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

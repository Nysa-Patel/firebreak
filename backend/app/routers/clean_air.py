import math

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.db_models import CleanAirLocation
from app.models.schemas import CleanAirLocationOut
from app.services.geohash_utils import haversine_km

router = APIRouter(prefix="/api", tags=["clean-air"])


@router.get("/clean-air-locations", response_model=list[CleanAirLocationOut])
async def clean_air_locations(
    lat: float = Query(ge=-90, le=90),
    lon: float = Query(ge=-180, le=180),
    radius_km: float = Query(default=25, ge=1, le=200),
    db: Session = Depends(get_db),
) -> list[CleanAirLocationOut]:
    rows = db.execute(select(CleanAirLocation)).scalars().all()

    results = []
    for row in rows:
        distance = haversine_km(lat, lon, row.lat, row.lon)
        if distance <= radius_km:
            out = CleanAirLocationOut.model_validate(row)
            out.distance_km = round(distance, 1)
            results.append(out)

    return sorted(results, key=lambda r: r.distance_km or math.inf)

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.db_models import AqiReading
from app.models.schemas import AqiResponse
from app.services.airnow_client import get_current_aqi

router = APIRouter(prefix="/api", tags=["aqi"])

# Bucket precision for trend logging -- coarser than the geohash used for
# crowd submissions since this is just for grouping repeat lookups of "the
# same area", not a privacy control.
_TREND_BUCKET_DECIMALS = 2


@router.get("/aqi", response_model=AqiResponse)
async def read_aqi(
    lat: float = Query(ge=-90, le=90),
    lon: float = Query(ge=-180, le=180),
    db: Session = Depends(get_db),
) -> AqiResponse:
    result = await get_current_aqi(lat, lon)

    if result.aqi is not None:
        db.add(
            AqiReading(
                lat_bucket=round(lat, _TREND_BUCKET_DECIMALS),
                lon_bucket=round(lon, _TREND_BUCKET_DECIMALS),
                aqi=result.aqi,
            )
        )
        db.commit()

    return result

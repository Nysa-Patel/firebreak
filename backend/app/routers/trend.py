from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.db_models import AqiReading
from app.models.schemas import TrendResponse
from app.services.aqi_backfill import backfill_new_location
from app.services.trend_engine import compute_trend

router = APIRouter(prefix="/api", tags=["trend"])

_TREND_BUCKET_DECIMALS = 2

# Below this, a location hasn't been looked up enough times for Holt's
# smoothing to say anything -- worth a one-time historical backfill so the
# first lookup doesn't just sit at "not enough data".
_BACKFILL_THRESHOLD = 2


@router.get("/trend", response_model=TrendResponse)
async def trend(
    lat: float = Query(ge=-90, le=90),
    lon: float = Query(ge=-180, le=180),
    hours: int = Query(default=6, ge=1, le=48),
    db: Session = Depends(get_db),
) -> TrendResponse:
    lat_bucket = round(lat, _TREND_BUCKET_DECIMALS)
    lon_bucket = round(lon, _TREND_BUCKET_DECIMALS)

    existing = db.execute(
        select(func.count())
        .select_from(AqiReading)
        .where(AqiReading.lat_bucket == lat_bucket, AqiReading.lon_bucket == lon_bucket)
    ).scalar_one()

    if existing < _BACKFILL_THRESHOLD:
        await backfill_new_location(db, lat, lon)

    return compute_trend(db, lat_bucket, lon_bucket, hours=hours)

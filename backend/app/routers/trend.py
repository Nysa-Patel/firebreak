from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.schemas import TrendResponse
from app.services.trend_engine import compute_trend

router = APIRouter(prefix="/api", tags=["trend"])

_TREND_BUCKET_DECIMALS = 2


@router.get("/trend", response_model=TrendResponse)
async def trend(
    lat: float = Query(ge=-90, le=90),
    lon: float = Query(ge=-180, le=180),
    db: Session = Depends(get_db),
) -> TrendResponse:
    return compute_trend(db, round(lat, _TREND_BUCKET_DECIMALS), round(lon, _TREND_BUCKET_DECIMALS))

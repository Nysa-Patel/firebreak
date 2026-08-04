import httpx
from fastapi import APIRouter, HTTPException, Query

from app.models.schemas import GeocodeResult
from app.services.geocode_client import search_location

router = APIRouter(prefix="/api", tags=["geocode"])


@router.get("/geocode", response_model=list[GeocodeResult])
async def geocode(q: str = Query(min_length=2, max_length=100)) -> list[GeocodeResult]:
    try:
        return await search_location(q)
    except httpx.HTTPError:
        raise HTTPException(status_code=502, detail="Location search is temporarily unavailable.")

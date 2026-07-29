from fastapi import APIRouter

from app.models.schemas import RiskScoreRequest, RiskScoreResponse
from app.services.risk_engine import score_risk

router = APIRouter(prefix="/api", tags=["risk"])


@router.post("/risk-score", response_model=RiskScoreResponse)
async def risk_score(request: RiskScoreRequest) -> RiskScoreResponse:
    return score_risk(request)

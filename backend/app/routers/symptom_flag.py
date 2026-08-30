from fastapi import APIRouter

from app.models.schemas import (
    PatternMatchResponse,
    SymptomChecklistItem,
    SymptomChecklistResponse,
    SymptomFlagRequest,
    SymptomFlagResponse,
)
from app.services.symptom_pattern_match import match_pattern
from app.services.symptom_rules import CHECKLISTS, DISCLAIMER, evaluate_symptoms

router = APIRouter(prefix="/api", tags=["symptom-flag"])


@router.get("/symptom-checklist", response_model=SymptomChecklistResponse)
async def symptom_checklist() -> SymptomChecklistResponse:
    return SymptomChecklistResponse(
        conditions={
            bucket: [SymptomChecklistItem(id=s.id, label=s.label, tier=s.tier) for s in symptoms]
            for bucket, symptoms in CHECKLISTS.items()
        },
        disclaimer=DISCLAIMER,
    )


@router.post("/symptom-flag", response_model=SymptomFlagResponse)
async def symptom_flag(payload: SymptomFlagRequest) -> SymptomFlagResponse:
    assessment = evaluate_symptoms(payload.checked_symptom_ids)
    pattern = match_pattern(payload.checked_symptom_ids)
    return SymptomFlagResponse(
        level=assessment.level,
        message=assessment.message,
        matched_critical=assessment.matched_critical,
        matched_moderate=assessment.matched_moderate,
        matched_mild=assessment.matched_mild,
        disclaimer=DISCLAIMER,
        pattern_match=PatternMatchResponse(
            matched=pattern.matched,
            pattern=pattern.pattern,
            score=pattern.score,
            matched_symptoms=pattern.matched_symptoms,
            reason=pattern.reason,
        ),
    )

from fastapi import APIRouter

from app.models.schemas import AskRequest, AskResponse, AskSource
from app.services.rag_answer import ASK_DISCLAIMER, compose_answer

router = APIRouter(prefix="/api", tags=["ask"])


@router.post("/ask", response_model=AskResponse)
async def ask(payload: AskRequest) -> AskResponse:
    answer, grounded, results = compose_answer(payload.question, payload.context)
    return AskResponse(
        answer=answer,
        grounded=grounded,
        sources=[AskSource(id=r.entry.id, title=r.entry.title, source_label=r.entry.source_label) for r in results],
        disclaimer=ASK_DISCLAIMER,
    )

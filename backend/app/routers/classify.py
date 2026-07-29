from fastapi import APIRouter, File, HTTPException, UploadFile

from app.ml.inference import classify_smoke_bytes
from app.models.schemas import ClassifySmokeResponse

router = APIRouter(prefix="/api", tags=["classify"])

_MAX_UPLOAD_BYTES = 8 * 1024 * 1024


@router.post("/classify-smoke", response_model=ClassifySmokeResponse)
async def classify_smoke(photo: UploadFile = File(...)) -> ClassifySmokeResponse:
    raw = await photo.read()
    if len(raw) > _MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Photo too large (max 8MB).")
    if not raw:
        raise HTTPException(status_code=400, detail="Empty upload.")

    return classify_smoke_bytes(raw)

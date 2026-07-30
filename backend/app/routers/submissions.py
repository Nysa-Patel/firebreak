import base64
import datetime as dt

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.ml.inference import classify_smoke_bytes
from app.models.db_models import Submission
from app.models.schemas import SubmissionDetailOut, SubmissionOut
from app.services import geohash_utils
from app.services.phash_utils import compute_phash_bytes, is_near_duplicate
from app.services.photo_retention import purge_expired_photos

router = APIRouter(prefix="/api", tags=["submissions"])

_MAX_UPLOAD_BYTES = 8 * 1024 * 1024


def _to_out(row: Submission) -> SubmissionOut:
    lat, lon = geohash_utils.decode_center(row.geohash)
    return SubmissionOut(
        id=row.id,
        geohash=row.geohash,
        fuzzed_lat=lat,
        fuzzed_lon=lon,
        density_class=row.density_class,
        confidence=row.confidence,
        trust_score=row.trust_score,
        created_at=row.created_at,
    )


def _to_detail(row: Submission) -> SubmissionDetailOut:
    base = _to_out(row)
    return SubmissionDetailOut(
        **base.model_dump(),
        client_captured_at=row.client_captured_at,
        photo_base64=row.photo_base64,
        photo_available=row.photo_base64 is not None,
    )


@router.post("/submissions", response_model=SubmissionOut)
async def create_submission(
    lat: float = Form(ge=-90, le=90),
    lon: float = Form(ge=-180, le=180),
    captured_at: dt.datetime = Form(...),
    photo: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> SubmissionOut:
    now = dt.datetime.utcnow()

    if captured_at > now + dt.timedelta(minutes=2):
        raise HTTPException(status_code=400, detail="captured_at is in the future.")
    age_minutes = (now - captured_at).total_seconds() / 60
    if age_minutes > settings.submission_max_age_minutes:
        raise HTTPException(
            status_code=400,
            detail=f"Photo is too old ({age_minutes:.0f} min) -- submissions must reflect current conditions.",
        )

    raw = await photo.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Empty upload.")
    if len(raw) > _MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Photo too large (max 8MB).")

    geohash = geohash_utils.encode(lat, lon, settings.submission_geohash_precision)
    phash = compute_phash_bytes(raw)

    # Anti-gaming: flag near-identical images re-submitted from the same
    # rough location in a short window, rather than silently deduping --
    # duplicates still count, but their trust score is suppressed.
    window_start = now - dt.timedelta(minutes=settings.duplicate_window_minutes)
    recent_same_cell = (
        db.execute(
            select(Submission).where(
                Submission.geohash == geohash,
                Submission.created_at >= window_start,
            )
        )
        .scalars()
        .all()
    )
    duplicate_flag_count = sum(1 for s in recent_same_cell if is_near_duplicate(phash, s.phash))

    classification = classify_smoke_bytes(raw)

    freshness = max(0.0, 1 - age_minutes / settings.submission_max_age_minutes)
    duplicate_penalty = 1 / (1 + duplicate_flag_count)
    trust_score = round(classification.confidence * freshness * duplicate_penalty, 3)

    submission = Submission(
        geohash=geohash,
        density_class=classification.density_class,
        confidence=classification.confidence,
        trust_score=trust_score,
        phash=phash,
        duplicate_flag_count=duplicate_flag_count,
        client_captured_at=captured_at,
        # Kept only for settings.photo_retention_hours -- see photo_retention.py.
        photo_base64=base64.b64encode(raw).decode("ascii"),
    )
    db.add(submission)
    purge_expired_photos(db)
    db.commit()
    db.refresh(submission)

    return _to_out(submission)


@router.get("/submissions", response_model=list[SubmissionOut])
async def list_submissions(
    since_hours: int = 6,
    db: Session = Depends(get_db),
) -> list[SubmissionOut]:
    cutoff = dt.datetime.utcnow() - dt.timedelta(hours=since_hours)
    rows = (
        db.execute(select(Submission).where(Submission.created_at >= cutoff).order_by(Submission.created_at.desc()))
        .scalars()
        .all()
    )
    return [_to_out(r) for r in rows]


@router.get("/submissions/{submission_id}", response_model=SubmissionDetailOut)
async def get_submission(submission_id: int, db: Session = Depends(get_db)) -> SubmissionDetailOut:
    purge_expired_photos(db)
    row = db.get(Submission, submission_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Submission not found.")
    return _to_detail(row)

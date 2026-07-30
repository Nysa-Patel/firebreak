from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.db_models import SymptomLog
from app.models.schemas import PersonalThresholdResponse, SymptomLogCreate, SymptomLogOut
from app.services.personal_model import compute_personal_threshold

router = APIRouter(prefix="/api", tags=["symptom-log"])


def _logs_for_device(db: Session, device_id: str) -> list[SymptomLog]:
    return (
        db.execute(select(SymptomLog).where(SymptomLog.device_id == device_id).order_by(SymptomLog.logged_at))
        .scalars()
        .all()
    )


@router.post("/symptom-logs", response_model=SymptomLogOut)
async def create_symptom_log(payload: SymptomLogCreate, db: Session = Depends(get_db)) -> SymptomLog:
    log = SymptomLog(device_id=payload.device_id, severity=payload.severity, aqi=payload.aqi)
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


@router.get("/symptom-logs", response_model=list[SymptomLogOut])
async def list_symptom_logs(
    device_id: str = Query(min_length=8, max_length=64), db: Session = Depends(get_db)
) -> list[SymptomLog]:
    return _logs_for_device(db, device_id)


@router.get("/personal-threshold", response_model=PersonalThresholdResponse)
async def personal_threshold(
    device_id: str = Query(min_length=8, max_length=64), db: Session = Depends(get_db)
) -> PersonalThresholdResponse:
    return compute_personal_threshold(_logs_for_device(db, device_id))

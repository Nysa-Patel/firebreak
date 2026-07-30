"""Purge submission photos older than the retention window.

Called opportunistically from the submissions router (on write and on
detail-read) rather than via a separate scheduled job -- Render's free tier
has no built-in cron, and piggybacking on existing write/read paths means
every submission naturally gets swept eventually without extra
infrastructure. Only the photo_base64 column is cleared; the row (density
class, trust score, timestamps) is untouched, since that's what the
map/feed display long after the photo itself is gone.
"""

import datetime as dt

from sqlalchemy import update
from sqlalchemy.orm import Session

from app.config import settings
from app.models.db_models import Submission


def purge_expired_photos(db: Session) -> None:
    cutoff = dt.datetime.utcnow() - dt.timedelta(hours=settings.photo_retention_hours)
    db.execute(
        update(Submission)
        .where(Submission.created_at < cutoff, Submission.photo_base64.is_not(None))
        .values(photo_base64=None)
    )
    db.commit()

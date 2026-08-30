from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError, ProgrammingError
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import settings

connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
engine = create_engine(settings.database_url, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def run_migrations() -> None:
    """Tiny hand-rolled migrations for columns added after a table already
    existed in production -- `Base.metadata.create_all()` only creates
    missing *tables*, never alters existing ones. No Alembic setup for a
    project this size, so this stays a short, explicit list rather than a
    real migration framework.
    """
    is_sqlite = settings.database_url.startswith("sqlite")
    with engine.begin() as conn:
        if is_sqlite:
            try:
                conn.execute(text("ALTER TABLE submissions ADD COLUMN photo_base64 TEXT"))
            except OperationalError:
                pass  # column already exists -- sqlite has no IF NOT EXISTS for ADD COLUMN
            try:
                conn.execute(text("ALTER TABLE submissions ADD COLUMN exif_gps_distance_km FLOAT"))
            except OperationalError:
                pass
        else:
            try:
                conn.execute(text("ALTER TABLE submissions ADD COLUMN IF NOT EXISTS photo_base64 TEXT"))
            except ProgrammingError:
                pass
            try:
                conn.execute(text("ALTER TABLE submissions ADD COLUMN IF NOT EXISTS exif_gps_distance_km FLOAT"))
            except ProgrammingError:
                pass

"""Seed seed_data/clean_air_locations.json into the DB.

Idempotent (no-ops if the row count already matches the seed file), so
app.main also calls this at startup -- Render's free tier has no convenient
one-off shell for a Postgres instance, so the app seeding itself on boot
means a fresh Postgres database doesn't require manual intervention after
deploy. Re-syncs (clears + reinserts) when the seed file has changed size --
this table is pure reference data, not user-generated, so replacing it
wholesale on a seed-file update is safe.

Run standalone with: python -m scripts.seed_db
"""

import json
from pathlib import Path

from app.database import Base, SessionLocal, engine
from app.models.db_models import CleanAirLocation

_SEED_FILE = Path(__file__).resolve().parent.parent / "seed_data" / "clean_air_locations.json"


def seed_clean_air_locations() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        entries = json.loads(_SEED_FILE.read_text())
        current_count = db.query(CleanAirLocation).count()
        if current_count == len(entries):
            print(f"clean_air_locations already in sync ({current_count} rows), skipping.")
            return

        db.query(CleanAirLocation).delete()
        for entry in entries:
            db.add(CleanAirLocation(**entry))
        db.commit()
        print(f"Re-synced clean_air_locations: {current_count} -> {len(entries)} rows.")
    finally:
        db.close()


if __name__ == "__main__":
    seed_clean_air_locations()

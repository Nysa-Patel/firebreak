"""One-off script to load seed_data/clean_air_locations.json into the DB.

Run with: python -m scripts.seed_db
"""

import json
from pathlib import Path

from app.database import Base, SessionLocal, engine
from app.models.db_models import CleanAirLocation

_SEED_FILE = Path(__file__).resolve().parent.parent / "seed_data" / "clean_air_locations.json"


def main() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.query(CleanAirLocation).count() > 0:
            print("clean_air_locations already seeded, skipping.")
            return

        entries = json.loads(_SEED_FILE.read_text())
        for entry in entries:
            db.add(CleanAirLocation(**entry))
        db.commit()
        print(f"Seeded {len(entries)} clean-air locations.")
    finally:
        db.close()


if __name__ == "__main__":
    main()

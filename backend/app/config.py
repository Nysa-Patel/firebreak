from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# Anchored to the backend/ package dir rather than left relative -- a
# relative "sqlite:///./wildfire.db" (or a relative ".env" path) resolves
# against the *process's* cwd, which depends on how/where uvicorn was
# launched from. This already silently created a second, unseeded DB file
# once when launched from outside backend/; the same relative-path bug meant
# a real .env sitting in backend/ was never actually picked up either.
_BACKEND_DIR = Path(__file__).resolve().parent.parent
_DEFAULT_SQLITE_PATH = _BACKEND_DIR / "wildfire.db"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=str(_BACKEND_DIR / ".env"), extra="ignore")

    airnow_api_key: str = ""
    database_url: str = f"sqlite:///{_DEFAULT_SQLITE_PATH}"
    noaa_api_key: str = ""
    environment: str = "development"

    # AirNow observations are hourly-ish; cache to stay well under rate limits.
    airnow_cache_ttl_seconds: int = 15 * 60

    # Crowd submissions: geohash precision 6 ~= 1.2km x 0.6km cell, enough to
    # anonymize an exact address while still being useful on a map.
    submission_geohash_precision: int = 6
    duplicate_window_minutes: int = 30
    submission_max_age_minutes: int = 60

    # How long a submission's raw photo stays fetchable via the detail
    # endpoint (pin click) before being purged -- the classification/trust
    # score/timestamp stay on the row indefinitely, just not the image.
    photo_retention_hours: int = 48


settings = Settings()

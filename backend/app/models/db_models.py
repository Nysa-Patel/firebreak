import datetime as dt

from sqlalchemy import Float, Integer, String, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Submission(Base):
    """A crowd-sourced sky photo reading.

    Only the fuzzed geohash cell is stored, never exact coordinates. The
    photo itself is kept only for a short window (see
    app.services.photo_retention) so pin-click detail views can show it --
    after that window the photo_base64 column is nulled out but the row
    (classification, trust score, timestamp) stays, since that's the part
    the map/feed actually displays long-term.
    """

    __tablename__ = "submissions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    geohash: Mapped[str] = mapped_column(String(12), index=True)
    density_class: Mapped[str] = mapped_column(String(16))
    confidence: Mapped[float] = mapped_column(Float)
    trust_score: Mapped[float] = mapped_column(Float)
    phash: Mapped[str] = mapped_column(String(32), index=True)
    duplicate_flag_count: Mapped[int] = mapped_column(Integer, default=0)
    client_captured_at: Mapped[dt.datetime] = mapped_column(DateTime)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=dt.datetime.utcnow)
    photo_base64: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Distance between the photo's EXIF GPS (if present) and the submitted
    # location -- null when the photo had no EXIF GPS at all, not when the
    # locations agreed. Kept for the same reason duplicate_flag_count is:
    # transparency into what fed the trust score, not just the final number.
    exif_gps_distance_km: Mapped[float | None] = mapped_column(Float, nullable=True)


class AqiReading(Base):
    """Log of AQI lookups, keyed by rounded lat/lon bucket, so the trend
    endpoint has real recent history to extrapolate from instead of a single
    point-in-time reading."""

    __tablename__ = "aqi_readings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    lat_bucket: Mapped[float] = mapped_column(Float, index=True)
    lon_bucket: Mapped[float] = mapped_column(Float, index=True)
    aqi: Mapped[int] = mapped_column(Integer)
    recorded_at: Mapped[dt.datetime] = mapped_column(DateTime, default=dt.datetime.utcnow, index=True)


class SymptomLog(Base):
    """One self-reported symptom check-in, tied to a device only (no account)
    via a random anonymous ID generated and stored client-side. The AQI at
    the time of logging travels with it so app.services.personal_model can
    later fit a per-device logistic regression (symptomatic ~ aqi) -- this
    table is never linked to real identity, just the anonymous device id.
    """

    __tablename__ = "symptom_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    device_id: Mapped[str] = mapped_column(String(64), index=True)
    severity: Mapped[str] = mapped_column(String(16))
    aqi: Mapped[int] = mapped_column(Integer)
    logged_at: Mapped[dt.datetime] = mapped_column(DateTime, default=dt.datetime.utcnow, index=True)


class CleanAirLocation(Base):
    """Seeded dataset of indoor spaces with filtered air (libraries, community
    centers, etc.) for the demo region. Framed in the write-up as a stub for a
    future open, crowd-maintained dataset.
    """

    __tablename__ = "clean_air_locations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    category: Mapped[str] = mapped_column(String(64))
    address: Mapped[str] = mapped_column(String(300))
    lat: Mapped[float] = mapped_column(Float)
    lon: Mapped[float] = mapped_column(Float)
    notes: Mapped[str] = mapped_column(String(500), default="")

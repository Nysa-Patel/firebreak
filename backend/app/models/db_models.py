import datetime as dt

from sqlalchemy import Float, Integer, String, DateTime
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Submission(Base):
    """A crowd-sourced sky photo reading.

    Only the fuzzed geohash cell is stored, never exact coordinates, and the
    raw photo is discarded after classification -- only the derived signal
    (density class, confidence, perceptual hash for dedup) is kept.
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

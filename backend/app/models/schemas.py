import datetime as dt
from typing import Literal, Optional

from pydantic import BaseModel, Field

DensityClass = Literal["clear", "hazy", "heavy"]
AqiCategory = Literal["good", "moderate", "unhealthy_sensitive", "unhealthy", "very_unhealthy", "hazardous"]


class AqiResponse(BaseModel):
    aqi: Optional[int]
    pm25: Optional[float]
    category: AqiCategory
    source: Literal["airnow", "stub"]
    station_distance_km: Optional[float] = None
    observed_at: Optional[dt.datetime] = None


class ClassifySmokeResponse(BaseModel):
    density_class: DensityClass
    confidence: float = Field(ge=0, le=1)
    model_source: Literal["onnx_model", "unavailable_stub"]


class RiskProfile(BaseModel):
    age: int = Field(ge=0, le=120)
    has_respiratory_condition: bool = False
    is_pregnant: bool = False
    has_outdoor_occupation: bool = False


class RiskScoreRequest(BaseModel):
    profile: RiskProfile
    aqi_category: AqiCategory
    density_class: Optional[DensityClass] = None


class RiskScoreResponse(BaseModel):
    risk_level: Literal["low", "moderate", "high", "very_high"]
    recommendation: str
    contributing_factors: list[str]


class SubmissionCreate(BaseModel):
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)
    captured_at: dt.datetime
    image_base64: str


class SubmissionOut(BaseModel):
    id: int
    geohash: str
    fuzzed_lat: float
    fuzzed_lon: float
    density_class: DensityClass
    confidence: float
    trust_score: float
    created_at: dt.datetime

    class Config:
        from_attributes = True


class CleanAirLocationOut(BaseModel):
    id: int
    name: str
    category: str
    address: str
    lat: float
    lon: float
    notes: str
    distance_km: Optional[float] = None

    class Config:
        from_attributes = True


class TrendResponse(BaseModel):
    direction: Literal["improving", "steady", "worsening"]
    basis: str
    disclaimer: str = (
        "Lightweight trend extrapolation from recent AQI readings -- not a "
        "predictive atmospheric forecast."
    )

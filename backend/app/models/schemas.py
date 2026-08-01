import datetime as dt
from typing import Literal, Optional

from pydantic import BaseModel, Field

DensityClass = Literal["clear", "hazy", "heavy"]
AqiCategory = Literal["good", "moderate", "unhealthy_sensitive", "unhealthy", "very_unhealthy", "hazardous"]
SymptomSeverity = Literal["none", "mild", "moderate", "severe"]
SymptomTier = Literal["mild", "moderate", "critical"]
ConditionBucket = Literal["general", "asthma_copd", "cardiovascular", "pregnancy"]
SymptomFlagLevel = Literal["none", "mild", "elevated", "urgent", "emergency"]


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
    heatmap_overlay_base64: Optional[str] = None
    explanation: Optional[str] = None


class RiskProfile(BaseModel):
    age: int = Field(ge=0, le=120)
    has_respiratory_condition: bool = False
    has_cardiovascular_condition: bool = False
    is_pregnant: bool = False
    has_outdoor_occupation: bool = False


class RiskScoreRequest(BaseModel):
    profile: RiskProfile
    aqi_category: AqiCategory
    density_class: Optional[DensityClass] = None
    symptom_level: SymptomFlagLevel = "none"


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


class SubmissionDetailOut(SubmissionOut):
    client_captured_at: dt.datetime
    photo_base64: Optional[str] = None
    photo_available: bool = False


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


class TrendReading(BaseModel):
    recorded_at: dt.datetime
    aqi: int


class ForecastPoint(BaseModel):
    hours_ahead: int
    aqi: float


class TrendResponse(BaseModel):
    direction: Literal["improving", "steady", "worsening"]
    basis: str
    readings: list[TrendReading] = []
    forecast: list[ForecastPoint] = []
    method: str = "holt_linear_smoothing"
    disclaimer: str = (
        "Short-term statistical extrapolation from recent AQI readings (Holt's "
        "linear smoothing) -- not a predictive atmospheric forecast."
    )


class SymptomLogCreate(BaseModel):
    device_id: str = Field(min_length=8, max_length=64)
    severity: SymptomSeverity
    aqi: int = Field(ge=0, le=500)


class SymptomLogOut(BaseModel):
    id: int
    logged_at: dt.datetime
    severity: SymptomSeverity
    aqi: int

    class Config:
        from_attributes = True


class PersonalThresholdResponse(BaseModel):
    has_enough_data: bool
    logs_count: int
    min_required: int
    threshold_aqi: Optional[float] = None
    confidence: Literal["low", "moderate", "high"] = "low"
    method: str = "logistic_regression_per_device"
    message: str


class SymptomChecklistItem(BaseModel):
    id: str
    label: str
    tier: SymptomTier


class SymptomChecklistResponse(BaseModel):
    conditions: dict[ConditionBucket, list[SymptomChecklistItem]]
    disclaimer: str


class SymptomFlagRequest(BaseModel):
    checked_symptom_ids: list[str] = []


class SymptomFlagResponse(BaseModel):
    level: SymptomFlagLevel
    message: str
    matched_critical: list[str]
    matched_moderate: list[str]
    matched_mild: list[str]
    disclaimer: str

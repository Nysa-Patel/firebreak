export type AqiCategory =
  | "good"
  | "moderate"
  | "unhealthy_sensitive"
  | "unhealthy"
  | "very_unhealthy"
  | "hazardous";

export type DensityClass = "clear" | "hazy" | "heavy";

export interface AqiResponse {
  aqi: number | null;
  pm25: number | null;
  category: AqiCategory;
  source: "airnow" | "stub";
  station_distance_km: number | null;
  observed_at: string | null;
}

export interface ClassifySmokeResponse {
  density_class: DensityClass;
  confidence: number;
  model_source: "onnx_model" | "unavailable_stub";
  heatmap_overlay_base64: string | null;
  explanation: string | null;
}

export interface RiskProfile {
  age: number;
  has_respiratory_condition: boolean;
  has_cardiovascular_condition: boolean;
  is_pregnant: boolean;
  has_outdoor_occupation: boolean;
}

export interface RiskScoreResponse {
  risk_level: "low" | "moderate" | "high" | "very_high";
  recommendation: string;
  contributing_factors: string[];
}

export type SymptomTier = "mild" | "moderate" | "critical";
export type ConditionBucket = "general" | "asthma_copd" | "cardiovascular" | "pregnancy";
export type SymptomFlagLevel = "none" | "mild" | "elevated" | "urgent" | "emergency";

export interface SymptomChecklistItem {
  id: string;
  label: string;
  tier: SymptomTier;
}

export interface SymptomChecklistResponse {
  conditions: Partial<Record<ConditionBucket, SymptomChecklistItem[]>>;
  disclaimer: string;
}

export interface SymptomFlagResponse {
  level: SymptomFlagLevel;
  message: string;
  matched_critical: string[];
  matched_moderate: string[];
  matched_mild: string[];
  disclaimer: string;
}

export interface SubmissionOut {
  id: number;
  geohash: string;
  fuzzed_lat: number;
  fuzzed_lon: number;
  density_class: DensityClass;
  confidence: number;
  trust_score: number;
  created_at: string;
}

export interface SubmissionDetailOut extends SubmissionOut {
  client_captured_at: string;
  photo_base64: string | null;
  photo_available: boolean;
}

export interface CleanAirLocationOut {
  id: number;
  name: string;
  category: string;
  address: string;
  lat: number;
  lon: number;
  notes: string;
  distance_km: number | null;
}

export interface TrendReading {
  recorded_at: string;
  aqi: number;
}

export interface ForecastPoint {
  hours_ahead: number;
  aqi: number;
}

export interface TrendResponse {
  direction: "improving" | "steady" | "worsening";
  basis: string;
  readings: TrendReading[];
  forecast: ForecastPoint[];
  method: string;
  disclaimer: string;
}

export type SymptomSeverity = "none" | "mild" | "moderate" | "severe";

export interface SymptomLogOut {
  id: number;
  logged_at: string;
  severity: SymptomSeverity;
  aqi: number;
}

export interface PersonalThresholdResponse {
  has_enough_data: boolean;
  logs_count: number;
  min_required: number;
  threshold_aqi: number | null;
  confidence: "low" | "moderate" | "high";
  method: string;
  message: string;
}

export interface AskContext {
  aqi?: number | null;
  aqi_category?: AqiCategory | null;
  density_class?: DensityClass | null;
  symptom_level?: SymptomFlagLevel | null;
  symptom_message?: string | null;
}

export interface AskSource {
  id: string;
  title: string;
  source_label: string;
}

export interface AskResponse {
  answer: string;
  grounded: boolean;
  sources: AskSource[];
  disclaimer: string;
}

export interface GeocodeResult {
  label: string;
  lat: number;
  lon: number;
}

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
}

export interface RiskProfile {
  age: number;
  has_respiratory_condition: boolean;
  is_pregnant: boolean;
  has_outdoor_occupation: boolean;
}

export interface RiskScoreResponse {
  risk_level: "low" | "moderate" | "high" | "very_high";
  recommendation: string;
  contributing_factors: string[];
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

export interface TrendResponse {
  direction: "improving" | "steady" | "worsening";
  basis: string;
  readings: TrendReading[];
  disclaimer: string;
}

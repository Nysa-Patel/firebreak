import type {
  AqiResponse,
  CleanAirLocationOut,
  ClassifySmokeResponse,
  RiskProfile,
  RiskScoreResponse,
  SubmissionOut,
  TrendResponse,
  DensityClass,
  AqiCategory,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, init);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${init?.method ?? "GET"} ${path} failed (${res.status}): ${body}`);
  }
  return res.json() as Promise<T>;
}

export function getAqi(lat: number, lon: number): Promise<AqiResponse> {
  return apiFetch(`/api/aqi?lat=${lat}&lon=${lon}`);
}

export function classifySmoke(photo: File): Promise<ClassifySmokeResponse> {
  const form = new FormData();
  form.append("photo", photo);
  return apiFetch("/api/classify-smoke", { method: "POST", body: form });
}

export function scoreRisk(
  profile: RiskProfile,
  aqiCategory: AqiCategory,
  densityClass?: DensityClass
): Promise<RiskScoreResponse> {
  return apiFetch("/api/risk-score", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profile, aqi_category: aqiCategory, density_class: densityClass }),
  });
}

export function submitPhoto(
  lat: number,
  lon: number,
  capturedAt: Date,
  photo: File
): Promise<SubmissionOut> {
  const form = new FormData();
  form.append("lat", String(lat));
  form.append("lon", String(lon));
  form.append("captured_at", capturedAt.toISOString().slice(0, 19));
  form.append("photo", photo);
  return apiFetch("/api/submissions", { method: "POST", body: form });
}

export function listSubmissions(sinceHours = 6): Promise<SubmissionOut[]> {
  return apiFetch(`/api/submissions?since_hours=${sinceHours}`);
}

export function getCleanAirLocations(
  lat: number,
  lon: number,
  radiusKm = 25
): Promise<CleanAirLocationOut[]> {
  return apiFetch(`/api/clean-air-locations?lat=${lat}&lon=${lon}&radius_km=${radiusKm}`);
}

export function getTrend(lat: number, lon: number): Promise<TrendResponse> {
  return apiFetch(`/api/trend?lat=${lat}&lon=${lon}`);
}

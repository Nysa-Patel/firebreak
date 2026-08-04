import type {
  AqiResponse,
  AskContext,
  AskResponse,
  CleanAirLocationOut,
  ClassifySmokeResponse,
  GeocodeResult,
  PersonalThresholdResponse,
  RiskProfile,
  RiskScoreResponse,
  SubmissionDetailOut,
  SubmissionOut,
  SymptomChecklistResponse,
  SymptomFlagLevel,
  SymptomFlagResponse,
  SymptomLogOut,
  SymptomSeverity,
  TrendResponse,
  DensityClass,
  AqiCategory,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

// Render's free tier spins the backend down after inactivity -- the first
// request after a cold start can take 30-60s to come back, which a bare
// fetch with the browser's default timeout will fail well before. Retrying
// with a generous per-attempt timeout covers a cold start without making
// every normal (already-warm) request feel slow.
const REQUEST_TIMEOUT_MS = 20_000;
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 3_000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url: string, init: RequestInit | undefined, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetchWithTimeout(`${API_BASE}${path}`, init, REQUEST_TIMEOUT_MS);
      if (!res.ok) {
        // 502/503/504 are what a still-waking-up Render instance returns
        // via its proxy before the app is actually listening -- worth a
        // retry. Other 4xx/5xx are real errors, not a cold start.
        if ([502, 503, 504].includes(res.status) && attempt < MAX_ATTEMPTS) {
          await sleep(RETRY_DELAY_MS);
          continue;
        }
        const body = await res.text();
        throw new Error(`${init?.method ?? "GET"} ${path} failed (${res.status}): ${body}`);
      }
      return (await res.json()) as T;
    } catch (err) {
      lastError = err;
      const isAbort = err instanceof DOMException && err.name === "AbortError";
      const isNetworkError = err instanceof TypeError; // fetch's generic "Failed to fetch"
      if ((isAbort || isNetworkError) && attempt < MAX_ATTEMPTS) {
        await sleep(RETRY_DELAY_MS);
        continue;
      }
      throw err;
    }
  }

  throw lastError;
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
  densityClass?: DensityClass,
  symptomLevel?: SymptomFlagLevel
): Promise<RiskScoreResponse> {
  return apiFetch("/api/risk-score", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      profile,
      aqi_category: aqiCategory,
      density_class: densityClass,
      symptom_level: symptomLevel ?? "none",
    }),
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

export function getSubmissionDetail(id: number): Promise<SubmissionDetailOut> {
  return apiFetch(`/api/submissions/${id}`);
}

export function getCleanAirLocations(
  lat: number,
  lon: number,
  radiusKm = 25
): Promise<CleanAirLocationOut[]> {
  return apiFetch(`/api/clean-air-locations?lat=${lat}&lon=${lon}&radius_km=${radiusKm}`);
}

export function getTrend(lat: number, lon: number, hours = 6): Promise<TrendResponse> {
  return apiFetch(`/api/trend?lat=${lat}&lon=${lon}&hours=${hours}`);
}

export function logSymptom(deviceId: string, severity: SymptomSeverity, aqi: number): Promise<SymptomLogOut> {
  return apiFetch("/api/symptom-logs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ device_id: deviceId, severity, aqi }),
  });
}

export function getSymptomLogs(deviceId: string): Promise<SymptomLogOut[]> {
  return apiFetch(`/api/symptom-logs?device_id=${deviceId}`);
}

export function getPersonalThreshold(deviceId: string): Promise<PersonalThresholdResponse> {
  return apiFetch(`/api/personal-threshold?device_id=${deviceId}`);
}

export function getSymptomChecklist(): Promise<SymptomChecklistResponse> {
  return apiFetch("/api/symptom-checklist");
}

export function evaluateSymptomFlag(checkedSymptomIds: string[]): Promise<SymptomFlagResponse> {
  return apiFetch("/api/symptom-flag", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ checked_symptom_ids: checkedSymptomIds }),
  });
}

export function askQuestion(question: string, context?: AskContext): Promise<AskResponse> {
  return apiFetch("/api/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, context }),
  });
}

export function geocodeLocation(query: string): Promise<GeocodeResult[]> {
  return apiFetch(`/api/geocode?q=${encodeURIComponent(query)}`);
}

/** Fire a lightweight request immediately on page load to start waking a
 * sleeping Render instance in parallel with everything else, so the real
 * data calls that follow are more likely to land on an already-warm
 * backend instead of each independently eating a cold-start timeout. */
export function pingBackend(): void {
  fetch(`${API_BASE}/health`).catch(() => {
    /* best-effort -- failures here are fine, the real calls still retry */
  });
}

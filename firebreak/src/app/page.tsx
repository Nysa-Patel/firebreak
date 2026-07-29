"use client";

import { useEffect, useState } from "react";
import { getAqi, getCleanAirLocations, getTrend, pingBackend, scoreRisk } from "@/lib/api";
import { useGeolocation } from "@/lib/useGeolocation";
import { useRiskProfile } from "@/lib/useRiskProfile";
import type { AqiResponse, CleanAirLocationOut, ClassifySmokeResponse, RiskScoreResponse, TrendResponse } from "@/lib/types";
import { RiskProfileForm } from "@/components/RiskProfileForm";
import { AqiGauge } from "@/components/AqiGauge";
import { PhotoClassifier } from "@/components/PhotoClassifier";
import { RecommendationCard } from "@/components/RecommendationCard";
import { CleanAirLocations } from "@/components/CleanAirLocations";
import { TrendSparkline } from "@/components/TrendSparkline";

export default function Home() {
  const { lat, lon, error: geoError } = useGeolocation();
  const { profile, setProfile, loaded: profileLoaded } = useRiskProfile();

  const [aqi, setAqi] = useState<AqiResponse | null>(null);
  const [aqiStatus, setAqiStatus] = useState<"loading" | "ready" | "error">("loading");
  const [smokeResult, setSmokeResult] = useState<ClassifySmokeResponse | null>(null);
  const [riskResult, setRiskResult] = useState<RiskScoreResponse | null>(null);
  const [locations, setLocations] = useState<CleanAirLocationOut[]>([]);
  const [trend, setTrend] = useState<TrendResponse | null>(null);

  useEffect(() => {
    // Kick the backend awake immediately (Render's free tier sleeps after
    // inactivity) so the data calls below are more likely to land warm.
    pingBackend();
  }, []);

  useEffect(() => {
    if (lat == null || lon == null) return;
    setAqiStatus("loading");
    getAqi(lat, lon)
      .then((result) => {
        setAqi(result);
        setAqiStatus("ready");
      })
      .catch(() => {
        setAqi(null);
        setAqiStatus("error");
      });
    getCleanAirLocations(lat, lon).then(setLocations).catch(() => setLocations([]));
    getTrend(lat, lon).then(setTrend).catch(() => setTrend(null));
  }, [lat, lon]);

  useEffect(() => {
    if (!aqi || !profileLoaded) return;
    scoreRisk(profile, aqi.category, smokeResult?.density_class)
      .then(setRiskResult)
      .catch(() => setRiskResult(null));
  }, [aqi, profile, profileLoaded, smokeResult]);

  return (
    <main className="max-w-5xl mx-auto w-full px-4 py-8">
      {geoError && (
        <p className="text-sm mb-4" style={{ color: "var(--status-warning)" }}>
          {geoError}
        </p>
      )}

      <div className="grid lg:grid-cols-[1fr_340px] gap-5 items-start">
        <div className="space-y-5 min-w-0">
          <RecommendationCard result={riskResult} />

          <div className="grid sm:grid-cols-2 gap-5">
            <AqiGauge aqi={aqi} status={aqiStatus} />
            <TrendSparkline trend={trend} />
          </div>

          <PhotoClassifier lat={lat} lon={lon} onClassified={setSmokeResult} />
        </div>

        <div className="space-y-5 min-w-0">
          <RiskProfileForm profile={profile} onChange={setProfile} />
          <CleanAirLocations locations={locations} />
        </div>
      </div>
    </main>
  );
}

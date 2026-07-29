"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getAqi, getCleanAirLocations, getTrend, scoreRisk } from "@/lib/api";
import { useGeolocation } from "@/lib/useGeolocation";
import { useRiskProfile } from "@/lib/useRiskProfile";
import type { AqiResponse, CleanAirLocationOut, ClassifySmokeResponse, RiskScoreResponse, TrendResponse } from "@/lib/types";
import { RiskProfileForm } from "@/components/RiskProfileForm";
import { AqiCard } from "@/components/AqiCard";
import { PhotoClassifier } from "@/components/PhotoClassifier";
import { RecommendationCard } from "@/components/RecommendationCard";
import { CleanAirLocations } from "@/components/CleanAirLocations";
import { TrendBadge } from "@/components/TrendBadge";

export default function Home() {
  const { lat, lon, error: geoError, loading: geoLoading } = useGeolocation();
  const { profile, setProfile, loaded: profileLoaded } = useRiskProfile();

  const [aqi, setAqi] = useState<AqiResponse | null>(null);
  const [aqiLoading, setAqiLoading] = useState(true);
  const [smokeResult, setSmokeResult] = useState<ClassifySmokeResponse | null>(null);
  const [riskResult, setRiskResult] = useState<RiskScoreResponse | null>(null);
  const [locations, setLocations] = useState<CleanAirLocationOut[]>([]);
  const [trend, setTrend] = useState<TrendResponse | null>(null);

  useEffect(() => {
    if (lat == null || lon == null) return;
    setAqiLoading(true);
    getAqi(lat, lon)
      .then(setAqi)
      .catch(() => setAqi(null))
      .finally(() => setAqiLoading(false));
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
    <main className="max-w-3xl mx-auto w-full px-4 py-8 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Wildfire Smoke Exposure Risk</h1>
        <p className="text-sm opacity-70">
          Personalized smoke risk combining live AQI, a sky-photo smoke reading, and your profile --
          not just a raw number.
        </p>
        {geoError && <p className="text-xs text-amber-600 dark:text-amber-400">{geoError}</p>}
        <Link href="/map" className="inline-block text-sm underline underline-offset-4">
          View community coverage map →
        </Link>
      </header>

      <RecommendationCard result={riskResult} />

      <div className="grid sm:grid-cols-2 gap-4">
        <AqiCard aqi={aqi} loading={aqiLoading || geoLoading} />
        <TrendBadge trend={trend} />
      </div>

      <PhotoClassifier lat={lat} lon={lon} onClassified={setSmokeResult} />

      <RiskProfileForm profile={profile} onChange={setProfile} />

      <CleanAirLocations locations={locations} />
    </main>
  );
}

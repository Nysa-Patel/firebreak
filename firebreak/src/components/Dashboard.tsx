"use client";

import { useEffect, useState } from "react";
import { getAqi, getCleanAirLocations, getTrend, pingBackend, scoreRisk } from "@/lib/api";
import { useGeolocation } from "@/lib/useGeolocation";
import { useFamilyMembers } from "@/lib/useFamilyMembers";
import { PERSONAS } from "@/lib/personas";
import { DEMO_REGION } from "@/lib/demoRegion";
import type {
  AqiResponse,
  CleanAirLocationOut,
  ClassifySmokeResponse,
  RiskScoreResponse,
  SymptomFlagLevel,
  TrendResponse,
} from "@/lib/types";
import type { InitialDashboardData } from "@/lib/serverFetch";
import { RiskProfileForm } from "@/components/RiskProfileForm";
import { AqiGauge } from "@/components/AqiGauge";
import { PhotoClassifier } from "@/components/PhotoClassifier";
import { RecommendationCard } from "@/components/RecommendationCard";
import { CleanAirLocations } from "@/components/CleanAirLocations";
import { TrendSparkline } from "@/components/TrendSparkline";
import { FamilyProfileSwitcher } from "@/components/FamilyProfileSwitcher";
import { SymptomLogger } from "@/components/SymptomLogger";
import { SymptomChecklistPanel } from "@/components/SymptomChecklistPanel";

export function Dashboard({ initial }: { initial: InitialDashboardData }) {
  const { lat, lon, error: geoError } = useGeolocation();
  const {
    members,
    activeMember,
    activeId,
    setActiveId,
    addMember,
    removeMember,
    renameMember,
    updateMemberProfile,
    loaded: profileLoaded,
  } = useFamilyMembers();

  // Seeded with the server-rendered demo-region snapshot (see page.tsx) so
  // the very first paint already has real data instead of a loading state --
  // the effect below still runs and overwrites this with the viewer's real
  // location once geolocation resolves, same as it always did.
  const [aqi, setAqi] = useState<AqiResponse | null>(initial.aqi);
  const [aqiStatus, setAqiStatus] = useState<"loading" | "ready" | "error">(initial.aqi ? "ready" : "loading");
  const [smokeResult, setSmokeResult] = useState<ClassifySmokeResponse | null>(null);
  const [riskResult, setRiskResult] = useState<RiskScoreResponse | null>(null);
  const [locations, setLocations] = useState<CleanAirLocationOut[]>(initial.locations);
  const [trend, setTrend] = useState<TrendResponse | null>(initial.trend);
  const [personaKey, setPersonaKey] = useState<string | null>(null);
  const [symptomFlagLevel, setSymptomFlagLevel] = useState<SymptomFlagLevel>("none");

  const effectiveProfile = personaKey ? PERSONAS.find((p) => p.key === personaKey)!.profile : activeMember.profile;

  function handleSelectMember(id: string) {
    setPersonaKey(null);
    setActiveId(id);
  }

  useEffect(() => {
    // Kick the backend awake immediately (Render's free tier sleeps after
    // inactivity) so the data calls below are more likely to land warm.
    pingBackend();
  }, []);

  useEffect(() => {
    if (lat == null || lon == null) return;
    // The server-rendered snapshot above is for DEMO_REGION specifically --
    // if geolocation resolves to that same fallback (permission denied is
    // the common case), skip refetching data we already have.
    const isSameAsSeeded = lat === DEMO_REGION.lat && lon === DEMO_REGION.lon;
    if (isSameAsSeeded && aqi) return;

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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `aqi` is only read for the seeded-skip check above, not a real dependency
  }, [lat, lon]);

  // No official AQI reading and no sky photo submitted -- there is no real
  // signal to score against, so don't claim a "low risk" reading that would
  // just be the API's neutral default wearing a confident face. Distinguish
  // a real coverage gap (no station nearby) from AirNow just failing to
  // answer this one call, since those need different messages.
  const noDataReason =
    aqi != null && aqi.aqi == null && !smokeResult
      ? aqi.source === "unavailable"
        ? "unavailable"
        : "monitoring_desert"
      : undefined;

  useEffect(() => {
    if (!aqi || !profileLoaded) return;
    if (noDataReason) {
      setRiskResult(null);
      return;
    }
    scoreRisk(effectiveProfile, aqi.category, smokeResult?.density_class, symptomFlagLevel)
      .then(setRiskResult)
      .catch(() => setRiskResult(null));
  }, [aqi, effectiveProfile, profileLoaded, smokeResult, symptomFlagLevel, noDataReason]);

  return (
    <main className="max-w-5xl mx-auto w-full px-4 py-8">
      {geoError && (
        <p className="text-sm mb-4" style={{ color: "var(--status-warning)" }}>
          {geoError}
        </p>
      )}

      <div className="grid lg:grid-cols-[1fr_340px] gap-5 items-start">
        <div className="space-y-5 min-w-0">
          <FamilyProfileSwitcher
            members={members}
            activeId={activeId}
            personaKey={personaKey}
            onSelectMember={handleSelectMember}
            onSelectPersona={setPersonaKey}
            onAddMember={addMember}
            onRenameMember={renameMember}
            onRemoveMember={removeMember}
          />

          <RecommendationCard result={riskResult} noDataReason={noDataReason} />

          <div className="grid sm:grid-cols-2 gap-5">
            <AqiGauge aqi={aqi} status={aqiStatus} />
            <TrendSparkline trend={trend} />
          </div>

          <div className="card">
            <SymptomLogger
              aqi={aqi?.aqi ?? null}
              memberId={personaKey ?? activeId}
              memberName={personaKey ? PERSONAS.find((p) => p.key === personaKey)!.label : activeMember.name}
            />
            <SymptomChecklistPanel
              profile={effectiveProfile}
              aqi={aqi?.aqi ?? null}
              densityClass={smokeResult?.density_class ?? null}
              onFlagChange={setSymptomFlagLevel}
              resetKey={personaKey ?? activeId}
            />
          </div>

          <PhotoClassifier lat={lat} lon={lon} onClassified={setSmokeResult} />
        </div>

        <div className="space-y-5 min-w-0">
          <RiskProfileForm
            profile={effectiveProfile}
            onChange={(p) => updateMemberProfile(activeId, p)}
            disabled={personaKey != null}
            memberName={activeMember.name === "Me" ? "Your" : activeMember.name}
          />
          <CleanAirLocations locations={locations} />
        </div>
      </div>
    </main>
  );
}

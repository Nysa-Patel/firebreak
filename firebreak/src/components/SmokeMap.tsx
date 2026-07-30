"use client";

import { useState } from "react";
import "leaflet/dist/leaflet.css";
import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import { getSubmissionDetail } from "@/lib/api";
import { DENSITY_COLOR, DENSITY_LABEL } from "@/lib/display";
import { timeAgo } from "@/lib/timeAgo";
import type { CleanAirLocationOut, SubmissionDetailOut, SubmissionOut } from "@/lib/types";

interface Props {
  center: [number, number];
  submissions: SubmissionOut[];
  cleanAirLocations: CleanAirLocationOut[];
}

function SubmissionMarker({ submission }: { submission: SubmissionOut }) {
  const [detail, setDetail] = useState<SubmissionDetailOut | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  async function handleOpen() {
    if (detail || status === "loading") return;
    setStatus("loading");
    try {
      const d = await getSubmissionDetail(submission.id);
      setDetail(d);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  return (
    <CircleMarker
      center={[submission.fuzzed_lat, submission.fuzzed_lon]}
      radius={7 + submission.trust_score * 5}
      pathOptions={{ color: DENSITY_COLOR[submission.density_class], fillOpacity: 0.6 }}
      eventHandlers={{ click: handleOpen }}
    >
      <Popup minWidth={200}>
        <div style={{ fontSize: 13 }}>
          <strong>{DENSITY_LABEL[submission.density_class]}</strong>
          <br />
          trust score: {Math.round(submission.trust_score * 100)}%
          <br />
          {timeAgo(submission.created_at)}
          <div style={{ marginTop: 6 }}>
            {status === "loading" && <span style={{ opacity: 0.7 }}>Loading photo...</span>}
            {status === "error" && <span style={{ opacity: 0.7 }}>Couldn&apos;t load photo.</span>}
            {detail && detail.photo_available && detail.photo_base64 && (
              // eslint-disable-next-line @next/next/no-img-element -- base64 data URI, not a remote asset
              <img
                src={`data:image/jpeg;base64,${detail.photo_base64}`}
                alt="Submitted sky photo"
                style={{ width: "100%", borderRadius: 6, marginTop: 4 }}
              />
            )}
            {detail && !detail.photo_available && (
              <span style={{ opacity: 0.7 }}>Photo no longer available (48h retention window passed).</span>
            )}
          </div>
          <span style={{ fontSize: 11, opacity: 0.6, display: "block", marginTop: 6 }}>
            Location fuzzed to a ~1km cell to protect the submitter&apos;s privacy.
          </span>
        </div>
      </Popup>
    </CircleMarker>
  );
}

export function SmokeMap({ center, submissions, cleanAirLocations }: Props) {
  return (
    <MapContainer center={center} zoom={10} scrollWheelZoom style={{ height: "100%", width: "100%" }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <CircleMarker center={center} radius={8} pathOptions={{ color: "var(--accent)", fillOpacity: 0.8 }}>
        <Popup>You are roughly here</Popup>
      </CircleMarker>

      {submissions.map((s) => (
        <SubmissionMarker key={s.id} submission={s} />
      ))}

      {cleanAirLocations.map((loc) => (
        <CircleMarker
          key={`clean-${loc.id}`}
          center={[loc.lat, loc.lon]}
          radius={6}
          pathOptions={{ color: "#0ea5e9", fillOpacity: 0.9 }}
        >
          <Popup>
            <strong>{loc.name}</strong>
            <br />
            {loc.address}
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}

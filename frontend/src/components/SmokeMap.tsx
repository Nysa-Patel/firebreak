"use client";

import "leaflet/dist/leaflet.css";
import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import { DENSITY_COLOR } from "@/lib/display";
import type { CleanAirLocationOut, SubmissionOut } from "@/lib/types";

interface Props {
  center: [number, number];
  submissions: SubmissionOut[];
  cleanAirLocations: CleanAirLocationOut[];
}

export function SmokeMap({ center, submissions, cleanAirLocations }: Props) {
  return (
    <MapContainer center={center} zoom={10} scrollWheelZoom style={{ height: "100%", width: "100%" }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <CircleMarker center={center} radius={8} pathOptions={{ color: "#3b82f6", fillOpacity: 0.8 }}>
        <Popup>You are roughly here</Popup>
      </CircleMarker>

      {submissions.map((s) => (
        <CircleMarker
          key={s.id}
          center={[s.fuzzed_lat, s.fuzzed_lon]}
          radius={7 + s.trust_score * 5}
          pathOptions={{ color: DENSITY_COLOR[s.density_class], fillOpacity: 0.6 }}
        >
          <Popup>
            <strong>{s.density_class}</strong>
            <br />
            trust score: {s.trust_score.toFixed(2)}
            <br />
            <span className="text-xs opacity-70">
              Location fuzzed to a ~1km cell to protect the submitter&apos;s privacy.
            </span>
          </Popup>
        </CircleMarker>
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

"use client";

import { useEffect, useRef, useState } from "react";
import { geocodeLocation } from "@/lib/api";
import { useGeolocation } from "@/lib/useGeolocation";
import { clearLocationOverride, getLocationOverride, setLocationOverride } from "@/lib/locationOverride";
import { DEMO_REGION } from "@/lib/demoRegion";
import type { GeocodeResult } from "@/lib/types";

function PinIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z"
        fill="currentColor"
      />
    </svg>
  );
}

const PRESETS = [
  { label: "Chico, CA (demo)", lat: DEMO_REGION.lat, lon: DEMO_REGION.lon },
  { label: "Los Angeles, CA", lat: 34.0522, lon: -118.2437 },
  { label: "Denver, CO", lat: 39.7392, lon: -104.9903 },
  { label: "Portland, OR", lat: 45.5152, lon: -122.6784 },
  { label: "New York, NY", lat: 40.7128, lon: -74.006 },
];

export function LocationPicker() {
  const { label: activeLabel } = useGeolocation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function choose(lat: number, lon: number, label: string) {
    setLocationOverride({ lat, lon, label });
    setOpen(false);
    setResults([]);
    setQuery("");
    setError(null);
  }

  function useRealLocation() {
    clearLocationOverride();
    setOpen(false);
    setResults([]);
    setQuery("");
    setError(null);
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed || searching) return;
    setSearching(true);
    setError(null);
    try {
      const found = await geocodeLocation(trimmed);
      setResults(found);
      if (found.length === 0) setError("No matches found -- try a different search or pick a city below.");
    } catch {
      setError("Location search is temporarily unavailable -- pick a city below instead.");
    } finally {
      setSearching(false);
    }
  }

  const isOverridden = getLocationOverride() != null;

  return (
    <div className="relative ml-auto" ref={containerRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-sm px-2 sm:px-3 py-1.5 rounded-full transition-colors"
        style={{ background: "var(--surface-2)", color: "var(--text-secondary)" }}
      >
        <PinIcon />
        <span className="max-w-[70px] sm:max-w-[140px] truncate">{activeLabel ?? "My location"}</span>
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-72 rounded-xl p-3 z-20"
          style={{ background: "var(--surface-1)", border: "1px solid var(--border)", boxShadow: "0 8px 24px rgba(0,0,0,0.25)" }}
        >
          <form onSubmit={handleSearch} className="flex gap-2 mb-3">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search a city..."
              autoFocus
              className="flex-1 rounded-lg px-3 py-1.5 text-sm min-w-0"
              style={{ border: "1px solid var(--border)", background: "var(--surface-2)" }}
            />
            <button
              type="submit"
              disabled={searching || !query.trim()}
              className="text-sm font-medium rounded-lg px-3 py-1.5 disabled:opacity-50 shrink-0"
              style={{ background: "#e5e7eb", color: "#111827" }}
            >
              {searching ? "..." : "Search"}
            </button>
          </form>

          {error && (
            <p className="text-xs mb-2" style={{ color: "var(--status-warning)" }}>
              {error}
            </p>
          )}

          {results.length > 0 && (
            <div className="mb-3 space-y-1">
              {results.map((r) => (
                <button
                  key={`${r.lat}-${r.lon}`}
                  onClick={() => choose(r.lat, r.lon, r.label)}
                  className="w-full text-left text-sm px-2 py-1.5 rounded-lg truncate"
                  style={{ color: "var(--text-primary)" }}
                >
                  {r.label}
                </button>
              ))}
            </div>
          )}

          <p className="text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: "var(--text-muted)" }}>
            Quick picks
          </p>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => choose(p.lat, p.lon, p.label)}
                className="text-xs px-2.5 py-1 rounded-full"
                style={{ background: "var(--surface-2)", color: "var(--text-secondary)" }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {isOverridden && (
            <button
              onClick={useRealLocation}
              className="text-xs w-full text-center py-1.5 rounded-lg"
              style={{ color: "var(--text-secondary)" }}
            >
              Use my real location
            </button>
          )}
        </div>
      )}
    </div>
  );
}

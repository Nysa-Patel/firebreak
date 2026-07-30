"""Pull real, nationwide public libraries and community centers from
OpenStreetMap (via the Overpass API) into seed_data/clean_air_locations.json.

This replaces the original 5-entry, Chico-only hand-picked list with real
addresses across the whole US (~9,700 nodes) -- these are meant to be actual
places someone might go to during a smoke event, so accuracy matters more
than for most demo data; OSM's `amenity=library` / `amenity=community_centre`
tags are the most reliable free source of real, geocoded public buildings at
this scale (~6,500 libraries + ~3,200 community centers).

Run from backend/: `python -m scripts.fetch_clean_air_locations`
"""

import json
import time
from pathlib import Path

import httpx

_OUT_PATH = Path(__file__).resolve().parent.parent / "seed_data" / "clean_air_locations.json"
_OVERPASS_URL = "https://overpass-api.de/api/interpreter"

_QUERY = """
[out:json][timeout:180];
area["ISO3166-1"="US"][admin_level=2]->.usa;
(
  node["amenity"="library"](area.usa);
  node["amenity"="community_centre"](area.usa);
);
out body;
"""


def _build_address(tags: dict) -> str | None:
    """None if the tags don't have enough to be a useful, navigable address
    -- a bare state code ("CA") is real data but not somewhere a person in a
    smoke event could actually find, so it's treated the same as missing."""
    housenumber, street = tags.get("addr:housenumber"), tags.get("addr:street")
    city, state, postcode = tags.get("addr:city"), tags.get("addr:state"), tags.get("addr:postcode")
    if not street and not city:
        return None

    parts = []
    if housenumber and street:
        parts.append(f"{housenumber} {street}")
    elif street:
        parts.append(street)
    locality = ", ".join(p for p in [city, state] if p)
    if locality:
        parts.append(locality)
    if postcode:
        parts.append(postcode)
    return ", ".join(parts)


def main() -> None:
    print("Querying Overpass API for US libraries + community centers (this can take ~1-2 min)...")
    headers = {"User-Agent": "firebreak-wildfire-app/0.1 (student competition project, one-off data prep script)"}
    resp = httpx.post(_OVERPASS_URL, data={"data": _QUERY}, headers=headers, timeout=200)
    resp.raise_for_status()
    elements = resp.json()["elements"]
    print(f"Got {len(elements)} raw nodes.")

    entries = []
    skipped_no_name = 0
    skipped_no_address = 0
    for el in elements:
        tags = el.get("tags", {})
        name = tags.get("name")
        if not name:
            skipped_no_name += 1
            continue
        address = _build_address(tags)
        if not address:
            skipped_no_address += 1
            continue
        entries.append(
            {
                "name": name,
                "category": "library" if tags.get("amenity") == "library" else "community_center",
                "address": address,
                "lat": el["lat"],
                "lon": el["lon"],
                "notes": "Sourced from OpenStreetMap (community-maintained, ODbL-licensed).",
            }
        )

    print(
        f"Kept {len(entries)} entries "
        f"(skipped {skipped_no_name} with no name, {skipped_no_address} with no usable address)."
    )
    _OUT_PATH.write_text(json.dumps(entries, indent=2))
    print(f"Wrote {_OUT_PATH}")


if __name__ == "__main__":
    main()

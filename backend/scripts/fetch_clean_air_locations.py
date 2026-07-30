"""Pull real, nationwide public libraries and community centers from
OpenStreetMap (via the Overpass API) into seed_data/clean_air_locations.json,
merged with the original hand-picked Chico/Butte County entries.

OSM's amenity tags don't happen to include those specific well-known Chico
institutions (or they're missing the name/address tags this script requires),
so a straight replacement silently dropped the demo region's own curated,
narrative-relevant entries (e.g. the Paradise Ridge monitoring-desert framing)
down to a single incidental match. Keeping both means the demo region stays
accurate and the rest of the country gets real coverage too -- these are
meant to be actual places someone might go to during a smoke event, so
accuracy matters more than for most demo data.

Run from backend/: `python -m scripts.fetch_clean_air_locations`
"""

import json
from pathlib import Path

import httpx

_OUT_PATH = Path(__file__).resolve().parent.parent / "seed_data" / "clean_air_locations.json"
_OVERPASS_URL = "https://overpass-api.de/api/interpreter"

# The original hand-picked demo-region entries -- kept verbatim rather than
# relying on OSM to happen to have them under matching tags/names.
_CURATED_ENTRIES = [
    {
        "name": "Chico Branch Library",
        "category": "library",
        "address": "1108 Sherman Ave, Chico, CA 95926",
        "lat": 39.7285,
        "lon": -121.8375,
        "notes": "Public library, open to all, air-conditioned/filtered indoor space.",
    },
    {
        "name": "Paradise Branch Library",
        "category": "library",
        "address": "5926 Clark Rd, Paradise, CA 95969",
        "lat": 39.7596,
        "lon": -121.6219,
        "notes": "Serves the Paradise Ridge area, one of the most monitoring-sparse parts of Butte County.",
    },
    {
        "name": "Chico Senior Center",
        "category": "community_center",
        "address": "1856 Manzanita Ave, Chico, CA 95926",
        "lat": 39.7392,
        "lon": -121.8433,
        "notes": "Community center with indoor seating areas.",
    },
    {
        "name": "Oroville Branch Library",
        "category": "library",
        "address": "1820 Mitchell Ave, Oroville, CA 95966",
        "lat": 39.5138,
        "lon": -121.5564,
        "notes": "Covers the Oroville area, another gap between official monitors.",
    },
    {
        "name": "Meriam Library, Chico State",
        "category": "library",
        "address": "400 W 1st St, Chico, CA 95929",
        "lat": 39.73,
        "lon": -121.8494,
        "notes": "University library, publicly accessible reading areas.",
    },
]

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
        f"Kept {len(entries)} OSM entries "
        f"(skipped {skipped_no_name} with no name, {skipped_no_address} with no usable address)."
    )

    combined = _CURATED_ENTRIES + entries
    print(f"Combined with {len(_CURATED_ENTRIES)} curated entries -> {len(combined)} total.")
    _OUT_PATH.write_text(json.dumps(combined, indent=2))
    print(f"Wrote {_OUT_PATH}")


if __name__ == "__main__":
    main()

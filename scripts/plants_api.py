"""Client helpers for the USDA PLANTS Database backend REST API.

The public site (plants.sc.egov.usda.gov) is an Angular SPA — scraping it returns
an empty shell. Data lives on a separate services host, queried here directly.

No authentication required; all data is public domain.

Each helper normalizes one of the API's non-obvious response shapes so callers
don't have to rediscover them. See module docstrings per function for the raw
shape being unwrapped.
"""

from __future__ import annotations

import re
from typing import Any

import requests

BASE = "https://plantsservices.sc.egov.usda.gov/api"

# The API returns scientific names with italic markup embedded in the string.
_HTML_TAG = re.compile(r"<[^>]+>")

# Conservative default — the advanced-search endpoints are slow and a broad
# query will exhaust the server's own execution timeout before responding.
DEFAULT_TIMEOUT = 60


def strip_html(value: str | None) -> str:
    """Remove the <i> markup the API embeds in ScientificName fields."""
    return _HTML_TAG.sub("", value or "")


def healthcheck() -> bool:
    """Return True if the services host is reachable and reporting healthy."""
    try:
        r = requests.get(
            "https://plantsservices.sc.egov.usda.gov/healthcheck",
            timeout=DEFAULT_TIMEOUT,
        )
    except requests.RequestException:
        return False
    return r.ok and "Succeeded" in r.text


def get_plant(symbol: str) -> dict[str, Any]:
    """Fetch the full plant profile for a PLANTS symbol (e.g. 'QUAG').

    Returns a single object whose 'Id' field is the numeric key required by
    every detail endpoint below.
    """
    r = requests.get(
        f"{BASE}/PlantProfile", params={"symbol": symbol}, timeout=DEFAULT_TIMEOUT
    )
    r.raise_for_status()
    return r.json()


def search_plants(text: str) -> list[dict[str, Any]]:
    """Text search, returning plant objects unwrapped from their envelope.

    The raw response is Array<{Text, Plant}> — the plant lives under .Plant, so
    a naive read of the top-level objects finds no Symbol or ScientificName.

    The index covers taxonomic author names as well as plant names, so a common
    name like 'oak' also matches every species authored by the botanist Oakes.
    Search by scientific genus ('Quercus') when precision matters.
    """
    r = requests.get(
        f"{BASE}/PlantSearch", params={"searchText": text}, timeout=DEFAULT_TIMEOUT
    )
    r.raise_for_status()
    return [item["Plant"] for item in r.json()]


def resolve_symbol(name: str) -> str | None:
    """Best-effort common-name/scientific-name → PLANTS symbol lookup.

    Returns the first result's symbol, or None if nothing matched. Callers
    handling ambiguous input should use search_plants() and present choices
    instead — a single-best-match guess is often wrong for common names that
    map to many species.
    """
    results = search_plants(name)
    return results[0].get("Symbol") if results else None


def get_characteristics(plant_id: int) -> dict[str, list[tuple[str, str]]]:
    """Fetch growth/ecological characteristics, grouped by category.

    The raw response is a flat Array<{PlantCharacteristicName,
    PlantCharacteristicValue, PlantCharacteristicCategory, ...}>, not a dict.
    Grouping by category reproduces how the site presents the data
    (Growth Requirements, Morphology/Physiology, Reproduction, Suitability/Use).

    An empty dict means the database has no characteristic data for this plant.
    That is common for subspecies and hybrids and is not an error.
    """
    r = requests.get(
        f"{BASE}/PlantCharacteristics/{plant_id}", timeout=DEFAULT_TIMEOUT
    )
    r.raise_for_status()
    grouped: dict[str, list[tuple[str, str]]] = {}
    for row in r.json():
        grouped.setdefault(row["PlantCharacteristicCategory"], []).append(
            (row["PlantCharacteristicName"], row["PlantCharacteristicValue"])
        )
    return grouped


def get_detail(resource: str, plant_id: int) -> Any:
    """Fetch any single-ID detail resource by name.

    Covers the uniform /api/<Resource>/{id} endpoints: PlantWetland,
    PlantWildlife, PlantSynonyms, PlantEthnobotany, PlantPollinator,
    PlantLegalStatus, PlantNoxiousStatus, PlantInvasiveStatus,
    PlantRelatedLinks, Classification.

    Most return a list; an empty list means no data for that plant.
    """
    r = requests.get(f"{BASE}/{resource}/{plant_id}", timeout=DEFAULT_TIMEOUT)
    r.raise_for_status()
    return r.json()


def noxious_invasive_locations() -> dict[str, list[str]]:
    """List the location names accepted by get_noxious_by_state().

    Returns {"noxious": [...], "invasive": [...]}. Coverage differs between the
    two lists and neither is complete, so check here before reporting that a
    state has no listed species.
    """
    d = requests.get(f"{BASE}/NoxiousInvasiveSearch", timeout=DEFAULT_TIMEOUT).json()
    return {
        "noxious": [l["PlantLocationName"] for l in d["NoxiousLocations"]],
        "invasive": [l["PlantLocationName"] for l in d["InvasiveLocations"]],
    }


def get_noxious_by_state(state: str, invasive: bool = False) -> list[dict[str, Any]]:
    """Fetch noxious (or invasive) plants for a location.

    `state` must be the FULL location name as it appears in
    noxious_invasive_locations() — 'Alabama', not 'AL' and not a numeric ID.
    An unrecognized value returns an empty result set rather than an error,
    which makes a wrong abbreviation look exactly like a state with no listings.

    These endpoints also reject a bodyless POST with HTTP 411 Length Required;
    passing json={} makes requests set Content-Length and satisfies the server.

    Coverage is genuinely sparse: federal listings appear under 'United States'
    for noxious, and only some states publish their own lists. A zero result is
    usually real absence of data, not a query mistake — but confirm the name is
    spelled as the location list spells it before concluding that.
    """
    endpoint = "GetInvasiveByState" if invasive else "GetNoxiousByState"
    r = requests.post(
        f"{BASE}/NoxiousInvasiveSearch/{endpoint}",
        params={"state": state},
        json={},
        timeout=DEFAULT_TIMEOUT,
    )
    r.raise_for_status()
    return r.json().get("PlantResults", [])


def get_state_locations() -> list[dict[str, Any]]:
    """Return all 77 locations (US states, territories, Canadian provinces).

    The response is a dict keyed on 'Locations', not a bare array. Each entry
    carries a PlantLocationId — the numeric key that advanced-search filter
    bodies expect, in place of the two-letter abbreviation used elsewhere.
    """
    r = requests.get(f"{BASE}/StateSearch", timeout=DEFAULT_TIMEOUT)
    r.raise_for_status()
    return r.json()["Locations"]


def location_id(state_name: str) -> int | None:
    """Look up a PlantLocationId by full location name (e.g. 'California')."""
    for loc in get_state_locations():
        if loc["PlantLocationName"].lower() == state_name.lower():
            return loc["PlantLocationId"]
    return None


def download_search_csv(filters: dict[str, Any], output_path: str) -> None:
    """Run an advanced search and write the results to a CSV file.

    Always pass at least one narrowing filter. The server enforces its own
    execution timeout, and an unfiltered or state-wide query typically exceeds
    it — the response then arrives as a plain-text timeout message rather than
    CSV, which this function raises on rather than silently writing to disk.

    Example filters: {"locationIds": [3296], "nativeStatusIds": ["N"]}
    """
    r = requests.post(
        f"{BASE}/plants-search-results/download",
        json=filters,
        timeout=DEFAULT_TIMEOUT * 3,
    )
    r.raise_for_status()
    if r.text.lstrip().startswith("Execution Timeout"):
        raise RuntimeError(
            "Server timed out building the CSV — narrow the filters and retry."
        )
    with open(output_path, "wb") as fh:
        fh.write(r.content)


if __name__ == "__main__":
    # Smoke test against a known-stable record (Quercus agrifolia).
    assert healthcheck(), "services host unreachable"
    profile = get_plant("QUAG")
    print(f"{profile['Symbol']}  {strip_html(profile['ScientificName'])}")
    print(f"  common name: {profile['CommonName']}")
    print(f"  growth habits: {profile['GrowthHabits']}")
    traits = get_characteristics(profile["Id"])
    print(f"  characteristic categories: {list(traits)}")
    print(f"  total traits: {sum(len(v) for v in traits.values())}")

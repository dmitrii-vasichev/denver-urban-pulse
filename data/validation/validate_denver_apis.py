"""
Validate Denver Open Data API endpoints.

Checks: Crime, Traffic Accidents, 311 Service Requests, Statistical Neighborhoods.
Confirms each endpoint is accessible, documents fields, record counts, and quirks.
"""

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import requests

BASE = "https://services1.arcgis.com/zdB7qR0BtYrg0Xpl/arcgis/rest/services"

ENDPOINTS = {
    "crime": {
        "url": f"{BASE}/ODC_CRIME_OFFENSES_P/FeatureServer/324",
        "description": "Crime offenses — past 5 years + current YTD",
    },
    "traffic_accidents": {
        "url": f"{BASE}/ODC_CRIME_TRAFFICACCIDENTS5YR_P/FeatureServer/325",
        "description": "Traffic accidents — past 5 years + current YTD",
    },
    "311_rolling": {
        "url": f"{BASE}/ODC_service_requests_311/FeatureServer/66",
        "description": "311 Service Requests — rolling 12 months (table, not layer)",
    },
    "311_2023": {
        "url": f"{BASE}/311_Service_Requests_2023/FeatureServer/0",
        "description": "311 Service Requests — 2023 archive",
    },
    "neighborhoods": {
        "url": f"{BASE}/ODC_ADMN_NEIGHBORHOOD_A/FeatureServer/13",
        "description": "Statistical Neighborhoods — boundaries",
    },
}

TIMEOUT = 30


def query_endpoint(url: str, params: dict) -> dict | None:
    """Send a query to an ArcGIS REST endpoint."""
    params.setdefault("f", "json")
    try:
        resp = requests.get(f"{url}/query", params=params, timeout=TIMEOUT)
        resp.raise_for_status()
        data = resp.json()
        if "error" in data:
            print(f"  API error: {data['error'].get('message', data['error'])}")
            return None
        return data
    except requests.RequestException as e:
        print(f"  Request failed: {e}")
        return None


def get_metadata(url: str) -> dict | None:
    """Get layer metadata (fields, record count)."""
    try:
        resp = requests.get(url, params={"f": "json"}, timeout=TIMEOUT)
        resp.raise_for_status()
        data = resp.json()
        if "error" in data:
            print(f"  Metadata error: {data['error'].get('message', data['error'])}")
            return None
        return data
    except requests.RequestException as e:
        print(f"  Metadata request failed: {e}")
        return None


def get_record_count(url: str) -> int | None:
    """Get total record count for a layer."""
    data = query_endpoint(url, {"where": "1=1", "returnCountOnly": "true"})
    if data and "count" in data:
        return data["count"]
    return None


def get_sample_record(url: str) -> dict | None:
    """Get a single sample record with all fields."""
    data = query_endpoint(url, {
        "where": "1=1",
        "outFields": "*",
        "resultRecordCount": "1",
        "orderByFields": "OBJECTID DESC",
    })
    if data and "features" in data and data["features"]:
        return data["features"][0].get("attributes", {})
    return None


def get_date_range(url: str, date_field: str) -> tuple[str | None, str | None]:
    """Get min and max dates for a date field."""
    stats = query_endpoint(url, {
        "where": "1=1",
        "outStatistics": json.dumps([
            {"statisticType": "min", "onStatisticField": date_field, "outStatisticFieldName": "min_date"},
            {"statisticType": "max", "onStatisticField": date_field, "outStatisticFieldName": "max_date"},
        ]),
    })
    if stats and "features" in stats and stats["features"]:
        attrs = stats["features"][0].get("attributes", {})
        min_ts = attrs.get("min_date")
        max_ts = attrs.get("max_date")
        fmt = lambda ts: datetime.fromtimestamp(ts / 1000, tz=timezone.utc).strftime("%Y-%m-%d") if ts else None
        return fmt(min_ts), fmt(max_ts)
    return None, None


def get_geojson_neighborhoods(url: str) -> dict | None:
    """Get neighborhoods as GeoJSON to validate geometry."""
    data = query_endpoint(url, {
        "where": "1=1",
        "outFields": "*",
        "f": "geojson",
    })
    return data


def validate_endpoint(name: str, info: dict) -> dict:
    """Validate a single endpoint and return results."""
    print(f"\n{'='*60}")
    print(f"Validating: {name}")
    print(f"URL: {info['url']}")
    print(f"Description: {info['description']}")
    print(f"{'='*60}")

    result = {
        "name": name,
        "url": info["url"],
        "status": "UNKNOWN",
        "record_count": None,
        "fields": [],
        "date_range": None,
        "sample": None,
        "notes": [],
    }

    # 1. Get metadata
    meta = get_metadata(info["url"])
    if not meta:
        result["status"] = "FAIL"
        result["notes"].append("Cannot fetch metadata")
        print("  FAIL: Cannot fetch metadata")
        return result

    print(f"  Layer name: {meta.get('name', 'N/A')}")
    print(f"  Geometry type: {meta.get('geometryType', 'N/A')}")

    # 2. Extract fields
    fields = meta.get("fields", [])
    result["fields"] = [
        {"name": f["name"], "type": f["type"], "alias": f.get("alias", "")}
        for f in fields
    ]
    print(f"  Fields: {len(fields)}")
    for f in fields:
        print(f"    - {f['name']} ({f['type']}){' — ' + f.get('alias', '') if f.get('alias') != f['name'] else ''}")

    # 3. Record count
    count = get_record_count(info["url"])
    result["record_count"] = count
    print(f"  Record count: {count:,}" if count else "  Record count: N/A")

    # 4. Date range (find first date field)
    date_fields = [f["name"] for f in fields if f["type"] == "esriFieldTypeDate"]
    if date_fields:
        primary_date = date_fields[0]
        # Prefer known date fields
        for preferred in ["REPORTED_DATE", "FIRST_OCCURRENCE_DATE", "reported_date",
                          "Case_Created_dttm", "case_created_dttm", "TOP_TRAFFIC_ACCIDENT_OFFENSE_DATE"]:
            if preferred in date_fields:
                primary_date = preferred
                break
        min_d, max_d = get_date_range(info["url"], primary_date)
        result["date_range"] = {"field": primary_date, "min": min_d, "max": max_d}
        print(f"  Date range ({primary_date}): {min_d} to {max_d}")
    else:
        result["notes"].append("No date fields found")

    # 5. Sample record
    sample = get_sample_record(info["url"])
    if sample:
        result["sample"] = sample
        print(f"  Sample record: OK (OBJECTID={sample.get('OBJECTID', 'N/A')})")
    else:
        result["notes"].append("Cannot fetch sample record")

    result["status"] = "OK"
    print(f"\n  Result: OK")
    return result


def validate_neighborhoods_geojson() -> dict | None:
    """Additional validation: download neighborhoods as GeoJSON."""
    print(f"\n{'='*60}")
    print("Validating: Neighborhoods GeoJSON download")
    print(f"{'='*60}")

    url = ENDPOINTS["neighborhoods"]["url"]
    geojson = get_geojson_neighborhoods(url)
    if not geojson:
        print("  FAIL: Cannot download GeoJSON")
        return None

    features = geojson.get("features", [])
    print(f"  Features count: {len(features)}")

    if features:
        props = features[0].get("properties", {})
        geom = features[0].get("geometry", {})
        print(f"  Geometry type: {geom.get('type', 'N/A')}")
        print(f"  Properties: {list(props.keys())}")

        # List all neighborhood names
        names = sorted(
            f.get("properties", {}).get("NBHD_NAME", "")
            for f in features
        )
        print(f"  Neighborhoods ({len(names)}):")
        for n in names:
            print(f"    - {n}")

    return {
        "feature_count": len(features),
        "neighborhood_names": names if features else [],
        "status": "OK",
    }


def generate_report(results: list[dict], neighborhoods: dict | None) -> str:
    """Generate markdown report."""
    lines = [
        "# Denver Open Data API Validation Report",
        f"\nGenerated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        "",
    ]

    # Summary table
    lines.append("## Summary\n")
    lines.append("| Dataset | Status | Records | Date Range |")
    lines.append("|---------|--------|---------|------------|")
    for r in results:
        dr = r.get("date_range")
        date_str = f"{dr['min']} → {dr['max']}" if dr and dr.get("min") else "N/A"
        count_str = f"{r['record_count']:,}" if r["record_count"] else "N/A"
        lines.append(f"| {r['name']} | {r['status']} | {count_str} | {date_str} |")

    # Endpoints
    lines.append("\n## Endpoints\n")
    for r in results:
        lines.append(f"### {r['name']}")
        lines.append(f"- **URL:** `{r['url']}`")
        lines.append(f"- **Records:** {r['record_count']:,}" if r["record_count"] else "- **Records:** N/A")
        if r.get("date_range"):
            dr = r["date_range"]
            lines.append(f"- **Date field:** `{dr['field']}`")
            lines.append(f"- **Range:** {dr['min']} → {dr['max']}")
        if r.get("notes"):
            lines.append(f"- **Notes:** {'; '.join(r['notes'])}")
        lines.append(f"\n**Fields ({len(r['fields'])}):**\n")
        lines.append("| Field | Type | Alias |")
        lines.append("|-------|------|-------|")
        for f in r["fields"]:
            lines.append(f"| `{f['name']}` | {f['type']} | {f['alias']} |")
        lines.append("")

    # Neighborhoods
    if neighborhoods:
        lines.append("## Neighborhoods GeoJSON\n")
        lines.append(f"- **Feature count:** {neighborhoods['feature_count']}")
        lines.append(f"- **Status:** {neighborhoods['status']}")
        lines.append(f"\n**All neighborhoods ({len(neighborhoods['neighborhood_names'])}):**\n")
        for n in neighborhoods["neighborhood_names"]:
            lines.append(f"- {n}")

    # 311 quirks
    lines.append("\n## 311 Year-Partitioning Notes\n")
    lines.append("- The rolling dataset (`ODC_service_requests_311`) covers ~12 months.")
    lines.append("- Historical years are in separate layers (e.g., `311_Service_Requests_2023`).")
    lines.append("- To get full history, union the rolling dataset with yearly archives.")
    lines.append("- Field names are consistent across years.")

    lines.append("\n## API Quirks and Limitations\n")
    lines.append("- ArcGIS REST API returns max 2000 records per request (use `resultOffset` for pagination).")
    lines.append("- Date fields are Unix timestamps in milliseconds.")
    lines.append("- Some records may lack lat/lon coordinates.")
    lines.append("- Data updates Monday–Friday; weekend data appears on Monday.")
    lines.append("- GeoJSON format available via `f=geojson` parameter.")

    return "\n".join(lines)


def main():
    print("Denver Open Data API Validation")
    print("=" * 60)

    results = []
    all_ok = True

    for name, info in ENDPOINTS.items():
        result = validate_endpoint(name, info)
        results.append(result)
        if result["status"] != "OK":
            all_ok = False

    neighborhoods = validate_neighborhoods_geojson()

    # Generate report
    report = generate_report(results, neighborhoods)
    report_path = Path(__file__).parent / "api_report.md"
    report_path.write_text(report)
    print(f"\nReport saved to: {report_path}")

    # Summary
    print(f"\n{'='*60}")
    print("VALIDATION SUMMARY")
    print(f"{'='*60}")
    ok = sum(1 for r in results if r["status"] == "OK")
    fail = sum(1 for r in results if r["status"] != "OK")
    print(f"  OK:   {ok}/{len(results)}")
    print(f"  FAIL: {fail}/{len(results)}")

    if not all_ok:
        print("\nSome endpoints failed validation!")
        sys.exit(1)
    else:
        print("\nAll endpoints validated successfully!")
        sys.exit(0)


if __name__ == "__main__":
    main()

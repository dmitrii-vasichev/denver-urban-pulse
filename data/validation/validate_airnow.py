"""
Validate AirNow API for Denver metro area.

Checks: current AQI, historical data availability, rate limits, response format.
Requires AIRNOW_API_KEY environment variable.
"""

import os
import sys
from datetime import datetime, timedelta, timezone

import requests

API_KEY = os.environ.get("AIRNOW_API_KEY", "")
BASE_URL = "https://www.airnowapi.org/aq"
DENVER_LAT = 39.7392
DENVER_LON = -104.9903
TIMEOUT = 30


def check_api_key():
    """Verify API key is set."""
    if not API_KEY:
        print("ERROR: AIRNOW_API_KEY not set in environment")
        sys.exit(1)
    print(f"API key: {API_KEY[:8]}...{API_KEY[-4:]}")


def test_current_observation():
    """Test current AQI observation for Denver area."""
    print("\n" + "=" * 60)
    print("Test 1: Current AQI observation")
    print("=" * 60)

    url = f"{BASE_URL}/observation/latLong/current/"
    params = {
        "format": "application/json",
        "latitude": DENVER_LAT,
        "longitude": DENVER_LON,
        "distance": 25,  # miles
        "API_KEY": API_KEY,
    }

    resp = requests.get(url, params=params, timeout=TIMEOUT)
    print(f"  Status: {resp.status_code}")
    print(f"  Rate limit headers: {dict((k, v) for k, v in resp.headers.items() if 'limit' in k.lower() or 'rate' in k.lower())}")

    if resp.status_code != 200:
        print(f"  FAIL: HTTP {resp.status_code}")
        return None

    data = resp.json()
    print(f"  Stations returned: {len(data)}")

    if not data:
        print("  WARN: No stations returned for Denver area")
        return None

    for obs in data:
        print(f"\n  Station: {obs.get('ReportingArea', 'N/A')}")
        print(f"    Parameter: {obs.get('ParameterName', 'N/A')}")
        print(f"    AQI: {obs.get('AQI', 'N/A')}")
        print(f"    Category: {obs.get('Category', {}).get('Name', 'N/A')}")
        print(f"    Date: {obs.get('DateObserved', 'N/A')} {obs.get('HourObserved', 'N/A')}:00")
        print(f"    Lat/Lon: {obs.get('Latitude', 'N/A')}, {obs.get('Longitude', 'N/A')}")
        print(f"    State: {obs.get('StateCode', 'N/A')}")

    # Document response format
    print("\n  Response fields:")
    if data:
        for key in data[0]:
            print(f"    - {key}: {type(data[0][key]).__name__} = {data[0][key]}")

    return data


def test_historical_observation():
    """Test historical AQI data availability."""
    print("\n" + "=" * 60)
    print("Test 2: Historical AQI data")
    print("=" * 60)

    url = f"{BASE_URL}/observation/latLong/historical/"

    # Test various lookback periods
    now = datetime.now(tz=timezone.utc)
    periods = [
        ("7 days ago", now - timedelta(days=7)),
        ("30 days ago", now - timedelta(days=30)),
        ("90 days ago", now - timedelta(days=90)),
        ("180 days ago", now - timedelta(days=180)),
        ("365 days ago", now - timedelta(days=365)),
    ]

    results = {}
    for label, dt in periods:
        date_str = dt.strftime("%Y-%m-%dT00-0000")
        params = {
            "format": "application/json",
            "latitude": DENVER_LAT,
            "longitude": DENVER_LON,
            "distance": 25,
            "date": date_str,
            "API_KEY": API_KEY,
        }

        resp = requests.get(url, params=params, timeout=TIMEOUT)
        if resp.status_code == 200:
            data = resp.json()
            count = len(data)
            aqi_values = [d.get("AQI") for d in data if d.get("AQI") is not None]
            results[label] = {
                "status": "OK",
                "records": count,
                "aqi_range": f"{min(aqi_values)}-{max(aqi_values)}" if aqi_values else "N/A",
            }
            print(f"  {label}: OK — {count} records, AQI range: {results[label]['aqi_range']}")
        else:
            results[label] = {"status": f"HTTP {resp.status_code}", "records": 0}
            print(f"  {label}: FAIL — HTTP {resp.status_code}")

    return results


def test_forecast():
    """Test AQI forecast endpoint for Denver."""
    print("\n" + "=" * 60)
    print("Test 3: AQI forecast")
    print("=" * 60)

    url = f"{BASE_URL}/forecast/latLong/"
    params = {
        "format": "application/json",
        "latitude": DENVER_LAT,
        "longitude": DENVER_LON,
        "distance": 25,
        "API_KEY": API_KEY,
    }

    resp = requests.get(url, params=params, timeout=TIMEOUT)
    print(f"  Status: {resp.status_code}")

    if resp.status_code != 200:
        print(f"  FAIL: HTTP {resp.status_code}")
        return None

    data = resp.json()
    print(f"  Forecast entries: {len(data)}")

    for entry in data[:5]:
        print(f"    Date: {entry.get('DateForecast', 'N/A')} | "
              f"Param: {entry.get('ParameterName', 'N/A')} | "
              f"AQI: {entry.get('AQI', 'N/A')} | "
              f"Category: {entry.get('Category', {}).get('Name', 'N/A')}")

    return data


def main():
    print("AirNow API Validation — Denver Metro Area")
    print("=" * 60)

    check_api_key()

    # Test 1: Current observations
    current = test_current_observation()

    # Test 2: Historical data
    historical = test_historical_observation()

    # Test 3: Forecast
    forecast = test_forecast()

    # Summary
    print("\n" + "=" * 60)
    print("VALIDATION SUMMARY")
    print("=" * 60)

    checks = {
        "API key valid": current is not None,
        "Current AQI available": current is not None and len(current) > 0,
        "Historical data (90d)": historical is not None and historical.get("90 days ago", {}).get("status") == "OK",
        "Forecast available": forecast is not None and len(forecast) > 0,
    }

    all_ok = True
    for check, passed in checks.items():
        status = "OK" if passed else "FAIL"
        if not passed:
            all_ok = False
        print(f"  [{status}] {check}")

    print(f"\nRate limits: AirNow free tier allows ~500 requests/hour.")
    print(f"Recommendation: Cache daily, fetch once per refresh cycle.")

    if all_ok:
        print("\nAll AirNow checks passed!")
        sys.exit(0)
    else:
        print("\nSome checks failed!")
        sys.exit(1)


if __name__ == "__main__":
    main()

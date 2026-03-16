"""Tests for mart build scripts — SQL structure validation."""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "staging"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from build_city_pulse_daily import BUILD_SQL as DAILY_SQL
from build_incident_trends import BUILD_SQL as TRENDS_SQL, CRIME_LABEL_SQL as TRENDS_CRIME_LABEL, CRASH_LABEL_SQL as TRENDS_CRASH_LABEL
from build_category_breakdown import CRIME_LABEL_SQL as BREAKDOWN_CRIME_LABEL, CRASH_LABEL_SQL as BREAKDOWN_CRASH_LABEL
from build_aqi_daily import BUILD_SQL as AQI_SQL


class TestCityPulseDailySQL:
    """Validate mart_city_pulse_daily SQL structure."""

    def test_inserts_into_correct_table(self):
        assert "INSERT INTO mart_city_pulse_daily" in DAILY_SQL

    def test_has_upsert(self):
        assert "ON CONFLICT (date) DO UPDATE" in DAILY_SQL

    def test_aggregates_all_three_domains(self):
        assert "stg_crime" in DAILY_SQL
        assert "stg_crashes" in DAILY_SQL
        assert "stg_311" in DAILY_SQL

    def test_sums_victim_count(self):
        assert "victim_count" in DAILY_SQL

    def test_sums_injuries_and_fatalities(self):
        assert "serious_injuries" in DAILY_SQL
        assert "fatalities" in DAILY_SQL


class TestIncidentTrendsSQL:
    """Validate mart_incident_trends SQL structure."""

    def test_inserts_into_correct_table(self):
        assert "INSERT INTO mart_incident_trends" in TRENDS_SQL

    def test_has_upsert(self):
        assert "ON CONFLICT (date, domain, category) DO UPDATE" in TRENDS_SQL

    def test_includes_crime_domain(self):
        assert "'crime' AS domain" in TRENDS_SQL

    def test_includes_crashes_domain(self):
        assert "'crashes' AS domain" in TRENDS_SQL

    def test_includes_311_domain(self):
        assert "'311' AS domain" in TRENDS_SQL

    def test_uses_offense_category_for_crime(self):
        assert "offense_category" in TRENDS_SQL

    def test_uses_top_offense_for_crashes(self):
        assert "top_offense" in TRENDS_SQL

    def test_uses_agency_for_311(self):
        assert "agency" in TRENDS_SQL

    def test_uses_human_readable_crime_labels(self):
        assert "Vehicle Theft" in TRENDS_SQL
        assert "INITCAP" in TRENDS_SQL

    def test_uses_human_readable_crash_labels(self):
        assert "Traffic Accident" in TRENDS_SQL
        assert "Hit & Run" in TRENDS_SQL

    def test_crime_labels_match_category_breakdown(self):
        assert TRENDS_CRIME_LABEL.strip() == BREAKDOWN_CRIME_LABEL.strip()

    def test_crash_labels_match_category_breakdown(self):
        assert TRENDS_CRASH_LABEL.strip() == BREAKDOWN_CRASH_LABEL.strip()


class TestAqiDailySQL:
    """Validate mart_aqi_daily SQL structure."""

    def test_inserts_into_correct_table(self):
        assert "INSERT INTO mart_aqi_daily" in AQI_SQL

    def test_has_upsert(self):
        assert "ON CONFLICT (date) DO UPDATE" in AQI_SQL

    def test_pivots_ozone(self):
        assert "OZONE" in AQI_SQL

    def test_pivots_pm25(self):
        assert "PM2.5" in AQI_SQL

    def test_pivots_pm10(self):
        assert "PM10" in AQI_SQL

    def test_computes_max_aqi(self):
        assert "MAX(aqi)" in AQI_SQL

    def test_uses_denver_timezone(self):
        assert "America/Denver" in AQI_SQL

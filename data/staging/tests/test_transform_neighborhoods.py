"""Tests for neighborhoods staging transformation logic."""

import json
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from transform_neighborhoods import transform_record


def _make_raw_row(**overrides):
    row = {
        "nbhd_id": 10,
        "nbhd_name": "Capitol Hill",
        "typology": "Urban Center",
        "geojson": json.dumps({"type": "Polygon", "coordinates": [[[0, 0], [1, 0], [1, 1], [0, 0]]]}),
        "shape_area": 12345678.9,
        "shape_length": 15000.5,
    }
    row.update(overrides)
    return row


class TestTransformNeighborhoodsRecord:
    def test_basic_fields(self):
        raw = _make_raw_row()
        result = transform_record(raw)
        assert result["nbhd_id"] == 10
        assert result["nbhd_name"] == "Capitol Hill"
        assert result["typology"] == "Urban Center"

    def test_geojson_parsed_and_serialized(self):
        geojson_obj = {"type": "Polygon", "coordinates": [[[0, 0], [1, 0], [1, 1], [0, 0]]]}
        raw = _make_raw_row(geojson=json.dumps(geojson_obj))
        result = transform_record(raw)
        # Should be a valid JSON string
        parsed = json.loads(result["geojson"])
        assert parsed["type"] == "Polygon"

    def test_geojson_none(self):
        raw = _make_raw_row(geojson=None)
        result = transform_record(raw)
        assert result["geojson"] is None

    def test_geojson_invalid_json(self):
        raw = _make_raw_row(geojson="not-valid-json{{{")
        result = transform_record(raw)
        assert result["geojson"] is None

    def test_shape_values(self):
        raw = _make_raw_row(shape_area=99999.0, shape_length=500.0)
        result = transform_record(raw)
        assert result["shape_area"] == 99999.0
        assert result["shape_length"] == 500.0

    def test_all_stg_columns_present(self):
        from transform_neighborhoods import STG_COLUMNS
        raw = _make_raw_row()
        result = transform_record(raw)
        for col in STG_COLUMNS:
            assert col in result, f"Missing column: {col}"

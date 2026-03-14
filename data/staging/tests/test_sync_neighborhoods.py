"""Tests for neighborhood name sync matching logic."""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sync_neighborhoods import _match_name


LOOKUP = {
    "capitol hill": "Capitol Hill",
    "five points": "Five Points",
    "cbd": "CBD",
    "baker": "Baker",
    "cory - merrill": "Cory - Merrill",
    "college view - south platte": "College View - South Platte",
    "gateway - green valley ranch": "Gateway - Green Valley Ranch",
    "elyria swansea": "Elyria Swansea",
}


class TestMatchName:
    def test_exact_match(self):
        assert _match_name("Capitol Hill", LOOKUP) == "Capitol Hill"

    def test_case_insensitive(self):
        assert _match_name("CAPITOL HILL", LOOKUP) == "Capitol Hill"
        assert _match_name("capitol hill", LOOKUP) == "Capitol Hill"

    def test_with_hyphens_to_spaced_hyphens(self):
        # Raw data often uses "cory-merrill" instead of "cory - merrill"
        assert _match_name("cory-merrill", LOOKUP) == "Cory - Merrill"

    def test_hyphen_replacement_complex(self):
        assert _match_name("gateway-green-valley-ranch", LOOKUP) is not None

    def test_no_match(self):
        assert _match_name("nonexistent-place", LOOKUP) is None

    def test_empty_string(self):
        assert _match_name("", LOOKUP) is None

    def test_whitespace_trimmed(self):
        assert _match_name("  baker  ", LOOKUP) == "Baker"

    def test_simple_name(self):
        assert _match_name("cbd", LOOKUP) == "CBD"

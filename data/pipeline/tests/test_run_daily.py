"""Tests for daily pipeline runner."""

import sys
import os
from unittest.mock import patch, MagicMock

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from run_daily import _run_script


class TestRunScript:
    @patch("run_daily.subprocess.run")
    def test_success(self, mock_run):
        mock_run.return_value = MagicMock(returncode=0, stdout="ok\n", stderr="")
        result = _run_script("test_step", "/fake/script.py", "/fake")
        assert result["status"] == "ok"
        assert result["step"] == "test_step"

    @patch("run_daily.subprocess.run")
    def test_failure_exit_code(self, mock_run):
        mock_run.return_value = MagicMock(returncode=1, stdout="", stderr="error msg")
        result = _run_script("test_step", "/fake/script.py", "/fake")
        assert result["status"] == "error"
        assert result["exit_code"] == 1

    @patch("run_daily.subprocess.run")
    def test_timeout(self, mock_run):
        import subprocess
        mock_run.side_effect = subprocess.TimeoutExpired(cmd="test", timeout=600)
        result = _run_script("test_step", "/fake/script.py", "/fake")
        assert result["status"] == "error"
        assert "timeout" in result["error"]

    @patch("run_daily.subprocess.run")
    def test_exception(self, mock_run):
        mock_run.side_effect = OSError("file not found")
        result = _run_script("test_step", "/fake/script.py", "/fake")
        assert result["status"] == "error"
        assert "file not found" in result["error"]

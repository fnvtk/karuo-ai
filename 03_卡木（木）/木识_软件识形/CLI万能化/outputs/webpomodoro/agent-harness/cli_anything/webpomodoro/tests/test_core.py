"""
Unit tests for cli-anything-webpomodoro core modules.
Tests use real LocalStorage data (read-only, no side effects).
"""
import pytest
from click.testing import CliRunner


# ── Backend unit tests ──────────────────────────────────────────────────────

class TestBackend:
    def test_localstorage_readable(self):
        from cli_anything.webpomodoro.utils.webpomodoro_backend import read_localstorage
        ls = read_localstorage()
        assert isinstance(ls, dict)
        # Should have at least Version key
        assert "Version" in ls or len(ls) == 0  # empty if app never ran

    def test_version_is_string(self):
        from cli_anything.webpomodoro.utils.webpomodoro_backend import read_localstorage
        ls = read_localstorage()
        if "Version" in ls:
            assert isinstance(ls["Version"], str)

    def test_timing_task_id_format(self):
        from cli_anything.webpomodoro.utils.webpomodoro_backend import read_localstorage
        ls = read_localstorage()
        tid = ls.get("timingTaskId", "")
        # If set, should look like a UUID
        if tid:
            assert len(tid) >= 30

    def test_is_running_returns_bool(self):
        from cli_anything.webpomodoro.utils.webpomodoro_backend import is_running
        result = is_running()
        assert isinstance(result, bool)

    def test_timer_label_is_string(self):
        from cli_anything.webpomodoro.utils.webpomodoro_backend import get_timer_label, is_running
        if is_running():
            label = get_timer_label()
            assert isinstance(label, str)
            assert len(label) > 0

    def test_get_timer_state_keys(self):
        from cli_anything.webpomodoro.utils.webpomodoro_backend import get_timer_state
        state = get_timer_state()
        assert "label" in state
        assert "timingTaskId" in state
        assert "user" in state
        assert "email" in state

    def test_user_email_present(self):
        from cli_anything.webpomodoro.utils.webpomodoro_backend import get_timer_state
        state = get_timer_state()
        email = state.get("email", "")
        if email:
            assert "@" in email


# ── Data layer unit tests ────────────────────────────────────────────────────

class TestDataLayer:
    def test_get_user_info(self):
        from cli_anything.webpomodoro.core.data import get_user_info
        info = get_user_info()
        assert isinstance(info, dict)
        assert "name" in info
        assert "email" in info
        assert "appVersion" in info

    def test_get_goals(self):
        from cli_anything.webpomodoro.core.data import get_goals
        goals = get_goals()
        assert isinstance(goals, list)

    def test_pomodoro_count_is_int(self):
        from cli_anything.webpomodoro.utils.webpomodoro_backend import count_today_pomodoros
        count = count_today_pomodoros()
        assert isinstance(count, int)
        assert count >= 0

    def test_get_full_status_structure(self):
        from cli_anything.webpomodoro.core.data import get_full_status
        status = get_full_status()
        assert "timer" in status
        assert "user" in status
        assert "goals" in status
        assert "totalPomodoros" in status

    def test_read_tasks_returns_list(self):
        from cli_anything.webpomodoro.utils.webpomodoro_backend import read_tasks
        tasks = read_tasks(limit=5)
        assert isinstance(tasks, list)

    def test_read_pomodoros_returns_list(self):
        from cli_anything.webpomodoro.utils.webpomodoro_backend import read_pomodoro_records
        records = read_pomodoro_records(limit=5)
        assert isinstance(records, list)


# ── CLI command tests ─────────────────────────────────────────────────────────

class TestCLICommands:
    def setup_method(self):
        self.runner = CliRunner()

    def test_cli_help(self):
        from cli_anything.webpomodoro.webpomodoro_cli import cli
        result = self.runner.invoke(cli, ["--help"])
        assert result.exit_code == 0
        assert "timer" in result.output
        assert "task" in result.output
        assert "session" in result.output

    def test_timer_help(self):
        from cli_anything.webpomodoro.webpomodoro_cli import cli
        result = self.runner.invoke(cli, ["timer", "--help"])
        assert result.exit_code == 0
        assert "status" in result.output
        assert "start" in result.output
        assert "pause" in result.output

    def test_timer_status_runs(self):
        from cli_anything.webpomodoro.webpomodoro_cli import cli
        result = self.runner.invoke(cli, ["timer", "status"])
        assert result.exit_code == 0

    def test_timer_status_json(self):
        from cli_anything.webpomodoro.webpomodoro_cli import cli
        import json
        result = self.runner.invoke(cli, ["timer", "status", "--json"])
        assert result.exit_code == 0
        data = json.loads(result.output)
        assert "label" in data or "running" in data

    def test_session_today_runs(self):
        from cli_anything.webpomodoro.webpomodoro_cli import cli
        result = self.runner.invoke(cli, ["session", "today"])
        assert result.exit_code == 0

    def test_data_settings_runs(self):
        from cli_anything.webpomodoro.webpomodoro_cli import cli
        result = self.runner.invoke(cli, ["data", "settings"])
        assert result.exit_code == 0

    def test_data_goals_runs(self):
        from cli_anything.webpomodoro.webpomodoro_cli import cli
        result = self.runner.invoke(cli, ["data", "goals"])
        assert result.exit_code == 0

    def test_task_list_runs(self):
        from cli_anything.webpomodoro.webpomodoro_cli import cli
        result = self.runner.invoke(cli, ["task", "list", "--limit", "5"])
        assert result.exit_code == 0

    def test_session_history_json(self):
        from cli_anything.webpomodoro.webpomodoro_cli import cli
        import json
        result = self.runner.invoke(cli, ["session", "history", "--json"])
        assert result.exit_code == 0
        data = json.loads(result.output)
        assert isinstance(data, list)

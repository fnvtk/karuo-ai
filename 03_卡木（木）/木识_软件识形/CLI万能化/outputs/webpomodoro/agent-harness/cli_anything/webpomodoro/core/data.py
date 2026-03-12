"""
WebPomodoro data layer — reads tasks, sessions, goals from local storage.
"""
import json
import base64
from datetime import datetime, timezone
from typing import Optional

from cli_anything.webpomodoro.utils.webpomodoro_backend import (
    read_localstorage,
    read_tasks,
    read_pomodoro_records,
    count_today_pomodoros,
    get_timer_state,
)


def _safe_json(s):
    try:
        return json.loads(s) if isinstance(s, str) else s
    except Exception:
        return s


def _decode_b64(s: str) -> str:
    try:
        return base64.b64decode(s).decode("utf-8")
    except Exception:
        return s


def _ts_to_human(ts) -> str:
    """Convert millisecond timestamp to human-readable local time."""
    try:
        ts_sec = int(ts) / 1000
        return datetime.fromtimestamp(ts_sec).strftime("%Y-%m-%d %H:%M")
    except Exception:
        return str(ts)


def get_current_task_info() -> dict:
    """
    Returns info about the currently tracked task.
    Combines localStorage (timingTaskId) with IndexedDB task lookup.
    """
    ls = read_localstorage()
    task_id = ls.get("timingTaskId", "")
    subtask_id = ls.get("timingSubtaskId", "")

    result = {
        "timingTaskId": task_id,
        "timingSubtaskId": subtask_id,
        "found": False,
        "taskName": None,
    }

    if not task_id:
        result["message"] = "No task currently being timed"
        return result

    # Search in IndexedDB task records
    tasks = read_tasks(limit=100)
    for t in tasks:
        tid = t.get("id", "").strip()
        if tid == task_id or task_id in tid:
            result["found"] = True
            result["rawData"] = t.get("data", {})
            # Try to extract name from raw words
            words = t.get("data", {}).get("_raw_words", [])
            if words:
                result["taskName"] = " ".join(words[:5])
            break

    return result


def get_user_info() -> dict:
    """Return logged-in user info."""
    ls = read_localstorage()
    return {
        "name": _decode_b64(ls.get("cookie.NAME", "")),
        "email": _decode_b64(ls.get("cookie.ACCT", "")),
        "uid": ls.get("cookie.UID", ""),
        "appVersion": ls.get("Version", ""),
        "installDate": _ts_to_human(ls.get("InstallationDate", 0)),
    }


def get_goals() -> list:
    """Return daily goals."""
    ls = read_localstorage()
    goals_raw = ls.get("Goals", "[]")
    goals = _safe_json(goals_raw)
    result = []
    if isinstance(goals, list):
        for g in goals:
            if isinstance(g, dict):
                goal_type = g.get("type", "")
                value = g.get("value", 0)
                if goal_type == "TIME":
                    result.append({"type": "daily_focus_minutes", "value": value,
                                   "display": f"{value} 分钟/天"})
                elif goal_type == "COUNT":
                    result.append({"type": "daily_pomodoro_count", "value": value,
                                   "display": f"{value} 个番茄/天"})
    return result


def get_full_status() -> dict:
    """Return complete app status."""
    state = get_timer_state()
    user = get_user_info()
    goals = get_goals()
    pomodoro_count = count_today_pomodoros()

    return {
        "timer": {
            "label": state.get("label", "unknown"),
            "timingTaskId": state.get("timingTaskId", ""),
        },
        "user": user,
        "goals": goals,
        "totalPomodoros": pomodoro_count,
        "lastSync": _ts_to_human(state.get("syncTimestamp", 0)),
    }


def get_recent_pomodoros(limit: int = 10) -> list:
    """Get recent Pomodoro session records."""
    records = read_pomodoro_records(limit=limit)
    result = []
    for r in records:
        item = {"id": r.get("id", ""), "data": r.get("data", {})}
        result.append(item)
    return result

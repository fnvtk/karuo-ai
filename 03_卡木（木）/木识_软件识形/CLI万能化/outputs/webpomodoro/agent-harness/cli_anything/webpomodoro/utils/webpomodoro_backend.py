"""
WebPomodoro backend — macOS-native control via AppleScript + SQLite data access.
"""
import subprocess
import sqlite3
import os
import json
from pathlib import Path
from typing import Optional


# ── Paths ──────────────────────────────────────────────────────────────────

CONTAINER = Path.home() / "Library/Containers/com.macpomodoro/Data"
WEBKIT_BASE = CONTAINER / "Library/WebKit/WebsiteData/Default"
PREFS_PLIST = CONTAINER / "Library/Preferences/com.macpomodoro.plist"


def _find_webkit_dir() -> Optional[Path]:
    """Find the hashed WebKit storage directory."""
    if not WEBKIT_BASE.exists():
        return None
    dirs = list(WEBKIT_BASE.iterdir())
    if dirs:
        return dirs[0] / dirs[0].name
    return None


def _localstorage_db() -> Optional[Path]:
    d = _find_webkit_dir()
    if d:
        p = d / "LocalStorage/localstorage.sqlite3"
        if p.exists():
            return p
    return None


def _indexeddb() -> Optional[Path]:
    d = _find_webkit_dir()
    if d:
        idb_dir = d / "IndexedDB"
        if idb_dir.exists():
            dbs = list(idb_dir.iterdir())
            if dbs:
                return dbs[0] / "IndexedDB.sqlite3"
    return None


# ── App control ────────────────────────────────────────────────────────────

def _run_applescript(script: str) -> str:
    result = subprocess.run(
        ["osascript", "-e", script],
        capture_output=True, text=True, timeout=10
    )
    if result.returncode != 0:
        raise RuntimeError(f"AppleScript error: {result.stderr.strip()}")
    return result.stdout.strip()


def is_running() -> bool:
    """Check if WebPomodoro is running."""
    script = 'tell application "System Events" to return (name of processes) contains "WebPomodoro"'
    return _run_applescript(script) == "true"


def launch() -> None:
    """Launch WebPomodoro if not running."""
    subprocess.run(["open", "-a", "WebPomodoro"], check=True)


def get_timer_label() -> str:
    """Read current timer display from status bar (e.g. '24:30')."""
    script = '''
tell application "System Events"
  tell process "WebPomodoro"
    return name of menu bar item 1 of menu bar 2
  end tell
end tell'''
    try:
        return _run_applescript(script)
    except Exception:
        return "unknown"


def click_status_bar() -> None:
    """Click the status bar item to open the timer menu."""
    script = '''
tell application "System Events"
  tell process "WebPomodoro"
    click menu bar item 1 of menu bar 2
  end tell
end tell'''
    _run_applescript(script)


def activate_app() -> None:
    _run_applescript('tell application "WebPomodoro" to activate')


# ── LocalStorage reader ────────────────────────────────────────────────────

def _decode_utf16(b) -> str:
    if isinstance(b, bytes):
        return b.decode("utf-16-le", errors="replace")
    return str(b)


def read_localstorage() -> dict:
    """Read all LocalStorage key-value pairs."""
    db_path = _localstorage_db()
    if not db_path:
        return {}
    conn = sqlite3.connect(str(db_path))
    c = conn.cursor()
    c.execute("SELECT key, value FROM ItemTable")
    result = {}
    for key, val in c.fetchall():
        try:
            k = _decode_utf16(key)
            v = _decode_utf16(val)
            if not v.startswith("data:image"):  # skip base64 images
                result[k] = v
        except Exception:
            pass
    conn.close()
    return result


def get_timer_state() -> dict:
    """
    Return timer state dict:
      label, timingTaskId, timingSubtaskId, goals, syncTimestamp
    """
    ls = read_localstorage()
    label = get_timer_label()
    return {
        "label": label,
        "timingTaskId": ls.get("timingTaskId", ""),
        "timingSubtaskId": ls.get("timingSubtaskId", ""),
        "goals": _safe_json(ls.get("Goals", "[]")),
        "version": ls.get("Version", ""),
        "user": _safe_b64(ls.get("cookie.NAME", "")),
        "email": _safe_b64(ls.get("cookie.ACCT", "")),
        "syncTimestamp": ls.get("SyncTimestamp", ""),
    }


def _safe_json(s: str):
    try:
        return json.loads(s)
    except Exception:
        return s


def _safe_b64(s: str) -> str:
    import base64
    try:
        return base64.b64decode(s).decode("utf-8")
    except Exception:
        return s


# ── IndexedDB reader (binary WebKit IDB format) ────────────────────────────

def _decode_idb_value(raw: bytes) -> Optional[dict]:
    """
    WebKit IDB values are serialized in a custom binary format.
    We extract printable strings as a best-effort approach.
    """
    if not raw:
        return None
    # Try to extract UTF-8 readable substrings (field names + values)
    result = {}
    try:
        text = raw.decode("utf-8", errors="replace")
        # Extract key-value pairs by scanning for common field patterns
        import re
        # JSON-like fragments embedded in binary
        json_frags = re.findall(r'\{[^{}]{5,500}\}', text)
        for frag in json_frags:
            try:
                obj = json.loads(frag)
                result.update(obj)
                break
            except Exception:
                pass
        # Extract readable strings
        words = re.findall(r'[A-Za-z0-9\u4e00-\u9fff\-_@.]{3,}', text)
        if not result and words:
            result["_raw_words"] = words[:20]
    except Exception:
        pass
    return result


def read_pomodoro_records(limit: int = 20) -> list:
    """Read recent Pomodoro records from IndexedDB."""
    db_path = _indexeddb()
    if not db_path:
        return []
    conn = sqlite3.connect(str(db_path))
    c = conn.cursor()
    try:
        # Pomodoro store is id=124
        c.execute("SELECT key, value FROM Records WHERE objectStoreID=124 ORDER BY rowid DESC LIMIT ?", (limit,))
        rows = c.fetchall()
        results = []
        for key, val in rows:
            key_str = _decode_utf16(key) if isinstance(key, bytes) else str(key)
            val_decoded = _decode_idb_value(val) if isinstance(val, bytes) else {}
            results.append({"id": key_str.strip("\x00"), "data": val_decoded})
        return results
    except Exception as e:
        return [{"error": str(e)}]
    finally:
        conn.close()


def read_tasks(limit: int = 20) -> list:
    """Read recent tasks from IndexedDB."""
    db_path = _indexeddb()
    if not db_path:
        return []
    conn = sqlite3.connect(str(db_path))
    c = conn.cursor()
    try:
        c.execute("SELECT key, value FROM Records WHERE objectStoreID=122 ORDER BY rowid DESC LIMIT ?", (limit,))
        rows = c.fetchall()
        results = []
        for key, val in rows:
            key_str = _decode_utf16(key) if isinstance(key, bytes) else str(key)
            val_decoded = _decode_idb_value(val) if isinstance(val, bytes) else {}
            results.append({"id": key_str.strip("\x00"), "data": val_decoded})
        return results
    except Exception as e:
        return [{"error": str(e)}]
    finally:
        conn.close()


def count_today_pomodoros() -> int:
    """Count number of Pomodoro records in IndexedDB (approximate today's count)."""
    db_path = _indexeddb()
    if not db_path:
        return 0
    conn = sqlite3.connect(str(db_path))
    c = conn.cursor()
    try:
        c.execute("SELECT COUNT(*) FROM Records WHERE objectStoreID=124")
        return c.fetchone()[0]
    except Exception:
        return 0
    finally:
        conn.close()

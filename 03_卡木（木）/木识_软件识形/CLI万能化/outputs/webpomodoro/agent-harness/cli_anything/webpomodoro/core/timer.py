"""
Timer control — uses AppleScript (Accessibility) to drive WebPomodoro.
State machine: initial → work ↔ pause → rest → initial
"""
import subprocess
import time
from typing import Optional


def _applescript(script: str) -> str:
    r = subprocess.run(["osascript", "-e", script], capture_output=True, text=True, timeout=10)
    if r.returncode != 0:
        raise RuntimeError(r.stderr.strip())
    return r.stdout.strip()


def _ensure_app_active() -> None:
    _applescript('tell application "WebPomodoro" to activate')
    time.sleep(0.4)


def _click_in_window(x: int, y: int) -> None:
    """Click at screen position via System Events."""
    script = f'''
tell application "System Events"
  tell process "WebPomodoro"
    click at {{{x}, {y}}}
  end tell
end tell'''
    _applescript(script)


def _press_key(key: str) -> None:
    script = f'''
tell application "System Events"
  tell process "WebPomodoro"
    keystroke "{key}"
  end tell
end tell'''
    _applescript(script)


# ── Menu-based controls ────────────────────────────────────────────────────

def _get_window_buttons() -> list:
    """Get all buttons in the main WebPomodoro window."""
    script = '''
tell application "System Events"
  tell process "WebPomodoro"
    set wins to windows
    if (count of wins) > 0 then
      set win1 to item 1 of wins
      set allButtons to buttons of win1
      set btnNames to {}
      repeat with b in allButtons
        try
          set end of btnNames to description of b & " | " & title of b
        end try
      end repeat
      return btnNames
    end if
    return {}
  end tell
end tell'''
    try:
        return _applescript(script)
    except Exception:
        return []


def start_work() -> dict:
    """Start a work (focus) session."""
    _ensure_app_active()
    # Try AppleScript webBridge approach via JS evaluation via URL scheme
    # Fallback: click the start button via Accessibility
    script = '''
tell application "System Events"
  tell process "WebPomodoro"
    set wins to windows
    if (count of wins) > 0 then
      set win1 to item 1 of wins
      -- Look for start/play button
      repeat with b in buttons of win1
        try
          set desc to description of b
          if desc contains "开始" or desc contains "start" or desc contains "Start" or desc contains "play" then
            click b
            return "clicked: " & desc
          end if
        end try
      end repeat
    end if
  end tell
end tell
return "no start button found"'''
    try:
        result = _applescript(script)
        return {"action": "start_work", "result": result}
    except Exception as e:
        return {"action": "start_work", "error": str(e)}


def pause_timer() -> dict:
    """Pause the current timer."""
    _ensure_app_active()
    script = '''
tell application "System Events"
  tell process "WebPomodoro"
    set wins to windows
    if (count of wins) > 0 then
      set win1 to item 1 of wins
      repeat with b in buttons of win1
        try
          set desc to description of b
          if desc contains "暂停" or desc contains "pause" or desc contains "Pause" then
            click b
            return "clicked: " & desc
          end if
        end try
      end repeat
    end if
  end tell
end tell
return "no pause button found"'''
    try:
        result = _applescript(script)
        return {"action": "pause", "result": result}
    except Exception as e:
        return {"action": "pause", "error": str(e)}


def stop_timer() -> dict:
    """Stop/reset the current timer."""
    _ensure_app_active()
    script = '''
tell application "System Events"
  tell process "WebPomodoro"
    set wins to windows
    if (count of wins) > 0 then
      set win1 to item 1 of wins
      repeat with b in buttons of win1
        try
          set desc to description of b
          if desc contains "停止" or desc contains "stop" or desc contains "Stop" or desc contains "reset" then
            click b
            return "clicked: " & desc
          end if
        end try
      end repeat
    end if
  end tell
end tell
return "no stop button found"'''
    try:
        result = _applescript(script)
        return {"action": "stop", "result": result}
    except Exception as e:
        return {"action": "stop", "error": str(e)}


def start_break() -> dict:
    """Start a break session."""
    _ensure_app_active()
    script = '''
tell application "System Events"
  tell process "WebPomodoro"
    set wins to windows
    if (count of wins) > 0 then
      set win1 to item 1 of wins
      repeat with b in buttons of win1
        try
          set desc to description of b
          if desc contains "休息" or desc contains "break" or desc contains "Break" or desc contains "rest" then
            click b
            return "clicked: " & desc
          end if
        end try
      end repeat
    end if
  end tell
end tell
return "no break button found"'''
    try:
        result = _applescript(script)
        return {"action": "start_break", "result": result}
    except Exception as e:
        return {"action": "start_break", "error": str(e)}


def get_status_label() -> str:
    """Get current timer label from menu bar (e.g. '24:30' or '专注中')."""
    script = '''
tell application "System Events"
  tell process "WebPomodoro"
    return name of menu bar item 1 of menu bar 2
  end tell
end tell'''
    try:
        return _applescript(script)
    except Exception:
        return "unknown"


def list_ui_elements() -> str:
    """Debug: list all UI elements in the main window."""
    script = '''
tell application "System Events"
  tell process "WebPomodoro"
    set result_list to {}
    set wins to windows
    if (count of wins) > 0 then
      set win1 to item 1 of wins
      -- buttons
      repeat with b in buttons of win1
        try
          set end of result_list to "BTN: " & description of b
        end try
      end repeat
      -- static texts
      repeat with st in static texts of win1
        try
          set t to value of st
          if t is not missing value and t is not "" then
            set end of result_list to "TXT: " & t
          end if
        end try
      end repeat
    end if
    return result_list
  end tell
end tell'''
    try:
        return _applescript(script)
    except Exception as e:
        return f"error: {e}"

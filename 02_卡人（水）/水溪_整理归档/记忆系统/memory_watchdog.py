#!/usr/bin/env python3
"""
记忆系统 Watchdog（轻量版）
- 检查每日收集是否超时未跑
- 检查 memory_health.json / daily_digest.md / agent_results.json 是否过旧
- 连续 2 次异常才触发告警状态（降噪）
"""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path

ROOT = Path("/Users/karuo/Documents/个人/卡若AI/02_卡人（水）/水溪_整理归档/记忆系统")
STRUCTURED = ROOT / "structured"

STAMP = STRUCTURED / "last_chat_collect_date.txt"
HEALTH = STRUCTURED / "memory_health.json"
DAILY_DIGEST = STRUCTURED / "daily_digest.md"
AGENT_RESULTS = STRUCTURED / "agent_results.json"
STATE = STRUCTURED / "watchdog_state.json"
REPORT = STRUCTURED / "watchdog_report.json"


def now():
    return datetime.now()


def load_json(path: Path, default):
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default


def file_age_hours(path: Path):
    if not path.exists():
        return None
    dt = datetime.fromtimestamp(path.stat().st_mtime)
    return (now() - dt).total_seconds() / 3600.0


def check():
    issues = []
    today = now().strftime("%Y-%m-%d")

    # 1) 每日 stamp
    if not STAMP.exists():
        issues.append("缺少 last_chat_collect_date.txt")
    else:
        val = STAMP.read_text(encoding="utf-8").strip()
        if val != today:
            issues.append(f"每日收集未执行（stamp={val}, today={today}）")

    # 2) memory_health
    if not HEALTH.exists():
        issues.append("缺少 memory_health.json")
    else:
        age = file_age_hours(HEALTH)
        if age is not None and age > 30:
            issues.append(f"memory_health.json 过旧（{age:.1f}h）")

    # 3) daily digest
    if not DAILY_DIGEST.exists():
        issues.append("缺少 daily_digest.md")
    else:
        age = file_age_hours(DAILY_DIGEST)
        if age is not None and age > 30:
            issues.append(f"daily_digest.md 过旧（{age:.1f}h）")

    # 4) agent results
    if not AGENT_RESULTS.exists():
        issues.append("缺少 agent_results.json")
    else:
        age = file_age_hours(AGENT_RESULTS)
        if age is not None and age > 36:
            issues.append(f"agent_results.json 过旧（{age:.1f}h）")

    return issues


def main():
    STRUCTURED.mkdir(parents=True, exist_ok=True)
    issues = check()

    state = load_json(STATE, {"consecutive_anomalies": 0, "last_status": "unknown", "updated": ""})
    if issues:
        state["consecutive_anomalies"] = int(state.get("consecutive_anomalies", 0)) + 1
        status = "anomaly"
    else:
        state["consecutive_anomalies"] = 0
        status = "ok"

    state["last_status"] = status
    state["updated"] = now().strftime("%Y-%m-%d %H:%M:%S")
    STATE.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")

    alert = state["consecutive_anomalies"] >= 2
    report = {
        "updated": now().strftime("%Y-%m-%d %H:%M:%S"),
        "status": status,
        "issues": issues,
        "consecutive_anomalies": state["consecutive_anomalies"],
        "alert": alert,
    }
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    if alert:
        print(f"[watchdog] ALERT 连续异常 {state['consecutive_anomalies']} 次：")
        for i in issues:
            print(f"  - {i}")
    elif issues:
        print("[watchdog] 本次异常（未到告警阈值）：")
        for i in issues:
            print(f"  - {i}")
    else:
        print("[watchdog] OK 记忆系统健康。")


if __name__ == "__main__":
    main()


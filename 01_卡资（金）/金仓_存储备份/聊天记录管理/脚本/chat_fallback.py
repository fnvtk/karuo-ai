#!/usr/bin/env python3
"""
聊天记录 · 本地 Fallback（MongoDB 不可用时使用）

- 每次归档到 MongoDB 后同步写入本文件，保留最近 N 条对话摘要。
- context_recall / query_chat 在连不上 MongoDB 时从此读取并做简单关键词匹配。
"""

import json
import os
from datetime import datetime, timezone
from pathlib import Path

# 与 auto_archive 同目录，fallback 在上一级
SCRIPT_DIR = Path(__file__).resolve().parent
FALLBACK_DIR = SCRIPT_DIR.parent / "fallback"
FALLBACK_FILE = FALLBACK_DIR / "recent_chats_fallback.json"
MAX_ENTRIES = 30


def _ensure_dir():
    FALLBACK_DIR.mkdir(parents=True, exist_ok=True)


def _serialize_dt(dt):
    if dt is None:
        return None
    if hasattr(dt, "isoformat"):
        return dt.isoformat()
    return str(dt)


def 追加一条(对话文档: dict):
    """将一条对话摘要追加到 fallback 文件（新的在头，保留最近 MAX_ENTRIES 条）。"""
    _ensure_dir()
    entry = {
        "对话ID": 对话文档.get("对话ID", ""),
        "名称": 对话文档.get("名称", ""),
        "项目": 对话文档.get("项目", ""),
        "首条消息": (对话文档.get("首条消息") or "")[:500],
        "创建时间": _serialize_dt(对话文档.get("创建时间")),
        "消息数量": 对话文档.get("消息数量", 0),
    }
    data = 读取_all()
    # 去重：同 对话ID 只保留最新
    conv_id = entry["对话ID"]
    data["conversations"] = [c for c in data["conversations"] if c.get("对话ID") != conv_id]
    data["conversations"].insert(0, entry)
    data["conversations"] = data["conversations"][:MAX_ENTRIES]
    data["updated"] = datetime.now(timezone.utc).isoformat()
    with open(FALLBACK_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=0)
    return True


def 批量追加(对话文档列表: list):
    """批量追加（新对话在头）。"""
    if not 对话文档列表:
        return
    _ensure_dir()
    data = 读取_all()
    existing_ids = {c.get("对话ID") for c in data["conversations"]}
    for 文档 in reversed(对话文档列表):
        if 文档.get("对话ID") in existing_ids:
            continue
        entry = {
            "对话ID": 文档.get("对话ID", ""),
            "名称": 文档.get("名称", ""),
            "项目": 文档.get("项目", ""),
            "首条消息": (文档.get("首条消息") or "")[:500],
            "创建时间": _serialize_dt(文档.get("创建时间")),
            "消息数量": 文档.get("消息数量", 0),
        }
        data["conversations"].insert(0, entry)
        existing_ids.add(entry["对话ID"])
    data["conversations"] = data["conversations"][:MAX_ENTRIES]
    data["updated"] = datetime.now(timezone.utc).isoformat()
    with open(FALLBACK_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=0)


def 读取_all() -> dict:
    """读取完整 fallback 数据。"""
    _ensure_dir()
    if not FALLBACK_FILE.exists():
        return {"updated": None, "conversations": []}
    try:
        with open(FALLBACK_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
    except (json.JSONDecodeError, OSError):
        return {"updated": None, "conversations": []}
    if not isinstance(data.get("conversations"), list):
        data["conversations"] = []
    return data


def 读取列表() -> list:
    """返回最近对话列表（用于 context_recall 降级）。"""
    data = 读取_all()
    return data.get("conversations", [])

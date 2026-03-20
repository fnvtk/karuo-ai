#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
从 Navicat Premium (macOS) 的 plist 中读取连接配置（主机、端口、用户、库名等）。
密码通常为加密存储，需在《00_账号与API索引》或环境变量中另行配置。
用途：不打开 Navicat，用 mysql/mongosh/psql 等 CLI 时复用连接信息。
归属：金仓 · Navicat Premium 静默控制。
"""
import json
import plistlib
import sys
from pathlib import Path

PLIST_PATH = Path.home() / "Library/Preferences/com.premiumSoft.NavicatPremium.plist"
# 其他可能路径
ALT_PATHS = [
    Path.home() / "Library/Application Support/PremiumSoft CyberTech/Navicat Premium/",
]


def load_plist(path: Path) -> dict:
    try:
        with open(path, "rb") as f:
            return plistlib.load(f)
    except Exception:
        return {}


def extract_connections(data: dict) -> list:
    """从 plist 结构中尽量解析出连接信息（结构因版本可能不同）。"""
    out = []
    # 常见键名（不同版本可能不同）
    for key in ("connections", "Connection", "Servers", "favoriteConnections", "connectionList"):
        if key in data and isinstance(data[key], (list, dict)):
            raw = data[key]
            items = raw if isinstance(raw, list) else list(raw.values()) if isinstance(raw, dict) else []
            for item in items:
                if isinstance(item, dict):
                    conn = {
                        "name": item.get("name") or item.get("connectionName") or item.get("label") or "unknown",
                        "host": item.get("host") or item.get("Host") or "",
                        "port": item.get("port") or item.get("Port") or 0,
                        "user": item.get("userName") or item.get("user") or item.get("UserName") or "",
                        "database": item.get("database") or item.get("databaseName") or "",
                        "type": item.get("type") or item.get("databaseType") or "",
                    }
                    if conn["host"] or conn["database"] or conn["user"]:
                        out.append(conn)
    # 若顶层是列表或字典，尝试遍历
    if not out and isinstance(data, dict):
        for k, v in data.items():
            if isinstance(v, dict) and any(x in v for x in ("host", "Host", "userName", "user")):
                conn = {
                    "name": v.get("name") or v.get("connectionName") or k,
                    "host": v.get("host") or v.get("Host") or "",
                    "port": v.get("port") or v.get("Port") or 0,
                    "user": v.get("userName") or v.get("user") or "",
                    "database": v.get("database") or v.get("databaseName") or "",
                    "type": v.get("type") or v.get("databaseType") or "",
                }
                if conn["host"] or conn["database"] or conn["user"]:
                    out.append(conn)
    return out


def main():
    path = PLIST_PATH
    if not path.exists():
        for p in ALT_PATHS:
            candidate = p / "preferences.plist" if p.is_dir() else p
            if candidate.exists():
                path = candidate
                break
    if not path.exists():
        print(json.dumps({"error": "Navicat plist not found", "tried": str(PLIST_PATH)}, ensure_ascii=False, indent=2))
        sys.exit(1)
    data = load_plist(path)
    connections = extract_connections(data)
    if not connections:
        # 输出原始键，便于调试
        print(json.dumps({"keys": list(data.keys())[:50], "message": "No connection structure found"}, ensure_ascii=False, indent=2))
        sys.exit(0)
    print(json.dumps(connections, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

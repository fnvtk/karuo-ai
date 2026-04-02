#!/usr/bin/env python3
"""
将本地 SQLite Key 池（key_pool.db）中的活跃 Key 同步到卡若官网 Mongo（karuo_site.gateways），
供 /console/gateway 与 callLLMViaGateway 多 Key 尝试（tryWithKeys + 轮换起点）。

支持平台：cerebras → gw-cerebras，cohere → gw-cohere（须在 PLATFORM_CONFIG 中配置）。

环境变量：MONGO_URI、MONGO_DB（默认与官网 storage-mongo 一致）。
"""
from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any, Dict, List

try:
    from pymongo import MongoClient
except ImportError as e:
    raise SystemExit("需要 pymongo：pip install pymongo") from e

if TYPE_CHECKING:
    from key_pool_manager import KeyPool

MONGO_URI = os.environ.get("MONGO_URI", "mongodb://admin:admin123@localhost:27017/?authSource=admin")
MONGO_DB = os.environ.get("MONGO_DB", "karuo_site")

# 与 site/src/lib/gateway-defaults.ts 对齐（仅结构，不含密钥）
GATEWAY_BLUEPRINTS: Dict[str, Dict[str, Any]] = {
    "cerebras": {
        "id": "gw-cerebras",
        "name": "Cerebras（AI芯片加速·主力）",
        "baseUrl": "https://api.cerebras.ai/v1",
        "model": "qwen-3-235b-a22b-instruct-2507",
        "priority": 1,
        "retries": 2,
        "timeoutMs": 15000,
        "endpoints": [
            {"id": "gw-cerebras-e1", "url": "https://api.cerebras.ai/v1", "enabled": True},
        ],
    },
    "cohere": {
        "id": "gw-cohere",
        "name": "Cohere（NLP专家·128K上下文）",
        "baseUrl": "https://api.cohere.com/compatibility/v1",
        "model": "command-a-03-2025",
        "priority": 2,
        "retries": 2,
        "timeoutMs": 20000,
        "endpoints": [
            {"id": "gw-cohere-e1", "url": "https://api.cohere.com/compatibility/v1", "enabled": True},
        ],
    },
}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def sync_key_pool_to_site_mongo(pool: "KeyPool") -> Dict[str, Any]:
    """从 KeyPool 读取各平台 active Key，写入/更新 Mongo gateways。"""
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=10000)
    client.admin.command("ping")
    col = client[MONGO_DB].gateways

    summary: Dict[str, Any] = {"updated": [], "errors": []}

    for platform, blueprint in GATEWAY_BLUEPRINTS.items():
        gw_id = blueprint["id"]
        try:
            rows = pool.get_active_keys(platform)
            keys: List[str] = []
            for r in rows:
                k = (r.get("api_key") or "").strip()
                if k:
                    keys.append(k)

            if not col.find_one({"id": gw_id}):
                insert_doc = {
                    **blueprint,
                    "apiKey": keys[0] if keys else "",
                    "apiKeys": keys,
                    "status": "active" if keys else "standby",
                    "updatedAt": _now_iso(),
                }
                col.insert_one(insert_doc)
                summary["updated"].append({"id": gw_id, "keys": len(keys), "op": "insert"})
            else:
                col.update_one(
                    {"id": gw_id},
                    {
                        "$set": {
                            "apiKey": keys[0] if keys else "",
                            "apiKeys": keys,
                            "status": "active" if keys else "standby",
                            "updatedAt": _now_iso(),
                        }
                    },
                )
                summary["updated"].append({"id": gw_id, "keys": len(keys), "op": "update"})
        except Exception as e:
            summary["errors"].append({"id": gw_id, "error": str(e)})

    client.close()
    return summary


def main() -> None:
    import sys
    from pathlib import Path

    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from key_pool_manager import KeyPool

    s = sync_key_pool_to_site_mongo(KeyPool())
    for u in s.get("updated", []):
        print(f"[sync] {u['id']}: {u['op']}，活跃 Key 数={u['keys']}")
    for e in s.get("errors", []):
        print(f"[sync] ERROR {e['id']}: {e['error']}")


if __name__ == "__main__":
    main()

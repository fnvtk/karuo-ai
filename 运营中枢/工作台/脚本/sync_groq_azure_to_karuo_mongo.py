#!/usr/bin/env python3
"""
将 Groq / Azure Speech 凭证写入卡若官网 Mongo（karuo_site）。

- Groq：写入集合 gateways，id=gw-groq（与控制台 /console/gateway 一致，apiKeys 为池）。
- Azure Speech：写入集合 settings（键 azure_speech_key / azure_speech_region）。
  说明：官网当前对话语音默认走腾讯云；此两项供后续扩展或你本机 TryVoice/.env 对照，不保证前台已消费。

用法：
  export GROQ_API_KEY=gsk_xxx   # 或 KARUO_GROQ_API_KEY
  export AZURE_SPEECH_KEY=...   # 或 KARUO_AZURE_SPEECH_KEY
  export AZURE_SPEECH_REGION=eastus
  python3 sync_groq_azure_to_karuo_mongo.py --apply

  python3 sync_groq_azure_to_karuo_mongo.py --clear   # 清空 gw-groq 的 Key 并删 Azure 两项 settings
"""
from __future__ import annotations

import argparse
import os
from datetime import datetime, timezone

try:
    from pymongo import MongoClient
except ImportError as e:
    raise SystemExit("需要 pymongo：pip install pymongo") from e

MONGO_URI = os.environ.get("MONGO_URI", "mongodb://admin:admin123@localhost:27017/?authSource=admin")
MONGO_DB = os.environ.get("MONGO_DB", "karuo_site")

GW_GROQ = {
    "id": "gw-groq",
    "name": "Groq（超快推理）",
    "baseUrl": "https://api.groq.com/openai/v1",
    "model": "llama-3.1-8b-instant",
    "priority": 91,
    "retries": 2,
    "timeoutMs": 15000,
    "endpoints": [{"id": "gw-groq-e1", "url": "https://api.groq.com/openai/v1", "enabled": True}],
}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--apply", action="store_true", help="从环境变量写入 Mongo")
    p.add_argument("--clear", action="store_true", help="清空 gw-groq 密钥并删除 Azure 语音 settings")
    args = p.parse_args()
    if not args.apply and not args.clear:
        p.print_help()
        raise SystemExit(2)

    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=8000)
    client.admin.command("ping")
    db = client[MONGO_DB]

    if args.clear:
        cleared = {
            **GW_GROQ,
            "apiKey": "",
            "apiKeys": [],
            "status": "disabled",
        }
        db.gateways.update_one({"id": "gw-groq"}, {"$set": cleared}, upsert=True)
        # 仅删语音相关预留键
        db.settings.delete_many({"key": {"$in": ["azure_speech_key", "azure_speech_region", "groq_api_key"]}})
        print("[clear] gw-groq 已置空（若存在）；已删除 azure_speech_* / groq_api_key settings（若存在）")

    if args.apply:
        groq = (
            os.environ.get("KARUO_GROQ_API_KEY")
            or os.environ.get("GROQ_API_KEY")
            or ""
        ).strip()
        az_key = (
            os.environ.get("KARUO_AZURE_SPEECH_KEY")
            or os.environ.get("AZURE_SPEECH_KEY")
            or ""
        ).strip()
        az_region = (
            os.environ.get("KARUO_AZURE_SPEECH_REGION")
            or os.environ.get("AZURE_SPEECH_REGION")
            or "eastus"
        ).strip()

        doc = {**GW_GROQ}
        if groq:
            doc["apiKey"] = groq
            doc["apiKeys"] = [groq]
            doc["status"] = "active"
        else:
            doc["apiKey"] = ""
            doc["apiKeys"] = []
            doc["status"] = "disabled"

        db.gateways.update_one({"id": "gw-groq"}, {"$set": doc}, upsert=True)
        print(f"[apply] gw-groq upsert 完成；status={doc['status']}；已配置 Key={'是' if groq else '否'}")

        if az_key:
            ts = _now_iso()
            db.settings.update_one(
                {"key": "azure_speech_key"},
                {"$set": {"key": "azure_speech_key", "value": az_key, "updatedAt": ts}},
                upsert=True,
            )
            db.settings.update_one(
                {"key": "azure_speech_region"},
                {"$set": {"key": "azure_speech_region", "value": az_region, "updatedAt": ts}},
                upsert=True,
            )
            print(f"[apply] Azure Speech 已写入 settings（region={az_region}）")
        else:
            print("[apply] 未设置 AZURE_SPEECH_KEY，跳过 Azure")

    client.close()


if __name__ == "__main__":
    main()

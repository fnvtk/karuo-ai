#!/usr/bin/env python3
"""
Agent 列表同步与恢复
- 导出：将 Cursor 右侧 Agent 列表（来自 state.vscdb composerData）同步到 MongoDB「Agent列表」
- 恢复：从 MongoDB「对话记录」+「消息内容」写回 state.vscdb，使新工作区打开时右侧 Agent 列表恢复显示

注意：恢复时建议先关闭 Cursor，完成后再重新打开。

用法:
  python3 agent_sync_restore.py export     # 当前 Agent 列表 → MongoDB
  python3 agent_sync_restore.py restore    # MongoDB → state.vscdb（恢复全部或指定）
  python3 agent_sync_restore.py restore --name "阿猫的苹果笔记本"   # 只恢复名称匹配的对话为右侧 Agent
  python3 agent_sync_restore.py list       # 查看 MongoDB 中 Agent 列表
"""

import argparse
import json
import os
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path

try:
    from pymongo import MongoClient, UpdateOne
    from pymongo.errors import BulkWriteError
except ImportError:
    print("需要 pymongo: pip install pymongo")
    sys.exit(1)

MONGO_URI = "mongodb://admin:admin123@localhost:27017/?authSource=admin"
DB_NAME = "karuo_site"
STATE_VSCDB = os.path.expanduser(
    "~/Library/Application Support/Cursor/User/globalStorage/state.vscdb"
)


def 时间戳转时间(ts_ms):
    if not ts_ms:
        return None
    try:
        return datetime.fromtimestamp(ts_ms / 1000, tz=timezone.utc)
    except (ValueError, OSError):
        return None


def get_db():
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    try:
        client.admin.command("ping")
    except Exception as e:
        print(f"MongoDB 连接失败: {e}")
        sys.exit(1)
    return client, client[DB_NAME]


def export_to_mongo(db):
    """从 state.vscdb 读取 composerData，同步到 MongoDB 集合「Agent列表」"""
    if not os.path.exists(STATE_VSCDB):
        print(f"未找到: {STATE_VSCDB}")
        return

    conn = sqlite3.connect(STATE_VSCDB)
    cur = conn.cursor()
    cur.execute("SELECT key, value FROM cursorDiskKV WHERE key LIKE 'composerData:%'")

    ops = []
    count = 0
    for row in cur.fetchall():
        key, value = row
        对话ID = key.replace("composerData:", "")
        try:
            data = json.loads(value)
        except (json.JSONDecodeError, TypeError):
            continue

        名称 = data.get("name") or data.get("subtitle") or ""
        headers = data.get("fullConversationHeadersOnly", [])
        消息数 = len(headers)
        创建时间 = 时间戳转时间(data.get("createdAt"))
        更新时间 = 时间戳转时间(data.get("lastUpdatedAt"))

        doc = {
            "对话ID": 对话ID,
            "名称": 名称 or f"Agent_{对话ID[:8]}",
            "消息数量": 消息数,
            "创建时间": 创建时间,
            "更新时间": 更新时间,
            "是否Agent": data.get("isAgentic", False),
            "来源": "state.vscdb",
            "同步时间": datetime.now(timezone.utc),
        }
        ops.append(UpdateOne({"对话ID": 对话ID}, {"$set": doc}, upsert=True))
        count += 1

    conn.close()

    if ops:
        try:
            db["Agent列表"].create_index("对话ID", unique=True)
            db["Agent列表"].bulk_write(ops, ordered=False)
        except BulkWriteError as e:
            print("部分写入失败:", e.details)
        print(f"已同步 {count} 个 Agent 到 MongoDB 集合「Agent列表」")
    else:
        print("无 composerData 可同步")


def restore_from_mongo(db, limit=None, 对话ID列表=None, name_filter=None):
    """从 MongoDB 对话记录+消息内容 写回 state.vscdb，使 Cursor 右侧 Agent 列表恢复"""
    if not os.path.exists(STATE_VSCDB):
        print(f"未找到: {STATE_VSCDB}")
        return

    if 对话ID列表 is not None:
        # 调用方已指定要恢复的对话 ID
        pass
    elif name_filter:
        # 按名称模糊匹配，只恢复这些对话为 Agent
        convs = list(
            db["对话记录"]
            .find({"名称": {"$regex": name_filter.strip(), "$options": "i"}})
            .sort("更新时间", -1)
        )
        对话ID列表 = [c["对话ID"] for c in convs]
        if not 对话ID列表:
            print(f'未找到名称包含 "{name_filter}" 的对话。')
            return
        print(f"按名称匹配到 {len(对话ID列表)} 条对话，将恢复为右侧 Agent。")
    else:
        # 默认：Agent列表 或 对话记录 最近 N 条
        agent_cursor = db["Agent列表"].find({}).sort("更新时间", -1)
        if limit:
            agent_cursor = agent_cursor.limit(limit)
        对话ID列表 = [a["对话ID"] for a in agent_cursor]

        if not 对话ID列表:
            # 若 Agent列表 为空，则从 对话记录 取最近 N 条
            对话ID列表 = [
                d["对话ID"]
                for d in db["对话记录"].find({}, {"对话ID": 1}).sort("更新时间", -1).limit(limit or 200)
            ]

    if not 对话ID列表:
        print("MongoDB 中无对话可恢复")
        return

    conn = sqlite3.connect(STATE_VSCDB)
    cur = conn.cursor()

    # 准备写入 cursorDiskKV
    insert_count = 0

    for 对话ID in 对话ID列表:
        conv = db["对话记录"].find_one({"对话ID": 对话ID})
        if not conv:
            continue

        名称 = conv.get("名称", "") or f"Agent_{对话ID[:8]}"
        创建时间 = conv.get("创建时间")
        更新时间 = conv.get("更新时间") or 创建时间
        if 创建时间 and hasattr(创建时间, "timestamp"):
            created_ts = int(创建时间.timestamp() * 1000)
        else:
            created_ts = int(datetime.now(timezone.utc).timestamp() * 1000)
        if 更新时间 and hasattr(更新时间, "timestamp"):
            updated_ts = int(更新时间.timestamp() * 1000)
        else:
            updated_ts = created_ts

        msgs = list(db["消息内容"].find({"对话ID": 对话ID}).sort("_id", 1))
        headers = [{"bubbleId": m["消息ID"]} for m in msgs]

        # 最小化 composerData，保证 Cursor 能识别并显示在列表
        composer_data = {
            "_v": 14,
            "composerId": 对话ID,
            "name": 名称,
            "subtitle": "",
            "createdAt": created_ts,
            "lastUpdatedAt": updated_ts,
            "fullConversationHeadersOnly": headers,
            "hasLoaded": True,
            "status": "none",
            "text": "",
            "richText": "",
            "context": {"notepads": [], "composers": [], "quotes": [], "fileSelections": [], "folderSelections": [], "selections": [], "cursorRules": [], "mentions": {"notepads": {}, "composers": {}}},
            "conversationMap": {},
            "isAgentic": conv.get("是否Agent", False),
            "modelConfig": conv.get("模型配置", {}),
        }

        key = f"composerData:{对话ID}"
        value = json.dumps(composer_data, ensure_ascii=False)
        cur.execute("INSERT OR REPLACE INTO cursorDiskKV (key, value) VALUES (?, ?)", (key, value))
        insert_count += 1

        # 写回每条消息到 bubbleId
        for m in msgs:
            mid = m["消息ID"]
            msg_type = m.get("类型", 2)
            content = m.get("内容", "")
            created_at = m.get("创建时间")
            if created_at and hasattr(created_at, "timestamp"):
                rpc_ts = int(created_at.timestamp() * 1000)
            else:
                rpc_ts = created_ts

            bubble = {
                "_v": 3,
                "type": msg_type,
                "bubbleId": mid,
                "text": content,
                "isAgentic": m.get("是否Agent", False),
                "tokenCount": m.get("Token用量", {}),
                "timingInfo": {"clientRpcSendTime": rpc_ts} if rpc_ts else {},
            }
            bkey = f"bubbleId:{对话ID}:{mid}"
            bval = json.dumps(bubble, ensure_ascii=False)
            cur.execute("INSERT OR REPLACE INTO cursorDiskKV (key, value) VALUES (?, ?)", (bkey, bval))
            insert_count += 1

    conn.commit()
    conn.close()
    print(f"已恢复 {len(对话ID列表)} 个 Agent 到 state.vscdb（共写入 {insert_count} 条记录）")
    print("请重启 Cursor 后查看右侧 Agent 列表。")


def list_agents(db, limit=50):
    """列出 MongoDB 中 Agent 列表"""
    agents = list(db["Agent列表"].find({}).sort("更新时间", -1).limit(limit))
    if not agents:
        print("「Agent列表」为空，请先执行: python3 agent_sync_restore.py export")
        return
    print(f"\n共 {len(agents)} 条（最近 {limit} 条）\n")
    for i, a in enumerate(agents, 1):
        name = a.get("名称", "")
        cid = a.get("对话ID", "")
        n = a.get("消息数量", 0)
        t = a.get("更新时间")
        ts = t.strftime("%Y-%m-%d %H:%M") if t else ""
        print(f"  {i}. {name}")
        print(f"      ID: {cid} | 消息: {n} | 更新: {ts}")
    print()


def main():
    parser = argparse.ArgumentParser(description="Agent 列表同步与恢复")
    parser.add_argument("action", choices=["export", "restore", "list"], help="export=同步到MongoDB restore=从MongoDB恢复 list=查看列表")
    parser.add_argument("--limit", type=int, default=None, help="restore 时最多恢复 N 个 Agent")
    parser.add_argument("--name", type=str, default=None, help="restore 时只恢复名称包含此关键词的对话（会出现在右侧 Agent 列表）")
    args = parser.parse_args()

    client, db = get_db()

    if args.action == "export":
        export_to_mongo(db)
    elif args.action == "restore":
        print("即将从 MongoDB 写回 state.vscdb，建议先关闭 Cursor。")
        restore_from_mongo(db, limit=args.limit, name_filter=args.name)
    elif args.action == "list":
        list_agents(db)

    client.close()


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
state.vscdb 安全清理（中文字段版）

用法:
  python3 cleanup_statedb.py --days 30                    # dry-run
  python3 cleanup_statedb.py --days 30 --execute          # 执行
  python3 cleanup_statedb.py --days 30 --execute --backup # 备份后执行
  python3 cleanup_statedb.py --orphans                    # 清理孤立数据
"""

import argparse
import os
import shutil
import sqlite3
import sys
import json
from datetime import datetime, timezone

try:
    from pymongo import MongoClient
except ImportError:
    print("需要 pymongo: pip install pymongo")
    sys.exit(1)

MONGO_URI = "mongodb://admin:admin123@localhost:27017/?authSource=admin"
DB_NAME = "karuo_site"
STATE_VSCDB = os.path.expanduser("~/Library/Application Support/Cursor/User/globalStorage/state.vscdb")


def get_db():
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    try:
        client.admin.command("ping")
    except Exception as e:
        print(f"连接失败: {e}")
        sys.exit(1)
    return client, client[DB_NAME]


def 备份():
    if not os.path.exists(STATE_VSCDB):
        return False
    备份目录 = os.path.expanduser("~/Documents/个人/卡若AI/01_卡资（金）/金仓_存储备份/聊天记录管理/备份")
    os.makedirs(备份目录, exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    目标 = os.path.join(备份目录, f"state.vscdb.backup_{ts}")
    gb = os.path.getsize(STATE_VSCDB) / 1024**3
    print(f"备份 state.vscdb ({gb:.1f} GB) → {目标}")
    shutil.copy2(STATE_VSCDB, 目标)
    print("备份完成")
    return True


def 分析(conn, mongo_db):
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM cursorDiskKV WHERE key LIKE 'bubbleId:%'")
    总数 = cur.fetchone()[0]

    cur.execute("SELECT DISTINCT substr(key, 10, 36) FROM cursorDiskKV WHERE key LIKE 'bubbleId:%'")
    sqlite对话ID = set(row[0] for row in cur.fetchall())

    已迁移 = set(doc["对话ID"] for doc in mongo_db["对话记录"].find({}, {"对话ID": 1}))
    含消息 = set()
    for cid in 已迁移:
        if mongo_db["消息内容"].count_documents({"对话ID": cid}) > 0:
            含消息.add(cid)

    可清理 = sqlite对话ID & 含消息
    可清理数 = 0
    for cid in 可清理:
        cur.execute("SELECT COUNT(*) FROM cursorDiskKV WHERE key LIKE ?", (f"bubbleId:{cid}:%",))
        可清理数 += cur.fetchone()[0]

    composer_ids = set(
        row[0].replace("composerData:", "")
        for row in conn.execute("SELECT key FROM cursorDiskKV WHERE key LIKE 'composerData:%'").fetchall()
    )
    孤立ID = sqlite对话ID - composer_ids
    孤立数 = 0
    for cid in 孤立ID:
        cur.execute("SELECT COUNT(*) FROM cursorDiskKV WHERE key LIKE ?", (f"bubbleId:{cid}:%",))
        孤立数 += cur.fetchone()[0]

    return {
        "总数": 总数, "sqlite对话数": len(sqlite对话ID),
        "已迁移": len(已迁移), "含消息": len(含消息),
        "可清理对话": len(可清理), "可清理消息": 可清理数,
        "孤立对话": len(孤立ID), "孤立消息": 孤立数,
        "可清理ID": 可清理, "孤立ID": 孤立ID,
    }


def 执行清理(conn, ids, 标签=""):
    cur = conn.cursor()
    总删 = 0
    for cid in ids:
        cur.execute("DELETE FROM cursorDiskKV WHERE key LIKE ?", (f"bubbleId:{cid}:%",))
        总删 += cur.rowcount
    conn.commit()
    print(f"  {标签}: 删除 {总删} 条")
    return 总删


def main():
    parser = argparse.ArgumentParser(description="state.vscdb 安全清理")
    parser.add_argument("--days", type=int, default=30)
    parser.add_argument("--execute", action="store_true")
    parser.add_argument("--backup", action="store_true")
    parser.add_argument("--orphans", action="store_true")
    parser.add_argument("--vacuum", action="store_true")
    args = parser.parse_args()

    if not os.path.exists(STATE_VSCDB):
        print(f"不存在: {STATE_VSCDB}")
        sys.exit(1)

    client, mongo_db = get_db()
    gb = os.path.getsize(STATE_VSCDB) / 1024**3
    print(f"state.vscdb: {gb:.1f} GB")

    conn = sqlite3.connect(STATE_VSCDB)
    r = 分析(conn, mongo_db)

    print(f"\n{'=' * 55}")
    print(f"  清理分析")
    print(f"{'=' * 55}")
    print(f"  SQLite bubbleId 总数:  {r['总数']:,}")
    print(f"  SQLite 对话数:         {r['sqlite对话数']:,}")
    print(f"  MongoDB 已迁移:        {r['已迁移']:,}")
    print(f"  MongoDB 含消息:        {r['含消息']:,}")
    print(f"  可安全清理对话:         {r['可清理对话']:,}")
    print(f"  可安全清理 bubbleId:    {r['可清理消息']:,}")
    print(f"  孤立对话:              {r['孤立对话']:,}")
    print(f"  孤立 bubbleId:         {r['孤立消息']:,}")
    print(f"{'=' * 55}")

    if not args.execute:
        print("\n⚠️  dry-run，未删除。加 --execute 执行。")
        conn.close()
        client.close()
        return

    if args.backup and not 备份():
        print("备份失败")
        conn.close()
        client.close()
        return

    总删 = 0
    if r["可清理消息"] > 0:
        总删 += 执行清理(conn, r["可清理ID"], "已迁移数据")
    if args.orphans and r["孤立消息"] > 0:
        总删 += 执行清理(conn, r["孤立ID"], "孤立数据")
    print(f"\n总删除: {总删:,}")

    if args.vacuum and 总删 > 0:
        print("\nVACUUM 压缩中...")
        pre = os.path.getsize(STATE_VSCDB)
        conn.execute("VACUUM")
        post = os.path.getsize(STATE_VSCDB)
        print(f"  {pre/1024**3:.1f} GB → {post/1024**3:.1f} GB (释放 {(pre-post)/1024**3:.1f} GB)")

    conn.close()
    client.close()


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
聊天记录导入导出（中文字段版）

用法:
  python3 export_import_chats.py export -o /path/to/backup.json
  python3 export_import_chats.py export --project "Soul创业" -o /path/to/backup.json
  python3 export_import_chats.py import -i /path/to/backup.json
  python3 export_import_chats.py import -i /path/to/backup.json --merge
"""

import argparse
import json
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


def get_db():
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    try:
        client.admin.command("ping")
    except Exception as e:
        print(f"连接失败: {e}")
        sys.exit(1)
    return client, client[DB_NAME]


class 时间编码器(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, datetime):
            return {"$date": obj.isoformat()}
        return super().default(obj)


def 解析时间(doc):
    for k, v in doc.items():
        if isinstance(v, dict) and "$date" in v:
            doc[k] = datetime.fromisoformat(v["$date"])
    return doc


def 导出(db, output_path, project=None, since=None):
    query = {}
    if project:
        query["项目"] = {"$regex": project, "$options": "i"}
    if since:
        try:
            dt = datetime.strptime(since, "%Y-%m-%d").replace(tzinfo=timezone.utc)
            query["创建时间"] = {"$gte": dt}
        except ValueError:
            print(f"日期格式错误: {since}")
            return

    convs = list(db["对话记录"].find(query))
    if not convs:
        print("未找到对话")
        return

    print(f"导出 {len(convs)} 个对话...")
    数据 = {"版本": "2.0", "导出时间": datetime.now(timezone.utc).isoformat(), "对话列表": []}

    总消息 = 0
    for conv in convs:
        conv.pop("_id", None)
        对话ID = conv["对话ID"]
        msgs = list(db["消息内容"].find({"对话ID": 对话ID}).sort("_id", 1))
        for m in msgs:
            m.pop("_id", None)
        总消息 += len(msgs)
        数据["对话列表"].append({"元数据": conv, "消息": msgs, "消息数": len(msgs)})

    数据["总对话"] = len(convs)
    数据["总消息"] = 总消息

    output = Path(output_path)
    output.parent.mkdir(parents=True, exist_ok=True)
    with open(output, "w", encoding="utf-8") as f:
        json.dump(数据, f, ensure_ascii=False, indent=2, cls=时间编码器)

    mb = output.stat().st_size / 1024 / 1024
    print(f"完成: {output} ({mb:.1f} MB, {len(convs)} 对话, {总消息} 消息)")


def 导入(db, input_path, merge=False):
    f = Path(input_path)
    if not f.exists():
        print(f"文件不存在: {input_path}")
        return

    with open(f, "r", encoding="utf-8") as fp:
        data = json.load(fp)

    convs = data.get("对话列表", [])
    print(f"导入 {len(convs)} 个对话...")
    导入对话 = 0
    导入消息 = 0

    for item in convs:
        meta = 解析时间(item.get("元数据", {}))
        msgs = item.get("消息", [])
        对话ID = meta.get("对话ID")
        if not 对话ID:
            continue

        if not merge and db["对话记录"].find_one({"对话ID": 对话ID}):
            continue

        db["对话记录"].update_one({"对话ID": 对话ID}, {"$set": meta}, upsert=True)
        导入对话 += 1

        if msgs:
            ops = [UpdateOne({"对话ID": m["对话ID"], "消息ID": m["消息ID"]}, {"$set": 解析时间(m)}, upsert=True) for m in msgs]
            try:
                r = db["消息内容"].bulk_write(ops, ordered=False)
                导入消息 += r.upserted_count + r.modified_count
            except BulkWriteError:
                pass

    print(f"完成: {导入对话} 对话, {导入消息} 消息")


def main():
    parser = argparse.ArgumentParser(description="聊天记录导入导出")
    sub = parser.add_subparsers(dest="action")
    ep = sub.add_parser("export")
    ep.add_argument("-o", "--output", required=True)
    ep.add_argument("--project", type=str)
    ep.add_argument("--since", type=str)
    ip = sub.add_parser("import")
    ip.add_argument("-i", "--input", required=True)
    ip.add_argument("--merge", action="store_true")
    args = parser.parse_args()

    if not args.action:
        parser.print_help()
        return
    client, db = get_db()
    if args.action == "export":
        导出(db, args.output, getattr(args, "project", None), getattr(args, "since", None))
    elif args.action == "import":
        导入(db, args.input, args.merge)
    client.close()


if __name__ == "__main__":
    main()

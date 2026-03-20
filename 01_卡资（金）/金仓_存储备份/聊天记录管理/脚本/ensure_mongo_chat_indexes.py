#!/usr/bin/env python3
"""
为 karuo_site.对话记录 / 消息内容 创建唯一索引，从数据库层防止重复文档。
若已存在重复键，可先自动去重（同 对话ID / 同 对话ID+消息ID 保留一条）。

用法:
  python3 ensure_mongo_chat_indexes.py
  python3 ensure_mongo_chat_indexes.py --dry-run   # 只打印将删除/将创建的统计，不写库
"""
import argparse
import os
import sys

try:
    from pymongo import MongoClient
    from pymongo.errors import OperationFailure
except ImportError:
    print("需要 pymongo: pip install pymongo")
    sys.exit(1)

MONGO_URI = os.environ.get("MONGO_URI", "mongodb://admin:admin123@localhost:27017/?authSource=admin")
DB_NAME = os.environ.get("MONGO_DB", "karuo_site")

COL_CONV = "对话记录"
COL_MSG = "消息内容"


def dedupe_by_fields(db, coll_name: str, group_keys: list, dry_run: bool) -> int:
    """同一分组保留 _id 最小的一条，删除其余。返回删除条数。"""
    col = db[coll_name]
    id_expr = {k: f"${k}" for k in group_keys}
    pipeline = [
        {"$group": {"_id": id_expr, "ids": {"$push": "$_id"}, "n": {"$sum": 1}}},
        {"$match": {"n": {"$gt": 1}}},
    ]
    removed = 0
    for doc in col.aggregate(pipeline, allowDiskUse=True):
        ids = sorted(doc["ids"], key=lambda x: str(x))
        to_del = ids[1:]
        if not to_del:
            continue
        removed += len(to_del)
        if dry_run:
            continue
        col.delete_many({"_id": {"$in": to_del}})
    return removed


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", help="不执行删除与建索引")
    args = ap.parse_args()

    # 大集合建唯一索引可能较久，放宽 socket 超时避免中途断连
    client = MongoClient(
        MONGO_URI,
        serverSelectionTimeoutMS=8000,
        socketTimeoutMS=600_000,
        connectTimeoutMS=20_000,
    )
    try:
        client.admin.command("ping")
    except Exception as e:
        print(f"❌ MongoDB 连接失败: {e}")
        sys.exit(1)
    db = client[DB_NAME]

    print("🔍 检查并去重…")
    r1 = dedupe_by_fields(db, COL_CONV, ["对话ID"], args.dry_run)
    r2 = dedupe_by_fields(db, COL_MSG, ["对话ID", "消息ID"], args.dry_run)
    print(f"  {COL_CONV} 重复组清理: 将删/已删 {r1} 条" + ("（dry-run）" if args.dry_run else ""))
    print(f"  {COL_MSG} 重复组清理: 将删/已删 {r2} 条" + ("（dry-run）" if args.dry_run else ""))

    if args.dry_run:
        print("（dry-run）跳过创建索引")
        client.close()
        return

    def ensure_unique_index(coll, keys: list, index_name: str, legacy_names: list) -> None:
        """若已有同名唯一索引则跳过；否则删除同键旧索引名后创建唯一索引。"""
        idx_map = {i["name"]: i for i in coll.list_indexes()}
        if index_name in idx_map and idx_map[index_name].get("unique"):
            print(f"  ✅ {coll.name}: {index_name}（已存在且 unique）")
            return
        if index_name in idx_map:
            try:
                coll.drop_index(index_name)
                print(f"  已删除同名非唯一索引: {index_name}")
            except Exception as ex:
                print(f"  ⚠️ 删除 {index_name}: {ex}")
        for leg in legacy_names:
            if leg in idx_map:
                try:
                    coll.drop_index(leg)
                    print(f"  已删除旧索引 {leg} → 将创建 {index_name}")
                except Exception as ex:
                    print(f"  ⚠️ 删除 {leg}: {ex}")
        try:
            coll.create_index(keys, unique=True, name=index_name)
            print(f"  ✅ {coll.name}: {index_name}")
        except OperationFailure as e:
            print(f"  ⚠️ {coll.name} 创建失败: {e.details or e}")
        except Exception as e:
            print(f"  ⚠️ {coll.name} 创建异常（可稍后重跑本脚本）: {e}")

    print("📌 创建唯一索引…")
    ensure_unique_index(
        db[COL_CONV],
        [("对话ID", 1)],
        "uniq_对话ID",
        ["对话ID_1"],
    )
    ensure_unique_index(
        db[COL_MSG],
        [("对话ID", 1), ("消息ID", 1)],
        "uniq_对话ID_消息ID",
        ["对话ID_1_消息ID_1"],
    )

    client.close()
    print("完成。")


if __name__ == "__main__":
    main()

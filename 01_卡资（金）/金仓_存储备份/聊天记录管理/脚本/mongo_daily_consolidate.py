#!/usr/bin/env python3
"""
karuo_site 每日一次全库整理（去重键 + 空白/空行规范化 + 记忆同质化合并 + 记忆.md 回灌）

默认同一天仅执行一次（与 collect_chat_daily 相同 structured 目录下的日期戳）。
环境变量：MONGO_URI、MONGO_DB（同 ensure_mongo_chat_indexes.py）。

步骤概览：
1. 调用 ensure_mongo_chat_indexes：按 对话ID / 对话ID+消息ID 删重复文档并保唯一索引
2. 消息内容、对话记录：字符串字段去行尾空格、统一换行、压缩连续空行
3. 删除规范化后为空的 消息内容 文档
4. 记忆条目：按「规范化后全文」分组合并，保留创建时间最新的一条，删其余
5. 记忆条目：刷新 内容/摘要/内容哈希（与 memory_mongo 规则一致）
6. 子进程：sync_memory_to_mongo.py（记忆.md → Mongo）
7. 刷新 项目分类 汇总（与 realtime_chat_sync 一致）

用法：
  python3 mongo_daily_consolidate.py              # 今日未跑则执行
  python3 mongo_daily_consolidate.py --force      # 忽略日期戳
  python3 mongo_daily_consolidate.py --dry-run    # 只打印统计，不写库、不写戳
  python3 mongo_daily_consolidate.py --skip-memory-sync  # 不跑记忆.md 同步
"""

from __future__ import annotations

import argparse
import hashlib
import importlib.util
import os
import subprocess
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Tuple

try:
    from pymongo import MongoClient, UpdateOne
    from pymongo.errors import ServerSelectionTimeoutError
except ImportError:
    print("需要 pymongo: pip install pymongo")
    sys.exit(1)

_script_dir = Path(__file__).resolve().parent
KARUO_AI_ROOT = Path("/Users/karuo/Documents/个人/卡若AI")
STRUCTURED = (
    KARUO_AI_ROOT
    / "02_卡人（水）"
    / "水溪_整理归档"
    / "记忆系统"
    / "structured"
)
STAMP_FILE = STRUCTURED / "last_mongo_consolidate_date.txt"

MONGO_URI = os.environ.get("MONGO_URI", "mongodb://admin:admin123@localhost:27017/?authSource=admin")
MONGO_DB = os.environ.get("MONGO_DB", "karuo_site")

COL_CONV = "对话记录"
COL_MSG = "消息内容"
COL_MEM = "记忆条目"

BATCH = 800


def today_str() -> str:
    return datetime.now().strftime("%Y-%m-%d")


def already_done_today() -> bool:
    if not STAMP_FILE.exists():
        return False
    try:
        return STAMP_FILE.read_text(encoding="utf-8").strip() == today_str()
    except OSError:
        return False


def normalize_text(s: Any) -> str:
    """统一换行、去行尾空格、连续空行压成单行空段、整体 trim。"""
    if not isinstance(s, str):
        return ""
    t = s.replace("\r\n", "\n").replace("\r", "\n")
    lines = [ln.rstrip() for ln in t.split("\n")]
    out: List[str] = []
    prev_empty = False
    for ln in lines:
        empty = ln.strip() == ""
        if empty:
            if not prev_empty:
                out.append("")
            prev_empty = True
        else:
            out.append(ln)
            prev_empty = False
    return "\n".join(out).strip()


def load_memory_helpers():
    mem_dir = (
        KARUO_AI_ROOT
        / "02_卡人（水）"
        / "水溪_整理归档"
        / "记忆系统"
    )
    p = str(mem_dir.resolve())
    if p not in sys.path:
        sys.path.insert(0, p)
    import memory_mongo as mm  # type: ignore

    return mm


def run_ensure_indexes(dry_run: bool) -> None:
    script = _script_dir / "ensure_mongo_chat_indexes.py"
    if not script.exists():
        print(f"⚠️ 未找到 {script}，跳过键去重。")
        return
    argv = [sys.executable, str(script)]
    if dry_run:
        argv.append("--dry-run")
    print("▶ ensure_mongo_chat_indexes …")
    subprocess.run(argv, check=False)


def refresh_project_categories(db: Any) -> None:
    spec = importlib.util.spec_from_file_location(
        "realtime_chat_sync",
        _script_dir / "realtime_chat_sync.py",
    )
    if spec is None or spec.loader is None:
        print("⚠️ 无法加载 realtime_chat_sync，跳过项目分类刷新。")
        return
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    fn = getattr(mod, "刷新项目分类汇总", None)
    if callable(fn):
        print("▶ 刷新项目分类汇总 …")
        fn(db)


def normalize_messages(db: Any, dry_run: bool) -> Tuple[int, int, int]:
    """返回 (扫描条数, 更新条数, 删除空内容条数)。"""
    col = db[COL_MSG]
    scanned = updated = deleted = 0
    bulk: List[Any] = []
    to_delete: List[Any] = []

    for doc in col.find({}, {"内容": 1}):
        scanned += 1
        raw = doc.get("内容", "") or ""
        new_c = normalize_text(raw)
        if new_c == "":
            to_delete.append(doc["_id"])
            continue
        if new_c != raw:
            bulk.append(
                UpdateOne(
                    {"_id": doc["_id"]},
                    {"$set": {"内容": new_c}},
                )
            )
        if len(bulk) >= BATCH:
            if not dry_run and bulk:
                col.bulk_write(bulk, ordered=False)
            updated += len(bulk)
            bulk = []

    if bulk:
        if not dry_run:
            col.bulk_write(bulk, ordered=False)
        updated += len(bulk)

    if to_delete:
        deleted = len(to_delete)
        if not dry_run:
            col.delete_many({"_id": {"$in": to_delete}})

    return scanned, updated, deleted


def normalize_conversations(db: Any, dry_run: bool) -> Tuple[int, int]:
    fields = ("名称", "副标题", "首条消息")
    col = db[COL_CONV]
    scanned = updated = 0
    bulk: List[Any] = []

    for doc in col.find({}, {f: 1 for f in fields}):
        scanned += 1
        sets: Dict[str, str] = {}
        for f in fields:
            raw = doc.get(f, "") or ""
            if not isinstance(raw, str):
                continue
            if f == "名称":
                new_v = raw.strip()
            else:
                new_v = normalize_text(raw)
            if new_v != raw:
                sets[f] = new_v
        if sets:
            bulk.append(UpdateOne({"_id": doc["_id"]}, {"$set": sets}))
        if len(bulk) >= BATCH:
            if not dry_run and bulk:
                col.bulk_write(bulk, ordered=False)
            updated += len(bulk)
            bulk = []

    if bulk:
        if not dry_run:
            col.bulk_write(bulk, ordered=False)
        updated += len(bulk)

    return scanned, updated


def dedupe_and_normalize_memory(db: Any, dry_run: bool) -> Tuple[int, int, int]:
    """
    同质化合并 + 规范化。
    返回 (扫描条数, 删除重复条数, 因规范化更新的条数)
    """
    mm = load_memory_helpers()
    col = db[COL_MEM]
    ensure = getattr(mm, "ensure_indexes", None)
    if callable(ensure):
        ensure(db)

    内容哈希 = mm.内容哈希
    groups: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    scanned = 0

    for doc in col.find(
        {},
        {"内容": 1, "创建时间": 1, "日期": 1, "时间": 1, "摘要": 1},
    ):
        scanned += 1
        body = doc.get("内容", "") or ""
        key = hashlib.sha256(normalize_text(body).encode("utf-8")).hexdigest()
        groups[key].append(doc)

    removed = 0
    for _key, lst in groups.items():
        if len(lst) <= 1:
            continue
        removed += len(lst) - 1
        if dry_run:
            continue
        lst.sort(
            key=lambda d: d.get("创建时间")
            or datetime.min.replace(tzinfo=timezone.utc),
            reverse=True,
        )
        rest_ids = [x["_id"] for x in lst[1:]]
        if rest_ids:
            col.delete_many({"_id": {"$in": rest_ids}})

    mem_updated = 0
    if dry_run:
        return scanned, removed, 0

    bulk: List[Any] = []
    for doc in col.find({}, {"内容": 1, "日期": 1, "时间": 1, "摘要": 1}):
        raw = doc.get("内容", "") or ""
        日期 = str(doc.get("日期", "") or "")
        时间 = str(doc.get("时间", "") or "")
        new_c = normalize_text(raw)
        if new_c == raw:
            continue
        new_摘要 = new_c[:120] + "…" if len(new_c) > 120 else new_c
        new_hash = 内容哈希(日期, 时间, new_c)
        bulk.append(
            UpdateOne(
                {"_id": doc["_id"]},
                {
                    "$set": {
                        "内容": new_c,
                        "摘要": new_摘要,
                        "内容哈希": new_hash,
                    }
                },
            )
        )
        if len(bulk) >= BATCH:
            if not dry_run and bulk:
                try:
                    col.bulk_write(bulk, ordered=False)
                except Exception as ex:
                    print(f"⚠️ 记忆条目 bulk 更新: {ex}")
            mem_updated += len(bulk)
            bulk = []

    if bulk:
        if not dry_run:
            try:
                col.bulk_write(bulk, ordered=False)
            except Exception as ex:
                print(f"⚠️ 记忆条目 bulk 更新: {ex}")
        mem_updated += len(bulk)

    return scanned, removed, mem_updated


def run_memory_md_sync(dry_run: bool) -> None:
    if dry_run:
        print("（dry-run）跳过 sync_memory_to_mongo.py")
        return
    script = (
        KARUO_AI_ROOT
        / "02_卡人（水）"
        / "水溪_整理归档"
        / "记忆系统"
        / "sync_memory_to_mongo.py"
    )
    if not script.exists():
        print(f"⚠️ 未找到 {script}")
        return
    print("▶ sync_memory_to_mongo.py …")
    subprocess.run([sys.executable, str(script)], check=False)


def main() -> None:
    ap = argparse.ArgumentParser(description="karuo_site 每日 Mongo 整理")
    ap.add_argument("--force", action="store_true", help="忽略日期戳，强制执行")
    ap.add_argument("--dry-run", action="store_true", help="不写库、不写日期戳")
    ap.add_argument(
        "--skip-memory-sync",
        action="store_true",
        help="不执行 记忆.md → Mongo 子进程",
    )
    args = ap.parse_args()

    if not args.force and not args.dry_run and already_done_today():
        print(f"[mongo_daily_consolidate] 今日({today_str()})已整理过，跳过。（--force 可重跑）")
        return

    STRUCTURED.mkdir(parents=True, exist_ok=True)

    try:
        client = MongoClient(
            MONGO_URI,
            serverSelectionTimeoutMS=8000,
            socketTimeoutMS=600_000,
            connectTimeoutMS=20_000,
        )
        client.admin.command("ping")
    except (ServerSelectionTimeoutError, Exception) as e:
        print(f"❌ MongoDB 连接失败: {e}")
        sys.exit(1)

    db = client[MONGO_DB]
    print(f"📦 库: {MONGO_DB}（每日全量整理） dry_run={args.dry_run}")

    run_ensure_indexes(args.dry_run)

    s1, u1, d1 = normalize_messages(db, args.dry_run)
    print(f"  消息内容: 扫描 {s1}, 规范化更新 {u1}, 删空 {d1}")

    s2, u2 = normalize_conversations(db, args.dry_run)
    print(f"  对话记录: 扫描 {s2}, 字段规范化更新 {u2}")

    try:
        sm, rm, mu = dedupe_and_normalize_memory(db, args.dry_run)
        print(f"  记忆条目: 扫描 {sm}, 同质化删除 {rm}, 规范化更新 {mu}")
    except Exception as ex:
        print(f"⚠️ 记忆条目整理失败（已跳过该段）: {ex}")

    client.close()

    if not args.skip_memory_sync:
        run_memory_md_sync(args.dry_run)
    else:
        print("▶ 已跳过 sync_memory_to_mongo.py")

    # 刷新分类需重新连库（上已 close）
    if not args.dry_run:
        try:
            client2 = MongoClient(
                MONGO_URI,
                serverSelectionTimeoutMS=8000,
                socketTimeoutMS=120_000,
            )
            client2.admin.command("ping")
            refresh_project_categories(client2[MONGO_DB])
            client2.close()
        except Exception as ex:
            print(f"⚠️ 项目分类刷新失败: {ex}")

    if not args.dry_run:
        STAMP_FILE.write_text(today_str(), encoding="utf-8")
        print(f"✅ 已写入日期戳: {STAMP_FILE}")
    else:
        print("（dry-run）未写日期戳")

    print("完成。")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
卡若AI 记忆 · 从 记忆.md 同步到 MongoDB

- 读取 1、卡若：本人/记忆.md
- 解析为结构化条目（分类、标签、日期、时间、内容）
- 写入 karuo_site.记忆条目，以 内容哈希 去重（已存在则跳过）

用法：
  python3 sync_memory_to_mongo.py          # 全量同步
  python3 sync_memory_to_mongo.py --dry    # 仅解析并打印，不写入
"""

import argparse
import sys
from pathlib import Path

# 同目录
sys.path.insert(0, str(Path(__file__).resolve().parent))
from memory_mongo import (
    MEMORY_MD,
    get_db,
    ensure_indexes,
    解析记忆md全文,
    内容哈希,
    COLLECTION,
)


def main():
    ap = argparse.ArgumentParser(description="记忆.md → MongoDB 同步")
    ap.add_argument("--dry", action="store_true", help="仅解析不写入")
    args = ap.parse_args()

    if not MEMORY_MD.exists():
        print(f"未找到记忆文件: {MEMORY_MD}")
        sys.exit(1)

    文本 = MEMORY_MD.read_text(encoding="utf-8")
    条目列表 = 解析记忆md全文(文本)
    print(f"解析到 {len(条目列表)} 条记忆条目。")

    if args.dry:
        for i, e in enumerate(条目列表[:15]):
            print(f"  [{i+1}] {e.get('日期')} {e.get('时间')} [{e.get('标签')}] {e.get('内容', '')[:60]}…")
        if len(条目列表) > 15:
            print(f"  ... 共 {len(条目列表)} 条")
        return

    client, db = get_db()
    ensure_indexes(db)
    col = db[COLLECTION]
    新增 = 0
    跳过 = 0
    for e in 条目列表:
        日期 = e.get("日期", "")
        时间 = e.get("时间", "")
        内容 = e.get("内容", "")
        if not 内容:
            continue
        h = 内容哈希(日期, 时间, 内容)
        if col.find_one({"内容哈希": h}):
            跳过 += 1
            continue
        from datetime import datetime, timezone
        doc = {
            "分类": e.get("分类", "每日沉淀"),
            "标签": e.get("标签", "其他"),
            "日期": 日期,
            "时间": 时间,
            "内容": 内容,
            "摘要": 内容[:120] + "…" if len(内容) > 120 else 内容,
            "来源": "记忆.md",
            "创建时间": datetime.now(timezone.utc),
            "内容哈希": h,
        }
        col.insert_one(doc)
        新增 += 1

    client.close()
    print(f"同步完成: 新增 {新增} 条，跳过已存在 {跳过} 条。")


if __name__ == "__main__":
    main()

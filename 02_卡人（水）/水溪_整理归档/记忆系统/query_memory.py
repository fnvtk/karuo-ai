#!/usr/bin/env python3
"""
卡若AI 记忆 · 查询工具（MongoDB）

便于 AI 或人在对话中按分类/标签/关键词/最近 N 条快速调取，输出中文易读。

用法：
  python3 query_memory.py --stats
  python3 query_memory.py --分类 固定偏好
  python3 query_memory.py --标签 规则
  python3 query_memory.py --日期 2026-03-15
  python3 query_memory.py --关键词 飞书
  python3 query_memory.py --最近 20
  python3 query_memory.py --最近 10 --分类 每日沉淀
"""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from memory_mongo import (
    get_db,
    ensure_indexes,
    按分类查,
    按标签查,
    按日期查,
    按关键词查,
    最近N条,
    统计,
)


def _fmt(doc):
    """单条格式化为一行中文，便于 AI 理解。"""
    日期 = doc.get("日期", "")
    时间 = doc.get("时间", "")
    标签 = doc.get("标签", "")
    内容 = (doc.get("内容") or doc.get("摘要", ""))[:200]
    if 标签 and 标签 != "其他":
        return f"- [{日期} {时间}] [{标签}] {内容}"
    return f"- [{日期} {时间}] {内容}"


def _fallback_记忆md(limit_lines=80):
    """MongoDB 不可用时从 记忆.md 读取并输出最近若干行。"""
    from memory_mongo import MEMORY_MD
    print("【MongoDB 不可用，以下来自 记忆.md】\n", file=sys.stderr)
    if not MEMORY_MD.exists():
        print("记忆.md 不存在")
        return
    with open(MEMORY_MD, "r", encoding="utf-8") as f:
        lines = f.readlines()
    tail = lines[-limit_lines:] if len(lines) > limit_lines else lines
    print("".join(tail).rstrip())


def main():
    ap = argparse.ArgumentParser(description="记忆条目查询（MongoDB）")
    ap.add_argument("--stats", action="store_true", help="按分类统计条数")
    ap.add_argument("--分类", type=str, metavar="名称", help="按分类查：固定偏好 / 近期目标 / 每日沉淀")
    ap.add_argument("--标签", type=str, metavar="名称", help="按标签查：规则、原则、项目、技术等")
    ap.add_argument("--日期", type=str, metavar="YYYY-MM-DD", help="按日期查")
    ap.add_argument("--关键词", type=str, metavar="词", help="全文检索内容")
    ap.add_argument("--最近", type=int, metavar="N", help="最近 N 条；可配合 --分类/--标签")
    ap.add_argument("-n", "--limit", type=int, default=50, help="条数上限，默认 50")
    args = ap.parse_args()

    try:
        client, db = get_db()
        ensure_indexes(db)
    except Exception as e:
        print(f"MongoDB 连接失败: {e}，降级为 记忆.md", file=sys.stderr)
        _fallback_记忆md(limit_lines=100)
        return

    if args.stats:
        for k, v in 统计(db).items():
            print(f"  {k}: {v}")
        client.close()
        return

    if args.分类:
        rows = 按分类查(db, args.分类, limit=args.limit)
        print(f"【分类】{args.分类} 共 {len(rows)} 条\n")
        for doc in rows:
            print(_fmt(doc))
    elif args.标签:
        rows = 按标签查(db, args.标签, limit=args.limit)
        print(f"【标签】{args.标签} 共 {len(rows)} 条\n")
        for doc in rows:
            print(_fmt(doc))
    elif args.日期:
        rows = 按日期查(db, args.日期)
        print(f"【日期】{args.日期} 共 {len(rows)} 条\n")
        for doc in rows:
            print(_fmt(doc))
    elif args.关键词:
        rows = 按关键词查(db, args.关键词, limit=args.limit)
        print(f"【关键词】{args.关键词} 共 {len(rows)} 条\n")
        for doc in rows:
            print(_fmt(doc))
    elif args.最近:
        rows = 最近N条(db, n=args.最近, 分类=args.分类 or None, 标签=args.标签 or None)
        print(f"【最近 {args.最近} 条】\n")
        for doc in rows:
            print(_fmt(doc))
    else:
        ap.print_help()
        print("\n示例: python3 query_memory.py --最近 20")
    client.close()


if __name__ == "__main__":
    main()

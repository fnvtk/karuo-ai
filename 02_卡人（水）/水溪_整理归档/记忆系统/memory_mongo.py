#!/usr/bin/env python3
"""
卡若AI 记忆 · MongoDB 读写模块

- 库：karuo_site（唯一 MongoDB 27017）
- 集合：记忆条目（中文字段，便于 AI 理解与调取）
- 支持：按分类、标签、日期、关键词、最近 N 条查询；写入时去重（内容哈希）
"""

import hashlib
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

try:
    from pymongo import MongoClient, ASCENDING, DESCENDING, TEXT
except ImportError:
    MongoClient = None  # type: ignore

# 配置（与聊天记录管理一致，遵守唯一 MongoDB 约定）
MONGO_URI = "mongodb://admin:admin123@localhost:27017/?authSource=admin"
DB_NAME = "karuo_site"
COLLECTION = "记忆条目"

# 记忆.md 路径（与 BOOTSTRAP 一致）
MEMORY_MD = Path("/Users/karuo/Documents/个人/1、卡若：本人/记忆.md")

# 分类枚举（中文）
分类_固定偏好 = "固定偏好"
分类_近期目标 = "近期目标"
分类_每日沉淀 = "每日沉淀"

# 标签从原文 [xxx] 解析，常见值
常见标签 = frozenset({
    "规则", "原则", "项目", "技术", "商业", "学习", "偏好", "人脉", "工具",
    "读书笔记", "经验", "能力沉淀", "人设", "其他"
})


def _get_client():
    if MongoClient is None:
        raise RuntimeError("需要安装 pymongo: pip install pymongo")
    return MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)


def get_db():
    """返回 (client, db)。调用方用完可关闭 client。"""
    client = _get_client()
    client.admin.command("ping")
    return client, client[DB_NAME]


def 内容哈希(日期: str, 时间: str, 内容: str) -> str:
    """生成条目唯一标识，用于去重。"""
    raw = f"{日期}|{时间}|{内容.strip()}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:16]


def ensure_indexes(db):
    """确保 记忆条目 集合索引存在（含中文全文索引）。"""
    col = db[COLLECTION]
    col.create_index([("分类", ASCENDING), ("日期", DESCENDING)])
    col.create_index([("标签", ASCENDING), ("日期", DESCENDING)])
    col.create_index([("日期", DESCENDING)])
    col.create_index([("创建时间", DESCENDING)])
    col.create_index([("内容哈希", ASCENDING)], unique=True)
    try:
        col.create_index([("内容", TEXT)], default_language="none")
    except Exception:
        pass  # 已有或不支持时忽略


def 解析一行(行: str, 当前分类: str, 当前日期: Optional[str]) -> Optional[Dict[str, Any]]:
    """
    解析 记忆.md 中一行条目：
    - [HH:MM] [标签] 内容  或  - [HH:MM] 内容
    返回 None 表示不是条目行；否则返回 分类、标签、日期、时间、内容。
    """
    行 = 行.strip()
    if not 行.startswith("- [") or "]" not in 行:
        return None
    m = re.match(r"^-\s*\[(\d{1,2}:\d{2})\]\s*(?:\[([^\]]+)\]\s*)?(.*)$", 行)
    if not m:
        return None
    时间, 标签, 内容 = m.group(1), m.group(2) or "", m.group(3).strip()
    if not 内容:
        return None
    标签 = (标签.strip() if 标签 else "其他") or "其他"
    if 当前日期 is None and 当前分类 == 分类_每日沉淀:
        日期 = datetime.now().strftime("%Y-%m-%d")
    elif 当前日期 in (None, "") and 当前分类 in (分类_固定偏好, 分类_近期目标):
        日期 = "长期"
    else:
        日期 = 当前日期 or datetime.now().strftime("%Y-%m-%d")
    return {
        "分类": 当前分类,
        "标签": 标签 if 标签 else "其他",
        "日期": 日期,
        "时间": 时间,
        "内容": 内容,
    }


def 解析记忆md全文(文本: str) -> List[Dict[str, Any]]:
    """
    解析 记忆.md 全文，得到结构化条目列表。
    识别：## 固定偏好 / ## 近期目标 / ## 每日沉淀；### YYYY-MM-DD 为日期。
    """
    条目列表 = []
    当前分类 = ""
    当前日期 = None
    for line in 文本.splitlines():
        line = line.strip()
        if line.startswith("## "):
            if "固定偏好" in line:
                当前分类 = 分类_固定偏好
                当前日期 = ""  # 无日期块，解析时用「长期」
            elif "近期目标" in line:
                当前分类 = 分类_近期目标
                当前日期 = ""
            elif "每日沉淀" in line:
                当前分类 = 分类_每日沉淀
                当前日期 = None  # 等待 ### YYYY-MM-DD
            else:
                当前分类 = ""
                当前日期 = None
            continue
        if line.startswith("### ") and re.match(r"### \d{4}-\d{2}-\d{2}", line):
            m = re.match(r"### (\d{4}-\d{2}-\d{2})", line)
            if m and 当前分类 == 分类_每日沉淀:
                当前日期 = m.group(1)
            continue
        if 当前分类:
            one = 解析一行(line, 当前分类, 当前日期)
            if one:
                条目列表.append(one)
    return 条目列表


def 写入一条(
    db,
    分类: str,
    内容: str,
    标签: str = "其他",
    日期: Optional[str] = None,
    时间: Optional[str] = None,
    来源: str = "记忆.md",
) -> bool:
    """
    写入一条记忆到 MongoDB。若 内容哈希 已存在则跳过（去重）。
    """
    now = datetime.now(timezone.utc)
    日期 = 日期 or now.strftime("%Y-%m-%d")
    时间 = 时间 or now.strftime("%H:%M")
    摘要 = 内容[:120] + "…" if len(内容) > 120 else 内容
    内容哈希_val = 内容哈希(日期, 时间, 内容)
    doc = {
        "分类": 分类,
        "标签": 标签,
        "日期": 日期,
        "时间": 时间,
        "内容": 内容,
        "摘要": 摘要,
        "来源": 来源,
        "创建时间": now,
        "内容哈希": 内容哈希_val,
    }
    col = db[COLLECTION]
    try:
        col.insert_one(doc)
        return True
    except Exception as e:
        if "duplicate" in str(e).lower() or "E11000" in str(e):
            return False  # 已存在，算成功
        raise


def 按分类查(db, 分类: str,  limit: int = 50) -> List[Dict]:
    """按分类查询，按日期倒序。"""
    return list(
        db[COLLECTION]
        .find({"分类": 分类})
        .sort("日期", DESCENDING)
        .limit(limit)
    )


def 按标签查(db, 标签: str, limit: int = 50) -> List[Dict]:
    """按标签查询，按日期倒序。"""
    return list(
        db[COLLECTION]
        .find({"标签": 标签})
        .sort("日期", DESCENDING)
        .limit(limit)
    )


def 按日期查(db, 日期: str) -> List[Dict]:
    """按日期查询。"""
    return list(db[COLLECTION].find({"日期": 日期}).sort("时间", ASCENDING))


def 按关键词查(db, 关键词: str, limit: int = 30) -> List[Dict]:
    """全文检索（内容字段）。中文或短词用正则，否则尝试 text 索引。"""
    col = db[COLLECTION]
    # 中文或短关键词用正则，便于「飞书」「规则」等直接命中
    is_cjk = any("\u4e00" <= c <= "\u9fff" for c in 关键词)
    if is_cjk or len(关键词) <= 4:
        return list(
            col.find({"内容": {"$regex": re.escape(关键词), "$options": "i"}})
            .sort("日期", DESCENDING)
            .limit(limit)
        )
    try:
        cursor = col.find(
            {"$text": {"$search": 关键词}},
            {"score": {"$meta": "textScore"}},
        ).sort([("score", {"$meta": "textScore"})]).limit(limit)
        return list(cursor)
    except Exception:
        return list(
            col.find({"内容": {"$regex": re.escape(关键词), "$options": "i"}})
            .sort("日期", DESCENDING)
            .limit(limit)
        )


def 最近N条(db, n: int = 30, 分类: Optional[str] = None, 标签: Optional[str] = None) -> List[Dict]:
    """最近 N 条，可选按分类或标签过滤；按创建时间倒序。"""
    q = {}
    if 分类:
        q["分类"] = 分类
    if 标签:
        q["标签"] = 标签
    return list(db[COLLECTION].find(q).sort("创建时间", DESCENDING).limit(n))


def 统计(db) -> Dict[str, int]:
    """按分类统计条数。"""
    pipeline = [
        {"$group": {"_id": "$分类", "数量": {"$sum": 1}}},
        {"$sort": {"数量": -1}},
    ]
    by_class = {doc["_id"]: doc["数量"] for doc in db[COLLECTION].aggregate(pipeline)}
    by_class["总计"] = sum(by_class.values())
    return by_class


if __name__ == "__main__":
    import sys
    client, db = get_db()
    ensure_indexes(db)
    if len(sys.argv) > 1 and sys.argv[1] == "stats":
        for k, v in 统计(db).items():
            print(f"  {k}: {v}")
    else:
        print("memory_mongo: 记忆条目读写。用法: python memory_mongo.py stats")
    client.close()

#!/usr/bin/env python3
"""
上下文召回：新建对话时从 MongoDB 匹配相关历史对话
根据用户输入的关键词/描述，搜索 MongoDB 中最相关的历史对话，
返回摘要和关键上下文，供新对话使用

用法:
  python3 context_recall.py "用户的问题或关键词"
  python3 context_recall.py "存客宝部署" --limit 5
  python3 context_recall.py "飞书日志" --project "飞书"
  python3 context_recall.py "Soul运营报表" --detail
"""

import argparse
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

# 保证从任意目录运行都能找到 chat_fallback
_script_dir = Path(__file__).resolve().parent
if str(_script_dir) not in sys.path:
    sys.path.insert(0, str(_script_dir))

try:
    from pymongo import MongoClient
except ImportError:
    MongoClient = None

MONGO_URI = "mongodb://admin:admin123@localhost:27017/?authSource=admin"
DB_NAME = "karuo_site"


def get_db():
    """连接 MongoDB；失败时返回 (None, None)，由调用方降级到 fallback。"""
    if MongoClient is None:
        return None, None
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    try:
        client.admin.command("ping")
    except Exception as e:
        print(f"MongoDB 连接失败: {e}，使用本地最近对话 fallback。", file=sys.stderr)
        try:
            client.close()
        except Exception:
            pass
        return None, None
    return client, client[DB_NAME]


def 从_fallback_召回(查询文本, 项目过滤=None, limit=5):
    """MongoDB 不可用时从本地 fallback 文件做关键词匹配，返回与 召回历史对话 相同结构。"""
    try:
        import chat_fallback
        列表 = chat_fallback.读取列表()
    except Exception:
        return None
    关键词 = 提取关键词(查询文本)
    if not 关键词:
        关键词 = 查询文本.split()[:5]
    结果 = []
    for c in 列表:
        名称 = c.get("名称", "") or ""
        项目 = c.get("项目", "") or ""
        首条 = c.get("首条消息", "") or ""
        搜索文本 = f"{名称} {项目} {首条}".lower()
        if 项目过滤 and 项目过滤.lower() not in 项目.lower():
            continue
        score = sum(1 for kw in 关键词 if kw.lower() in 搜索文本)
        if score > 0:
            结果.append({
                "对话ID": c.get("对话ID", ""),
                "名称": 名称,
                "项目": 项目,
                "创建时间": c.get("创建时间"),
                "消息数量": c.get("消息数量", 0),
                "首条消息": 首条[:300],
                "匹配片段": 首条[:300],
            })
    结果.sort(key=lambda x: -len(x.get("匹配片段", "")))
    结果 = 结果[:limit]
    return 结果 if 结果 else None


def 提取关键词(文本):
    """从用户输入提取搜索关键词"""
    cleaned = re.sub(r'[^\w\s\u4e00-\u9fff]', ' ', 文本)
    words = cleaned.split()
    stopwords = {"的", "了", "在", "是", "我", "有", "和", "就", "不", "人", "都", "一", "这", "上", "也", "到", "说",
                 "要", "会", "可以", "你", "对", "出", "能", "他", "时", "过", "把", "很", "那", "什么", "用", "被",
                 "从", "最", "还", "做", "但", "它", "让", "给", "看", "去", "想", "怎么", "帮", "帮我", "请", "一下"}
    keywords = [w for w in words if w not in stopwords and len(w) > 1]
    return keywords


def 召回历史对话(db, 查询文本, 项目过滤=None, limit=5, 详细=False):
    """
    从 MongoDB 召回与查询文本最相关的历史对话
    返回格式化的上下文供新对话使用
    """
    关键词 = 提取关键词(查询文本)
    if not 关键词:
        关键词 = 查询文本.split()[:5]

    搜索词 = " ".join(关键词)
    结果 = []
    对话ID集 = set()

    # 方式1: 全文搜索消息内容
    try:
        消息结果 = db["消息内容"].find(
            {"$text": {"$search": 搜索词}},
            {"score": {"$meta": "textScore"}},
        ).sort([("score", {"$meta": "textScore"})]).limit(limit * 3)

        for msg in 消息结果:
            cid = msg["对话ID"]
            if cid not in 对话ID集:
                对话ID集.add(cid)
                结果.append({
                    "对话ID": cid,
                    "匹配来源": "消息内容",
                    "匹配片段": msg.get("内容", "")[:300],
                    "分数": msg.get("score", 0),
                })
    except Exception:
        pass

    # 方式2: 全文搜索对话名称和首条消息
    try:
        对话结果 = db["对话记录"].find(
            {"$text": {"$search": 搜索词}},
            {"score": {"$meta": "textScore"}},
        ).sort([("score", {"$meta": "textScore"})]).limit(limit * 2)

        for conv in 对话结果:
            cid = conv["对话ID"]
            if cid not in 对话ID集:
                对话ID集.add(cid)
                结果.append({
                    "对话ID": cid,
                    "匹配来源": "对话名称",
                    "匹配片段": conv.get("首条消息", "")[:300],
                    "分数": conv.get("score", 0),
                })
    except Exception:
        pass

    # 方式3: 正则匹配（兜底）
    if len(结果) < limit:
        for kw in 关键词[:3]:
            regex_results = db["对话记录"].find(
                {"$or": [
                    {"名称": {"$regex": kw, "$options": "i"}},
                    {"首条消息": {"$regex": kw, "$options": "i"}},
                ]}
            ).limit(limit)
            for conv in regex_results:
                cid = conv["对话ID"]
                if cid not in 对话ID集:
                    对话ID集.add(cid)
                    结果.append({
                        "对话ID": cid,
                        "匹配来源": "关键词匹配",
                        "匹配片段": conv.get("首条消息", "")[:300],
                        "分数": 0,
                    })

    # 项目过滤
    if 项目过滤:
        filtered_ids = set(
            doc["对话ID"] for doc in db["对话记录"].find(
                {"对话ID": {"$in": list(对话ID集)}, "项目": {"$regex": 项目过滤, "$options": "i"}},
                {"对话ID": 1}
            )
        )
        结果 = [r for r in 结果 if r["对话ID"] in filtered_ids]

    # 按分数排序
    结果.sort(key=lambda x: -x.get("分数", 0))
    结果 = 结果[:limit]

    if not 结果:
        return None

    # 获取对话详情
    对话详情列表 = []
    for r in 结果:
        conv = db["对话记录"].find_one({"对话ID": r["对话ID"]})
        if not conv:
            continue

        详情 = {
            "对话ID": r["对话ID"],
            "名称": conv.get("名称", ""),
            "项目": conv.get("项目", ""),
            "创建时间": conv.get("创建时间"),
            "消息数量": conv.get("消息数量", 0),
            "首条消息": conv.get("首条消息", ""),
            "匹配片段": r["匹配片段"],
        }

        if 详细:
            msgs = db["消息内容"].find(
                {"对话ID": r["对话ID"]}
            ).sort("_id", 1).limit(10)
            详情["关键消息"] = []
            for msg in msgs:
                内容 = msg.get("内容", "")
                if 内容:
                    详情["关键消息"].append({
                        "角色": msg.get("角色", ""),
                        "内容": 内容[:500],
                    })

        对话详情列表.append(详情)

    return 对话详情列表


def _时间格式(创建时间):
    """创建时间可能是 datetime 或 ISO 字符串。"""
    if 创建时间 is None:
        return "未知"
    if hasattr(创建时间, "strftime"):
        return 创建时间.strftime("%Y-%m-%d")
    if isinstance(创建时间, str) and len(创建时间) >= 10:
        return 创建时间[:10]
    return "未知"


def 格式化输出(对话列表, 详细=False, from_fallback=False):
    """格式化召回结果。"""
    if not 对话列表:
        print("未找到相关历史对话")
        return ""

    输出 = []
    标题 = f"## 历史对话召回（{len(对话列表)} 条相关记录）"
    if from_fallback:
        标题 += " 【来自本地 fallback，MongoDB 暂不可用】"
    输出.append(标题 + "\n")

    for i, 对话 in enumerate(对话列表, 1):
        时间str = _时间格式(对话.get("创建时间"))

        输出.append(f"### {i}. [{对话['项目']}] {对话['名称']}")
        输出.append(f"- 时间: {时间str} | 消息数: {对话['消息数量']}")
        输出.append(f"- ID: `{对话['对话ID']}`")

        if 对话.get("首条消息"):
            输出.append(f"- 首条消息: {对话['首条消息'][:200]}")

        if 对话.get("匹配片段") and 对话["匹配片段"] != 对话.get("首条消息", ""):
            输出.append(f"- 匹配内容: {对话['匹配片段'][:200]}")

        if 详细 and 对话.get("关键消息"):
            输出.append("\n  **关键对话片段:**")
            for msg in 对话["关键消息"][:5]:
                角色标 = "👤" if msg["角色"] == "用户" else "🤖"
                输出.append(f"  {角色标} {msg['内容'][:300]}")
        elif from_fallback:
            输出.append("  （fallback 无详细消息，仅摘要）")

        输出.append("")

    text = "\n".join(输出)
    print(text)
    return text


def main():
    parser = argparse.ArgumentParser(description="历史对话上下文召回")
    parser.add_argument("query", type=str, help="搜索关键词或问题描述")
    parser.add_argument("--limit", type=int, default=5, help="返回数量")
    parser.add_argument("--project", type=str, help="限定项目")
    parser.add_argument("--detail", action="store_true", help="显示详细对话内容")
    parser.add_argument("--json", action="store_true", help="JSON格式输出")
    args = parser.parse_args()

    client, db = get_db()
    if db is not None:
        结果 = 召回历史对话(db, args.query, args.project, args.limit, args.detail)
        来自_fallback = False
    else:
        结果 = 从_fallback_召回(args.query, args.project, args.limit)
        来自_fallback = True

    if args.json:
        import json

        class DateEncoder(json.JSONEncoder):
            def default(self, o):
                if isinstance(o, datetime):
                    return o.isoformat()
                return super().default(o)

        if 结果:
            print(json.dumps(结果, ensure_ascii=False, indent=2, cls=DateEncoder))
        else:
            print("[]")
    else:
        格式化输出(结果, args.detail, from_fallback=来自_fallback)

    if client is not None:
        client.close()


if __name__ == "__main__":
    main()

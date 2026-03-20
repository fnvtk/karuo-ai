#!/usr/bin/env python3
"""
Cursor 聊天记录迁移到 MongoDB（中文字段版）
从 state.vscdb (SQLite) + agent-transcripts (JSONL) → MongoDB karuo_site

用法:
  python3 migrate_cursor_to_mongo.py          # 增量同步
  python3 migrate_cursor_to_mongo.py --full   # 全量迁移
  python3 migrate_cursor_to_mongo.py --include-transcripts  # 含 agent-transcripts
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
TRANSCRIPTS_BASE = os.path.expanduser("~/.cursor/projects")

# 精简分类：大类优先，减少碎片（关键词持续优化以降低未分类数量）
项目分类规则 = {
    "卡若AI": ["卡若AI", "karuo_ai", "BOOTSTRAP", "SKILL_REGISTRY", "五行", "卡若ai"],
    "Soul创业": ["soul", "Soul", "soul创业", "卡若创业派对", "soul派对", "soul运营"],
    "存客宝": ["cunkebao", "存客宝", "触客宝", "touchkebao"],
    "玩值电竞": ["玩值", "wanzhi", "wanzhi_esports", "wzdj"],
    "数据处理": ["数据中台", "datacenter", "KR_", "SG_", "导入mongo", "mongo数据库", "数据库集合", "集合导入", "嘟嘟牛", "社工", "MongoDB迁移", "数据库迁移", "数据库恢复", "数据库优化", "/Users/karuo/数据库"],
    "神射手": ["shensheshou", "神射手"],
    "上帝之眼": ["上帝之眼", "god_eye", "量化交易"],
    "服务器": ["服务器", "宝塔", "nginx", "SSL", "502", "腾讯云"],
    "设备管理": ["ADB", "投屏", "scrcpy", "局域网", "远程控制", "192.168"],
    "群晖NAS": ["群晖", "Synology", "NAS", "CKBNAS", "nas_init", "1825", "smb://", "NAS部署", "USB连接"],
    "飞书": ["飞书", "feishu", "lark", "妙记", "飞书妙记", "智能纪要"],
    "微信管理": ["微信", "WeChat", "微信存储", "社群占用"],
    "工具维护": ["cursor", "state.vscdb", "icloud", "iCloud", "docker", "Docker", "硬盘", "磁盘", "空间", "node_modules", ".next", "清理", "输入法", "搜狗", "下载目录", "整理下载", "文件分类", "无法安装", "快捷方式", "进程", "快捷键", "GitHub", "Gitea", "fnvtk", "token"],
    "个人": ["/个人/", "/1、卡若", "日记", "记忆", "iPhone", "相册", "MacBook相册", "Photos"],
    "开发": ["/开发/", "知己", "项目模板", "智能项目生成", "金：项目", "银掌柜", "续茄", "小程序", "腾讯书籍", "分销模块", "前后端整合", "package.json", "开发文档", "开发模板", "MBTI", "route.ts", "page.tsx", "wxml", "wxss"],
}


def 检测项目(文件路径列表: list, 名称: str = "", 内容: str = "") -> str:
    搜索文本 = " ".join(文件路径列表) + " " + 名称 + " " + 内容
    for 项目, 关键词列表 in 项目分类规则.items():
        for 关键词 in 关键词列表:
            if 关键词.lower() in 搜索文本.lower():
                return 项目
    return "未分类"


def 时间戳转时间(ts_ms):
    if not ts_ms or ts_ms == 0:
        return None
    try:
        return datetime.fromtimestamp(ts_ms / 1000, tz=timezone.utc)
    except (ValueError, OSError):
        return None


def 创建索引(db):
    对话集 = db["对话记录"]
    对话集.create_index("对话ID", unique=True)
    对话集.create_index("项目")
    对话集.create_index("创建时间")
    对话集.create_index([("名称", "text"), ("首条消息", "text")])

    消息集 = db["消息内容"]
    消息集.create_index([("对话ID", 1), ("消息ID", 1)], unique=True)
    消息集.create_index("对话ID")
    消息集.create_index("创建时间")
    消息集.create_index([("内容", "text")])

    db["项目分类"].create_index("名称", unique=True)
    print("索引创建完成")


def 迁移对话数据(db, full_mode=False):
    if not os.path.exists(STATE_VSCDB):
        print(f"未找到 state.vscdb: {STATE_VSCDB}")
        return

    print(f"\n{'=' * 50}")
    print(f"迁移 state.vscdb ({'全量' if full_mode else '增量'})")
    大小 = os.path.getsize(STATE_VSCDB) / 1024 / 1024 / 1024
    print(f"文件大小: {大小:.1f} GB")
    print(f"{'=' * 50}")

    conn = sqlite3.connect(STATE_VSCDB)
    cursor = conn.cursor()

    已有ID = set()
    if not full_mode:
        已有ID = set(
            doc["对话ID"] for doc in db["对话记录"].find({}, {"对话ID": 1})
        )
        print(f"MongoDB 已有 {len(已有ID)} 个对话")

    # 阶段1: 对话元数据
    print("\n--- 阶段1: 对话元数据 ---")
    cursor.execute("SELECT key, value FROM cursorDiskKV WHERE key LIKE 'composerData:%'")

    对话操作 = []
    对话消息映射 = {}
    项目计数 = {}
    跳过数 = 0

    for row in cursor.fetchall():
        key, value = row
        对话ID = key.replace("composerData:", "")
        if not full_mode and 对话ID in 已有ID:
            跳过数 += 1
            continue

        try:
            data = json.loads(value)
        except (json.JSONDecodeError, TypeError):
            continue

        headers = data.get("fullConversationHeadersOnly", [])
        if not headers:
            continue

        消息ID列表 = [h.get("bubbleId", "") for h in headers if h.get("bubbleId")]
        对话消息映射[对话ID] = 消息ID列表

        ctx = data.get("context", {})
        文件路径 = []
        for f in ctx.get("fileSelections", []):
            path = f.get("uri", {}).get("fsPath", "")
            if path:
                文件路径.append(path)
        for f in ctx.get("folderSelections", []):
            if isinstance(f, dict):
                path = f.get("uri", {}).get("fsPath", "")
                if path:
                    文件路径.append(path)

        名称 = data.get("name", "") or ""
        副标题 = data.get("subtitle", "") or ""
        项目 = 检测项目(文件路径, 名称, 副标题)
        项目计数[项目] = 项目计数.get(项目, 0) + 1

        创建时间 = 时间戳转时间(data.get("createdAt"))
        更新时间 = 时间戳转时间(data.get("lastUpdatedAt"))

        对话文档 = {
            "对话ID": 对话ID,
            "名称": 名称,
            "副标题": 副标题,
            "项目": 项目,
            "标签": [],
            "创建时间": 创建时间,
            "更新时间": 更新时间,
            "消息数量": len(headers),
            "是否Agent": data.get("isAgentic", False),
            "模型配置": data.get("modelConfig", {}),
            "关联文件": 文件路径[:50],
            "首条消息": "",
            "来源": "state.vscdb",
            "来源工作区": "",
            "迁移时间": datetime.now(timezone.utc),
        }

        对话操作.append(
            UpdateOne({"对话ID": 对话ID}, {"$set": 对话文档}, upsert=True)
        )

    if 对话操作:
        try:
            result = db["对话记录"].bulk_write(对话操作, ordered=False)
            print(f"插入 {result.upserted_count}, 更新 {result.modified_count}, 跳过 {跳过数}")
        except BulkWriteError as e:
            print(f"部分写入: {e.details.get('nInserted', 0)} 成功")
    else:
        print(f"无新对话 (跳过 {跳过数})")

    # 阶段2: 消息内容
    print("\n--- 阶段2: 消息内容 ---")
    已有消息对话 = set()
    if not full_mode:
        pipeline = [{"$group": {"_id": "$对话ID"}}]
        已有消息对话 = set(doc["_id"] for doc in db["消息内容"].aggregate(pipeline))

    总消息 = 0
    批量操作 = []
    批量大小 = 2000

    for 对话ID, 消息ID列表 in 对话消息映射.items():
        if not full_mode and 对话ID in 已有消息对话:
            continue

        首条用户消息 = ""
        for mid in 消息ID列表:
            key = f"bubbleId:{对话ID}:{mid}"
            cursor.execute("SELECT value FROM cursorDiskKV WHERE key = ?", (key,))
            row = cursor.fetchone()
            if not row:
                continue
            try:
                data = json.loads(row[0])
            except (json.JSONDecodeError, TypeError):
                continue

            类型 = data.get("type", 0)
            内容 = data.get("text", "") or ""
            timing = data.get("timingInfo", {})
            rpc_time = timing.get("clientRpcSendTime")
            创建时间 = 时间戳转时间(rpc_time) if rpc_time else None

            if 类型 == 1 and not 首条用户消息 and 内容:
                首条用户消息 = 内容[:500]

            工具调用 = data.get("toolResults", [])
            代码块 = data.get("codeBlocks", [])

            消息文档 = {
                "对话ID": 对话ID,
                "消息ID": mid,
                "类型": 类型,
                "角色": "用户" if 类型 == 1 else "AI",
                "内容": 内容,
                "创建时间": 创建时间,
                "是否Agent": data.get("isAgentic", False),
                "Token用量": data.get("tokenCount", {}),
                "工具调用数": len(工具调用) if 工具调用 else 0,
                "代码块数": len(代码块) if 代码块 else 0,
            }

            批量操作.append(
                UpdateOne(
                    {"对话ID": 对话ID, "消息ID": mid},
                    {"$set": 消息文档},
                    upsert=True,
                )
            )
            总消息 += 1

            if len(批量操作) >= 批量大小:
                try:
                    db["消息内容"].bulk_write(批量操作, ordered=False)
                except BulkWriteError:
                    pass
                批量操作 = []
                print(f"  已处理 {总消息} 条消息...", end="\r")

        if 首条用户消息:
            db["对话记录"].update_one(
                {"对话ID": 对话ID}, {"$set": {"首条消息": 首条用户消息}}
            )

    if 批量操作:
        try:
            db["消息内容"].bulk_write(批量操作, ordered=False)
        except BulkWriteError:
            pass

    print(f"\n消息迁移完成: {总消息} 条")

    # 阶段3: 项目分类
    print("\n--- 阶段3: 项目分类 ---")
    for 项目, 数量 in 项目计数.items():
        db["项目分类"].update_one(
            {"名称": 项目},
            {"$set": {"名称": 项目, "更新时间": datetime.now(timezone.utc)}, "$inc": {"对话数": 数量}},
            upsert=True,
        )
    for p, c in sorted(项目计数.items(), key=lambda x: -x[1]):
        print(f"  {p}: {c}")

    conn.close()


def 迁移Transcripts(db):
    print(f"\n{'=' * 50}")
    print("迁移 agent-transcripts")
    print(f"{'=' * 50}")

    if not os.path.exists(TRANSCRIPTS_BASE):
        print(f"目录不存在: {TRANSCRIPTS_BASE}")
        return

    已有ID = set(
        doc["对话ID"]
        for doc in db["对话记录"].find({"来源": "agent-transcript"}, {"对话ID": 1})
    )

    总文件 = 0
    新增 = 0

    for workspace_dir in Path(TRANSCRIPTS_BASE).iterdir():
        if not workspace_dir.is_dir():
            continue
        transcripts_dir = workspace_dir / "agent-transcripts"
        if not transcripts_dir.exists():
            continue

        工作区 = workspace_dir.name.replace("Users-karuo-Documents-", "")

        for chat_dir in transcripts_dir.iterdir():
            if not chat_dir.is_dir() or chat_dir.name == "subagents":
                continue
            main_jsonl = chat_dir / f"{chat_dir.name}.jsonl"
            if not main_jsonl.exists():
                continue

            tid = chat_dir.name
            if tid in 已有ID:
                continue

            总文件 += 1
            try:
                消息列表 = []
                首条 = ""
                对话名 = ""

                with open(main_jsonl, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if not line:
                            continue
                        try:
                            entry = json.loads(line)
                        except json.JSONDecodeError:
                            continue

                        role = entry.get("role", "")
                        content = entry.get("content", "")
                        if isinstance(content, list):
                            parts = [p.get("text", "") for p in content if isinstance(p, dict) and p.get("type") == "text"]
                            content = "\n".join(parts)
                        if not isinstance(content, str):
                            content = str(content)

                        if role == "user" and not 首条 and content:
                            首条 = content[:500]
                            对话名 = " ".join(content[:100].split()[:8])

                        消息列表.append({
                            "对话ID": tid,
                            "消息ID": f"t-{len(消息列表)}",
                            "类型": 1 if role == "user" else 2,
                            "角色": "用户" if role == "user" else "AI",
                            "内容": content[:50000],
                            "创建时间": datetime.now(timezone.utc),
                            "是否Agent": True,
                            "Token用量": {},
                            "工具调用数": 0,
                            "代码块数": 0,
                        })

                if not 消息列表:
                    continue

                项目 = 检测项目([], 对话名, 首条)

                db["对话记录"].update_one(
                    {"对话ID": tid},
                    {"$set": {
                        "对话ID": tid,
                        "名称": 对话名 or f"Transcript {tid[:8]}",
                        "副标题": "",
                        "项目": 项目,
                        "标签": ["agent-transcript"],
                        "创建时间": datetime.now(timezone.utc),
                        "更新时间": datetime.now(timezone.utc),
                        "消息数量": len(消息列表),
                        "是否Agent": True,
                        "模型配置": {},
                        "关联文件": [],
                        "首条消息": 首条,
                        "来源": "agent-transcript",
                        "来源工作区": 工作区,
                        "迁移时间": datetime.now(timezone.utc),
                    }},
                    upsert=True,
                )

                ops = [
                    UpdateOne({"对话ID": m["对话ID"], "消息ID": m["消息ID"]}, {"$set": m}, upsert=True)
                    for m in 消息列表
                ]
                try:
                    db["消息内容"].bulk_write(ops, ordered=False)
                except BulkWriteError:
                    pass
                新增 += 1

            except Exception as e:
                print(f"  处理 {tid} 失败: {e}")

    print(f"扫描 {总文件} 个, 新增 {新增} 个")


def 打印统计(db):
    print(f"\n{'=' * 50}")
    print("迁移统计")
    print(f"{'=' * 50}")
    对话数 = db["对话记录"].count_documents({})
    消息数 = db["消息内容"].count_documents({})
    print(f"总对话: {对话数}")
    print(f"总消息: {消息数}")

    pipeline = [
        {"$group": {"_id": "$项目", "数量": {"$sum": 1}}},
        {"$sort": {"数量": -1}},
    ]
    print("\n项目分布:")
    for doc in db["对话记录"].aggregate(pipeline):
        print(f"  {doc['_id']}: {doc['数量']}")


def main():
    parser = argparse.ArgumentParser(description="Cursor 聊天记录迁移")
    parser.add_argument("--full", action="store_true", help="全量迁移")
    parser.add_argument("--include-transcripts", action="store_true", help="含 agent-transcripts")
    args = parser.parse_args()

    print("连接 MongoDB...")
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    try:
        client.admin.command("ping")
    except Exception as e:
        print(f"连接失败: {e}")
        sys.exit(1)

    db = client[DB_NAME]
    创建索引(db)
    迁移对话数据(db, full_mode=args.full)
    if args.include_transcripts:
        迁移Transcripts(db)
    打印统计(db)
    client.close()


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
自动归档当前对话到 MongoDB
在每次对话结束时调用，自动将本轮对话存入数据库

用法（由卡若AI自动调用）:
  python3 auto_archive.py --id <对话ID> --name "对话名称" --project "项目名"
  python3 auto_archive.py --id <对话ID> --name "对话名称" --messages '[{"角色":"用户","内容":"xxx"},{"角色":"AI","内容":"yyy"}]'
  python3 auto_archive.py --id <对话ID> --name "对话名称" --summary "本轮对话摘要"
  python3 auto_archive.py --scan-new    # 扫描 state.vscdb 中新增的对话并归档
"""

import argparse
import json
import os
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path

# 保证从任意目录运行都能找到 chat_fallback
_script_dir = Path(__file__).resolve().parent
if str(_script_dir) not in sys.path:
    sys.path.insert(0, str(_script_dir))

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

# 数据库不可用时从本地 fallback 读取最近对话
import chat_fallback as _fallback

项目分类规则 = {
    "卡若AI": ["卡若AI", "karuo_ai", "BOOTSTRAP", "SKILL_REGISTRY", "五行", "卡若ai"],
    "Soul创业": ["soul", "Soul", "soul创业", "卡若创业派对", "soul派对", "soul运营"],
    "存客宝": ["cunkebao", "存客宝", "触客宝", "touchkebao"],
    "玩值电竞": ["玩值", "wanzhi", "wanzhi_esports", "wzdj"],
    "数据处理": ["数据中台", "datacenter", "KR_", "SG_", "导入mongo", "mongo数据库", "集合导入", "嘟嘟牛", "社工", "MongoDB迁移", "数据库迁移", "数据库恢复", "数据库优化", "/Users/karuo/数据库"],
    "神射手": ["shensheshou", "神射手"],
    "上帝之眼": ["上帝之眼", "god_eye", "量化交易"],
    "服务器": ["服务器", "宝塔", "nginx", "SSL", "502", "腾讯云"],
    "设备管理": ["ADB", "投屏", "scrcpy", "局域网", "远程控制", "192.168"],
    "群晖NAS": ["群晖", "Synology", "NAS", "CKBNAS", "nas_init", "1825", "smb://", "NAS部署", "USB连接"],
    "飞书": ["飞书", "feishu", "lark", "妙记", "飞书妙记", "智能纪要"],
    "微信管理": ["微信", "WeChat", "微信存储", "社群占用"],
    "工具维护": ["cursor", "state.vscdb", "icloud", "docker", "Docker", "硬盘", "磁盘", "空间", "node_modules", ".next", "清理", "输入法", "搜狗", "下载目录", "整理下载", "文件分类", "无法安装", "快捷方式", "进程", "快捷键", "GitHub", "Gitea", "fnvtk", "token"],
    "个人": ["/个人/", "/1、卡若", "日记", "记忆", "iPhone", "相册", "MacBook相册", "Photos"],
    "开发": ["/开发/", "知己", "项目模板", "智能项目生成", "金：项目", "银掌柜", "续茄", "小程序", "腾讯书籍", "分销模块", "前后端整合", "package.json", "开发文档", "开发模板", "MBTI", "route.ts", "page.tsx", "wxml", "wxss"],
}


def 检测项目(文件路径, 名称="", 内容=""):
    搜索文本 = " ".join(文件路径) + " " + 名称 + " " + 内容
    for 项目, 关键词 in 项目分类规则.items():
        for kw in 关键词:
            if kw.lower() in 搜索文本.lower():
                return 项目
    return "未分类"


def 时间戳转时间(ts_ms):
    if not ts_ms:
        return None
    try:
        return datetime.fromtimestamp(ts_ms / 1000, tz=timezone.utc)
    except (ValueError, OSError):
        return None


def 归档指定对话(db, 对话ID, 名称="", 项目="", 摘要="", 消息列表=None, 标签列表=None):
    """手动归档一个对话（由AI在对话结束时调用）"""
    now = datetime.now(timezone.utc)

    if not 项目:
        所有内容 = 摘要
        if 消息列表:
            所有内容 += " ".join(m.get("内容", "") for m in 消息列表[:5])
        项目 = 检测项目([], 名称, 所有内容)

    首条 = ""
    if 消息列表:
        for m in 消息列表:
            if m.get("角色") == "用户" and m.get("内容"):
                首条 = m["内容"][:500]
                break

    对话文档 = {
        "对话ID": 对话ID,
        "名称": 名称 or f"对话 {对话ID[:8]}",
        "副标题": 摘要[:200] if 摘要 else "",
        "项目": 项目,
        "标签": 标签列表 or [],
        "创建时间": now,
        "更新时间": now,
        "消息数量": len(消息列表) if 消息列表 else 0,
        "是否Agent": True,
        "模型配置": {},
        "关联文件": [],
        "首条消息": 首条,
        "来源": "手动归档",
        "来源工作区": "",
        "迁移时间": now,
    }

    db["对话记录"].update_one(
        {"对话ID": 对话ID}, {"$set": 对话文档}, upsert=True
    )

    if 消息列表:
        ops = []
        for i, m in enumerate(消息列表):
            ops.append(UpdateOne(
                {"对话ID": 对话ID, "消息ID": f"manual-{i}"},
                {"$set": {
                    "对话ID": 对话ID,
                    "消息ID": f"manual-{i}",
                    "类型": 1 if m.get("角色") == "用户" else 2,
                    "角色": m.get("角色", "未知"),
                    "内容": m.get("内容", ""),
                    "创建时间": now,
                    "是否Agent": True,
                    "Token用量": {},
                    "工具调用数": 0,
                    "代码块数": 0,
                }},
                upsert=True,
            ))
        if ops:
            try:
                db["消息内容"].bulk_write(ops, ordered=False)
            except BulkWriteError:
                pass

    print(f"已归档: [{项目}] {名称 or 对话ID[:8]} ({len(消息列表) if 消息列表 else 0} 条消息)")
    try:
        _fallback.追加一条(对话文档)
    except Exception:
        pass
    return 对话文档


def 扫描新增对话(db):
    """扫描 state.vscdb 中新增的对话（增量归档）"""
    if not os.path.exists(STATE_VSCDB):
        print("state.vscdb 不存在")
        return

    已有ID = set(
        doc["对话ID"] for doc in db["对话记录"].find({}, {"对话ID": 1})
    )

    conn = sqlite3.connect(STATE_VSCDB)
    cursor = conn.cursor()
    cursor.execute("SELECT key, value FROM cursorDiskKV WHERE key LIKE 'composerData:%'")

    新增 = 0
    新增对话列表 = []
    for row in cursor.fetchall():
        key, value = row
        对话ID = key.replace("composerData:", "")
        if 对话ID in 已有ID:
            continue

        try:
            data = json.loads(value)
        except (json.JSONDecodeError, TypeError):
            continue

        headers = data.get("fullConversationHeadersOnly", [])
        if not headers:
            continue

        ctx = data.get("context", {})
        文件路径 = [f.get("uri", {}).get("fsPath", "") for f in ctx.get("fileSelections", []) if f.get("uri", {}).get("fsPath")]
        名称 = data.get("name", "") or ""
        副标题 = data.get("subtitle", "") or ""
        项目 = 检测项目(文件路径, 名称, 副标题)

        消息ID列表 = [h.get("bubbleId", "") for h in headers if h.get("bubbleId")]
        首条 = ""

        # 提取消息
        消息ops = []
        for mid in 消息ID列表:
            cursor.execute("SELECT value FROM cursorDiskKV WHERE key = ?", (f"bubbleId:{对话ID}:{mid}",))
            r = cursor.fetchone()
            if not r:
                continue
            try:
                mdata = json.loads(r[0])
            except:
                continue
            类型 = mdata.get("type", 0)
            内容 = mdata.get("text", "") or ""
            if 类型 == 1 and not 首条 and 内容:
                首条 = 内容[:500]
            timing = mdata.get("timingInfo", {})
            创建时间 = 时间戳转时间(timing.get("clientRpcSendTime")) if timing.get("clientRpcSendTime") else None

            消息ops.append(UpdateOne(
                {"对话ID": 对话ID, "消息ID": mid},
                {"$set": {
                    "对话ID": 对话ID, "消息ID": mid,
                    "类型": 类型, "角色": "用户" if 类型 == 1 else "AI",
                    "内容": 内容, "创建时间": 创建时间,
                    "是否Agent": mdata.get("isAgentic", False),
                    "Token用量": mdata.get("tokenCount", {}),
                    "工具调用数": len(mdata.get("toolResults", []) or []),
                    "代码块数": len(mdata.get("codeBlocks", []) or []),
                }},
                upsert=True,
            ))

        db["对话记录"].update_one(
            {"对话ID": 对话ID},
            {"$set": {
                "对话ID": 对话ID, "名称": 名称, "副标题": 副标题,
                "项目": 项目, "标签": [],
                "创建时间": 时间戳转时间(data.get("createdAt")),
                "更新时间": 时间戳转时间(data.get("lastUpdatedAt")),
                "消息数量": len(headers), "是否Agent": data.get("isAgentic", False),
                "模型配置": data.get("modelConfig", {}), "关联文件": 文件路径[:50],
                "首条消息": 首条, "来源": "state.vscdb", "来源工作区": "",
                "迁移时间": datetime.now(timezone.utc),
            }},
            upsert=True,
        )

        if 消息ops:
            try:
                db["消息内容"].bulk_write(消息ops, ordered=False)
            except BulkWriteError:
                pass

        新增 += 1
        新增对话列表.append({
            "对话ID": 对话ID,
            "名称": 名称,
            "项目": 项目,
            "首条消息": 首条,
            "创建时间": 时间戳转时间(data.get("createdAt")),
            "消息数量": len(headers),
        })

    conn.close()
    if 新增对话列表:
        try:
            _fallback.批量追加(新增对话列表)
        except Exception:
            pass
    print(f"增量归档完成: 新增 {新增} 个对话")


def main():
    parser = argparse.ArgumentParser(description="自动归档对话到 MongoDB")
    parser.add_argument("--id", type=str, help="对话ID")
    parser.add_argument("--name", type=str, default="", help="对话名称")
    parser.add_argument("--project", type=str, default="", help="项目名")
    parser.add_argument("--summary", type=str, default="", help="对话摘要")
    parser.add_argument("--messages", type=str, default="", help="消息列表JSON")
    parser.add_argument("--tags", type=str, default="", help="标签，逗号分隔")
    parser.add_argument("--scan-new", action="store_true", help="扫描新增对话")
    args = parser.parse_args()

    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    try:
        client.admin.command("ping")
    except Exception as e:
        print(f"MongoDB 连接失败: {e}")
        sys.exit(1)

    db = client[DB_NAME]

    if args.scan_new:
        扫描新增对话(db)
    elif args.id:
        消息列表 = None
        if args.messages:
            try:
                消息列表 = json.loads(args.messages)
            except json.JSONDecodeError:
                print("消息列表JSON格式错误")
                sys.exit(1)
        标签 = [t.strip() for t in args.tags.split(",") if t.strip()] if args.tags else []
        归档指定对话(db, args.id, args.name, args.project, args.summary, 消息列表, 标签)
    else:
        parser.print_help()

    client.close()


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
Cursor 聊天记录查询（中文字段版）

用法:
  python3 query_chat_history.py --stats
  python3 query_chat_history.py --search "关键词"
  python3 query_chat_history.py --project "Soul创业"
  python3 query_chat_history.py --since 2026-03-01
  python3 query_chat_history.py --conversation <对话ID>
  python3 query_chat_history.py --list
  python3 query_chat_history.py --reclassify
  python3 query_chat_history.py --tag <对话ID> "标签"
"""

import argparse
import sys
from datetime import datetime, timezone

try:
    from pymongo import MongoClient
except ImportError:
    print("需要 pymongo: pip install pymongo")
    sys.exit(1)

MONGO_URI = "mongodb://admin:admin123@localhost:27017/?authSource=admin"
DB_NAME = "karuo_site"

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


def 检测项目(文件路径, 名称="", 内容=""):
    搜索文本 = " ".join(文件路径) + " " + 名称 + " " + 内容
    for 项目, 关键词 in 项目分类规则.items():
        for kw in 关键词:
            if kw.lower() in 搜索文本.lower():
                return 项目
    return "未分类"


def get_db():
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    try:
        client.admin.command("ping")
    except Exception as e:
        print(f"MongoDB 连接失败: {e}")
        sys.exit(1)
    return client, client[DB_NAME]


def 查看统计(db):
    对话数 = db["对话记录"].count_documents({})
    消息数 = db["消息内容"].count_documents({})

    print(f"{'=' * 55}")
    print(f"  聊天记录统计")
    print(f"{'=' * 55}")
    print(f"  总对话: {对话数}")
    print(f"  总消息: {消息数}")

    pipeline = [
        {"$group": {"_id": "$项目", "数量": {"$sum": 1}, "消息": {"$sum": "$消息数量"}}},
        {"$sort": {"数量": -1}},
    ]
    print(f"\n  {'项目':<15} {'对话':>6} {'消息':>8}")
    print(f"  {'-' * 35}")
    for doc in db["对话记录"].aggregate(pipeline):
        print(f"  {doc['_id']:<15} {doc['数量']:>6} {doc['消息']:>8}")

    p来源 = [{"$group": {"_id": "$来源", "数量": {"$sum": 1}}}]
    print(f"\n  来源:")
    for doc in db["对话记录"].aggregate(p来源):
        print(f"    {doc['_id']}: {doc['数量']}")

    p月份 = [
        {"$group": {"_id": {"$dateToString": {"format": "%Y-%m", "date": "$创建时间"}}, "数量": {"$sum": 1}}},
        {"$sort": {"_id": -1}}, {"$limit": 6},
    ]
    print(f"\n  月份分布:")
    for doc in db["对话记录"].aggregate(p月份):
        if doc["_id"]:
            print(f"    {doc['_id']}: {doc['数量']}")
    print(f"{'=' * 55}")


def 搜索对话(db, 关键词, limit=20):
    print(f"\n搜索: \"{关键词}\"")
    结果 = db["消息内容"].find(
        {"$text": {"$search": 关键词}},
        {"score": {"$meta": "textScore"}},
    ).sort([("score", {"$meta": "textScore"})]).limit(limit * 2)

    对话集 = set()
    摘要 = {}
    for msg in 结果:
        cid = msg["对话ID"]
        对话集.add(cid)
        if cid not in 摘要:
            摘要[cid] = msg.get("内容", "")[:200]

    if not 对话集:
        r2 = db["对话记录"].find(
            {"$text": {"$search": 关键词}},
            {"score": {"$meta": "textScore"}},
        ).sort([("score", {"$meta": "textScore"})]).limit(limit)
        for conv in r2:
            对话集.add(conv["对话ID"])

    if not 对话集:
        print("未找到匹配")
        return

    convs = db["对话记录"].find({"对话ID": {"$in": list(对话集)}}).limit(limit)
    print(f"\n找到 {len(对话集)} 个相关对话:\n")
    for conv in convs:
        cid = conv["对话ID"]
        名称 = conv.get("名称", "无标题")
        项目 = conv.get("项目", "未分类")
        时间 = conv.get("创建时间")
        时间str = 时间.strftime("%Y-%m-%d %H:%M") if 时间 else "未知"
        数量 = conv.get("消息数量", 0)
        s = 摘要.get(cid, conv.get("首条消息", ""))[:150]

        print(f"  [{项目}] {名称}")
        print(f"    ID: {cid}")
        print(f"    时间: {时间str} | 消息: {数量}")
        if s:
            print(f"    摘要: {s}...")
        print()


def 列出对话(db, project=None, since=None, limit=50):
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

    convs = db["对话记录"].find(query).sort("创建时间", -1).limit(limit)
    count = 0
    for conv in convs:
        名称 = conv.get("名称", "无标题")
        项目 = conv.get("项目", "未分类")
        时间 = conv.get("创建时间")
        时间str = 时间.strftime("%Y-%m-%d %H:%M") if 时间 else "未知"
        数量 = conv.get("消息数量", 0)
        ag = "🤖" if conv.get("是否Agent") else "💬"
        标签 = ", ".join(conv.get("标签", []))

        print(f"  {ag} [{项目}] {名称}")
        print(f"    ID: {conv['对话ID']}")
        print(f"    时间: {时间str} | 消息: {数量}{' | 标签: ' + 标签 if 标签 else ''}")
        print()
        count += 1
    print(f"共 {count} 个对话")


def 查看对话(db, 对话ID):
    conv = db["对话记录"].find_one({"对话ID": 对话ID})
    if not conv:
        print(f"未找到: {对话ID}")
        return

    print(f"\n{'=' * 55}")
    print(f"  对话: {conv.get('名称', '无标题')}")
    print(f"  项目: {conv.get('项目', '未分类')}")
    时间 = conv.get("创建时间")
    if 时间:
        print(f"  时间: {时间.strftime('%Y-%m-%d %H:%M')}")
    print(f"  消息: {conv.get('消息数量', 0)}")
    标签 = conv.get("标签", [])
    if 标签:
        print(f"  标签: {', '.join(标签)}")
    print(f"{'=' * 55}\n")

    msgs = db["消息内容"].find({"对话ID": 对话ID}).sort("_id", 1)
    for msg in msgs:
        角色 = "👤 用户" if msg.get("类型") == 1 else "🤖 AI"
        内容 = msg.get("内容", "")
        t = msg.get("创建时间")
        ts = t.strftime("%H:%M:%S") if t else ""
        print(f"--- {角色} {ts} ---")
        if 内容:
            print(内容[:2000] if len(内容) > 2000 else 内容)
        else:
            print("(无内容)")
        print()


def 重新分类(db):
    print("重新分类所有对话...")
    updated = 0
    for conv in db["对话记录"].find({}):
        new_p = 检测项目(
            conv.get("关联文件", []),
            conv.get("名称", ""),
            conv.get("首条消息", "") + " " + conv.get("副标题", ""),
        )
        if new_p != conv.get("项目"):
            db["对话记录"].update_one({"_id": conv["_id"]}, {"$set": {"项目": new_p}})
            updated += 1
    print(f"更新 {updated} 个对话")


def 打标签(db, 对话ID, 标签):
    result = db["对话记录"].update_one({"对话ID": 对话ID}, {"$addToSet": {"标签": 标签}})
    print(f"{'已添加' if result.modified_count else '未变更'}: \"{标签}\" → {对话ID}")


def main():
    parser = argparse.ArgumentParser(description="聊天记录查询")
    parser.add_argument("--stats", action="store_true")
    parser.add_argument("--search", type=str)
    parser.add_argument("--project", type=str)
    parser.add_argument("--since", type=str)
    parser.add_argument("--list", action="store_true")
    parser.add_argument("--conversation", type=str)
    parser.add_argument("--reclassify", action="store_true")
    parser.add_argument("--tag", nargs=2, metavar=("ID", "TAG"))
    parser.add_argument("--limit", type=int, default=50)
    args = parser.parse_args()

    client, db = get_db()
    if args.stats:
        查看统计(db)
    elif args.search:
        搜索对话(db, args.search, args.limit)
    elif args.list:
        列出对话(db, args.project, args.since, args.limit)
    elif args.conversation:
        查看对话(db, args.conversation)
    elif args.reclassify:
        重新分类(db)
    elif args.tag:
        打标签(db, args.tag[0], args.tag[1])
    elif args.project or args.since:
        列出对话(db, args.project, args.since, args.limit)
    else:
        parser.print_help()
    client.close()


if __name__ == "__main__":
    main()

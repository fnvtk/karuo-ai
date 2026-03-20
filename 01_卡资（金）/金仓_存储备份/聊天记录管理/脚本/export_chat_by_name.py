#!/usr/bin/env python3
"""
按对话名称从 MongoDB 导出 Agent 聊天内容为 Markdown
用于把「阿猫的苹果笔记本」等指定名称的对话导出到本地笔记

用法:
  python3 export_chat_by_name.py "阿猫的苹果笔记本"
  python3 export_chat_by_name.py "阿猫" -o ../导出/
  python3 export_chat_by_name.py "苹果笔记本" --all
"""

import argparse
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

try:
    from pymongo import MongoClient
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
        print(f"MongoDB 连接失败: {e}")
        sys.exit(1)
    return client, client[DB_NAME]


def 安全文件名(name):
    """去掉不适合做文件名的字符"""
    s = re.sub(r'[<>:"/\\|?*]', "_", name)
    return s.strip() or "未命名"


def export_conv_to_md(db, 对话ID, 名称, 输出路径):
    """将一条对话的消息内容导出为单个 Markdown 文件"""
    conv = db["对话记录"].find_one({"对话ID": 对话ID})
    if not conv:
        return False
    名称 = conv.get("名称", 名称 or "未命名")
    msgs = list(db["消息内容"].find({"对话ID": 对话ID}).sort("_id", 1))
    if not msgs:
        print(f"  对话 {对话ID} 无消息内容，跳过")
        return False

    lines = [
        f"# {名称}",
        "",
        f"- **对话ID**: `{对话ID}`",
        f"- **项目**: {conv.get('项目', '未分类')}",
        f"- **消息数**: {len(msgs)}",
    ]
    创建 = conv.get("创建时间")
    更新 = conv.get("更新时间")
    if 创建:
        lines.append(f"- **创建**: {创建.strftime('%Y-%m-%d %H:%M')}")
    if 更新:
        lines.append(f"- **更新**: {更新.strftime('%Y-%m-%d %H:%M')}")
    lines.extend(["", "---", ""])

    for m in msgs:
        角色 = "用户" if m.get("类型") == 1 else "AI"
        内容 = m.get("内容", "").strip()
        t = m.get("创建时间")
        ts = t.strftime("%Y-%m-%d %H:%M") if t else ""
        lines.append(f"## [{角色}] {ts}")
        lines.append("")
        if 内容:
            lines.append(内容)
        else:
            lines.append("*(无文本内容)*")
        lines.append("")
        lines.append("---")
        lines.append("")

    out_text = "\n".join(lines).rstrip() + "\n"
    Path(输出路径).parent.mkdir(parents=True, exist_ok=True)
    with open(输出路径, "w", encoding="utf-8") as f:
        f.write(out_text)
    return True


def main():
    parser = argparse.ArgumentParser(description="按名称导出 MongoDB 中的 Agent 聊天为 Markdown")
    parser.add_argument("name", nargs="?", default="阿猫的苹果笔记本", help="对话名称（模糊匹配），默认 阿猫的苹果笔记本")
    parser.add_argument("-o", "--output-dir", default=None, help="输出目录，默认 聊天记录管理/导出/")
    parser.add_argument("--all", action="store_true", help="导出所有名称匹配的对话（否则只导第一条）")
    args = parser.parse_args()

    script_dir = Path(__file__).resolve().parent
    default_out = script_dir.parent / "导出"
    out_dir = Path(args.output_dir).resolve() if args.output_dir else default_out

    client, db = get_db()
    # 名称模糊匹配：包含关键词即可
    keyword = args.name.strip()
    convs = list(
        db["对话记录"]
        .find({"名称": {"$regex": keyword, "$options": "i"}})
        .sort("更新时间", -1)
    )
    if not convs:
        # 尝试「阿猫」或「苹果」单独匹配
        convs = list(
            db["对话记录"]
            .find({"$or": [{"名称": {"$regex": "阿猫", "$options": "i"}}, {"名称": {"$regex": "苹果", "$options": "i"}}]})
            .sort("更新时间", -1)
        )
    if not convs:
        print(f'未在 MongoDB 中找到名称包含 "{keyword}" 的对话。')
        print("可用: python3 query_chat_history.py --list 查看所有对话。")
        client.close()
        sys.exit(1)

    if not args.all:
        convs = convs[:1]
    print(f"找到 {len(convs)} 条匹配对话，导出到: {out_dir}")
    out_dir.mkdir(parents=True, exist_ok=True)
    for conv in convs:
        cid = conv["对话ID"]
        名称 = conv.get("名称", "未命名")
        safe = 安全文件名(名称)
        short_id = cid[:8] if len(cid) >= 8 else cid
        out_path = out_dir / f"{safe}_{short_id}.md"
        if export_conv_to_md(db, cid, 名称, str(out_path)):
            print(f"  已写入: {out_path}")
    client.close()


if __name__ == "__main__":
    main()

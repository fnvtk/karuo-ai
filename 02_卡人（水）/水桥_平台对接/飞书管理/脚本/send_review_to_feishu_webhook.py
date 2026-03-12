#!/usr/bin/env python3
"""
卡若AI 对话复盘总结 → 飞书群 webhook

每次对话完成后，将简洁复盘总结发到指定飞书群。
飞书 bot v2 hook 要求：POST JSON，含 msg_type（如 text）。

用法：
  # 直接传入简洁总结（建议 ≤500 字）
  python3 send_review_to_feishu_webhook.py "【卡若AI复盘】2026-03-12 15:30\n🎯 完成记忆系统使用手册\n📌 已写开发文档/9、手册/卡若AI记忆系统使用手册.md\n▶ 无"

  # 从文件读
  python3 send_review_to_feishu_webhook.py --file /path/to/summary.txt

  # 指定 webhook（否则用默认）
  python3 send_review_to_feishu_webhook.py --webhook "https://open.feishu.cn/..." "总结内容"

环境变量（可选）：
  FEISHU_REVIEW_WEBHOOK  — 默认 webhook URL
"""
import argparse
import json
import os
import sys
from pathlib import Path

import requests

# 默认 webhook（卡若AI 复盘总结群）；可被环境变量或 --webhook 覆盖
DEFAULT_WEBHOOK = os.environ.get(
    "FEISHU_REVIEW_WEBHOOK",
    "https://open.feishu.cn/open-apis/bot/v2/hook/8b7f996e-2892-4075-989f-aa5593ea4fbc",
)


def send_text(webhook_url: str, text: str) -> bool:
    """POST 文本到飞书 bot v2 webhook。"""
    if not text or not webhook_url:
        return False
    payload = {"msg_type": "text", "content": {"text": text[:4000]}}  # 飞书单条文本有长度限制
    try:
        r = requests.post(webhook_url, json=payload, timeout=10)
        body = r.json()
        if body.get("code") != 0:
            print(f"飞书 webhook 返回错误: {body}", file=sys.stderr)
            return False
        return True
    except Exception as e:
        print(f"发送失败: {e}", file=sys.stderr)
        return False


def main():
    ap = argparse.ArgumentParser(description="卡若AI 复盘总结发飞书群")
    ap.add_argument("text", nargs="?", default="", help="简洁复盘总结（建议≤500字）")
    ap.add_argument("--file", "-f", help="从文件读取总结内容")
    ap.add_argument("--webhook", "-w", default=DEFAULT_WEBHOOK, help="飞书群 webhook URL")
    args = ap.parse_args()

    if args.file:
        path = Path(args.file)
        if path.exists():
            text = path.read_text(encoding="utf-8").strip()
        else:
            print(f"文件不存在: {args.file}", file=sys.stderr)
            sys.exit(1)
    else:
        text = (args.text or sys.stdin.read()).strip()

    if not text:
        print("无内容可发送", file=sys.stderr)
        sys.exit(1)

    ok = send_text(args.webhook, text)
    if ok:
        print("已发送到飞书群")
    else:
        sys.exit(1)


if __name__ == "__main__":
    main()

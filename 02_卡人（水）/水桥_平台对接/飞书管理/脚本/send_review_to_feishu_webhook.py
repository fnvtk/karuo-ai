#!/usr/bin/env python3
"""
卡若AI 对话复盘 → 飞书群 webhook（文本 或 单条交互卡片）

**命名约定**：**卡罗拉 = 卡若AI**（同一体系；口语/语音里常说「卡罗拉」，文档与脚本以「卡若AI」为主）。

飞书 bot v2：必须带 msg_type。
- text：兼容旧自动化
- interactive + card（JSON 字符串）：卡若AI 复盘卡片（推荐，群内展示更清晰）

用法：
  # 文本（旧）
  python3 send_review_to_feishu_webhook.py "【卡若AI复盘】..."

  # 卡片：从文件读卡若AI 五块正文（含 **🎯** … **▶** 标题；卡罗拉=卡若AI，格式相同）
  python3 send_review_to_feishu_webhook.py --card -f review.md

  # 卡片 + 指定 webhook
  python3 send_review_to_feishu_webhook.py --card -w "$FEISHU_PARTY_CLOSURE_WEBHOOK" -f review.md

环境变量：
  FEISHU_REVIEW_WEBHOOK — 默认 webhook（可被 --webhook 覆盖）
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path
from typing import Any

import requests

DEFAULT_WEBHOOK = os.environ.get(
    "FEISHU_REVIEW_WEBHOOK",
    "https://open.feishu.cn/open-apis/bot/v2/hook/8b7f996e-2892-4075-989f-aa5593ea4fbc",
)

# lark_md 中单元素不宜过长
_MAX_MD = 2800


def _truncate(s: str, n: int = _MAX_MD) -> str:
    s = (s or "").strip()
    if len(s) <= n:
        return s
    return s[: n - 20] + "\n…（已截断）"


def _escape_lark_md(s: str) -> str:
    """弱化破坏排版的字符（卡片内 markdown）。"""
    return s.replace("`", "'")


def parse_karola_five_blocks(text: str) -> tuple[str, dict[str, str]]:
    """
    从正文中解析卡若AI 五块（卡罗拉=卡若AI，同义）。
    标题行：首行若以 【 开头则作为卡片主标题；否则自动生成。
    块标题支持：**🎯 目标·结果·达成率** 或 🎯 目标（宽松匹配）
    """
    raw = text.strip()
    lines = raw.splitlines()
    title = "【卡若AI复盘】"
    if lines and lines[0].strip().startswith("【") and "】" in lines[0]:
        title = lines[0].strip()[:120]
        raw = "\n".join(lines[1:]).lstrip()

    patterns = {
        "target": r"(?:\*\*)?🎯\s*目标·结果·达成率(?:\*\*)?\s*\n([\s\S]*?)(?=(?:\*\*)?[📌💡📝▶])",
        "process": r"(?:\*\*)?📌\s*过程(?:\*\*)?\s*\n([\s\S]*?)(?=(?:\*\*)?[💡📝▶🎯])",
        "reflect": r"(?:\*\*)?💡\s*反思(?:\*\*)?\s*\n([\s\S]*?)(?=(?:\*\*)?[📝▶🎯📌])",
        "summary": r"(?:\*\*)?📝\s*总结(?:\*\*)?\s*\n([\s\S]*?)(?=(?:\*\*)?[▶🎯📌💡])",
        "next": r"(?:\*\*)?▶\s*下一步执行(?:\*\*)?\s*\n([\s\S]*?)$",
    }
    out: dict[str, str] = {}
    for key, pat in patterns.items():
        m = re.search(pat, raw, re.MULTILINE)
        out[key] = (m.group(1).strip() if m else "") if m else ""

    if not any(out.values()):
        out["process"] = _truncate(raw, 3500)
        out["target"] = "（未识别五块标题，全文见「过程」）"
    return title, out


def build_interactive_card(
    header_title: str,
    subtitle: str,
    target: str,
    process: str,
    reflect: str,
    summary: str,
    next_step: str,
    template: str = "wathet",
) -> dict[str, Any]:
    """飞书自定义机器人 interactive 卡片（card 为 JSON 对象，发送时再 dumps）。"""
    elements: list[dict[str, Any]] = []
    if subtitle:
        elements.append(
            {
                "tag": "div",
                "text": {"tag": "lark_md", "content": _truncate(_escape_lark_md(subtitle), 800)},
            }
        )
        elements.append({"tag": "hr"})

    sections = [
        ("🎯", "目标·结果·达成率", target),
        ("📌", "过程", process),
        ("💡", "反思", reflect),
        ("📝", "总结", summary),
        ("▶", "下一步执行", next_step),
    ]
    for emoji, name, body in sections:
        body = body.strip() or "（无）"
        md = f"**{emoji} {name}**\n{_truncate(_escape_lark_md(body))}"
        elements.append({"tag": "div", "text": {"tag": "lark_md", "content": md}})
        elements.append({"tag": "hr"})
    if elements and elements[-1].get("tag") == "hr":
        elements.pop()

    return {
        "config": {"wide_screen_mode": True},
        "header": {
            "template": template,
            "title": {"tag": "plain_text", "content": header_title[:100]},
        },
        "elements": elements,
    }


def send_text(webhook_url: str, text: str) -> bool:
    if not text or not webhook_url:
        return False
    payload = {"msg_type": "text", "content": {"text": text[:4000]}}
    try:
        r = requests.post(webhook_url, json=payload, timeout=15)
        body = r.json()
        if body.get("code") != 0:
            print(f"飞书 webhook 返回错误: {body}", file=sys.stderr)
            return False
        return True
    except Exception as e:
        print(f"发送失败: {e}", file=sys.stderr)
        return False


def send_interactive_card(webhook_url: str, card: dict[str, Any]) -> bool:
    if not webhook_url:
        return False
    payload = {"msg_type": "interactive", "card": json.dumps(card, ensure_ascii=False)}
    try:
        r = requests.post(webhook_url, json=payload, timeout=15)
        body = r.json()
        if body.get("code") != 0:
            print(f"飞书 webhook 返回错误: {body}", file=sys.stderr)
            return False
        return True
    except Exception as e:
        print(f"发送失败: {e}", file=sys.stderr)
        return False


def main():
    ap = argparse.ArgumentParser(description="卡若AI（卡罗拉）复盘发飞书群")
    ap.add_argument("text", nargs="?", default="", help="简洁复盘（仅非 --card 时使用）")
    ap.add_argument("--file", "-f", help="从文件读取正文")
    ap.add_argument("--webhook", "-w", default=DEFAULT_WEBHOOK, help="飞书群 webhook URL")
    ap.add_argument(
        "--card",
        action="store_true",
        help="以单条 interactive 卡片发送（正文需含卡若AI 五块标题，或退化为单段过程）",
    )
    ap.add_argument(
        "--subtitle",
        default="",
        help="卡片顶部说明（如：数据来源、统计窗口）",
    )
    ap.add_argument(
        "--header-template",
        default="wathet",
        help="卡片 header 颜色模板：blue / wathet / turquoise / ...",
    )
    args = ap.parse_args()

    if args.file:
        path = Path(args.file)
        if not path.exists():
            print(f"文件不存在: {args.file}", file=sys.stderr)
            sys.exit(1)
        body = path.read_text(encoding="utf-8").strip()
    else:
        body = (args.text or sys.stdin.read()).strip()

    if not body:
        print("无内容可发送", file=sys.stderr)
        sys.exit(1)

    if args.card:
        title, sec = parse_karola_five_blocks(body)
        card = build_interactive_card(
            header_title=title,
            subtitle=args.subtitle,
            target=sec.get("target", ""),
            process=sec.get("process", ""),
            reflect=sec.get("reflect", ""),
            summary=sec.get("summary", ""),
            next_step=sec.get("next", ""),
            template=args.header_template,
        )
        ok = send_interactive_card(args.webhook, card)
    else:
        ok = send_text(args.webhook, body)

    if ok:
        print("已发送到飞书群")
    else:
        sys.exit(1)


if __name__ == "__main__":
    main()

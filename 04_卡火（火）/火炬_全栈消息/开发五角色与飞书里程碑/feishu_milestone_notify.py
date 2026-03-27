#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
通用：完整功能里程碑 → 飞书群卡片（interactive / schema 2.0）。
Webhook 从指定环境变量读取，勿写入仓库。
文档：https://open.feishu.cn/document/client-docs/bot-v3/add-custom-bot
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.request


def build_card(
    *,
    product: str,
    keyword_line: str,
    feature: str,
    body_md: str,
    milestone_label: str | None,
    percent: int | None,
    repo_path: str,
) -> dict:
    lines = [
        f"**{keyword_line}**",
        "",
        f"**【项目】** {product}",
        f"**【功能】** {feature}",
    ]
    if milestone_label:
        lines.append(f"**【里程碑】** {milestone_label}")
    if percent is not None:
        lines.append(f"**【进度】** {percent}%")
    lines.extend(
        [
            f"**【仓库】** `{repo_path}`",
            "",
            "**【五角色摘要】**",
            "【产品】验收口径已对齐",
            "【架构】接口/数据与多端一致",
            "【前端】页面与交互/埋点已落地",
            "【后端】API/后台已联调",
            "【质控】本功能可独立验收",
            "",
            "---",
            "",
            body_md.strip(),
        ]
    )
    markdown_content = "\n".join(lines)
    header_title = f"{product} · 功能里程碑"
    return {
        "msg_type": "interactive",
        "card": {
            "schema": "2.0",
            "config": {
                "update_multi": True,
                "style": {
                    "text_size": {
                        "normal_v2": {
                            "default": "normal",
                            "pc": "normal",
                            "mobile": "heading",
                        }
                    }
                },
            },
            "body": {
                "direction": "vertical",
                "padding": "12px 12px 12px 12px",
                "elements": [
                    {
                        "tag": "markdown",
                        "content": markdown_content,
                        "text_align": "left",
                        "text_size": "normal_v2",
                        "margin": "0px 0px 0px 0px",
                    }
                ],
            },
            "header": {
                "title": {"tag": "plain_text", "content": header_title[:50]},
                "subtitle": {"tag": "plain_text", "content": feature[:60]},
                "template": "green",
                "padding": "12px 12px 12px 12px",
            },
        },
    }


def post_webhook(url: str, payload: dict) -> tuple[int, str]:
    data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json; charset=utf-8"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
            return resp.status, raw
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace")
        return e.code, raw
    except urllib.error.URLError as e:
        return -1, str(e.reason)


def main() -> int:
    parser = argparse.ArgumentParser(description="飞书里程碑卡片（五角色 Skill · F01e）")
    parser.add_argument("--feature", required=True, help="完整功能名称（一句话）")
    parser.add_argument(
        "--body",
        default="",
        help="详细说明（Markdown；建议写改动点、涉及端、自测说明）",
    )
    parser.add_argument("--milestone", default="", help="可选：里程碑标签")
    parser.add_argument("--percent", type=int, default=None, help="可选：进度 0-100")
    parser.add_argument(
        "--repo",
        default="",
        help="仓库路径展示用（默认当前目录）",
    )
    parser.add_argument(
        "--product",
        default="项目",
        help="项目名称（卡片标题与【项目】行）",
    )
    parser.add_argument(
        "--keyword-line",
        default="",
        help="嵌入正文首行，用于飞书机器人自定义关键词命中；默认「{product} 项目更新」",
    )
    parser.add_argument(
        "--webhook-env",
        default="FEISHU_WEBHOOK_MILESTONE",
        help="从该环境变量读取 Webhook URL",
    )
    parser.add_argument("--dry-run", action="store_true", help="只打印 JSON，不请求")
    args = parser.parse_args()

    repo = args.repo.strip() or os.getcwd()
    product = args.product.strip() or "项目"
    keyword = (args.keyword_line.strip() or f"{product} 项目更新").strip()

    url = os.environ.get(args.webhook_env.strip(), "").strip()
    payload = build_card(
        product=product,
        keyword_line=keyword,
        feature=args.feature.strip(),
        body_md=args.body or "（无补充说明）",
        milestone_label=args.milestone.strip() or None,
        percent=args.percent,
        repo_path=repo,
    )

    if args.dry_run:
        print(json.dumps(payload, ensure_ascii=False, indent=2))
        return 0

    if not url:
        print(f"缺少环境变量 {args.webhook_env}", file=sys.stderr)
        return 2

    status, text = post_webhook(url, payload)
    print(text)
    if status != 200:
        return 1
    try:
        j = json.loads(text)
        if j.get("code") != 0:
            return 1
    except json.JSONDecodeError:
        return 1 if status != 200 else 0
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

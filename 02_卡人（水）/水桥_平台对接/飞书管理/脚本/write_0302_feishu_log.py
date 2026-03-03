#!/usr/bin/env python3
"""
补全 3月2日 飞书日志到 3 月文档，百分比写清楚。
"""
import os
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))

from auto_log import get_token_silent, write_log, open_result, CONFIG


def _get_march_wiki_token():
    raw = (CONFIG.get("MONTH_WIKI_TOKENS") or {}).get(3) or os.environ.get("FEISHU_MARCH_WIKI_TOKEN") or ""
    return (raw or "").strip() or None


def build_tasks_0302():
    """3月2日：昨日3月1日完成度、本月与最终目标百分比、今日核心；百分比写清楚。"""
    return [
        {
            "person": "卡若",
            "events": ["今日复盘", "本月与最终目标", "今日核心", "一人公司", "玩值电竞"],
            "quadrant": "重要紧急",
            "t_targets": [
                "昨日 3月1日：一人公司 5%、玩值电竞 25%、飞书日志 100%",
                "本月目标约 12%，距最终目标差 88%（相对 2026 年总目标 100%）",
                "一人公司 Agent → 视频切片/文章/直播/小程序/朋友圈/聚合 5%",
                "玩值电竞 → Docker/功能推进 25%",
                "今日核心：每天 20 条 Soul 视频 + 20:00 发 1 条朋友圈",
            ],
            "n_process": [
                "【复盘】从聊天记录与今日文档统一整理；昨日目标与今年总目标一致",
                "【3月突破执行】本月/最终目标百分比已按 2026年整体目标 写入",
                "【今日】20 条视频 + 1 条朋友圈；一人公司第一、玩值电竞第二",
            ],
            "t_thoughts": [
                "今日一条核心：20 条 Soul 视频 + 8 点 1 条朋友圈，持续拉齐与最终目标",
                "百分比均相对总目标：本月 12%、一人公司 5%、玩值电竞 25%",
            ],
            "w_work": [
                "20 条 Soul 视频",
                "20:00 发 1 条朋友圈",
                "一人公司 / 玩值电竞推进",
                "飞书日志",
            ],
            "f_feedback": [
                "本月/最终目标 12% / 100%，差 88%",
                "一人公司 5% 🔄 | 玩值电竞 25% 🔄",
                "今日核心→20 条 Soul + 8 点朋友圈 🔄",
            ],
        }
    ]


def main():
    token = get_token_silent()
    if not token:
        print("❌ 无法获取飞书 Token")
        sys.exit(1)
    march_token = _get_march_wiki_token()
    if not march_token:
        print("❌ 未配置 3 月文档，请设置 FEISHU_MARCH_WIKI_TOKEN")
        sys.exit(1)
    tasks = build_tasks_0302()
    ok = write_log(token, "3月2日", tasks, march_token, overwrite=True)
    if ok:
        open_result(march_token)
        print("✅ 3月2日 飞书日志已补全（百分比已写清）")
    else:
        print("❌ 写入失败")
        sys.exit(1)


if __name__ == "__main__":
    main()

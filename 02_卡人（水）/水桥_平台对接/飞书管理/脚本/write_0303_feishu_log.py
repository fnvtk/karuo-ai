#!/usr/bin/env python3
"""
写入 3月3日 飞书日志到 3 月文档。昨日目标与今年总目标一致，百分比按总目标；今日 20 条视频 + 1 朋友圈，视频 Skill 四屏切片完成 20 个视频。
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


def build_tasks_0303():
    """3月3日：昨日目标一致、总目标一致、百分比按此；今日 20 条视频 + 1 朋友圈；视频 Skill 四屏切片 20 个；百分比。"""
    return [
        {
            "person": "卡若",
            "events": ["今日复盘", "本月与最终目标", "今日核心", "视频Skill四屏切片"],
            "quadrant": "重要紧急",
            "t_targets": [
                "昨日目标与今年总目标一致，百分比按总目标执行",
                "本月目标约 12%，距最终目标差 88%",
                "今日核心：每天 20 条 Soul 视频 + 20:00 发 1 条朋友圈",
                "视频 Skill 四屏切片：完成 20 个视频（当日完成度见反馈）",
            ],
            "n_process": [
                "【复盘】昨日目标一致、今年总目标一致，百分比按 2026年整体目标 对齐",
                "【2月突破执行】延续 3 月，本月/最终目标百分比已按进度写入",
                "【今日】20 条视频（四屏切片）+ 1 条朋友圈；视频切片 Skill 操作执行",
            ],
            "t_thoughts": [
                "今日一条核心：20 条 Soul 视频 + 8 点 1 条朋友圈，持续拉齐与最终目标",
                "四屏切片完成 20 个视频，按当日完成数看百分比",
            ],
            "w_work": [
                "20 条 Soul 视频（四屏切片）",
                "20:00 发 1 条朋友圈",
                "视频 Skill 操作",
                "飞书日志",
            ],
            "f_feedback": [
                "本月/最终目标 12% / 100%，差 88%",
                "今日核心→20 条 Soul + 8 点朋友圈 🔄",
                "四屏切片 20 条→当日完成度待填 % 🔄",
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
    tasks = build_tasks_0303()
    ok = write_log(token, "3月3日", tasks, march_token, overwrite=False)
    if ok:
        open_result(march_token)
        print("✅ 3月3日 飞书日志已写入")
    else:
        print("❌ 写入失败")
        sys.exit(1)


if __name__ == "__main__":
    main()

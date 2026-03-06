#!/usr/bin/env python3
"""
今日飞书日志：搜索全库+聊天/纪要后的最近进度总结汇总 + 每天切片20个视频 + 成交1980及全链路 + 目标百分比写清楚。
"""
import sys
from datetime import datetime
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))

from auto_log import get_token_silent, write_log, open_result, resolve_wiki_token_for_date


def build_tasks_today_with_summary():
    """今日：最近进度汇总 + 每天20切片 + 1980成交及全链路 + 目标百分比"""
    today = datetime.now()
    date_str = f"{today.month}月{today.day}日"
    # 最近进度汇总（来自全库+智能纪要 output）
    summary = [
        "【进度汇总】飞书 Token 全命令行（get/set-march-token）、今日日志三件事+未完成已固化",
        "【进度汇总】Soul 114/115 场纪要：后端转化优于前端、发视频+切片以量取胜、私域握在自己手上",
        "【进度汇总】卡若AI 完善与接口、一场创业实验 网站/小程序、玩值电竞布局为主线；木叶视频切片 SKILL 与四屏切片 20 条/日",
    ]
    return [
        {
            "person": "卡若",
            "events": ["最近进度汇总", "接下来目标", "目标百分比"],
            "quadrant": "重要紧急",
            "t_targets": [
                "本月目标约 12%，距最终目标差 88%（相对 2026 年总目标 100%）",
                "接下来目标：每天切片 20 个视频（Soul 竖屏/四屏）；成交 1980 及全链路（引流→私域→转化）",
                "一人公司约 5%、玩值电竞约 25%；今日核心与目标达成百分比见反馈",
            ],
            "n_process": summary,
            "t_thoughts": [
                "进度汇总来自全库+纪要；每天 20 切片与 1980 全链路为达成总目标的关键动作，百分比写清楚便于追踪",
            ],
            "w_work": [
                "每天 20 条视频切片（Soul/四屏）",
                "成交 1980 及全链路（产品/客单→引流→私域→转化）",
                "卡若AI 完善 / 一场创业实验 / 玩值电竞",
                "20:00 发 1 条朋友圈",
                "飞书日志",
            ],
            "f_feedback": [
                "本月/最终目标 12% / 100%，差 88%",
                "每日 20 切片目标 → 当日完成度 X%（X= 完成数/20×100）🔄",
                "成交 1980 及全链路 → 进行中 🔄",
                "一人公司 5% 🔄 | 玩值电竞 25% 🔄",
            ],
        },
    ]


def main():
    today = datetime.now()
    date_str = f"{today.month}月{today.day}日"
    print("=" * 50)
    print(f"📝 写入今日飞书日志（进度汇总+20切片+1980全链路+百分比）：{date_str}")
    print("=" * 50)

    token = get_token_silent()
    if not token:
        print("❌ 无法获取飞书 Token")
        sys.exit(1)

    tasks = build_tasks_today_with_summary()
    target_wiki_token = resolve_wiki_token_for_date(date_str)
    ok = write_log(token, date_str, tasks, target_wiki_token, overwrite=True)
    if ok:
        open_result(target_wiki_token)
        print(f"✅ {date_str} 飞书日志已更新（含进度汇总与目标百分比）")
        sys.exit(0)
    print("❌ 写入失败")
    ref_path = SCRIPT_DIR.parent / "参考资料" / f"{date_str}_飞书日志正文_三件事与未完成.md"
    if ref_path.exists():
        print(f"💡 可复制 {ref_path} 内容到飞书当月文档手动粘贴")
    sys.exit(1)


if __name__ == "__main__":
    main()

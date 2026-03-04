#!/usr/bin/env python3
"""
今日飞书日志：从聊天记录+今日文档统一整理，与本月/最终目标百分比，今日核心一条
- 写前必读：运营中枢/工作台/2026年整体目标.md，百分比以总目标为核心、保持上下文相关
- 今日核心目标：每天20条Soul视频 + 20:00发1条朋友圈
"""
import os
import sys
from datetime import datetime

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if SCRIPT_DIR not in sys.path:
    sys.path.insert(0, SCRIPT_DIR)

from auto_log import get_token_silent, write_log, open_result, resolve_wiki_token_for_date


def build_tasks_today():
    """今日任务：今年9月三件事+前面未完成项+今日核心；目标%以 2026年整体目标.md 为基准"""
    today = datetime.now()
    date_str = f"{today.month}月{today.day}日"
    # 今年9月三件事（总目标锚点）
    sep_goals = [
        "今年9月三件事：① 卡若AI 启动完善且接口可用 ② 一场创业实验 网站/小程序可上线 ③ 玩值电竞 完成接下来的布局",
    ]
    # 前面未完成项（看板 T003/T004/T005 + 每日固定）
    unfinished = [
        "【前面未完成】卡若AI 4项优化落地（T003）",
        "【前面未完成】一人公司 Agent（T004）5%",
        "【前面未完成】玩值电竞推进（T005）25%",
        "【前面未完成】每日 20 条 Soul 视频 + 20:00 发 1 条朋友圈",
    ]
    month_goal_pct = 12
    gap_pct = 88
    return [
        {
            "person": "卡若",
            "events": ["今年9月三件事", "前面未完成", "今日核心"],
            "quadrant": "重要紧急",
            "t_targets": sep_goals + unfinished + [
                f"本月目标约 {month_goal_pct}%，距最终目标差 {gap_pct}%",
                "今日核心：20条Soul视频 + 20:00发1条朋友圈",
            ],
            "n_process": [
                "【总目标】9月：卡若AI 完善+接口可用 / 一场创业实验 网站+小程序上线 / 玩值电竞 布局完成",
                "【前面未完成】已列在下方，今日一并推进",
                "【复盘】从聊天记录与今日文档统一整理",
            ],
            "t_thoughts": [
                "今年9月三件事为总锚点；前面未完成项每日叠加直到闭环",
                "今日核心 20条Soul+8点朋友圈 持续拉齐",
            ],
            "w_work": [
                "卡若AI 4项优化",
                "一人公司 / 玩值电竞推进",
                "20条Soul视频",
                "20:00发1条朋友圈",
                "飞书日志",
            ],
            "f_feedback": [
                "9月三件事已写入总目标 ✅",
                "前面未完成→T003/T004/T005 + 每日固定 🔄",
                f"本月/最终 {month_goal_pct}% / 100%，差 {gap_pct}%",
                "今日核心→20条Soul+8点朋友圈 🔄",
            ],
        }
    ]


def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--overwrite", action="store_true", help="覆盖已有当日日志")
    args = parser.parse_args()

    today = datetime.now()
    date_str = f"{today.month}月{today.day}日"
    print("=" * 50)
    print(f"📝 写入今日飞书日志：{date_str}" + (" [覆盖]" if args.overwrite else ""))
    print("=" * 50)

    token = get_token_silent()
    if not token:
        print("❌ 无法获取飞书 Token")
        sys.exit(1)

    tasks = build_tasks_today()
    target_wiki_token = resolve_wiki_token_for_date(date_str)
    ok = write_log(token, date_str, tasks, target_wiki_token, overwrite=getattr(args, "overwrite", False))
    if ok:
        open_result(target_wiki_token)
        print(f"✅ {date_str} 飞书日志已写入")
        sys.exit(0)
    print("❌ 写入失败")
    sys.exit(1)


if __name__ == "__main__":
    main()

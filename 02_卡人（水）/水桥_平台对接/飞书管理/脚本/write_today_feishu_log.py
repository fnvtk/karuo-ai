#!/usr/bin/env python3
"""
今日飞书日志：从聊天记录+今日文档统一整理，与本月/最终目标百分比，今日核心一条
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
    """今日任务：昨日完成度+本月未完成并入+本月/最终目标%+今日核心（20条Soul+8点朋友圈）"""
    today = datetime.now()
    date_str = f"{today.month}月{today.day}日"
    # 昨日2月27日完成度（与 write_today_0227 / 本月其他日对齐）
    yesterday_done = "昨日2月27日：一人公司5%、玩值电竞25%、飞书日志100%"
    # 本月未完成项（看板 T003/T004/T005 + 今日核心），并入今日
    month_unfinished = "本月未完成并入今日：一人公司、玩值电竞、卡若AI 4项优化、20条Soul+8点朋友圈"
    # 本月与最终目标
    month_goal_pct = 12
    gap_pct = 88
    return [
        {
            "person": "卡若",
            "events": ["昨日完成度", "本月未完成并入", "今日核心"],
            "quadrant": "重要紧急",
            "t_targets": [
                yesterday_done,
                month_unfinished,
                f"本月目标约 {month_goal_pct}%，距最终目标差 {gap_pct}%",
                "今日核心：每天20条Soul视频 + 20:00发1条朋友圈",
            ],
            "n_process": [
                "【昨日】2月27日完成度已更新至上；本月其他日未完成项一并写入",
                "【复盘】从聊天记录与今日文档统一整理",
                "【2月突破执行】未完成项并入今日，持续迭代至100%",
            ],
            "t_thoughts": [
                "昨日与本月完成度、未完成项均更新到当日日志；今日核心 20条Soul+8点朋友圈",
            ],
            "w_work": ["一人公司", "玩值电竞", "卡若AI优化", "20条Soul视频", "20:00发1条朋友圈", "飞书日志"],
            "f_feedback": [
                "昨日完成度已写入 ✅",
                "本月未完成已并入今日 🔄",
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

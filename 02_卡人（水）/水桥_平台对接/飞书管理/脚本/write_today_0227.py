#!/usr/bin/env python3
"""
2月27日飞书日志：异能公司Agent(第一)+玩值电竞(第二)+每日交流汇总
- 异能公司agent：视频切片、文章全网、直播、小程序、朋友圈、聚合到平台
- 玩值电竞：第二优先级
- 每小节简短
"""
import os
import sys
from datetime import datetime

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if SCRIPT_DIR not in sys.path:
    sys.path.insert(0, SCRIPT_DIR)

from auto_log import get_token_silent, write_log, open_result, resolve_wiki_token_for_date


def build_tasks_0227():
    """2月27日任务：异能公司(第一)+玩值电竞(第二)+交流汇总"""
    return [
        {
            "person": "卡若",
            "events": ["异能公司Agent", "玩值电竞", "飞书日志迭代"],
            "quadrant": "重要紧急",
            "t_targets": [
                "异能公司Agent→视频切片/文章/直播/小程序/朋友圈/聚合 (5%)",
                "玩值电竞→Docker部署与功能推进 (第二) (25%)",
                "飞书日志→每日迭代+进度百分比更新 (100%)",
            ],
            "n_process": [
                "【异能公司】视频切片分发、文章全网、每日直播、小程序、朋友圈→聚合平台",
                "【玩值电竞】Docker 3001，MongoDB wanzhi_esports，持续迭代",
                "【昨日2月26】卡若AI 56%、一场创业实验→永平、GitHub yongpxu-soul",
            ],
            "t_thoughts": [
                "异能公司第一、玩值电竞第二；每日固定项迭代直到100%",
            ],
            "w_work": ["异能公司Agent规划", "玩值电竞推进", "飞书日志登记"],
            "f_feedback": [
                "异能公司→立项 5% 🔄",
                "玩值电竞→进行中 25% 🔄",
                "每日交流→飞书日志迭代、异能公司Agent规划、玩值电竞",
            ],
        }
    ]


def main():
    date_str = "2月27日"
    print("=" * 50)
    print(f"📝 写入飞书日志：{date_str}")
    print("=" * 50)

    token = get_token_silent()
    if not token:
        print("❌ 无法获取飞书 Token")
        sys.exit(1)

    tasks = build_tasks_0227()
    target_wiki_token = resolve_wiki_token_for_date(date_str)
    ok = write_log(token, date_str, tasks, target_wiki_token)
    if ok:
        open_result(target_wiki_token)
        print(f"✅ {date_str} 日志写入成功")
        sys.exit(0)
    print("❌ 写入失败")
    sys.exit(1)


if __name__ == "__main__":
    main()

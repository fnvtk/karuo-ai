#!/usr/bin/env python3
"""
2月27日飞书日志：一人公司Agent(第一)+玩值电竞(第二)+每日交流汇总
- 一人公司agent：视频切片、文章全网、直播、小程序、朋友圈、聚合到平台
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
    """2月27日：开发<20%，侧重事务与未来方向；导出/婼瑄已做日志"""
    return [
        {
            "person": "卡若",
            "events": ["一人公司", "玩值电竞", "事务与方向", "飞书日志"],
            "quadrant": "重要紧急",
            "t_targets": [
                "一人公司→分发聚合 (5%) 自2月17日",
                "玩值电竞→Docker/功能 (25%) 自2月17日；每晚20:00朋友圈已入日历",
                "飞书日志→每日迭代 (100%)",
            ],
            "n_process": [
                "【事务】导出与婼瑄导出已汇总→执行日志/2026-02-27_导出与婼瑄导出汇总.md",
                "【方向】一人公司第一、玩值电竞第二；开发内容控在20%内",
                "【昨日2月26】卡若AI 56%、创业实验→永平 yongpxu-soul",
            ],
            "t_thoughts": [
                "日志以事务与未来为主，开发仅提要；日历已加每天20:00玩值电竞朋友圈",
            ],
            "w_work": ["一人公司", "玩值电竞", "飞书日志", "导出/婼瑄日志"],
            "f_feedback": [
                "一人公司 5% 🔄",
                "玩值电竞 25% 🔄；20:00朋友圈→本机日历重复",
                "导出与婼瑄汇总 ✅",
            ],
        }
    ]


def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--overwrite", action="store_true", help="覆盖已有当日日志")
    args = parser.parse_args()

    date_str = "2月27日"
    print("=" * 50)
    print(f"📝 写入飞书日志：{date_str}" + (" [覆盖]" if args.overwrite else ""))
    print("=" * 50)

    token = get_token_silent()
    if not token:
        print("❌ 无法获取飞书 Token")
        sys.exit(1)

    tasks = build_tasks_0227()
    target_wiki_token = resolve_wiki_token_for_date(date_str)
    ok = write_log(token, date_str, tasks, target_wiki_token, overwrite=args.overwrite)
    if ok:
        open_result(target_wiki_token)
        print(f"✅ {date_str} 日志写入成功")
        sys.exit(0)
    print("❌ 写入失败")
    sys.exit(1)


if __name__ == "__main__":
    main()

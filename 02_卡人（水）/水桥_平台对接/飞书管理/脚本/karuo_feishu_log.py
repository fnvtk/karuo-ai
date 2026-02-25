#!/usr/bin/env python3
"""
卡若的飞书日志：一键登记日记 + 运营报表摘要（任意目录可执行）
"""
import argparse
import os
import sys
from datetime import datetime

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if SCRIPT_DIR not in sys.path:
    sys.path.insert(0, SCRIPT_DIR)

from auto_log import get_token_silent, write_log, open_result, resolve_wiki_token_for_date


def default_date_str():
    now = datetime.now()
    return f"{now.month}月{now.day}日"


def prompt_if_empty(val, prompt_text):
    if val:
        return val
    try:
        return input(prompt_text).strip()
    except EOFError:
        return ""


def build_tasks(progress, bottleneck, next_step, clarity):
    progress = max(0, min(100, int(progress)))
    bottleneck = bottleneck or "暂无明显卡点"
    next_step = next_step or "继续推进接口与网站，补齐功能与方案映射"
    clarity = clarity or "功能层与解决方案清晰度待提升"

    return [
        {
            "person": "卡若",
            "events": ["卡若飞书日志", "运营报表登记", "接口与网站推进"],
            "quadrant": "重要紧急",
            "t_targets": [
                f"卡若AI开发→接口与网站持续推进 🔧 ({progress}%)",
                "运营报表登记→完成当日关键进展归档 📊 (100%)",
            ],
            "n_process": [
                f"【卡若AI】当前卡点：{bottleneck}",
                f"【清晰度】{clarity}",
                f"【下一步】{next_step}",
            ],
            "t_thoughts": [
                "先处理部署卡点，再扩展接口与网站功能，降低返工",
            ],
            "w_work": ["日志登记", "运营报表登记", "接口开发", "网站推进"],
            "f_feedback": [
                f"卡若AI开发→进行中 🔄（{progress}%）",
                f"卡点反馈→{bottleneck}",
            ],
        }
    ]


def main():
    parser = argparse.ArgumentParser(description="卡若的飞书日志一键登记")
    parser.add_argument("--date", default=default_date_str(), help='日期，如 "2月25日"')
    parser.add_argument("--progress", type=int, default=55, help="卡若AI任务完成度（0-100）")
    parser.add_argument("--bottleneck", default="", help="当前卡点")
    parser.add_argument("--next", dest="next_step", default="", help="下一步动作")
    parser.add_argument("--clarity", default="", help="功能与解决方案清晰度说明")
    parser.add_argument("--interactive", action="store_true", help="开启交互输入")
    args = parser.parse_args()

    if args.interactive:
        args.bottleneck = prompt_if_empty(args.bottleneck, "请输入当前卡点：")
        args.next_step = prompt_if_empty(args.next_step, "请输入下一步动作：")
        args.clarity = prompt_if_empty(args.clarity, "请输入清晰度说明：")

    token = get_token_silent()
    if not token:
        print("❌ 无法获取飞书 Token")
        sys.exit(1)

    tasks = build_tasks(args.progress, args.bottleneck, args.next_step, args.clarity)
    target_wiki_token = resolve_wiki_token_for_date(args.date)
    ok = write_log(token, args.date, tasks, target_wiki_token)
    if ok:
        open_result(target_wiki_token)
        print(f"✅ 卡若的飞书日志已写入：{args.date}")
        sys.exit(0)
    print("❌ 写入失败")
    sys.exit(1)


if __name__ == "__main__":
    main()

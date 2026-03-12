#!/usr/bin/env python3
"""
今日飞书日志（3月定制）：200视频/日、工具研发10～30切片、售内容产出、李永平、年度目标百分比
"""
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))

from auto_log import get_token_silent, write_log, open_result, resolve_wiki_token_for_date, CONFIG, get_today_date_str


def build_tasks_today():
    """今日：只聚焦一个核心目标——每天剪辑并分发 200 条视频（日期以中国时间为准）"""
    date_str = get_today_date_str()

    # 简单进度估算：按本周 3 月 10～12 日整体推进情况，粗略给出完成度区间
    percent_text = "本周目标完成度预估：≈30%（工具与流程打底阶段）"

    return [
        {
            "person": "远志（玩值）",
            "events": ["200视频分发", "剪辑+分发一体化"],
            "quadrant": "重要紧急",
            "t_targets": [
                "核心目标：每天稳定剪辑并分发 200 条视频到全网（抖音、快手、视频号、B站等）",
                "把「剪辑 → 上架 → 分发」做成一条稳定的流水线，而不是零散操作",
            ],
            "n_process": [
                "对照 3 月 10～12 日的目标，梳理本周已完成的：素材池、剪辑 SOP、分发清单等基础工作",
                percent_text,
            ],
            "t_thoughts": [
                "先把 200 条/日做「稳定」，再考虑扩量；优先打通从素材到上架的关键 3～5 个动作。",
            ],
            "w_work": [
                "今天：至少完成一条完整链路的压测（从原始视频到多平台同时上线）",
                "梳理「200 条/日」需要的最小人力/工具配置，并写成简洁清单",
                "盘点目前可自动化的动作（批量裁切、模板套用、标题生成、分发脚本等）",
            ],
            "f_feedback": [
                "今天结束前给出一个「200 条/日」的可执行方案（包含步骤、工具、人天）",
                "进度评估：按「方案清晰度 + 工具可用度」两个维度持续更新百分比",
            ],
        },
    ]


def main():
    date_str = get_today_date_str()
    print("=" * 50)
    print(f"📝 写入今日飞书日志（200视频+工具研发+售内容+年度目标%）：{date_str}")
    print("=" * 50)

    token = get_token_silent()
    if not token:
        print("❌ 无法获取飞书 Token，请执行：python3 feishu_token_cli.py get-access-token")
        sys.exit(1)

    tasks = build_tasks_today()
    target_wiki_token = resolve_wiki_token_for_date(date_str)
    ok = write_log(token, date_str, tasks, target_wiki_token, overwrite=True)
    # 无论成功失败，写完都打开飞书
    open_token = target_wiki_token or (CONFIG.get("MONTH_WIKI_TOKENS") or {}).get(2) or CONFIG.get("WIKI_TOKEN")
    open_result(open_token)
    if ok:
        print(f"✅ {date_str} 飞书日志已写入飞书")
        sys.exit(0)
    print("❌ 写入失败（见上方提示：token/月份不符时请先迁当月文档并 set-march-token）")
    print("📎 飞书日志固定链接：https://cunkebao.feishu.cn/wiki/ZdSBwHrsGii14HkcIbccQ0flnee")
    sys.exit(1)


if __name__ == "__main__":
    main()

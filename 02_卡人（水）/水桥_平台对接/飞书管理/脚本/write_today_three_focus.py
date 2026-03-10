#!/usr/bin/env python3
"""
今日飞书日志：三项重点 + 前面未完成项列表
1. 卡若AI 启动完善、接口可用
2. 一场创业实验 网站/小程序可上线
3. 玩值电竞 完成接下来的布局
+ 前面未完成项一并列出
"""
import sys
from datetime import datetime
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))

from auto_log import get_token_silent, write_log, open_result, resolve_wiki_token_for_date, CONFIG, get_today_date_str


def build_tasks_today_three_focus():
    """今日三件事 + 前面未完成；日期以中国时间为准；百分比以 2026年整体目标.md 为基准"""
    date_str = get_today_date_str()
    # 前面未完成（延续 3 月 / 本月未闭环）
    unfinished = [
        "20 条 Soul 视频 + 20:00 发 1 条朋友圈（每日固定）",
        "视频 Skill 四屏切片 20 条/日",
        "一人公司 Agent 推进（当前约 5%）",
        "玩值电竞 Docker/功能推进（当前约 25%）",
        "卡若AI 4 项优化 / 接口与网站持续推进",
    ]
    return [
        {
            "person": "卡若",
            "events": ["今日三件事", "前面未完成", "本月与最终目标"],
            "quadrant": "重要紧急",
            "t_targets": [
                "① 卡若AI 启动完善，并且接口可用",
                "② 一场创业实验：网站、小程序可上线（可使用）",
                "③ 玩值电竞：完成接下来的布局",
                "本月目标约 12%，距最终目标差 88%（相对 2026 年总目标 100%）",
            ],
            "n_process": [
                "【今日三件事】卡若AI 完善与接口可用；一场创业实验 网站/小程序上线；玩值电竞 布局",
                "【前面未完成】已并入下方列表，今日一并推进或延续",
            ],
            "t_thoughts": [
                "三件事为今日主线；前面未完成项持续迭代，不丢项",
            ],
            "w_work": [
                "卡若AI 完善 + 接口可用",
                "一场创业实验 网站/小程序上线",
                "玩值电竞 接下来布局",
                "前面未完成项（见下列表）",
                "飞书日志",
            ],
            "f_feedback": [
                "① 卡若AI 完善/接口可用 → 进行中 🔄",
                "② 一场创业实验 网站/小程序 → 进行中 🔄",
                "③ 玩值电竞 布局 → 进行中 🔄",
                "本月/最终 12% / 100%，差 88%",
            ],
        },
        {
            "person": "卡若",
            "events": ["前面未完成项列表"],
            "quadrant": "重要不紧急",
            "t_targets": ["前面未完成，今日可延续或补做"],
            "n_process": [f"【未完成】{item}" for item in unfinished],
            "t_thoughts": ["未完成项不删，只叠加到今日或后续"],
            "w_work": unfinished,
            "f_feedback": [f"未完成→{item} 🔄" for item in unfinished[:3]] + ["……（见上）🔄"],
        },
    ]


def main():
    import argparse
    parser = argparse.ArgumentParser(description="今日飞书日志：三件事 + 前面未完成")
    parser.add_argument("--overwrite", action="store_true", help="覆盖已有当日日志")
    args = parser.parse_args()

    date_str = get_today_date_str()
    print("=" * 50)
    print(f"📝 写入今日飞书日志（中国时间）：{date_str}" + (" [覆盖]" if args.overwrite else ""))
    print("  ① 卡若AI 完善/接口可用  ② 一场创业实验 网站/小程序上线  ③ 玩值电竞 布局 + 前面未完成")
    print("=" * 50)

    token = get_token_silent()
    if not token:
        print("❌ 无法获取飞书 Token")
        sys.exit(1)

    tasks = build_tasks_today_three_focus()
    target_wiki_token = resolve_wiki_token_for_date(date_str)
    ok = write_log(token, date_str, tasks, target_wiki_token, overwrite=args.overwrite)
    open_token = target_wiki_token or (CONFIG.get("MONTH_WIKI_TOKENS") or {}).get(2) or CONFIG.get("WIKI_TOKEN")
    open_result(open_token)
    if ok:
        print(f"✅ {date_str} 飞书日志已写入飞书")
        sys.exit(0)
    print("❌ 写入失败（文档月份不符时请先迁当月文档并 set-march-token）")
    print("📎 飞书日志固定链接：https://cunkebao.feishu.cn/wiki/ZdSBwHrsGii14HkcIbccQ0flnee")
    sys.exit(1)


if __name__ == "__main__":
    main()

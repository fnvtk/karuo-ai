#!/usr/bin/env python3
"""
今日飞书日志（3月定制）：200视频/日、工具研发10～30切片、售内容产出、李永平、年度目标百分比
"""
import sys
from datetime import datetime
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))

from auto_log import get_token_silent, write_log, open_result, resolve_wiki_token_for_date, CONFIG


def build_tasks_today():
    """今日：200视频/日、工具研发10～30切片、售内容产出、按年度目标百分比"""
    today = datetime.now()
    date_str = f"{today.month}月{today.day}日"

    return [
        {
            "person": "远志（玩值）",
            "events": ["每天200视频分发", "切片工具研发", "售内容产出"],
            "quadrant": "重要紧急",
            "t_targets": [
                "目标：每天发 200 个视频，工具分发到各平台",
                "工具研发：每天切 10-30 个视频的切片工具",
                "售内容：售的内容产出，按整个业务与年度目标百分比推进",
            ],
            "n_process": [
                "源自远志安排：200 视频/日分发；工具负责 10～30 切片/日；售内容与年度目标对齐",
            ],
            "t_thoughts": [
                "工具研发 + 售内容产出 = 支撑 200 视频/日；百分比以 2026 年整体目标为基准",
            ],
            "w_work": [
                "工具分发：200 视频/日 → 各平台",
                "工具研发：每天切 10-30 个视频的切片工具",
                "售内容产出（含内容生产）",
                "按业务与年度目标百分比追踪",
            ],
            "f_feedback": [
                "200 视频/日 → 当日完成度 X%",
                "10～30 切片工具 研发中",
                "售内容产出 进行中",
                "本月/年度目标 % 见整体目标",
            ],
        },
        {
            "person": "李永平",
            "events": ["一场创业实验", "yongpxu-soul 分支"],
            "quadrant": "重要紧急",
            "t_targets": [
                "永平交接「一场创业实验」+ yongpxu-soul 分支同步",
            ],
            "n_process": [
                "2/26 永平交接已启动；分支与开发进度跟进",
            ],
            "t_thoughts": ["保持沟通，确保交接顺畅"],
            "w_work": [
                "一场创业实验 网站/小程序进度跟进",
                "yongpxu-soul 分支同步与联调",
            ],
            "f_feedback": [
                "交接与分支 进行中",
            ],
        },
        {
            "person": "卡若",
            "events": ["年度目标百分比", "后台数据", "Token 过期处理"],
            "quadrant": "重要不紧急",
            "t_targets": [
                "按业务与年度目标百分比追踪（以 2026 年整体目标为基准）",
                "本月目标约 12%，距最终目标差 88%",
                "后台数据链接、Token 过期直接命令处理",
            ],
            "n_process": [
                "后台数据：神射手 kr-users.quwanzhi.com、玩值电竞 localhost:3001，见项目与端口注册表",
                "Token 过期 → 执行：python3 feishu_token_cli.py get-access-token",
            ],
            "t_thoughts": [
                "Token 过期无需询问，直接命令刷新；上周总结优化便于周复盘闭环",
            ],
            "w_work": [
                "后台数据链接登记/验证",
                "上周 3 月总结检查并优化进度",
                "飞书日志写入",
            ],
            "f_feedback": [
                "后台数据链接 见 00_账号与API索引、项目与端口注册表",
                "上周总结 已检查优化",
                "Token 已刷新",
            ],
        },
    ]


def main():
    today = datetime.now()
    date_str = f"{today.month}月{today.day}日"
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

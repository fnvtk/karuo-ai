#!/usr/bin/env python3
"""
今日飞书日志（3月21日定制）：远志视频切片500/日、李永平、后台数据、上周3月总结优化、Token过期处理
"""
import sys
from datetime import datetime
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))

from auto_log import get_token_silent, write_log, open_result, resolve_wiki_token_for_date


def build_tasks_today():
    """今日：远志、李永平、后台数据、上周总结、Token 处理"""
    today = datetime.now()
    date_str = f"{today.month}月{today.day}日"

    return [
        {
            "person": "远志（玩值）",
            "events": ["视频剪辑→切片→分发全网", "每天500视频目标", "SOP与视频切片"],
            "quadrant": "重要紧急",
            "t_targets": [
                "视频剪辑相关内容做成切片 → 分发到全网",
                "目标：每天发 500 个视频",
                "SOP 与视频切片流程做好；接下来一个月每天要做的事列出清单",
            ],
            "n_process": [
                "源自远志安排：整体视频剪辑→切片→分发；以量取胜，发视频+切片为核心动作",
            ],
            "t_thoughts": [
                "切片 SOP 标准化后，可规模化执行；一个月每日任务清单便于追踪与复盘",
            ],
            "w_work": [
                "完善视频切片 SOP（剪辑→切片→分发）",
                "制定接下来一个月每天视频任务清单",
                "执行切片并分发到全网（目标 500/日）",
            ],
            "f_feedback": [
                "SOP 进行中 🔄",
                "每日任务清单待输出 🔄",
                "500 视频/日 → 当日完成度 X% 🔄",
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
                "交接与分支 进行中 🔄",
            ],
        },
        {
            "person": "卡若",
            "events": ["后台数据链接", "上周3月总结", "Token 过期处理"],
            "quadrant": "重要不紧急",
            "t_targets": [
                "后台数据链接整理与可访问性确认",
                "上周 3 月总结检查与优化，写清进度",
                "Token 过期：直接执行命令处理",
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
                "后台数据链接 见 00_账号与API索引、项目与端口注册表 ✅",
                "上周总结 已检查优化 🔄",
                "Token 已刷新 ✅",
            ],
        },
    ]


def main():
    today = datetime.now()
    date_str = f"{today.month}月{today.day}日"
    print("=" * 50)
    print(f"📝 写入今日飞书日志（远志+李永平+后台+上周总结）：{date_str}")
    print("=" * 50)

    token = get_token_silent()
    if not token:
        print("❌ 无法获取飞书 Token，请执行：python3 feishu_token_cli.py get-access-token")
        sys.exit(1)

    tasks = build_tasks_today()
    target_wiki_token = resolve_wiki_token_for_date(date_str)
    ok = write_log(token, date_str, tasks, target_wiki_token, overwrite=True)
    if ok:
        open_result(target_wiki_token)
        print(f"✅ {date_str} 飞书日志已更新")
        sys.exit(0)
    print("❌ 写入失败")
    ref_path = SCRIPT_DIR.parent / "参考资料" / f"{date_str}_飞书日志_远志李永平.md"
    ref_path.parent.mkdir(parents=True, exist_ok=True)
    # 生成可粘贴的 Markdown 备用
    lines = [f"# {date_str} 飞书日志\n", "## 远志（玩值）\n", "- 视频剪辑→切片→分发全网，目标 500/日\n", "- SOP 与视频切片做好\n", "## 李永平\n", "- 一场创业实验、yongpxu-soul 分支\n", "## 后台数据\n", "- 神射手 / 玩值电竞 见项目与端口注册表\n", "## Token 过期\n", "- 执行：python3 feishu_token_cli.py get-access-token\n"]
    ref_path.write_text("".join(lines), encoding="utf-8")
    print(f"💡 可复制 {ref_path} 内容到飞书 3 月文档粘贴")
    sys.exit(1)


if __name__ == "__main__":
    main()

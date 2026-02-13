#!/usr/bin/env python3
"""
今日日志写入飞书（自定义内容）
用法: python3 write_today_custom.py
"""
import os
import sys

# 确保能导入同目录的 auto_log
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if SCRIPT_DIR not in sys.path:
    sys.path.insert(0, SCRIPT_DIR)

from auto_log import get_token_silent, write_log, open_result

# 2026-01-30 今日任务（上帝之眼 80% + 本地模型基建）
DATE_STR = "1月30日"
TASKS = [
    {
        "person": "卡若/火眸",
        "events": ["上帝之眼量化交易"],
        "quadrant": "重要紧急",
        "t_targets": ["交易营业厅认证通过"],
        "n_process": ["完成度 80%", "策略与自动化已搭建"],
        "t_thoughts": ["认证通过即可闭环"],
        "w_work": ["上帝之眼量化交易"],
        "f_feedback": ["完成度 80%，差营业厅认证 ✅"],
    },
    {
        "person": "卡若",
        "events": ["AI本地模型", "Siri本地模型", "完值电竞"],
        "quadrant": "重要紧急",
        "t_targets": ["完值电竞商业计划书", "其他项目支撑"],
        "n_process": ["本地模型搭建", "Siri 本地模型搭建"],
        "t_thoughts": ["基建支撑商业计划书与项目"],
        "w_work": ["本地 LLM 服务", "Siri 快捷指令对接"],
        "f_feedback": ["进行中 🔄"],
    },
]

if __name__ == "__main__":
    print("🔑 获取 Token...")
    token = get_token_silent()
    if not token:
        print("❌ 无法获取 Token")
        sys.exit(1)
    print("📝 写入飞书日志...")
    ok = write_log(token, DATE_STR, TASKS)
    if ok:
        open_result()  # 写入完成后自动打开飞书日志页面
    sys.exit(0 if ok else 1)

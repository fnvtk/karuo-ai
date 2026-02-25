#!/usr/bin/env python3
"""
2026-02-25 今日工作写入飞书
用法: python3 write_today_20260225.py
"""
import os
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if SCRIPT_DIR not in sys.path:
    sys.path.insert(0, SCRIPT_DIR)

from auto_log import get_token_silent, write_log, open_result, resolve_wiki_token_for_date

DATE_STR = "2月25日"
TASKS = [
    {
        "person": "卡若",
        "events": ["飞书卡若AI开发", "创业实业小程序对接", "阿猫投资落地"],
        "quadrant": "重要紧急",
        "t_targets": [
            "飞书卡若AI开发→接口完成并部署服务器 🔧 (0%)",
            "创业实业小程序→完成对接与上线清单 📱 (0%)",
            "投资落地→与阿猫确定目标与方向 💰 (0%)",
        ],
        "n_process": [
            "【飞书卡若AI】接口字段梳理→鉴权与异常处理→本地联调→部署上线→健康检查",
            "【小程序对接】需求边界确认→参数与回调对齐→待改项整理→提审前检查",
            "【投资沟通】同步最新机会→确认执行范围→确定收益目标与风险边界",
        ],
        "t_thoughts": [
            "先打通接口与部署，再推进业务对接与投资落地",
            "2月内容固定写入2月日志，避免跨月错写",
        ],
        "w_work": ["接口开发", "服务器部署", "小程序对接", "投资规划"],
        "f_feedback": ["三项任务→待执行 ⏰"],
    },
]

if __name__ == "__main__":
    print("🔑 获取 Token...")
    token = get_token_silent()
    if not token:
        print("❌ 无法获取 Token")
        sys.exit(1)
    print("📝 写入飞书日志（2月25日）...")
    ok = write_log(token, DATE_STR, TASKS)
    if ok:
        open_result(resolve_wiki_token_for_date(DATE_STR))
    sys.exit(0 if ok else 1)

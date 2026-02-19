#!/usr/bin/env python3
"""
2026-02-19 今日工作写入飞书
用法: python3 write_today_20260219.py
"""
import os
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if SCRIPT_DIR not in sys.path:
    sys.path.insert(0, SCRIPT_DIR)

from auto_log import get_token_silent, write_log, open_result

# 2026-02-19 今日工作（从工作台、代码管理、存客宝报告整理）
DATE_STR = "2月19日"
TASKS = [
    {
        "person": "卡若",
        "events": ["Gitea 同步", "工作台", "金仓", "Cursor规则", "火炬"],
        "quadrant": "重要紧急",
        "t_targets": [
            "Gitea 同步→6 次推送成功（总索引/金仓/水桥/工作台/Cursor/参考资料/火炬）🔗 (100%)",
            "工作台文档与代码管理→更新记录 📝 (100%)",
        ],
        "n_process": [
            "【金仓】Gitea 多轮同步→总索引与入口、金仓、水桥平台对接、运营中枢工作台、Cursor规则、运营中枢参考资料、火炬→百科同步成功",
            "【工作台】代码管理.md / gitea_push_log.md 持续更新→推送记录可追溯",
        ],
        "t_thoughts": ["代码与百科同步稳定，工作台记录可追溯"],
        "w_work": ["代码管理、版本同步、运营中枢维护"],
        "f_feedback": ["Gitea 同步 6 次 ✅", "工作台更新 ✅"],
    },
    {
        "person": "卡若",
        "events": ["存客宝", "公网流量", "腾讯云", "分析报告"],
        "quadrant": "重要紧急",
        "t_targets": [
            "存客宝公网数据问题与深度分析→报告产出 📊 (100%)",
        ],
        "n_process": [
            "【金盾/金仓】腾讯云监控截图分析→14:44 入向尖峰（33.07 Mbps/2864 包每秒）、14:39～15:10 出向持续活跃→计费关系与问题清单→《存客宝_公网数据问题与服务器深度分析报告》写入工作台",
        ],
        "t_thoughts": ["入向尖峰根因待结合日志/进程排查；出网流量是公网费用主因"],
        "w_work": ["运维分析、成本分析、文档产出"],
        "f_feedback": ["报告已生成 ✅"],
    },
]

if __name__ == "__main__":
    print("🔑 获取 Token...")
    token = get_token_silent()
    if not token:
        print("❌ 无法获取 Token")
        sys.exit(1)
    print("📝 写入飞书日志（2月19日）...")
    ok = write_log(token, DATE_STR, TASKS)
    if ok:
        open_result()
    sys.exit(0 if ok else 1)

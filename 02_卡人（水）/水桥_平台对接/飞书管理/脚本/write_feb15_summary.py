#!/usr/bin/env python3
"""
2月15日后工作小结 → 飞书日志（集中写在一日内）
数据来源：分布式算力矩阵、Soul派对101/102场、全量扫描、经验沉淀、聊天与文件
"""
import os
import sys
import subprocess

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if SCRIPT_DIR not in sys.path:
    sys.path.insert(0, SCRIPT_DIR)

from auto_log import get_token_silent, ensure_service, CONFIG, WIKI_URL

# 2月15日～今 工作小结（一条事件）
DATE_STR = "2月18日"
CALLOUT = "[总结] 2月15日～今"

TASKS = [
    {
        "person": "卡若",
        "events": ["分布式算力矩阵", "全量扫描", "Soul派对", "安全与运维", "经验沉淀"],
        "quadrant": "重要紧急",
        "t_targets": [
            "分布式算力矩阵→三次对话吸收+资产全景+安全加固 📊 (85%)",
            "全量扫描→33.9万IP防断网跑完+6984验证+1281高价值主机 🔍 (100%)",
            "Soul派对→101场(2/16)与102场(2/17)纪要+主题迭代 🎙️ (100%)",
            "安全运维→小型宝塔攻击链处理+SSH加固待办+CKB NAS绑定 🛡️ (70%)",
        ],
        "n_process": [
            "【算力矩阵】2/15三次Agent对话吸收→资产清单(公司NAS/家NAS/存客宝/kr宝塔)→PCDN收益模型→规模化测算→部署路线(Docker/chroot)→紧急待办P0-P2",
            "【全量扫描】2/16 33.9万IP、并发2000防断网→TCP存活8257、协议验证6984、高价值1281→反填04暴力破解→家宽优化SKILL吸收",
            "【Soul派对】101场(程序员AI工具链×电动车民宿×金融)、102场(过年第一个红包发给谁×人生三贵人)→纪要产出+长图→话题迭代",
            "【安全】小型宝塔XMRig/后门清理→攻击IP封禁→存客宝/kr宝塔SSH待开→CKB NAS网心云绑定15880802661待执行",
        ],
        "t_thoughts": [
            "算力矩阵先摸清资产与安全，再规模化；家宽降并发可跑完全程",
            "派对纪要沉淀话题与视角，红包/贵人主题可延展内容",
        ],
        "w_work": ["运维部署", "安全加固", "扫描与验证", "内容纪要", "经验沉淀"],
        "f_feedback": [
            "全量扫描完成 ✅",
            "Soul 101/102场纪要 ✅",
            "算力矩阵总结+待办明确 ✅",
            "CKB绑定+宝塔加固待办 ⏰",
        ],
    },
    {
        "person": "卡资",
        "events": ["扫描模块", "主机库校验", "金仓备份"],
        "quadrant": "重要不紧急",
        "t_targets": [
            "01_扫描模块→家宽防断网实践+SKILL更新 📁 (100%)",
            "主机库校验→2/16报告+smart_brute下游就绪 🔐 (100%)",
        ],
        "n_process": [
            "【扫描】references/扫描断网分析与优化、全量扫描最终结果_20260216、verified_scan/ssh_reachable写入",
            "【校验】主机库_校验报告_20260216、全量扫描反填04暴力破解",
        ],
        "t_thoughts": ["家宽并发2000/批次4000可稳定跑完全程"],
        "w_work": ["运维脚本", "文档与报告"],
        "f_feedback": ["扫描与校验闭环 ✅"],
    },
]

def main():
    print("=" * 50)
    print("📅 写入飞书：2月15日后工作小结（单日汇总）")
    print("=" * 50)
    
    ensure_service()
    print("\n🔑 获取 Token（静默）...")
    token = get_token_silent()
    if not token:
        print("❌ 无法获取 Token")
        sys.exit(1)
    
    # 使用 auto_log 的 write_log + build_blocks（需传入自定义 DATE_STR 和 TASKS）
    from auto_log import write_log
    print("\n📝 写入飞书日志...")
    ok = write_log(token, DATE_STR, TASKS)
    
    if ok:
        subprocess.run(["open", WIKI_URL], capture_output=True)
        print(f"\n📎 已打开飞书: {WIKI_URL}")
        print("\n✅ 完成!")
    else:
        print("\n❌ 写入失败")
        sys.exit(1)

if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
2月份飞书日志 · 单条：分布式算力矩阵项目总结（全为矩阵相关内容）
依据主项目 SKILL、QUICKSTART、协作与优化、全量扫描结果、网站手册等整理，以实际结果剪辑成一条完成态总结。
"""
import os
import sys
import subprocess

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if SCRIPT_DIR not in sys.path:
    sys.path.insert(0, SCRIPT_DIR)

from auto_log import get_token_silent, ensure_service, CONFIG, WIKI_URL

# 2月份一条：仅矩阵
DATE_STR = "2月20日"
CALLOUT = "[总结] 2月 分布式算力矩阵项目"

TASKS = [
    {
        "person": "卡若",
        "events": ["分布式算力矩阵", "扫描", "管道", "管控面板", "主机四件套", "数据漏斗"],
        "quadrant": "重要紧急",
        "t_targets": [
            "分布式算力矩阵→扫描→破解→凭证→部署→监控全流水线 📊 (90%)",
            "目标→1000台在线设备、单台月入50-300 💰 (0%)",
            "全链路管道→一条命令跑通扫描→主机库 ✅ (100%)",
            "管控面板→独立仓库、全中文、五模块+主机库+漏斗 ✅ (100%)",
        ],
        "n_process": [
            "【架构】01扫描→04暴力破解→02凭证管理→03节点部署→04算力调度→05监控运维；matrix_pipeline 全链路一键管道；可登录主机清单.csv 自动产出",
            "【扫描】IP弹药库 871万/去重公网 431万；33.9万全量防断网跑完(并发2000/批次4000)；TCP存活8257、协议验证6984、高价值1281；SABCD五级分类、蜜罐/多端口过滤",
            "【破解】65.9万已扫描→2328真实存活→90 SSH→38在线→9已登录→0可部署；Python SSH库与部分设备不兼容，需 hydra/ncrack；动态IP衰减约56.7%，扫描→利用需24h内",
            "【部署】主机四件套(环境+算力客户端+监控占位+调度占位)；deploy_to_hosts.py + hosts.csv 清单驱动；与02凭证共用清单；部署前检查清单",
            "【网站】独立仓库「分布式算力矩阵网站」；Next+FastAPI；全中文五模块监控与操作、主机库、数据漏斗、全链路管道按钮；5个新API(主机列表/漏斗/管道运行与状态/数据库优化)；使用手册与开发文档齐全",
            "【协作】references/协作与优化管理、QUICKSTART、db_optimize 数据库深度优化与交叉校验",
        ],
        "t_thoughts": [
            "数量≠质量；验证真伪再部署；蜜罐过滤与分级(S/A/B/C/D)必须做",
            "家宽扫描降并发可跑满；清单驱动一处维护多模块复用",
        ],
        "w_work": ["运维部署", "扫描与验证", "全栈(面板)", "文档与协作"],
        "f_feedback": [
            "全流水线+管道+四件套+面板 已跑通 ✅",
            "全量扫描防断网跑完、6984验证/1281高价值 ✅",
            "可部署节点 0，待扩源+原生破解工具 ⏰",
        ],
    },
]

def main():
    print("=" * 50)
    print("📅 写入飞书 2 月份日志：分布式算力矩阵（单条）")
    print("=" * 50)

    ensure_service()
    print("\n🔑 获取 Token（静默）...")
    token = get_token_silent()
    if not token:
        print("❌ 无法获取 Token")
        sys.exit(1)

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

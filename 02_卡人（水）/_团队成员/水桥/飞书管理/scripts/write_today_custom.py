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

# 2026-02-14 今日任务（合并复盘）
DATE_STR = "2月14日"
FEB_WIKI_TOKEN = "Jn2EwXP2OiTujNkAbNCcDcM7nRA"  # 2月文档token
TASKS = [
    {
        "person": "卡若",
        "events": ["NAS网心云部署", "卡若AI恢复", "Gitea同步", "经验沉淀"],
        "quadrant": "重要紧急",
        "t_targets": [
            "老旧NAS(DS213j)网心云→chroot部署成功上线 🖥️ (100%)",
            "卡若AI全量恢复→5角色17成员38技能归位 🏗️ (92%)",
            "CKB NAS Gitea同步+银掌柜部署更新 🔗 (100%)",
            "经验库+记忆系统+自动维护脚本更新 📚 (100%)",
        ],
        "n_process": [
            "【NAS算力部署】DS213j(armv7l/无Docker/内核3.2.40)→5次失败尝试→chroot完整rootfs方案成功→wxedge+containerd运行→绑定账号→PCDN收益产生→分布式算力管控Skill完整建设(1089行SKILL+脚本+监控+配置)",
            "【卡若AI恢复】婼瑄基线对齐→扫描206条对话提取4880条路径→金剑/金链合并到金仓→修复合并报告→P1抽查5个Skill完整→索引/模板/工作台全部刷新",
            "【NAS管理】双NAS文档更新→Gitea工单访问配置→银掌柜同步说明→NAS chroot部署经验294行入库→Agent成果追踪表→记忆系统脚本更新",
        ],
        "t_thoughts": ["老设备chroot绕过Docker限制，经验可复用到所有ARM32设备", "先恢复再优化，合并报告需过滤噪音"],
        "w_work": ["运维部署、系统恢复、架构优化、经验沉淀"],
        "f_feedback": ["DS213j已上线(SN:CTWX09Y9Q2ILI4PV) ✅", "卡若AI恢复92% ✅", "NAS同步+经验入库 ✅"],
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

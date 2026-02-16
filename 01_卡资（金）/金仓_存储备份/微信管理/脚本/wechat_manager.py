#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
微信管理主程序
提供微信数据分析、导出、RFM评估、自动化等功能

使用方法:
    python wechat_manager.py status          # 检查微信状态
    python wechat_manager.py export          # 导出数据
    python wechat_manager.py rfm             # RFM分析
    python wechat_manager.py analyze         # 分析联系人/群组
    python wechat_manager.py summary         # 生成每日摘要
    python wechat_manager.py report          # 生成管理报告
"""

import os
import sys
import argparse
import subprocess
import json
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, Dict, List, Any

# 微信数据路径
WECHAT_CONTAINER = os.path.expanduser(
    "~/Library/Containers/com.tencent.xinWeChat/Data/Library/Application Support"
)

# 微信 4.x 新数据路径
WECHAT_DATA_V4 = os.path.expanduser(
    "~/Library/Containers/com.tencent.xinWeChat/Data/Documents/xwechat_files"
)

# 输出目录
OUTPUT_DIR = os.path.expanduser("~/Documents/微信管理")

# RFM 配置
RFM_CONFIG = {
    "recency_days": [7, 30, 90, 180, 365],  # R值分段天数
    "frequency_count": [50, 20, 10, 5, 1],   # F值分段消息数
    "value_keywords": {
        # 高价值关键词 (+3分)
        "合作": 3, "投资": 3, "采购": 3, "签约": 3, "付款": 3,
        "项目": 3, "需求": 3, "预算": 3, "订单": 3,
        # 中价值关键词 (+2分)
        "咨询": 2, "了解": 2, "推荐": 2, "介绍": 2, "报价": 2,
        "方案": 2, "沟通": 2, "交流": 2,
        # 低价值关键词 (+1分)
        "谢谢": 1, "感谢": 1, "帮忙": 1, "请教": 1, "学习": 1,
        # 负面关键词 (-1分)
        "广告": -1, "推销": -1, "砍价": -1, "免费": -1
    }
}


class WeChatManager:
    """微信管理器主类"""
    
    def __init__(self):
        self.wechat_path = self._find_wechat_data()
        self.output_dir = Path(OUTPUT_DIR)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
    def _find_wechat_data(self) -> Optional[Path]:
        """查找微信数据目录"""
        # 优先查找 4.x 版本数据路径
        v4_path = Path(WECHAT_DATA_V4)
        if v4_path.exists():
            for item in v4_path.iterdir():
                if item.is_dir() and item.name.startswith("udbfnvtk"):
                    db_storage = item / "db_storage"
                    if db_storage.exists():
                        return db_storage
        
        # 回退到旧版本路径
        container = Path(WECHAT_CONTAINER)
        if not container.exists():
            return None
            
        # 查找消息数据库目录
        for item in container.iterdir():
            if item.is_dir() and len(item.name) == 32:  # 微信用户目录是32位hash
                return item
        return None
    
    def check_status(self) -> Dict[str, Any]:
        """检查微信状态"""
        status = {
            "wechat_running": False,
            "data_found": False,
            "data_size": "0",
            "db_count": 0,
            "wechat_version": "未知",
            "last_modified": None,
            "message_dbs": [],
            "contact_db": None,
            "sns_db": None,
            "data_path": None
        }
        
        # 检查微信进程
        try:
            result = subprocess.run(
                ["pgrep", "-x", "WeChat"],
                capture_output=True, text=True
            )
            status["wechat_running"] = result.returncode == 0
        except Exception:
            pass
        
        # 检查微信版本
        try:
            result = subprocess.run(
                ["defaults", "read", "/Applications/WeChat.app/Contents/Info.plist", 
                 "CFBundleShortVersionString"],
                capture_output=True, text=True
            )
            if result.returncode == 0:
                status["wechat_version"] = result.stdout.strip()
        except Exception:
            pass
        
        # 检查 4.x 版本数据目录
        v4_path = Path(WECHAT_DATA_V4)
        if v4_path.exists():
            for item in v4_path.iterdir():
                if item.is_dir() and item.name.startswith("udbfnvtk"):
                    db_storage = item / "db_storage"
                    if db_storage.exists():
                        status["data_found"] = True
                        status["data_path"] = str(db_storage)
                        
                        # 计算数据大小
                        try:
                            result = subprocess.run(
                                ["du", "-sh", str(item)],
                                capture_output=True, text=True
                            )
                            if result.returncode == 0:
                                status["data_size"] = result.stdout.split()[0]
                        except Exception:
                            pass
                        
                        # 查找消息数据库
                        msg_dir = db_storage / "message"
                        if msg_dir.exists():
                            msg_dbs = sorted(msg_dir.glob("message_*.db"))
                            status["message_dbs"] = [
                                {"name": db.name, "size": f"{db.stat().st_size / 1024 / 1024:.1f}MB"}
                                for db in msg_dbs if not db.name.endswith("fts.db")
                            ]
                            status["db_count"] = len(msg_dbs)
                        
                        # 查找联系人数据库
                        contact_db = db_storage / "contact" / "contact.db"
                        if contact_db.exists():
                            status["contact_db"] = str(contact_db)
                        
                        # 查找朋友圈数据库
                        sns_db = db_storage / "sns" / "sns.db"
                        if sns_db.exists():
                            status["sns_db"] = str(sns_db)
                        
                        # 获取最后修改时间
                        try:
                            db_files = list(db_storage.rglob("*.db"))
                            if db_files:
                                latest = max(db_files, key=lambda x: x.stat().st_mtime)
                                status["last_modified"] = datetime.fromtimestamp(
                                    latest.stat().st_mtime
                                ).strftime("%Y-%m-%d %H:%M:%S")
                        except Exception:
                            pass
                        break
        
        # 回退检查旧版本
        if not status["data_found"]:
            container = Path(WECHAT_CONTAINER)
            if container.exists():
                status["data_found"] = True
                try:
                    result = subprocess.run(
                        ["du", "-sh", str(container.parent)],
                        capture_output=True, text=True
                    )
                    if result.returncode == 0:
                        status["data_size"] = result.stdout.split()[0]
                except Exception:
                    pass
                
                try:
                    db_files = list(container.rglob("*.db"))
                    status["db_count"] = len(db_files)
                    if db_files:
                        latest = max(db_files, key=lambda x: x.stat().st_mtime)
                        status["last_modified"] = datetime.fromtimestamp(
                            latest.stat().st_mtime
                        ).strftime("%Y-%m-%d %H:%M:%S")
                except Exception:
                    pass
        
        return status
    
    def print_status(self):
        """打印微信状态"""
        status = self.check_status()
        
        print("\n📱 微信状态检查")
        print("=" * 60)
        
        # 微信进程
        running = "✅ 运行中" if status["wechat_running"] else "❌ 未运行"
        print(f"微信进程：{running}")
        
        # 版本信息
        print(f"微信版本：{status['wechat_version']}")
        
        # 数据目录
        if status["data_found"]:
            print(f"数据目录：✅ 已找到")
            print(f"数据大小：{status['data_size']}")
            print(f"最后更新：{status['last_modified']}")
            
            if status.get("data_path"):
                print(f"\n📂 数据路径：")
                print(f"   {status['data_path']}")
            
            # 显示消息数据库
            if status.get("message_dbs"):
                print(f"\n📨 消息数据库 ({len(status['message_dbs'])} 个):")
                for db in status["message_dbs"][:5]:  # 只显示前5个
                    print(f"   • {db['name']}: {db['size']}")
                if len(status["message_dbs"]) > 5:
                    print(f"   ... 还有 {len(status['message_dbs']) - 5} 个")
            
            # 联系人和朋友圈
            if status.get("contact_db"):
                print(f"\n👥 联系人数据库：✅ 已找到")
            if status.get("sns_db"):
                print(f"📷 朋友圈数据库：✅ 已找到")
        else:
            print(f"数据目录：❌ 未找到")
        
        print("\n" + "=" * 60)
        
        # 提示
        if not status["data_found"]:
            print("\n⚠️  未找到微信数据，请确认：")
            print("   1. 微信是否已安装并登录过")
            print("   2. 数据目录是否在默认位置")
        elif status["wechat_version"].startswith("4"):
            print("\n📌 检测到微信 4.x 版本")
            print("   使用 SQLCipher v4 加密（Page Size = 4096）")
            print("\n🔑 下一步：运行 get_wechat_key.py 获取解密密钥")
        else:
            print("\n📌 检测到微信 3.x 版本")
            print("   使用 SQLCipher v3 加密（Page Size = 1024）")
    
    def calculate_rfm(self, contact_data: Dict) -> Dict[str, Any]:
        """
        计算联系人 RFM 评分
        
        参数:
            contact_data: {
                "name": "联系人名称",
                "last_contact": datetime,  # 最近联系时间
                "messages": List[Dict],     # 消息列表
            }
        """
        now = datetime.now()
        
        # R - Recency (最近联系天数)
        last_contact = contact_data.get("last_contact", now)
        if isinstance(last_contact, str):
            last_contact = datetime.fromisoformat(last_contact)
        days_since = (now - last_contact).days
        
        r_score = 1
        for i, threshold in enumerate(RFM_CONFIG["recency_days"]):
            if days_since <= threshold:
                r_score = 5 - i
                break
        
        # F - Frequency (月均消息数)
        messages = contact_data.get("messages", [])
        total_messages = len(messages)
        
        # 假设统计最近30天
        f_score = 1
        for i, threshold in enumerate(RFM_CONFIG["frequency_count"]):
            if total_messages >= threshold:
                f_score = 5 - i
                break
        
        # M - Monetary (价值评分，基于关键词)
        value_score = 0
        for msg in messages:
            content = msg.get("content", "")
            for keyword, score in RFM_CONFIG["value_keywords"].items():
                if keyword in content:
                    value_score += score
        
        # 归一化 M 值到 1-5
        if value_score >= 50:
            m_score = 5
        elif value_score >= 30:
            m_score = 4
        elif value_score >= 15:
            m_score = 3
        elif value_score >= 5:
            m_score = 2
        else:
            m_score = 1
        
        # 计算综合评分
        total_score = r_score + f_score + m_score
        
        # 确定等级
        if total_score >= 13:
            level = "⭐⭐⭐⭐⭐"
            level_name = "高价值"
        elif total_score >= 10:
            level = "⭐⭐⭐⭐"
            level_name = "活跃"
        elif total_score >= 7:
            level = "⭐⭐⭐"
            level_name = "普通"
        elif total_score >= 4:
            level = "⭐⭐"
            level_name = "沉默"
        else:
            level = "⭐"
            level_name = "僵尸"
        
        return {
            "name": contact_data.get("name", "未知"),
            "R": r_score,
            "F": f_score,
            "M": m_score,
            "total": total_score,
            "level": level,
            "level_name": level_name,
            "days_since_contact": days_since,
            "message_count": total_messages,
            "value_score": value_score
        }
    
    def generate_daily_summary(self, date: Optional[str] = None) -> str:
        """
        生成每日聊天摘要
        
        参数:
            date: 日期字符串，默认为今天
        """
        if date is None or date == "today":
            target_date = datetime.now().strftime("%Y-%m-%d")
        else:
            target_date = date
        
        # 摘要模板
        summary = f"""
# 📊 每日微信摘要 - {target_date}

## 今日概览

| 指标 | 数值 |
|:-----|:-----|
| 总消息数 | 待分析 |
| 活跃联系人 | 待分析 |
| 活跃群聊 | 待分析 |

> ⚠️ 需要先解密数据库才能生成完整报告

## 使用说明

1. 获取数据库密钥（参考 SKILL.md）
2. 配置密钥到 config.yaml
3. 重新运行 `python wechat_manager.py summary`

---

生成时间：{datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
"""
        
        # 保存摘要
        output_file = self.output_dir / f"daily_summary_{target_date}.md"
        output_file.write_text(summary, encoding="utf-8")
        
        print(f"✅ 每日摘要已生成：{output_file}")
        return str(output_file)
    
    def generate_rfm_report(self, contacts: Optional[List[str]] = None) -> str:
        """
        生成 RFM 分析报告
        
        参数:
            contacts: 指定联系人列表，None 表示全部
        """
        report_date = datetime.now().strftime("%Y-%m-%d")
        
        # 报告模板
        report = f"""
# 📈 RFM 价值评估报告 - {report_date}

## 评估模型说明

| 维度 | 指标 | 权重 |
|:-----|:-----|:-----|
| **R** (Recency) | 最近联系天数 | 30% |
| **F** (Frequency) | 月均消息数 | 40% |
| **M** (Monetary) | 关键词价值分 | 30% |

## 等级定义

| 等级 | 分数范围 | 建议动作 |
|:-----|:---------|:---------|
| ⭐⭐⭐⭐⭐ | 13-15 | 重点维护，优先响应 |
| ⭐⭐⭐⭐ | 10-12 | 定期互动，转化潜力 |
| ⭐⭐⭐ | 7-9 | 节日问候，保持联系 |
| ⭐⭐ | 4-6 | 激活计划 |
| ⭐ | 1-3 | 考虑清理 |

## 分析结果

> ⚠️ 需要先解密数据库才能生成完整报告

| 联系人 | R | F | M | 总分 | 等级 |
|:-------|:--|:--|:--|:-----|:-----|
| (待分析) | - | - | - | - | - |

## 使用说明

1. 获取数据库密钥（参考 SKILL.md）
2. 配置密钥到 config.yaml
3. 重新运行 `python wechat_manager.py rfm`

---

生成时间：{datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
"""
        
        # 保存报告
        output_file = self.output_dir / f"rfm_report_{report_date}.md"
        output_file.write_text(report, encoding="utf-8")
        
        print(f"✅ RFM 报告已生成：{output_file}")
        return str(output_file)
    
    def analyze_contact(self, contact_name: str) -> str:
        """分析指定联系人"""
        report_date = datetime.now().strftime("%Y-%m-%d")
        
        report = f"""
# 🔍 联系人分析报告 - {contact_name}

## 基本信息

| 字段 | 值 |
|:-----|:---|
| 备注名 | {contact_name} |
| 分析日期 | {report_date} |

> ⚠️ 需要先解密数据库才能生成完整报告

## 待分析内容

- [ ] 互动统计
- [ ] RFM 评分
- [ ] 话题分布
- [ ] 互动趋势
- [ ] 关系建议

---

生成时间：{datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
"""
        
        output_file = self.output_dir / f"contact_{contact_name}_{report_date}.md"
        output_file.write_text(report, encoding="utf-8")
        
        print(f"✅ 联系人分析报告已生成：{output_file}")
        return str(output_file)
    
    def analyze_group(self, group_name: str) -> str:
        """分析指定群组"""
        report_date = datetime.now().strftime("%Y-%m-%d")
        
        report = f"""
# 👥 社群分析报告 - {group_name}

## 基本信息

| 字段 | 值 |
|:-----|:---|
| 群名称 | {group_name} |
| 分析日期 | {report_date} |

> ⚠️ 需要先解密数据库才能生成完整报告

## 待分析内容

- [ ] 成员数量
- [ ] 活跃度分析
- [ ] 成员画像
- [ ] 内容分析
- [ ] 运营建议

---

生成时间：{datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
"""
        
        output_file = self.output_dir / f"group_{group_name}_{report_date}.md"
        output_file.write_text(report, encoding="utf-8")
        
        print(f"✅ 社群分析报告已生成：{output_file}")
        return str(output_file)
    
    def generate_management_report(self) -> str:
        """生成综合管理报告"""
        report_date = datetime.now().strftime("%Y-%m-%d")
        status = self.check_status()
        
        report = f"""
# 📋 微信管理报告 - {report_date}

## 系统状态

| 项目 | 状态 |
|:-----|:-----|
| 微信进程 | {"✅ 运行中" if status["wechat_running"] else "❌ 未运行"} |
| 微信版本 | {status["wechat_version"]} |
| 数据目录 | {"✅ 已找到" if status["data_found"] else "❌ 未找到"} |
| 数据大小 | {status["data_size"]} |
| 数据库数量 | {status["db_count"]} 个 |
| 最后更新 | {status["last_modified"] or "未知"} |

## 功能模块状态

| 模块 | 状态 | 说明 |
|:-----|:-----|:-----|
| 数据采集 | ⏳ 待配置 | 需要获取数据库密钥 |
| 内容管理 | ⏳ 待配置 | 需要先完成数据采集 |
| AI 分析 | ⏳ 待配置 | 需要配置 AI API |
| 行为操作 | ⏳ 待启用 | 默认关闭，需手动启用 |

## 下一步行动

1. [ ] 获取数据库解密密钥
2. [ ] 配置 config.yaml
3. [ ] 测试数据导出功能
4. [ ] 生成首份 RFM 报告

## 输出目录

所有报告保存在：`{self.output_dir}`

---

生成时间：{datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
"""
        
        output_file = self.output_dir / f"management_report_{report_date}.md"
        output_file.write_text(report, encoding="utf-8")
        
        print(f"✅ 管理报告已生成：{output_file}")
        return str(output_file)


def main():
    """主函数"""
    parser = argparse.ArgumentParser(
        description="微信管理工具",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
使用示例:
  python wechat_manager.py status                    # 检查微信状态
  python wechat_manager.py export --contact "夏茜"   # 导出指定联系人
  python wechat_manager.py rfm                       # 生成RFM报告
  python wechat_manager.py analyze --contact "夏茜" # 分析联系人
  python wechat_manager.py analyze --group "创业群" # 分析群组
  python wechat_manager.py summary                   # 生成每日摘要
  python wechat_manager.py report                    # 生成管理报告
        """
    )
    
    subparsers = parser.add_subparsers(dest="command", help="可用命令")
    
    # status 命令
    subparsers.add_parser("status", help="检查微信状态")
    
    # export 命令
    export_parser = subparsers.add_parser("export", help="导出数据")
    export_parser.add_argument("--contact", help="指定联系人")
    export_parser.add_argument("--group", help="指定群组")
    export_parser.add_argument("--format", choices=["json", "csv", "html"], 
                               default="json", help="输出格式")
    
    # rfm 命令
    rfm_parser = subparsers.add_parser("rfm", help="RFM价值分析")
    rfm_parser.add_argument("--all", action="store_true", help="分析全部联系人")
    rfm_parser.add_argument("--contact", help="指定联系人")
    
    # analyze 命令
    analyze_parser = subparsers.add_parser("analyze", help="分析联系人/群组")
    analyze_parser.add_argument("--contact", help="分析指定联系人")
    analyze_parser.add_argument("--group", help="分析指定群组")
    
    # summary 命令
    summary_parser = subparsers.add_parser("summary", help="生成每日摘要")
    summary_parser.add_argument("--date", default="today", help="日期 (默认: today)")
    
    # report 命令
    subparsers.add_parser("report", help="生成管理报告")
    
    # like 命令
    like_parser = subparsers.add_parser("like", help="朋友圈点赞")
    like_parser.add_argument("--target", required=True, help="目标联系人")
    like_parser.add_argument("--count", type=int, default=5, help="点赞数量")
    
    # moments 命令
    moments_parser = subparsers.add_parser("moments", help="朋友圈操作")
    moments_parser.add_argument("--sync", action="store_true", help="同步朋友圈")
    
    args = parser.parse_args()
    
    # 初始化管理器
    manager = WeChatManager()
    
    # 执行命令
    if args.command == "status":
        manager.print_status()
        
    elif args.command == "export":
        print("⚠️  导出功能需要先配置数据库密钥")
        print("   请参考 SKILL.md 中的解密方案")
        
    elif args.command == "rfm":
        manager.generate_rfm_report()
        
    elif args.command == "analyze":
        if args.contact:
            manager.analyze_contact(args.contact)
        elif args.group:
            manager.analyze_group(args.group)
        else:
            print("❌ 请指定 --contact 或 --group 参数")
            
    elif args.command == "summary":
        manager.generate_daily_summary(args.date)
        
    elif args.command == "report":
        manager.generate_management_report()
        
    elif args.command == "like":
        print("⚠️  朋友圈点赞功能暂未实现")
        print("   此功能风险较高，建议谨慎使用")
        
    elif args.command == "moments":
        print("⚠️  朋友圈同步功能需要先配置数据库密钥")
        
    else:
        parser.print_help()


if __name__ == "__main__":
    main()

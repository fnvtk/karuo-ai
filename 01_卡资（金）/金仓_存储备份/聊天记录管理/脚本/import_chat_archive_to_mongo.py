#!/usr/bin/env python3
"""
对话归档目录导入 MongoDB（唯一性保证，不重复导入）
将 02_卡人（水）/水溪_整理归档/对话归档/ 目录下的所有 .txt 文件导入到 MongoDB

用法:
  python3 import_chat_archive_to_mongo.py          # 增量导入（跳过已存在的）
  python3 import_chat_archive_to_mongo.py --full   # 全量导入（强制覆盖）
  python3 import_chat_archive_to_mongo.py --stats  # 仅统计
"""

import argparse
import hashlib
import os
import re
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

try:
    from pymongo import MongoClient, UpdateOne
    from pymongo.errors import BulkWriteError
except ImportError:
    print("需要 pymongo: pip install pymongo")
    sys.exit(1)

MONGO_URI = "mongodb://admin:admin123@localhost:27017/?authSource=admin"
DB_NAME = "karuo_site"
ARCHIVE_BASE = Path("/Users/karuo/Documents/个人/卡若AI/02_卡人（水）/水溪_整理归档/对话归档")

# 项目分类规则（与 migrate_cursor_to_mongo.py 一致）
项目分类规则 = {
    "卡若AI": ["卡若AI", "karuo_ai", "BOOTSTRAP", "SKILL_REGISTRY", "五行", "卡若ai", "运营中枢", "技能", "SKILL.md"],
    "Soul创业": ["soul", "Soul", "soul创业", "卡若创业派对", "soul派对", "soul运营", "派对运营"],
    "存客宝": ["cunkebao", "存客宝", "触客宝", "touchkebao"],
    "玩值电竞": ["玩值", "wanzhi", "wanzhi_esports", "wzdj"],
    "数据处理": ["数据中台", "datacenter", "KR_", "SG_", "导入mongo", "mongo数据库", "集合导入", "嘟嘟牛", "社工", "MongoDB迁移", "数据库迁移", "数据库恢复", "数据库优化", "/Users/karuo/数据库"],
    "神射手": ["shensheshou", "神射手"],
    "上帝之眼": ["上帝之眼", "god_eye", "量化交易"],
    "服务器": ["服务器", "宝塔", "nginx", "SSL", "502", "腾讯云", "部署", "docker", "Docker"],
    "设备管理": ["ADB", "投屏", "scrcpy", "局域网", "远程控制", "192.168"],
    "群晖NAS": ["群晖", "Synology", "NAS", "CKBNAS", "nas_init", "1825", "smb://", "NAS部署", "USB连接"],
    "飞书": ["飞书", "feishu", "lark", "妙记", "飞书妙记", "智能纪要", "飞书日志"],
    "微信管理": ["微信", "WeChat", "微信存储", "社群占用"],
    "工具维护": ["cursor", "state.vscdb", "icloud", "docker", "Docker", "硬盘", "磁盘", "空间", "node_modules", ".next", "清理", "输入法", "搜狗", "下载目录", "整理下载", "文件分类", "无法安装", "快捷方式", "进程", "快捷键", "GitHub", "Gitea", "fnvtk", "token"],
    "个人": ["/个人/", "/1、卡若", "日记", "记忆", "iPhone", "相册", "MacBook相册", "Photos"],
    "开发": ["/开发/", "知己", "项目模板", "智能项目生成", "金：项目", "银掌柜", "续茄", "小程序", "腾讯书籍", "分销模块", "前后端整合", "package.json", "开发文档", "开发模板", "MBTI", "route.ts", "page.tsx", "wxml", "wxss"],
}


def 检测项目(文件路径: str, 名称: str = "", 内容: str = "") -> str:
    """根据文件路径、名称、内容检测项目分类"""
    搜索文本 = f"{文件路径} {名称} {内容[:2000]}"
    搜索文本_lower = 搜索文本.lower()
    
    项目得分 = {}
    for 项目, 关键词列表 in 项目分类规则.items():
        得分 = 0
        for kw in 关键词列表:
            if kw.lower() in 搜索文本_lower:
                # 文件路径匹配权重最高
                if kw.lower() in 文件路径.lower():
                    得分 += 3
                # 名称匹配权重中等
                elif kw.lower() in 名称.lower():
                    得分 += 2
                # 内容匹配权重较低
                else:
                    得分 += 1
        项目得分[项目] = 得分
    
    if 项目得分:
        最高项目 = max(项目得分.items(), key=lambda x: x[1])
        if 最高项目[1] > 0:
            return 最高项目[0]
    
    return "未分类"


def 生成唯一ID(文件路径: Path) -> str:
    """基于文件路径、大小、修改时间生成唯一ID（确保唯一性）"""
    try:
        stat = 文件路径.stat()
        # 使用相对路径（相对于归档目录）作为基础
        相对路径 = str(文件路径.relative_to(ARCHIVE_BASE))
        # 组合：相对路径 + 大小 + 修改时间
        唯一标识 = f"{相对路径}:{stat.st_size}:{int(stat.st_mtime)}"
        # 生成 SHA256 hash 作为对话ID（固定长度，避免过长）
        return hashlib.sha256(唯一标识.encode("utf-8")).hexdigest()[:32]
    except Exception:
        # 降级：仅使用文件名
        return hashlib.sha256(str(文件路径).encode("utf-8")).hexdigest()[:32]


def 解析对话文件(文件路径: Path) -> tuple[list, str, str]:
    """
    解析对话文件，提取消息列表、首条用户消息、对话名称
    返回: (消息列表, 首条用户消息, 对话名称)
    """
    try:
        内容 = 文件路径.read_text(encoding="utf-8", errors="ignore")
    except Exception as e:
        print(f"  读取失败 {文件路径}: {e}")
        return [], "", ""
    
    if not 内容.strip():
        return [], "", ""
    
    消息列表 = []
    首条用户消息 = ""
    对话名称 = ""
    
    # 解析 user/assistant 格式
    # 匹配模式：user: 或 assistant: 开头，后面跟内容
    当前角色 = None
    当前内容 = []
    
    for line in 内容.split("\n"):
        line = line.strip()
        if not line:
            continue
        
        # 检查是否是角色标记
        if line.startswith("user:") or line.startswith("assistant:"):
            # 保存上一条消息
            if 当前角色 and 当前内容:
                消息文本 = "\n".join(当前内容).strip()
                if 消息文本:
                    消息列表.append({
                        "角色": 当前角色,
                        "内容": 消息文本,
                    })
                    # 提取首条用户消息
                    if 当前角色 == "用户" and not 首条用户消息:
                        首条用户消息 = 消息文本[:500]
                        # 从首条消息提取对话名称（去除 <user_query> 标签）
                        名称文本 = re.sub(r"<[^>]+>", "", 消息文本).strip()
                        对话名称 = " ".join(名称文本.split()[:10])[:80] or "未命名对话"
            
            # 开始新消息
            当前角色 = "用户" if line.startswith("user:") else "AI"
            当前内容 = [line[line.index(":") + 1:].strip()] if ":" in line else []
        else:
            # 继续当前消息内容
            if 当前角色:
                当前内容.append(line)
    
    # 保存最后一条消息
    if 当前角色 and 当前内容:
        消息文本 = "\n".join(当前内容).strip()
        if 消息文本:
            消息列表.append({
                "角色": 当前角色,
                "内容": 消息文本,
            })
            if 当前角色 == "用户" and not 首条用户消息:
                首条用户消息 = 消息文本[:500]
                名称文本 = re.sub(r"<[^>]+>", "", 消息文本).strip()
                对话名称 = " ".join(名称文本.split()[:10])[:80] or "未命名对话"
    
    # 如果没有解析到消息，尝试从文件名提取名称
    if not 对话名称:
        文件名 = 文件路径.stem
        # 尝试从文件名提取（去除 UUID 后缀）
        名称部分 = re.sub(r"_[a-f0-9-]{32,}$", "", 文件名)
        if 名称部分:
            对话名称 = 名称部分[:80]
        else:
            对话名称 = 文件名[:80] or "未命名对话"
    
    return 消息列表, 首条用户消息, 对话名称


def 创建索引(db):
    """创建 MongoDB 索引"""
    对话集 = db["对话记录"]
    
    # 先删除可能存在的旧索引
    try:
        对话集.drop_index("来源文件路径_1")
    except Exception:
        pass
    
    # 清理 null 值的来源文件路径（为已存在的记录生成临时唯一值）
    null_count = 对话集.count_documents({"$or": [{"来源文件路径": None}, {"来源文件路径": {"$exists": False}}]})
    if null_count > 0:
        print(f"发现 {null_count} 条记录的来源文件路径为 null，正在清理...")
        # 为这些记录生成临时唯一值
        for doc in 对话集.find({"$or": [{"来源文件路径": None}, {"来源文件路径": {"$exists": False}}]}):
            临时路径 = f"legacy-{doc.get('对话ID', 'unknown')}-{doc.get('_id', 'unknown')}"
            对话集.update_one(
                {"_id": doc["_id"]},
                {"$set": {"来源文件路径": 临时路径}}
            )
    
    对话集.create_index("对话ID", unique=True)
    # 创建唯一索引（使用 sparse，只对存在的非 null 值唯一）
    try:
        对话集.create_index([("来源文件路径", 1)], unique=True, sparse=True)
    except Exception as e:
        print(f"创建来源文件路径索引失败（可能已存在）: {e}")
    
    对话集.create_index("项目")
    对话集.create_index("创建时间")
    
    消息集 = db["消息内容"]
    消息集.create_index([("对话ID", 1), ("消息ID", 1)], unique=True)
    消息集.create_index("对话ID")
    消息集.create_index("创建时间")
    
    db["项目分类"].create_index("名称", unique=True)
    print("索引创建完成")


def 导入对话归档(db, full_mode=False):
    """导入对话归档目录的所有 .txt 文件"""
    if not ARCHIVE_BASE.exists():
        print(f"对话归档目录不存在: {ARCHIVE_BASE}")
        return
    
    print(f"\n{'=' * 50}")
    print(f"导入对话归档目录 ({'全量' if full_mode else '增量'})")
    print(f"目录: {ARCHIVE_BASE}")
    print(f"{'=' * 50}")
    
    # 查找所有 .txt 文件
    所有文件 = list(ARCHIVE_BASE.rglob("*.txt"))
    print(f"扫描到 {len(所有文件)} 个对话文件")
    
    # 获取已存在的文件路径（用于去重）
    已有文件路径 = set()
    if not full_mode:
        for doc in db["对话记录"].find({"来源": "对话归档"}, {"来源文件路径": 1}):
            if "来源文件路径" in doc:
                已有文件路径.add(doc["来源文件路径"])
        print(f"已存在 {len(已有文件路径)} 个对话（将跳过）")
    
    总对话 = 0
    新增对话 = 0
    跳过对话 = 0
    总消息 = 0
    项目计数 = defaultdict(int)
    错误文件 = []
    
    批量操作_对话 = []
    批量操作_消息 = []
    批量大小 = 100
    
    for 文件路径 in 所有文件:
        总对话 += 1
        
        # 生成相对路径作为唯一标识
        相对路径 = str(文件路径.relative_to(ARCHIVE_BASE))
        
        # 检查是否已存在（增量模式）
        if not full_mode and 相对路径 in 已有文件路径:
            跳过对话 += 1
            if 总对话 % 50 == 0:
                print(f"  处理进度: {总对话}/{len(所有文件)} (跳过: {跳过对话}, 新增: {新增对话})", end="\r")
            continue
        
        # 解析对话文件
        消息列表, 首条用户消息, 对话名称 = 解析对话文件(文件路径)
        
        if not 消息列表:
            错误文件.append(相对路径)
            continue
        
        # 生成唯一对话ID
        对话ID = 生成唯一ID(文件路径)
        
        # 检测项目分类
        项目 = 检测项目(相对路径, 对话名称, 首条用户消息)
        项目计数[项目] += 1
        
        # 获取文件修改时间
        try:
            文件修改时间 = datetime.fromtimestamp(文件路径.stat().st_mtime, tz=timezone.utc)
        except Exception:
            文件修改时间 = datetime.now(timezone.utc)
        
        # 构建对话记录
        对话文档 = {
            "对话ID": 对话ID,
            "名称": 对话名称,
            "项目": 项目,
            "标签": ["对话归档"],
            "创建时间": 文件修改时间,
            "更新时间": datetime.now(timezone.utc),
            "消息数量": len(消息列表),
            "是否Agent": True,
            "首条消息": 首条用户消息,
            "来源": "对话归档",
            "来源文件路径": 相对路径,  # 用于唯一性检查
            "来源完整路径": str(文件路径),
            "导入时间": datetime.now(timezone.utc),
        }
        
        批量操作_对话.append(
            UpdateOne(
                {"来源文件路径": 相对路径},  # 使用文件路径作为唯一键
                {"$set": 对话文档},
                upsert=True,
            )
        )
        
        # 构建消息内容
        for idx, 消息 in enumerate(消息列表):
            消息ID = f"msg-{idx + 1}"
            消息文档 = {
                "对话ID": 对话ID,
                "消息ID": 消息ID,
                "类型": 1 if 消息["角色"] == "用户" else 2,
                "角色": 消息["角色"],
                "内容": 消息["内容"][:50000],  # 限制长度
                "创建时间": 文件修改时间,
                "是否Agent": True,
                "工具调用数": 0,
                "代码块数": 0,
            }
            
            批量操作_消息.append(
                UpdateOne(
                    {"对话ID": 对话ID, "消息ID": 消息ID},
                    {"$set": 消息文档},
                    upsert=True,
                )
            )
            总消息 += 1
        
        新增对话 += 1
        
        # 批量写入
        if len(批量操作_对话) >= 批量大小:
            try:
                db["对话记录"].bulk_write(批量操作_对话, ordered=False)
            except BulkWriteError:
                pass
            批量操作_对话 = []
        
        if len(批量操作_消息) >= 批量大小:
            try:
                db["消息内容"].bulk_write(批量操作_消息, ordered=False)
            except BulkWriteError:
                pass
            批量操作_消息 = []
        
        if 总对话 % 50 == 0:
            print(f"  处理进度: {总对话}/{len(所有文件)} (跳过: {跳过对话}, 新增: {新增对话})", end="\r")
    
    # 写入剩余数据
    if 批量操作_对话:
        try:
            db["对话记录"].bulk_write(批量操作_对话, ordered=False)
        except BulkWriteError:
            pass
    
    if 批量操作_消息:
        try:
            db["消息内容"].bulk_write(批量操作_消息, ordered=False)
        except BulkWriteError:
            pass
    
    print(f"\n导入完成:")
    print(f"  总文件数: {总对话}")
    print(f"  新增对话: {新增对话}")
    print(f"  跳过对话: {跳过对话}")
    print(f"  总消息数: {总消息}")
    print(f"  错误文件: {len(错误文件)}")
    
    if 错误文件:
        print(f"\n错误文件列表（前10个）:")
        for f in 错误文件[:10]:
            print(f"    {f}")
    
    # 更新项目分类统计
    print("\n项目分布:")
    for 项目, 数量 in sorted(项目计数.items(), key=lambda x: -x[1]):
        print(f"  {项目}: {数量}")
        db["项目分类"].update_one(
            {"名称": 项目},
            {"$set": {"名称": 项目, "更新时间": datetime.now(timezone.utc)}, "$inc": {"对话数": 数量}},
            upsert=True,
        )


def 打印统计(db):
    """打印 MongoDB 统计信息"""
    print(f"\n{'=' * 50}")
    print("MongoDB 统计")
    print(f"{'=' * 50}")
    
    总对话 = db["对话记录"].count_documents({})
    总消息 = db["消息内容"].count_documents({})
    归档对话 = db["对话记录"].count_documents({"来源": "对话归档"})
    
    print(f"总对话数: {总对话}")
    print(f"总消息数: {总消息}")
    print(f"对话归档来源: {归档对话}")
    
    pipeline = [
        {"$group": {"_id": "$项目", "数量": {"$sum": 1}}},
        {"$sort": {"数量": -1}},
    ]
    print("\n项目分布:")
    for doc in db["对话记录"].aggregate(pipeline):
        print(f"  {doc['_id']}: {doc['数量']}")


def main():
    parser = argparse.ArgumentParser(description="对话归档目录导入 MongoDB")
    parser.add_argument("--full", action="store_true", help="全量导入（强制覆盖）")
    parser.add_argument("--stats", action="store_true", help="仅统计，不导入")
    args = parser.parse_args()
    
    print("连接 MongoDB...")
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    try:
        client.admin.command("ping")
    except Exception as e:
        print(f"连接失败: {e}")
        sys.exit(1)
    
    db = client[DB_NAME]
    创建索引(db)
    
    if args.stats:
        打印统计(db)
    else:
        导入对话归档(db, full_mode=args.full)
        打印统计(db)
    
    client.close()
    print("\n完成！")


if __name__ == "__main__":
    main()

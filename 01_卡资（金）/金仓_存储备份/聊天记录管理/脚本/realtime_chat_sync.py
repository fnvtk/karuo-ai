#!/usr/bin/env python3
"""
实时对话同步与优化迭代
每条 Cursor 会话：同一 对话ID 写入 Mongo 至多每 **1 小时** 一次；未满 1 小时则跳过（减负载）。
满 1 小时再次同步时，默认只 **增量 upsert**「上次同步时间点之后」的新消息；全量见 --force / --sync-all。
导入时 **去掉** 仅空白/无正文的占位气泡（不写库；若库中已有则 delete）。

用法（由卡若AI自动调用）:
  python3 realtime_chat_sync.py
  python3 realtime_chat_sync.py --current-conversation-id <对话ID>
  python3 realtime_chat_sync.py --sync-all              # 全量；**不**按小时节流
  python3 realtime_chat_sync.py --force                 # 强制同步当前会话（忽略小时节流 + 全量消息）
  python3 realtime_chat_sync.py --ensure-indexes
  python3 realtime_chat_sync.py --optimize-classification
  python3 realtime_chat_sync.py --stats
  python3 realtime_chat_sync.py --only-new
"""

import argparse
import json
import os
import sqlite3
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

# 保证从任意目录运行都能找到 chat_fallback
_script_dir = Path(__file__).resolve().parent
if str(_script_dir) not in sys.path:
    sys.path.insert(0, str(_script_dir))

try:
    from pymongo import MongoClient, UpdateOne
    from pymongo.errors import BulkWriteError, ServerSelectionTimeoutError
except ImportError:
    print("需要 pymongo: pip install pymongo")
    sys.exit(1)

import chat_fallback as _fallback

MONGO_URI = "mongodb://admin:admin123@localhost:27017/?authSource=admin"
DB_NAME = "karuo_site"
STATE_VSCDB = os.path.expanduser(
    "~/Library/Application Support/Cursor/User/globalStorage/state.vscdb"
)

# 项目分类规则（从auto_archive.py继承并扩展）
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


def 检测项目(文件路径: List[str], 名称: str = "", 内容: str = "") -> str:
    """智能项目分类（支持多关键词匹配和权重计算）"""
    搜索文本 = " ".join(文件路径) + " " + 名称 + " " + 内容
    搜索文本_lower = 搜索文本.lower()
    
    项目得分 = {}
    for 项目, 关键词列表 in 项目分类规则.items():
        得分 = 0
        for kw in 关键词列表:
            if kw.lower() in 搜索文本_lower:
                # 文件名匹配权重更高
                if any(kw.lower() in p.lower() for p in 文件路径):
                    得分 += 3
                # 名称匹配权重中等
                elif kw.lower() in 名称.lower():
                    得分 += 2
                # 内容匹配权重较低
                else:
                    得分 += 1
        项目得分[项目] = 得分
    
    if 项目得分:
        # 返回得分最高的项目
        最高项目 = max(项目得分.items(), key=lambda x: x[1])
        if 最高项目[1] > 0:
            return 最高项目[0]
    
    return "未分类"


def 提取标签(内容: str, 项目: str) -> List[str]:
    """从对话内容中提取标签"""
    标签 = []
    
    # 基于项目的标签
    if 项目 != "未分类":
        标签.append(项目)
    
    # 关键词标签
    关键词标签 = {
        "bug修复": ["bug", "错误", "修复", "问题", "报错"],
        "功能开发": ["开发", "实现", "功能", "新增"],
        "优化": ["优化", "改进", "提升", "性能"],
        "部署": ["部署", "上线", "发布", "docker"],
        "数据分析": ["数据", "分析", "统计", "报表"],
        "文档": ["文档", "说明", "手册", "README"],
    }
    
    for 标签名, 关键词列表 in 关键词标签.items():
        if any(kw in 内容 for kw in 关键词列表):
            标签.append(标签名)
    
    return list(set(标签))  # 去重


def 生成摘要(消息列表: List[Dict]) -> str:
    """生成对话摘要"""
    if not 消息列表:
        return ""
    
    # 提取用户前3条消息的关键信息
    用户消息 = [m.get("内容", "") for m in 消息列表 if m.get("角色") == "用户"][:3]
    摘要 = " | ".join([msg[:100] for msg in 用户消息 if msg])
    
    if len(摘要) > 300:
        摘要 = 摘要[:300] + "..."
    
    return 摘要


def 时间戳转时间(ts_ms):
    """时间戳转datetime"""
    if not ts_ms:
        return None
    try:
        return datetime.fromtimestamp(ts_ms / 1000, tz=timezone.utc)
    except (ValueError, OSError):
        return None


def _ensure_utc(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None or not isinstance(dt, datetime):
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def 规范化消息正文(s: Any) -> str:
    """统一换行、strip；仅空白则空串（不入库）。"""
    if not isinstance(s, str):
        return ""
    t = s.replace("\r\n", "\n").replace("\r", "\n").strip()
    return t


SYNC_INTERVAL_SEC = 3600


def 刷新项目分类汇总(db: Any) -> None:
    """按 对话记录.项目 聚合，写入 项目分类（名称、对话数），供 Navicat 与控制台统计。"""
    now = datetime.now(timezone.utc)
    pipeline = [
        {"$group": {"_id": {"$ifNull": ["$项目", "未分类"]}, "对话数": {"$sum": 1}}},
    ]
    for doc in db["对话记录"].aggregate(pipeline):
        name = doc["_id"]
        if name is None or name == "":
            name = "未分类"
        name = str(name)
        db["项目分类"].update_one(
            {"名称": name},
            {"$set": {"名称": name, "对话数": int(doc["对话数"]), "更新时间": now}},
            upsert=True,
        )


def 实时同步对话(
    对话ID: str,
    强制: bool = False,
    db: Any = None,
    仅新对话: bool = False,
    刷新分类汇总: bool = True,
    忽略小时节流: bool = False,
) -> Optional[Dict]:
    """
    同步指定对话到 MongoDB（对话记录 upsert + 消息内容按 对话ID+消息ID upsert）。

    - 默认：同一 对话ID 距上次 `mongo_sync_last_at` 不足 1 小时则 **整段跳过**（不写库）。
    - 满 1 小时：更新 `对话记录`；`消息内容` 默认只写入 **创建时间晚于上次同步** 的新消息（+ 去掉空白正文）。
    - `--force` 或 `忽略小时节流=True`（如 --sync-all）：不按小时跳过；`强制` 时消息为 **全量** upsert。

    Args:
        忽略小时节流: True 时用于 --sync-all，每条对话都写，且消息全量
    """
    if not os.path.exists(STATE_VSCDB):
        print(f"⚠️ state.vscdb 不存在: {STATE_VSCDB}")
        return None

    own_client = False
    client = None
    if db is None:
        try:
            client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
            client.admin.command("ping")
            db = client[DB_NAME]
            own_client = True
        except (ServerSelectionTimeoutError, Exception) as e:
            print(f"⚠️ MongoDB 连接失败: {e}")
            return None

    try:
        if 仅新对话 and not 强制:
            已有 = db["对话记录"].find_one({"对话ID": 对话ID})
            if 已有:
                print(f"⏭️ 已存在（仅新对话模式跳过）: {对话ID[:8]}...")
                return 已有

        now = datetime.now(timezone.utc)
        existing = db["对话记录"].find_one({"对话ID": 对话ID})
        last_sync_at = _ensure_utc(existing.get("mongo_sync_last_at")) if existing else None

        if not 忽略小时节流 and not 强制 and last_sync_at is not None:
            elapsed = (now - last_sync_at).total_seconds()
            if elapsed < SYNC_INTERVAL_SEC:
                print(
                    f"⏭️ 距上次写入 Mongo 不足 1 小时（{int(elapsed)}s / 阈值 {SYNC_INTERVAL_SEC}s），跳过: {对话ID[:8]}…（--force 或全量 --sync-all 可绕过）"
                )
                return existing

        # 从 state.vscdb 读取对话数据
        conn = sqlite3.connect(STATE_VSCDB)
        cursor = conn.cursor()
        try:
            cursor.execute("SELECT value FROM cursorDiskKV WHERE key = ?", (f"composerData:{对话ID}",))
            row = cursor.fetchone()
            if not row:
                print(f"⚠️ 对话不存在于state.vscdb: {对话ID[:8]}...")
                return None
            data = json.loads(row[0])
        except (json.JSONDecodeError, TypeError) as e:
            print(f"⚠️ 解析对话数据失败: {e}")
            return None
        finally:
            conn.close()

        headers = data.get("fullConversationHeadersOnly", [])
        if not headers:
            print(f"⚠️ 对话无消息: {对话ID[:8]}...")
            return None

        ctx = data.get("context", {})
        文件路径 = [
            f.get("uri", {}).get("fsPath", "")
            for f in ctx.get("fileSelections", [])
            if f.get("uri", {}).get("fsPath")
        ]
        名称 = data.get("name", "") or ""
        副标题 = data.get("subtitle", "") or ""

        消息内容列表 = []
        消息ID列表 = [h.get("bubbleId", "") for h in headers if h.get("bubbleId")]
        首条 = ""

        conn = sqlite3.connect(STATE_VSCDB)
        cursor = conn.cursor()
        for mid in 消息ID列表:
            cursor.execute(
                "SELECT value FROM cursorDiskKV WHERE key = ?",
                (f"bubbleId:{对话ID}:{mid}",),
            )
            r = cursor.fetchone()
            if not r:
                continue
            try:
                mdata = json.loads(r[0])
            except (json.JSONDecodeError, TypeError):
                continue
            类型 = mdata.get("type", 0)
            内容 = 规范化消息正文(mdata.get("text", "") or "")
            角色 = "用户" if 类型 == 1 else "AI"
            if 类型 == 1 and not 首条 and 内容:
                首条 = 内容[:500]
            消息内容列表.append({"角色": 角色, "内容": 内容})
        conn.close()

        所有内容 = " ".join([m.get("内容", "") for m in 消息内容列表[:10]])
        项目 = 检测项目(文件路径, 名称, 所有内容)
        标签 = 提取标签(所有内容, 项目)
        摘要 = 生成摘要(消息内容列表)

        全量消息模式 = bool(强制 or 忽略小时节流 or last_sync_at is None)

        对话文档 = {
            "对话ID": 对话ID,
            "名称": 名称 or f"对话 {对话ID[:8]}",
            "副标题": 副标题 or 摘要[:200],
            "项目": 项目,
            "标签": 标签,
            "创建时间": 时间戳转时间(data.get("createdAt")) or now,
            "更新时间": now,
            "消息数量": len(headers),
            "是否Agent": data.get("isAgentic", False),
            "模型配置": data.get("modelConfig", {}),
            "关联文件": 文件路径[:50],
            "首条消息": 首条,
            "来源": "实时同步",
            "来源工作区": "",
            "迁移时间": now,
            "同步版本": "2.1",
            "mongo_sync_last_at": now,
        }

        db["对话记录"].update_one(
            {"对话ID": 对话ID},
            {"$set": 对话文档},
            upsert=True,
        )

        消息ops = []
        for mid in 消息ID列表:
            conn = sqlite3.connect(STATE_VSCDB)
            cursor = conn.cursor()
            cursor.execute(
                "SELECT value FROM cursorDiskKV WHERE key = ?",
                (f"bubbleId:{对话ID}:{mid}",),
            )
            r = cursor.fetchone()
            conn.close()
            if not r:
                continue
            try:
                mdata = json.loads(r[0])
            except (json.JSONDecodeError, TypeError):
                continue
            类型 = mdata.get("type", 0)
            raw_text = mdata.get("text", "") or ""
            内容 = 规范化消息正文(raw_text)
            timing = mdata.get("timingInfo", {})
            创建时间 = (
                时间戳转时间(timing.get("clientRpcSendTime"))
                if timing.get("clientRpcSendTime")
                else now
            )

            if not 内容:
                try:
                    db["消息内容"].delete_one({"对话ID": 对话ID, "消息ID": mid})
                except Exception:
                    pass
                continue

            if not 全量消息模式 and last_sync_at is not None:
                ct = _ensure_utc(创建时间) or now
                if ct <= last_sync_at:
                    continue

            消息ops.append(
                UpdateOne(
                    {"对话ID": 对话ID, "消息ID": mid},
                    {
                        "$set": {
                            "对话ID": 对话ID,
                            "消息ID": mid,
                            "类型": 类型,
                            "角色": "用户" if 类型 == 1 else "AI",
                            "内容": 内容,
                            "创建时间": 创建时间,
                            "是否Agent": mdata.get("isAgentic", False),
                            "Token用量": mdata.get("tokenCount", {}),
                            "工具调用数": len(mdata.get("toolResults", []) or []),
                            "代码块数": len(mdata.get("codeBlocks", []) or []),
                        }
                    },
                    upsert=True,
                )
            )

        if 消息ops:
            try:
                db["消息内容"].bulk_write(消息ops, ordered=False)
            except BulkWriteError as bwe:
                print(f"⚠️ 部分消息写入异常（可执行 ensure_mongo_chat_indexes.py 去重后建唯一索引）: {bwe.details}")

        try:
            _fallback.追加一条(对话文档)
        except Exception:
            pass

        if 刷新分类汇总:
            try:
                刷新项目分类汇总(db)
            except Exception as ex:
                print(f"⚠️ 项目分类汇总失败: {ex}")

        mode_tip = "全量消息" if 全量消息模式 else "增量消息（自 mongo_sync_last_at 起新气泡）"
        print(
            f"✅ 同步完成: [{项目}] {名称 or 对话ID[:8]} ({len(headers)} 条头, {len(消息ops)} 条写入, {len(标签)} 标签, {mode_tip})"
        )
        return 对话文档

    except Exception as e:
        print(f"❌ 同步失败: {e}")
        return None
    finally:
        if own_client and client is not None:
            client.close()


def 优化分类规则(db):
    """基于历史数据优化分类规则"""
    print("🔄 开始优化分类规则...")
    
    # 统计未分类对话的关键词
    未分类对话 = list(db["对话记录"].find({"项目": "未分类"}, {"名称": 1, "首条消息": 1, "关联文件": 1}).limit(100))
    
    if not 未分类对话:
        print("✅ 无未分类对话，分类规则良好")
        return
    
    关键词统计 = {}
    for 对话 in 未分类对话:
        文本 = f"{对话.get('名称', '')} {对话.get('首条消息', '')} {' '.join(对话.get('关联文件', []))}"
        # 简单提取关键词（实际可以用更复杂的NLP）
        words = 文本.lower().split()
        for word in words:
            if len(word) > 3:  # 忽略太短的词
                关键词统计[word] = 关键词统计.get(word, 0) + 1
    
    # 输出高频关键词建议
    if 关键词统计:
        高频词 = sorted(关键词统计.items(), key=lambda x: x[1], reverse=True)[:10]
        print("📊 未分类对话高频关键词（建议加入分类规则）:")
        for 词, 频次 in 高频词:
            print(f"  - {词}: {频次}次")
    
    print("✅ 分类规则优化完成")


def 显示统计(db):
    """显示同步统计"""
    try:
        总数 = db["对话记录"].count_documents({})
        实时同步数 = db["对话记录"].count_documents({"来源": "实时同步"})
        项目统计 = {}
        
        for 对话 in db["对话记录"].find({}, {"项目": 1}):
            项目 = 对话.get("项目", "未知")
            项目统计[项目] = 项目统计.get(项目, 0) + 1
        
        print(f"\n📊 对话同步统计")
        print(f"总对话数: {总数}")
        print(f"实时同步数: {实时同步数}")
        print(f"\n📁 项目分布:")
        for 项目, 数量 in sorted(项目统计.items(), key=lambda x: x[1], reverse=True):
            print(f"  {项目}: {数量}")
        
    except Exception as e:
        print(f"❌ 统计失败: {e}")


def main():
    parser = argparse.ArgumentParser(description="实时对话同步与优化迭代")
    parser.add_argument("--current-conversation-id", type=str, help="当前对话ID（从Cursor获取）")
    parser.add_argument("--sync-all", action="store_true", help="同步 state.vscdb 内全部对话（upsert，同一消息键不重复）")
    parser.add_argument(
        "--only-new",
        action="store_true",
        dest="only_new",
        help="仅同步库中尚不存在 对话ID 的会话（跳过已在 对话记录 中的 ID）",
    )
    parser.add_argument(
        "--ensure-indexes",
        action="store_true",
        dest="ensure_indexes",
        help="运行 ensure_mongo_chat_indexes.py 去重并创建唯一索引后退出",
    )
    parser.add_argument("--optimize-classification", action="store_true", help="优化分类规则")
    parser.add_argument("--stats", action="store_true", help="显示统计")
    parser.add_argument("--force", action="store_true", help="强制更新已存在的对话")
    args = parser.parse_args()

    if args.ensure_indexes:
        script = _script_dir / "ensure_mongo_chat_indexes.py"
        subprocess.run([sys.executable, str(script)], check=False)
        return

    # 连接MongoDB
    try:
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
        client.admin.command("ping")
        db = client[DB_NAME]
    except (ServerSelectionTimeoutError, Exception) as e:
        print(f"❌ MongoDB 连接失败: {e}")
        sys.exit(1)

    if args.stats:
        显示统计(db)
    elif args.optimize_classification:
        优化分类规则(db)
    elif args.sync_all:
        if not os.path.exists(STATE_VSCDB):
            print(f"⚠️ state.vscdb 不存在")
            client.close()
            sys.exit(1)
        conn = sqlite3.connect(STATE_VSCDB)
        cur = conn.cursor()
        cur.execute("SELECT key FROM cursorDiskKV WHERE key LIKE 'composerData:%'")
        cids = [row[0].replace("composerData:", "") for row in cur.fetchall()]
        conn.close()
        print(f"🔄 全量同步: 共 {len(cids)} 个 composer 对话")
        ok = fail = 0
        for i, cid in enumerate(cids):
            print(f"  [{i + 1}/{len(cids)}] {cid[:12]}…")
            r = 实时同步对话(
                cid,
                强制=args.force,
                db=db,
                仅新对话=args.only_new,
                刷新分类汇总=False,
                忽略小时节流=True,
            )
            if r:
                ok += 1
            else:
                fail += 1
        try:
            刷新项目分类汇总(db)
            print("✅ 已刷新 项目分类 汇总")
        except Exception as e:
            print(f"⚠️ 项目分类汇总失败: {e}")
        print(f"✅ 批量结束: 成功 {ok}，失败 {fail}")
    elif args.current_conversation_id:
        实时同步对话(
            args.current_conversation_id,
            强制=args.force,
            仅新对话=args.only_new,
        )
    else:
        # 默认：扫描最新对话并同步
        print("🔄 扫描最新对话...")
        if not os.path.exists(STATE_VSCDB):
            print(f"⚠️ state.vscdb 不存在")
            sys.exit(1)
        
        conn = sqlite3.connect(STATE_VSCDB)
        cursor = conn.cursor()
        cursor.execute("SELECT key, value FROM cursorDiskKV WHERE key LIKE 'composerData:%'")
        rows = cursor.fetchall()
        conn.close()

        最佳 = None
        最佳时间 = 0
        for key, value in rows:
            cid = key.replace("composerData:", "")
            try:
                data = json.loads(value)
            except (json.JSONDecodeError, TypeError):
                continue
            ts = data.get("createdAt") or data.get("lastUpdatedAt") or 0
            try:
                tsn = int(ts)
            except (TypeError, ValueError):
                tsn = 0
            if tsn >= 最佳时间:
                最佳时间 = tsn
                最佳 = cid

        if 最佳:
            print(f"📝 找到最近更新对话: {最佳[:8]}... (createdAt/lastUpdatedAt)")
            实时同步对话(最佳, 强制=args.force, 仅新对话=args.only_new)
        else:
            print("⚠️ 未找到可解析的 composerData 对话")

    client.close()


if __name__ == "__main__":
    main()

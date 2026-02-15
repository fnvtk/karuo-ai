#!/usr/bin/env python3
"""
Cursor Agent 迁移工具 v1.0

功能：
  1. 列出指定工作台的所有 Agent 对话
  2. 将 Agent 从一个工作台迁移到另一个工作台（侧栏可见）
  3. 导出 Agent 对话内容为 Markdown 文件
  4. 搜索全局 Agent（按名称关键词）

用法：
  python3 cursor_agent_migrate.py list <workspace_name_or_path>
  python3 cursor_agent_migrate.py search <keyword>
  python3 cursor_agent_migrate.py migrate <source_ws> <target_ws> [--agent <name_or_id>] [--all]
  python3 cursor_agent_migrate.py export <workspace_name_or_path> [--agent <name_or_id>] [--all] [--output <dir>]

示例：
  # 列出"个人"工作台的所有 Agent
  python3 cursor_agent_migrate.py list 个人

  # 搜索包含"分布式"的 Agent
  python3 cursor_agent_migrate.py search 分布式

  # 将"分布式算力矩阵"Agent 从"个人"迁移到"分布式算力矩阵"工作台
  python3 cursor_agent_migrate.py migrate 个人 分布式算力矩阵 --agent 分布式算力矩阵

  # 导出"个人"工作台所有 Agent 为 Markdown
  python3 cursor_agent_migrate.py export 个人 --all --output ./agent_exports

作者：卡若AI · 金仓
"""

import sqlite3
import json
import os
import sys
import shutil
import urllib.parse
from datetime import datetime
from pathlib import Path

# ─── 配置 ───────────────────────────────────────────────
CURSOR_HOME = os.path.expanduser("~/Library/Application Support/Cursor")
GLOBAL_DB = os.path.join(CURSOR_HOME, "User/globalStorage/state.vscdb")
WS_STORAGE = os.path.join(CURSOR_HOME, "User/workspaceStorage")


# ─── 数据库工具 ─────────────────────────────────────────
class CursorDB:
    """Cursor 数据库访问层"""

    def __init__(self):
        self._ws_cache = None

    def global_conn(self):
        return sqlite3.connect(GLOBAL_DB)

    def ws_conn(self, ws_hash):
        db_path = os.path.join(WS_STORAGE, ws_hash, "state.vscdb")
        return sqlite3.connect(db_path)

    def list_workspaces(self):
        """列出所有已知工作台及其路径"""
        if self._ws_cache:
            return self._ws_cache

        result = []
        for d in sorted(os.listdir(WS_STORAGE)):
            ws_json = os.path.join(WS_STORAGE, d, "workspace.json")
            if not os.path.exists(ws_json):
                continue
            with open(ws_json) as f:
                data = json.load(f)
            ws_path = data.get("workspace", data.get("folder", ""))
            decoded = urllib.parse.unquote(ws_path.replace("file://", ""))
            result.append({"hash": d, "path": decoded, "raw": ws_path})
        self._ws_cache = result
        return result

    def find_workspace(self, name_or_path):
        """按名称或路径模糊匹配工作台，返回 hash
        
        优先级：
        1. 精确匹配 .code-workspace 文件名
        2. 路径中包含 /Documents/ 的优先（主要工作区）
        3. 最近修改的优先
        """
        workspaces = self.list_workspaces()
        matches = []
        for ws in workspaces:
            if name_or_path in ws["path"]:
                matches.append(ws)
        if not matches:
            return None

        # 精确匹配文件名
        exact = []
        for m in matches:
            basename = os.path.basename(m["path"]).replace(".code-workspace", "")
            if basename == name_or_path:
                exact.append(m)
        if exact:
            matches = exact

        # 如果多个匹配，按优先级排序
        def sort_key(ws):
            db_path = os.path.join(WS_STORAGE, ws["hash"], "state.vscdb")
            mtime = os.path.getmtime(db_path) if os.path.exists(db_path) else 0
            # /Documents/ 路径优先（+1000000 权重）
            docs_bonus = 1000000 if "/Documents/" in ws["path"] else 0
            # 有 agent 数据的优先（+500000 权重）
            try:
                conn = sqlite3.connect(db_path)
                cur = conn.cursor()
                cur.execute("SELECT value FROM ItemTable WHERE key = 'composer.composerData'")
                row = cur.fetchone()
                conn.close()
                if row:
                    data = json.loads(row[0])
                    agents_count = len(data.get("allComposers", []))
                    agent_bonus = agents_count * 100000
                else:
                    agent_bonus = 0
            except:
                agent_bonus = 0
            return docs_bonus + agent_bonus + mtime

        matches.sort(key=sort_key, reverse=True)
        return matches[0]

    def get_ws_agents(self, ws_hash):
        """获取工作台的所有 Agent 列表"""
        conn = self.ws_conn(ws_hash)
        cur = conn.cursor()
        cur.execute(
            "SELECT value FROM ItemTable WHERE key = 'composer.composerData'"
        )
        row = cur.fetchone()
        conn.close()
        if not row:
            return []
        data = json.loads(row[0])
        return data.get("allComposers", [])

    def get_ws_composer_data(self, ws_hash):
        """获取工作台的完整 composerData"""
        conn = self.ws_conn(ws_hash)
        cur = conn.cursor()
        cur.execute(
            "SELECT value FROM ItemTable WHERE key = 'composer.composerData'"
        )
        row = cur.fetchone()
        conn.close()
        if not row:
            return {"allComposers": []}
        return json.loads(row[0])

    def update_ws_composer_data(self, ws_hash, data):
        """更新工作台的 composerData"""
        conn = self.ws_conn(ws_hash)
        cur = conn.cursor()
        value = json.dumps(data, ensure_ascii=False)
        cur.execute(
            "SELECT count(*) FROM ItemTable WHERE key = 'composer.composerData'"
        )
        if cur.fetchone()[0] > 0:
            cur.execute(
                "UPDATE ItemTable SET value = ? WHERE key = 'composer.composerData'",
                (value,),
            )
        else:
            cur.execute(
                "INSERT INTO ItemTable (key, value) VALUES ('composer.composerData', ?)",
                (value,),
            )
        conn.commit()
        conn.close()

    def search_agents_global(self, keyword):
        """在全局数据库中按关键词搜索 Agent"""
        conn = self.global_conn()
        cur = conn.cursor()
        cur.execute(
            "SELECT key, json_extract(value, '$.name'), json_extract(value, '$.createdAt'), "
            "json_extract(value, '$.subtitle') "
            "FROM cursorDiskKV WHERE key LIKE 'composerData:%' AND value LIKE ?",
            (f"%{keyword}%",),
        )
        results = []
        for row in cur.fetchall():
            composer_id = row[0].replace("composerData:", "")
            name = row[1] or "unnamed"
            created_at = row[2]
            subtitle = row[3] or ""
            try:
                dt = datetime.fromtimestamp(created_at / 1000)
                date_str = dt.strftime("%Y-%m-%d %H:%M")
            except:
                date_str = "unknown"
            results.append(
                {
                    "composerId": composer_id,
                    "name": name,
                    "createdAt": date_str,
                    "subtitle": subtitle,
                }
            )
        conn.close()
        return results

    def get_agent_bubbles(self, composer_id):
        """获取 Agent 的所有消息气泡"""
        conn = self.global_conn()
        cur = conn.cursor()

        # 获取 composerData
        cur.execute(
            f"SELECT value FROM cursorDiskKV WHERE key = 'composerData:{composer_id}'"
        )
        row = cur.fetchone()
        if not row:
            conn.close()
            return None

        data = json.loads(row[0])
        headers = data.get("fullConversationHeadersOnly", [])
        name = data.get("name", "unnamed")
        subtitle = data.get("subtitle", "")
        todos = data.get("todos", [])
        created_at = data.get("createdAt", 0)

        try:
            dt = datetime.fromtimestamp(created_at / 1000)
            date_str = dt.strftime("%Y-%m-%d %H:%M")
        except:
            date_str = "unknown"

        # 获取每个 bubble 的内容
        bubbles = []
        for h in headers:
            bid = h["bubbleId"]
            btype = h["type"]
            cur.execute(
                f"SELECT value FROM cursorDiskKV WHERE key = 'bubbleId:{composer_id}:{bid}'"
            )
            brow = cur.fetchone()
            if not brow:
                continue
            bd = json.loads(brow[0])
            bubbles.append(
                {
                    "type": btype,
                    "text": bd.get("text", ""),
                    "thinking": bd.get("thinking", {}),
                    "capabilityType": bd.get("capabilityType", ""),
                    "toolResults": bd.get("toolResults", []),
                    "createdAt": bd.get("createdAt", ""),
                }
            )

        conn.close()
        return {
            "composerId": composer_id,
            "name": name,
            "subtitle": subtitle,
            "todos": todos,
            "createdAt": date_str,
            "bubbleCount": len(headers),
            "bubbles": bubbles,
        }


# ─── 导出工具 ─────────────────────────────────────────
def export_agent_to_md(agent_data):
    """将 Agent 数据导出为 Markdown 字符串"""
    lines = []
    name = agent_data["name"]
    lines.append(f"# {name}")
    lines.append("")
    lines.append(f"> **创建时间**: {agent_data['createdAt']}")
    lines.append(f"> **Composer ID**: {agent_data['composerId']}")
    if agent_data["subtitle"]:
        lines.append(f"> **摘要**: {agent_data['subtitle']}")
    lines.append(f"> **消息数**: {agent_data['bubbleCount']}")
    lines.append("")
    lines.append("---")
    lines.append("")

    # 任务列表
    todos = agent_data.get("todos", [])
    if todos:
        lines.append("## 任务列表")
        lines.append("")
        for t in todos:
            status = t.get("status", "")
            content = t.get("content", "")
            icon = (
                "✅"
                if status == "completed"
                else "⏳" if status == "in_progress" else "❌" if status == "cancelled" else "⬜"
            )
            lines.append(f"- {icon} {content}")
        lines.append("")
        lines.append("---")
        lines.append("")

    # 消息内容
    msg_count = 0
    for bubble in agent_data["bubbles"]:
        btype = bubble["type"]
        text = bubble["text"]
        thinking = bubble["thinking"]
        thinking_text = thinking.get("text", "") if isinstance(thinking, dict) else ""
        cap_type = bubble["capabilityType"]
        tool_results = bubble["toolResults"]

        if btype == 1 and text:
            msg_count += 1
            lines.append(f"## 用户消息 #{msg_count}")
            if bubble["createdAt"]:
                lines.append(f"*{bubble['createdAt']}*")
            lines.append("")
            lines.append(text)
            lines.append("")
        elif btype == 2:
            if cap_type == 30 and thinking_text:
                lines.append("<details>")
                lines.append("<summary>🧠 AI 思考过程</summary>")
                lines.append("")
                lines.append(thinking_text)
                lines.append("")
                lines.append("</details>")
                lines.append("")
            elif cap_type == 15 and tool_results:
                for tr in tool_results:
                    tool_name = tr.get("toolName", "")
                    result = tr.get("result", "")
                    args = tr.get("args", {})
                    if tool_name:
                        lines.append(f"**🔧 工具调用**: `{tool_name}`")
                        if isinstance(args, dict):
                            cmd = args.get("command", "")
                            if cmd:
                                lines.append("```bash")
                                lines.append(cmd[:500])
                                lines.append("```")
                        if result:
                            lines.append("<details>")
                            lines.append("<summary>执行结果</summary>")
                            lines.append("")
                            lines.append("```")
                            lines.append(str(result)[:2000])
                            lines.append("```")
                            lines.append("</details>")
                        lines.append("")
            elif text and not cap_type:
                lines.append("### AI 回复")
                lines.append("")
                lines.append(text)
                lines.append("")

    return "\n".join(lines)


# ─── 迁移工具 ─────────────────────────────────────────
def migrate_agents(db, src_hash, tgt_hash, agent_ids):
    """将指定 Agent 从源工作台迁移到目标工作台"""
    # 读取源 agents
    src_agents = db.get_ws_agents(src_hash)
    agents_to_add = [a for a in src_agents if a.get("composerId") in agent_ids]

    if not agents_to_add:
        print("⚠️  未找到匹配的 Agent")
        return False

    # 备份目标数据库
    tgt_db_path = os.path.join(WS_STORAGE, tgt_hash, "state.vscdb")
    shutil.copy2(tgt_db_path, tgt_db_path + ".bak")
    print(f"  📦 已备份目标数据库")

    # 读取并更新目标
    tgt_data = db.get_ws_composer_data(tgt_hash)
    tgt_composers = tgt_data.get("allComposers", [])
    existing_ids = {c.get("composerId") for c in tgt_composers}

    added = 0
    for a in agents_to_add:
        if a["composerId"] not in existing_ids:
            tgt_composers.insert(0, a)
            existing_ids.add(a["composerId"])
            added += 1
            print(f"  ✅ 已添加: {a.get('name', 'unnamed')}")
        else:
            print(f"  ⏭️  已存在: {a.get('name', 'unnamed')}")

    tgt_data["allComposers"] = tgt_composers
    db.update_ws_composer_data(tgt_hash, tgt_data)

    print(f"\n  迁移完成: {added} 个 Agent 已添加")
    return True


# ─── CLI 入口 ─────────────────────────────────────────
def cmd_list(db, args):
    """列出工作台的 Agent"""
    if len(args) < 1:
        print("用法: cursor_agent_migrate.py list <workspace_name>")
        return

    ws = db.find_workspace(args[0])
    if not ws:
        print(f"❌ 未找到工作台: {args[0]}")
        print("\n可用工作台:")
        for w in db.list_workspaces():
            if ".code-workspace" in w["path"]:
                name = os.path.basename(w["path"]).replace(".code-workspace", "")
                print(f"  - {name}: {w['path']}")
        return

    print(f"📂 工作台: {ws['path']}")
    print(f"   Hash: {ws['hash']}")
    agents = db.get_ws_agents(ws["hash"])
    if not agents:
        print("   (无 Agent)")
        return

    print(f"   Agent 数量: {len(agents)}\n")
    for i, a in enumerate(agents, 1):
        name = a.get("name", "unnamed")
        cid = a.get("composerId", "?")
        subtitle = a.get("subtitle", "")
        created = a.get("createdAt", "")
        archived = "📁" if a.get("isArchived") else ""
        print(f"  {i}. {archived}{name}")
        print(f"     ID: {cid}")
        if subtitle:
            print(f"     摘要: {subtitle[:80]}")
        if created:
            try:
                dt = datetime.fromtimestamp(created / 1000)
                print(f"     创建: {dt.strftime('%Y-%m-%d %H:%M')}")
            except:
                pass
        print()


def cmd_search(db, args):
    """全局搜索 Agent"""
    if len(args) < 1:
        print("用法: cursor_agent_migrate.py search <keyword>")
        return

    keyword = args[0]
    print(f"🔍 搜索: {keyword}")
    results = db.search_agents_global(keyword)
    if not results:
        print("   未找到匹配的 Agent")
        return

    print(f"   找到 {len(results)} 个结果:\n")
    for r in results:
        print(f"  - {r['name']}")
        print(f"    ID: {r['composerId']}")
        print(f"    创建: {r['createdAt']}")
        if r["subtitle"]:
            print(f"    摘要: {r['subtitle'][:80]}")
        print()


def cmd_migrate(db, args):
    """迁移 Agent"""
    if len(args) < 2:
        print("用法: cursor_agent_migrate.py migrate <source_ws> <target_ws> --agent <name_or_id>")
        return

    src_name = args[0]
    tgt_name = args[1]

    src_ws = db.find_workspace(src_name)
    tgt_ws = db.find_workspace(tgt_name)

    if not src_ws:
        print(f"❌ 未找到源工作台: {src_name}")
        return
    if not tgt_ws:
        print(f"❌ 未找到目标工作台: {tgt_name}")
        return

    print(f"📤 源: {src_ws['path']}")
    print(f"📥 目标: {tgt_ws['path']}")

    src_agents = db.get_ws_agents(src_ws["hash"])
    if not src_agents:
        print("⚠️  源工作台没有 Agent")
        return

    # 解析 --agent 和 --all 参数
    migrate_all = "--all" in args
    agent_filter = None
    for i, a in enumerate(args):
        if a == "--agent" and i + 1 < len(args):
            agent_filter = args[i + 1]

    if not migrate_all and not agent_filter:
        print("\n请指定要迁移的 Agent:")
        print("  --all          迁移全部")
        print("  --agent <名称>  按名称匹配")
        print("\n源工作台 Agent 列表:")
        for a in src_agents:
            print(f"  - {a.get('name', 'unnamed')} ({a.get('composerId')})")
        return

    # 确定要迁移的 ID
    if migrate_all:
        agent_ids = [a.get("composerId") for a in src_agents]
    else:
        agent_ids = []
        for a in src_agents:
            name = a.get("name", "")
            cid = a.get("composerId", "")
            if agent_filter in name or agent_filter == cid:
                agent_ids.append(cid)

    if not agent_ids:
        print(f"⚠️  未找到匹配 '{agent_filter}' 的 Agent")
        return

    print(f"\n将迁移 {len(agent_ids)} 个 Agent:")
    for a in src_agents:
        if a.get("composerId") in agent_ids:
            print(f"  - {a.get('name', 'unnamed')}")

    migrate_agents(db, src_ws["hash"], tgt_ws["hash"], agent_ids)
    print("\n💡 提示: 重启 Cursor 或重新打开目标工作台即可看到迁移的 Agent")


def cmd_export(db, args):
    """导出 Agent 对话为 Markdown"""
    if len(args) < 1:
        print("用法: cursor_agent_migrate.py export <workspace_name> [--agent <name>] [--all] [--output <dir>]")
        return

    ws_name = args[0]
    ws = db.find_workspace(ws_name)
    if not ws:
        print(f"❌ 未找到工作台: {ws_name}")
        return

    agents = db.get_ws_agents(ws["hash"])
    if not agents:
        print("⚠️  工作台没有 Agent")
        return

    # 解析参数
    export_all = "--all" in args
    agent_filter = None
    output_dir = "./agent_exports"
    for i, a in enumerate(args):
        if a == "--agent" and i + 1 < len(args):
            agent_filter = args[i + 1]
        if a == "--output" and i + 1 < len(args):
            output_dir = args[i + 1]

    if not export_all and not agent_filter:
        print("请指定要导出的 Agent: --all 或 --agent <名称>")
        return

    os.makedirs(output_dir, exist_ok=True)

    for a in agents:
        name = a.get("name", "unnamed")
        cid = a.get("composerId", "")

        if not export_all and agent_filter and agent_filter not in name and agent_filter != cid:
            continue

        print(f"📝 导出: {name}...")
        agent_data = db.get_agent_bubbles(cid)
        if not agent_data:
            print(f"   ⚠️  无法读取数据")
            continue

        md_content = export_agent_to_md(agent_data)
        safe_name = name.replace("/", "-").replace(":", "-")
        filepath = os.path.join(output_dir, f"{safe_name}.md")

        with open(filepath, "w", encoding="utf-8") as f:
            f.write(md_content)

        size = os.path.getsize(filepath)
        print(f"   ✅ {filepath} ({size:,} bytes)")

    print(f"\n导出完成 → {output_dir}")


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return

    cmd = sys.argv[1]
    args = sys.argv[2:]
    db = CursorDB()

    commands = {
        "list": cmd_list,
        "search": cmd_search,
        "migrate": cmd_migrate,
        "export": cmd_export,
    }

    if cmd in commands:
        commands[cmd](db, args)
    else:
        print(f"❌ 未知命令: {cmd}")
        print("可用命令: list, search, migrate, export")
        print(f"\n{__doc__}")


if __name__ == "__main__":
    main()

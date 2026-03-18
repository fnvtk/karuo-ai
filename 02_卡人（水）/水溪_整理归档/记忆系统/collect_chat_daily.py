#!/usr/bin/env python3
"""
卡若AI 每日对话收集（每天仅执行一次）
- 扫描 ~/.cursor/projects/*/agent-transcripts/*.txt
- 用首条 user_query 生成中文名称，复制到 02_卡人（水）/水溪_整理归档/对话归档/YYYY-MM-DD/ 按工作台归类
- 按关键词复制到对应 Skill 的 对话记录/
- 本日汇总：中文名称 | 所属工作台 | 对话文件（供记忆与内容规划）
- 用 last_chat_collect_date.txt 记录日期，同一天不重复执行

用法：
  python collect_chat_daily.py           # 仅收集今日，每日一次
  python collect_chat_daily.py --all     # 全量历史按修改日期分类（不写 stamp）
  python collect_chat_daily.py --export-to <目录>   # 将全部 Agent 对话导出到指定目录（如 卡若Ai的文件夹）
"""

import re
import shutil
import sys
import json
import hashlib
from collections import defaultdict
from datetime import datetime
from pathlib import Path

KARUO_AI_ROOT = Path("/Users/karuo/Documents/个人/卡若AI")
CURSOR_PROJECTS = Path.home() / ".cursor" / "projects"
DOC_LIB = KARUO_AI_ROOT / "02_卡人（水）" / "水溪_整理归档" / "对话归档"
STRUCTURED = KARUO_AI_ROOT / "02_卡人（水）" / "水溪_整理归档" / "记忆系统" / "structured"
STAMP_FILE = STRUCTURED / "last_chat_collect_date.txt"
PROCESSED_FILE = STRUCTURED / "processed_sessions.json"
HEALTH_FILE = STRUCTURED / "memory_health.json"

# 项目目录名 -> 工作台中文名（未列出的用目录名）。导出时扫描本机 ~/.cursor/projects 下所有工作台。
PROJECT_TO_WORKSPACE_CN = {
    "Users-karuo-Documents-AI": "卡若AI",
    "Users-karuo-Documents-AI-02": "卡若AI-02",
    "Users-karuo-Documents": "个人文档",
    "Users-karuo-Documents-1-3": "文档1-3",
    "Users-karuo-Documents-1-4": "文档1-4",
    "Users-karuo-Documents-2": "文档2",
    "Users-karuo-Documents-2-AI": "文档2-AI",
    "Users-karuo-Documents-2-cunkebao-v3": "存客宝v3",
    "Users-karuo-Documents-2-soul": "文档2-Soul",
    "Users-karuo-Documents-3": "文档3",
    "Users-karuo-Documents-3-ai-code-workspace": "卡若AI工作区",
    "Users-karuo-Documents-3-code-workspace": "开发工作区",
    "Users-karuo-Documents-3-mbti-code-workspace": "MBTI工作区",
    "Users-karuo-Documents-3-MBTI": "MBTI",
    "Users-karuo-Documents-3-soul": "Soul",
    "Users-karuo-Documents-3-soul-code-workspace": "Soul工作区",
    "Users-karuo-Documents-3-Synologo-NAs-code-workspace": "群晖NAS工作区",
    "Users-karuo-Documents-3-Synologo-NAs2-code-workspace": "群晖NAS2工作区",
    "Users-karuo-Documents-3-Synologo-NAs3-code-workspace": "群晖NAS3工作区",
    "Users-karuo-Documents-1-3-soul": "Soul文档",
    "Users-karuo-Documents-4": "文档4",
    "Users-karuo-Documents-4-4-Web": "Web工作区",
    "Users-karuo-Documents-4-Synologo-NAs": "文档4-群晖",
    "Users-karuo-Documents-8": "文档8",
    "Users-karuo-Documents-8-clawdbot": "文档8-clawdbot",
    "Users-karuo-Documents-cunkebao": "存客宝",
    "Users-karuo-Documents-New": "文档New",
    "Users-karuo-3-code-workspace": "开发3",
    "Users-karuo-Library-Application-Support-Cursor-Workspaces-1770112432466-workspace-json": "Cursor工作区",
    "Users-karuo-Library-Application-Support-Cursor-Workspaces-1767952329506-workspace-json": "Cursor工作区2",
    "Users-karuo-Library-CloudStorage-SynologyDrive": "群晖云盘",
    "Users-karuo-Library-CloudStorage-SynologyDrive-AI": "群晖云盘-AI",
    "Users-karuo-Library-Mobile-Documents-com-apple-CloudDocs-Documents": "iCloud婼瑄",
    "Applications-Navicat-Premium-app": "Navicat",
    "Applications-Navicat-Premium-2-app": "Navicat2",
}

# 关键词 -> Skill 下 对话记录 相对路径（以人为导向：01_卡资（金）等）
KEYWORD_TO_SKILL = [
    (["群晖", "NAS", "Gitea", "wiki", "百科"], "01_卡资（金）/金仓_存储备份/群晖NAS管理/对话记录"),
    (["飞书", "妙记", "纪要", "会议"], "02_卡人（水）/水桥_平台对接/智能纪要/对话记录"),
    (["对话归档", "归档"], "02_卡人（水）/水溪_整理归档/对话归档/对话记录"),
    (["Gitea", "推送", "gitea", "karuo-ai"], "01_卡资（金）/金仓_存储备份/Gitea管理/对话记录"),
    (["目录结构", "卡若AI", "优化", "skill", "SKILL"], "01_卡资（金）/金仓_存储备份/Gitea管理/对话记录"),
    (["代码管理", "同步", "上传"], "01_卡资（金）/金仓_存储备份/Gitea管理/对话记录"),
]

def today():
    return datetime.now().strftime("%Y-%m-%d")


def now_ts():
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")

def already_done_today():
    if not STAMP_FILE.exists():
        return False
    return STAMP_FILE.read_text(encoding="utf-8").strip() == today()

def workspace_cn(project_name):
    return PROJECT_TO_WORKSPACE_CN.get(project_name, project_name)

def get_chinese_title(path, max_len=36):
    """从对话文件首条 user_query 提取中文名称，用于文件名与汇总。"""
    try:
        raw = path.read_text(encoding="utf-8", errors="ignore")[:1200]
    except Exception:
        return "未命名对话"
    # 匹配 <user_query>...第一行...</user_query> 或 user: 后首段
    m = re.search(r"<user_query>\s*([^<]+?)(?:\s*</user_query>|\n)", raw, re.DOTALL)
    if not m:
        m = re.search(r"user:\s*\n\s*([^\n]+)", raw)
    if not m:
        return "未命名对话"
    title = m.group(1).strip()
    title = re.sub(r"[\s/\\:*?\"<>|]+", " ", title).strip()
    title = title[:max_len] if title else "未命名对话"
    return title or "未命名对话"

def sanitize_filename(s):
    """使字符串可作为文件名一部分。"""
    s = re.sub(r'[\\/:*?"<>|\n\r\t]+', "_", s)
    return s.strip("._ ")[:80] or "未命名"


def load_processed():
    if not PROCESSED_FILE.exists():
        return {"version": "1.0", "updated": "", "items": {}}
    try:
        return json.loads(PROCESSED_FILE.read_text(encoding="utf-8"))
    except Exception:
        return {"version": "1.0", "updated": "", "items": {}}


def save_processed(state):
    state["updated"] = now_ts()
    STRUCTURED.mkdir(parents=True, exist_ok=True)
    PROCESSED_FILE.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")


def file_signature(path: Path):
    """
    幂等签名：路径 + 大小 + 修改时间 + 前后各 8KB 的 hash。
    避免重复复制同一份对话。
    """
    try:
        st = path.stat()
        size = st.st_size
        mtime = int(st.st_mtime)
        with path.open("rb") as f:
            head = f.read(8192)
            if size > 8192:
                f.seek(max(0, size - 8192))
                tail = f.read(8192)
            else:
                tail = b""
        h = hashlib.sha1(head + b"||" + tail).hexdigest()
        return f"{size}:{mtime}:{h}"
    except Exception:
        return ""


def redact_sensitive(text):
    """
    归档前脱敏，避免把明文密钥/密码写入记忆系统。
    返回：(脱敏文本, 命中次数)
    """
    rules = [
        # 常见 token / key
        (re.compile(r"ghp_[A-Za-z0-9]{20,}"), "ghp_***"),
        (re.compile(r"AKID[0-9A-Za-z]{16,}"), "AKID***"),
        (re.compile(r"LTAI[0-9A-Za-z]{12,}"), "LTAI***"),
        # key=value / key: value 形式
        (re.compile(r"(?i)\b(api[_-]?key|token|secret|password|passwd|pwd)\b\s*[:=]\s*([^\s,;\"']+)"), r"\1=***"),
        # URL 凭证 user:pass@
        (re.compile(r"://([^:/\s]+):([^@/\s]+)@"), r"://\1:***@"),
    ]

    hits = 0
    out = text
    for pattern, repl in rules:
        out, n = pattern.subn(repl, out)
        hits += n
    return out, hits


def copy_redacted(src: Path, dest: Path):
    try:
        raw = src.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        shutil.copy2(src, dest)
        return 0
    safe, hits = redact_sensitive(raw)
    dest.write_text(safe, encoding="utf-8")
    return hits

def collect_all_transcripts():
    out = []
    for proj_dir in sorted(CURSOR_PROJECTS.iterdir()):
        if not proj_dir.is_dir():
            continue
        trans_dir = proj_dir / "agent-transcripts"
        if not trans_dir.exists():
            continue
        for f in sorted(trans_dir.glob("*.txt")):
            try:
                stat = f.stat()
                out.append({
                    "path": f,
                    "project": proj_dir.name,
                    "name": f.name,
                    "stem": f.stem,
                    "modified": datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d"),
                    "size": stat.st_size,
                })
            except OSError:
                pass
    return out

def sample_content(path, max_chars=2000):
    try:
        return path.read_text(encoding="utf-8", errors="ignore")[:max_chars]
    except Exception:
        return ""

def match_skill(sample):
    for keywords, skill_path in KEYWORD_TO_SKILL:
        if any(k in sample for k in keywords):
            return KARUO_AI_ROOT / skill_path
    return None

def process_items_for_date(items, day_iso, processed_state, write_stamp=True):
    """对给定日期对应的 items 做复制与汇总。day_iso=YYYY-MM-DD。"""
    STRUCTURED.mkdir(parents=True, exist_ok=True)
    day_dir = DOC_LIB / day_iso
    day_dir.mkdir(parents=True, exist_ok=True)

    by_workspace = defaultdict(list)  # 工作台中文名 -> [(中文名, 文件名)]
    copied_skill = set()

    copied_count = 0
    skipped_count = 0
    redacted_hits = 0

    for item in items:
        sig = file_signature(item["path"])
        state_key = f"{item['project']}::{item['name']}"
        old_sig = (processed_state.get("items") or {}).get(state_key, "")
        if sig and old_sig == sig:
            skipped_count += 1
            continue

        cn_title = get_chinese_title(item["path"])
        safe_title = sanitize_filename(cn_title)
        workspace_cn_name = workspace_cn(item["project"])
        # 保存为：中文名_uuid.txt
        dest_name = f"{safe_title}_{item['stem']}.txt"
        proj_sub = day_dir / sanitize_filename(workspace_cn_name)
        proj_sub.mkdir(parents=True, exist_ok=True)
        dest_lib = proj_sub / dest_name
        try:
            redacted_hits += copy_redacted(item["path"], dest_lib)
        except Exception as e:
            print(f"[collect_chat_daily] 复制失败 {item['path']}: {e}")
            continue
        by_workspace[workspace_cn_name].append((cn_title, dest_name))
        copied_count += 1

        sample = sample_content(item["path"])
        skill_dir = match_skill(sample)
        if skill_dir:
            skill_dir.mkdir(parents=True, exist_ok=True)
            dest_skill = skill_dir / dest_name
            try:
                redacted_hits += copy_redacted(item["path"], dest_skill)
                copied_skill.add(str(skill_dir))
            except Exception:
                pass

        if sig:
            processed_state.setdefault("items", {})[state_key] = sig

    # 本日汇总：中文名称 | 所属工作台 | 对话文件
    summary_lines = [
        f"# {day_iso} 对话文档汇总",
        "",
        "> 来源：Cursor Agent 对话记录；名称取自首条用户消息，按工作台归类。",
        "",
        "## 统计",
        f"- 扫描对话数：{len(items)}",
        f"- 新增归档：{copied_count}",
        f"- 幂等跳过：{skipped_count}",
        f"- 脱敏命中：{redacted_hits}",
        f"- 工作台数：{len(by_workspace)}",
        f"- 已归类到 Skill：{len(copied_skill)} 个目录",
        "",
        "## 按工作台 · 中文名称与文件",
        "",
        "| 中文名称 | 所属工作台 | 对话文件 |",
        "|:---|:---|:---|",
    ]
    for ws in sorted(by_workspace.keys()):
        for cn_name, fname in sorted(by_workspace[ws], key=lambda x: x[0]):
            summary_lines.append(f"| {cn_name} | {ws} | `{fname}` |")
    summary_lines.append("")

    (day_dir / "本日汇总.md").write_text("\n".join(summary_lines), encoding="utf-8")

    HEALTH_FILE.write_text(
        json.dumps(
            {
                "updated": now_ts(),
                "date": day_iso,
                "scan_total": len(items),
                "copied_new": copied_count,
                "skipped_idempotent": skipped_count,
                "redacted_hits": redacted_hits,
                "skill_dirs": len(copied_skill),
                "status": "ok",
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    if write_stamp:
        STAMP_FILE.write_text(today(), encoding="utf-8")
    return copied_count

def run_daily_only():
    """仅收集今日有修改的对话，每日一次。"""
    processed_state = load_processed()
    if already_done_today():
        HEALTH_FILE.write_text(
            json.dumps(
                {
                    "updated": now_ts(),
                    "date": today(),
                    "scan_total": 0,
                    "copied_new": 0,
                    "skipped_idempotent": 0,
                    "redacted_hits": 0,
                    "skill_dirs": 0,
                    "status": "already_done",
                },
                ensure_ascii=False,
                indent=2,
            ),
            encoding="utf-8",
        )
        print(f"[collect_chat_daily] 今日({today()})已执行过，跳过。")
        return 0
    items = [x for x in collect_all_transcripts() if x["modified"] == today()]
    if not items:
        STRUCTURED.mkdir(parents=True, exist_ok=True)
        STAMP_FILE.write_text(today(), encoding="utf-8")
        HEALTH_FILE.write_text(
            json.dumps(
                {
                    "updated": now_ts(),
                    "date": today(),
                    "scan_total": 0,
                    "copied_new": 0,
                    "skipped_idempotent": 0,
                    "redacted_hits": 0,
                    "skill_dirs": 0,
                    "status": "no_new_items",
                },
                ensure_ascii=False,
                indent=2,
            ),
            encoding="utf-8",
        )
        print("[collect_chat_daily] 今日无新对话，已标记完成。")
        return 0
    n = process_items_for_date(items, today(), processed_state, write_stamp=True)
    save_processed(processed_state)
    print(f"[collect_chat_daily] 完成：新增归档 {n} 个对话（幂等去重已生效），目录 对话文档库/{today()}/。")
    return 0

def run_all_history():
    """全量历史按修改日期分类，每个日期生成目录与本日汇总。"""
    processed_state = load_processed()
    items = collect_all_transcripts()
    by_date = defaultdict(list)
    for x in items:
        by_date[x["modified"]].append(x)

    total = 0
    for day_iso in sorted(by_date.keys()):
        day_items = by_date[day_iso]
        n = process_items_for_date(day_items, day_iso, processed_state, write_stamp=False)
        total += n
        print(f"  {day_iso}: 新增归档 {n} 个对话 -> 对话文档库/{day_iso}/")

    save_processed(processed_state)
    print(f"[collect_chat_daily] 全量完成：共 {total} 个对话，按日期写入 {len(by_date)} 天。")
    return 0


def run_export_to(export_base: str):
    """将 Cursor 全部 Agent 对话导出到指定目录（如 卡若Ai的文件夹）。结构：<目录>/Cursor_Agent_对话/YYYY-MM-DD/<工作台>/<中文名>_<id>.txt"""
    export_base = Path(export_base).resolve()
    out_root = export_base / "Cursor_Agent_对话"
    items = collect_all_transcripts()
    if not items:
        print("[collect_chat_daily] 未发现任何 Agent 对话文件，跳过导出。")
        return 0
    by_date = defaultdict(list)
    for x in items:
        by_date[x["modified"]].append(x)
    total_copied = 0
    by_workspace_total = defaultdict(int)
    summary_lines = [
        "# Cursor Agent 对话导出汇总（本机所有工作台）",
        "",
        f"> 导出时间：{now_ts()}",
        "> 范围：本机 ~/.cursor/projects 下**所有工作台**的 agent-transcripts，不限于当前工作台。",
        "",
        "## 按日期",
        "",
        "| 日期 | 对话数 | 工作台 |",
        "|:---|:---|:---|",
    ]
    for day_iso in sorted(by_date.keys()):
        day_items = by_date[day_iso]
        day_dir = out_root / day_iso
        day_dir.mkdir(parents=True, exist_ok=True)
        by_ws = defaultdict(list)
        for item in day_items:
            cn_title = get_chinese_title(item["path"])
            safe_title = sanitize_filename(cn_title)
            ws_cn = workspace_cn(item["project"])
            dest_name = f"{safe_title}_{item['stem']}.txt"
            proj_sub = day_dir / sanitize_filename(ws_cn)
            proj_sub.mkdir(parents=True, exist_ok=True)
            dest_file = proj_sub / dest_name
            try:
                copy_redacted(item["path"], dest_file)
                total_copied += 1
                by_workspace_total[ws_cn] += 1
                by_ws[ws_cn].append(dest_name)
            except Exception as e:
                print(f"[collect_chat_daily] 导出失败 {item['path']}: {e}")
        ws_list = ", ".join(sorted(by_ws.keys()))
        summary_lines.append(f"| {day_iso} | {len(day_items)} | {ws_list} |")
    summary_lines.extend([
        "",
        "## 统计",
        f"- 总对话数：{len(items)}",
        f"- 导出文件数：{total_copied}",
        f"- 日期数：{len(by_date)}",
        "",
    ])
    out_root.mkdir(parents=True, exist_ok=True)
    (out_root / "导出汇总.md").write_text("\n".join(summary_lines), encoding="utf-8")
    print(f"[collect_chat_daily] 导出完成：共 {total_copied} 个对话 -> {out_root}")
    return 0


def main():
    if len(sys.argv) > 1 and sys.argv[1] in ("--all", "-a", "all"):
        return run_all_history()
    if len(sys.argv) > 2 and sys.argv[1] in ("--export-to", "-e"):
        return run_export_to(sys.argv[2])
    if len(sys.argv) == 2 and sys.argv[1].startswith("--export-to="):
        return run_export_to(sys.argv[1].split("=", 1)[1])
    return run_daily_only()

if __name__ == "__main__":
    exit(main())

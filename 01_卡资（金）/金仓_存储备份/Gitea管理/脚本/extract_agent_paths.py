#!/usr/bin/env python3
"""
从 Cursor agent-transcripts 中提取 references/scripts/文档路径，
生成聊天记录→文档恢复索引。
"""
import os
import re
from pathlib import Path
from collections import defaultdict

CURSOR_PROJECTS = Path.home() / ".cursor/projects"
KARUO_AI = Path("/Users/karuo/Documents/个人/卡若AI")
OUTPUT = KARUO_AI / "开发文档/聊天记录_文档恢复索引.md"

# 关心的路径模式
PATTERNS = [
    r'path:\s*([^\s\n"\']+)',           # path: /path/to/file
    r'"path":\s*"([^"]+)"',              # "path": "/path/to/file"
    r'references[/\\][^\s"\']+',         # references/xxx.md
    r'scripts[/\\][^\s"\']+',            # scripts/xxx.py
    r'/[^\s"\']*references[^\s"\']*',    # .../references/...
    r'/[^\s"\']*scripts[^\s"\']*',       # .../scripts/...
    r'卡若AI[/\\][^\s"\']+\.md',         # 卡若AI/xxx/xxx.md
    r'SKILL\.md',
]

def extract_paths(content: str) -> set:
    paths = set()
    for p in PATTERNS:
        for m in re.finditer(p, content, re.I):
            s = m.group(1) if m.lastindex else m.group(0)
            s = s.strip().strip('"\'')
            if s and len(s) > 10 and not s.startswith('http'):
                paths.add(s)
    # 从 path: xxx 提取
    for m in re.finditer(r'path:\s*([^\s\n"\']{10,})', content):
        paths.add(m.group(1).strip())
    return paths

def get_workspace_name(project_dir: Path) -> str:
    """从 project 目录名推断 workspace"""
    name = project_dir.name
    # Users-karuo-Documents-3-code-workspace -> 3、工作台
    if "Documents-3" in name or "3-code" in name:
        return "3、工作台"
    if "Documents-AI" in name:
        return "卡若AI"
    if "SynologyDrive" in name or "Synologo" in name or "synology" in name.lower():
        return "群晖NAS"
    if "存客宝" in name or "cunkebao" in name.lower():
        return "存客宝"
    if "soul" in name.lower():
        return "soul"
    return name

def main():
    results = defaultdict(lambda: {"transcripts": [], "paths": set()})
    
    for proj in CURSOR_PROJECTS.iterdir():
        if not proj.is_dir():
            continue
        at_dir = proj / "agent-transcripts"
        if not at_dir.exists():
            continue
        ws = get_workspace_name(proj)
        for tf in at_dir.glob("*.txt"):
            try:
                content = tf.read_text(encoding="utf-8", errors="ignore")
            except Exception:
                continue
            paths = extract_paths(content)
            karuo_paths = {p for p in paths if "卡若AI" in p or "references" in p or "scripts" in p or "SKILL" in p}
            if karuo_paths or "references" in content or "scripts" in content:
                results[ws]["transcripts"].append(tf.name)
                results[ws]["paths"].update(karuo_paths)
    
    # 去重并归类路径
    all_paths = set()
    for ws, data in results.items():
        all_paths.update(data["paths"])
    
    # 按 skill 归类
    skill_paths = defaultdict(list)
    for p in sorted(all_paths):
        if "卡若AI" in p or p.startswith("/"):
            rel = p.replace(str(KARUO_AI) + "/", "").replace("/Users/karuo/Documents/个人/卡若AI/", "")
            if "/" in rel:
                skill = rel.split("/")[0] + "/" + rel.split("/")[1] if len(rel.split("/")) > 1 else rel
                skill_paths[skill].append(rel)
    
    # 输出
    lines = [
        "# 聊天记录 → 文档恢复索引",
        "",
        "> 从 Cursor agent-transcripts 中提取的 references、scripts、文档路径。",
        "",
        "## 一、按 Workspace 统计",
        "",
    ]
    for ws in sorted(results.keys()):
        data = results[ws]
        n = len(data["transcripts"])
        np = len(data["paths"])
        lines.append(f"### {ws}")
        lines.append(f"- 涉及 agent-transcript: {n} 个")
        lines.append(f"- 提取到卡若AI相关路径: {np} 个")
        if data["paths"]:
            for p in sorted(list(data["paths"]))[:30]:
                lines.append(f"  - `{p}`")
            if len(data["paths"]) > 30:
                lines.append(f"  - ... 共 {len(data['paths'])} 条")
        lines.append("")
    
    lines.append("## 二、按 Skill 归类路径")
    lines.append("")
    for skill in sorted(skill_paths.keys()):
        paths = skill_paths[skill]
        lines.append(f"### {skill}")
        for p in paths[:20]:
            lines.append(f"- `{p}`")
        if len(paths) > 20:
            lines.append(f"- ... 共 {len(paths)} 条")
        lines.append("")
    
    lines.append("## 三、关键恢复来源")
    lines.append("")
    lines.append("| 来源 | 说明 |")
    lines.append("|------|------|")
    lines.append("| agent-transcripts | `~/.cursor/projects/*/agent-transcripts/*.txt` |")
    lines.append("| 婼瑄 卡若AI | `~/Library/Mobile Documents/.../婼瑄/卡若AI/` |")
    lines.append("| SynologyDrive Skill | `~/Library/CloudStorage/SynologyDrive-卡若/Skill/` |")
    lines.append("| AI的每日对话 | `3、工作台/AI的每日对话/` |")
    lines.append("")
    
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text("\n".join(lines), encoding="utf-8")
    print(f"已生成: {OUTPUT}")

if __name__ == "__main__":
    main()

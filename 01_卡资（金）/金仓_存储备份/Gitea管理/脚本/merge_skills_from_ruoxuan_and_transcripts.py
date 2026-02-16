#!/usr/bin/env python3
"""
婼瑄(1/30基线) + agent-transcripts(1/30-2/13) → 卡若AI 全量合并优化
- 以婼瑄为基线，补充卡若AI缺失的 references/scripts
- 从 1/30 后的 transcripts 提取新增路径
- 去重合并，更新恢复索引
"""
import re
import shutil
from pathlib import Path
from datetime import datetime
from collections import defaultdict

RUOXUAN = Path.home() / "Library/Mobile Documents/com~apple~CloudDocs/Documents/婼瑄/卡若AI"
KARUO_AI = Path("/Users/karuo/Documents/个人/卡若AI")
CURSOR_PROJECTS = Path.home() / ".cursor/projects"
OUTPUT_INDEX = KARUO_AI / "开发文档/聊天记录_文档恢复索引.md"
OUTPUT_MERGE = KARUO_AI / "开发文档/技能合并报告_1月30日至2月13日.md"
CUTOFF = datetime(2026, 1, 30)  # 1月30日之后

# 婼瑄 → 卡若AI 路径映射（婼瑄用人名金剑/金链，卡若AI用金仓/金盾）
PATH_MAP = {
    "金剑": "金仓",   # 金剑/服务器管理 → 金仓
    "金链": "金仓",   # 金链/iCloud等 → 金仓
    "木果": "金盾",   # 木果/开发模板 → 金盾
    "木根": "火眸",   # 木根/网站逆向 → 火眸
    "木叶": "火眸",   # 木叶/视频切片 → 火眸
    "水泉": "水桥",   # 水泉/需求拆解 → 水桥
    "水溪": "水桥",   # 水溪/对话归档 → 水桥
    "火眼": "金盾",   # 火眼/智能追问 → 金盾
    "火种": "火眸",   # 火种/读书笔记 → 火炬
    "土渠": "火眸",   # 土渠/流量自动化 → 火眸
    "土砖": "火眸",   # 土砖/技能工厂 → 火眸
    "土基": "火眸",   # 土基/商业工具 → 火眸
}

def map_ruoxuan_to_karuo(rel: str) -> str:
    """将婼瑄相对路径映射到卡若AI相对路径"""
    for old, new in PATH_MAP.items():
        rel = rel.replace(f"/{old}/", f"/{new}/").replace(f"{old}/", f"{new}/")
    return rel

SKIP_PARTS = {".venv", "__pycache__", ".git", "node_modules", ".browser_state"}
SKIP_SUFFIX = {".pyc", ".pyo", ".dist-info", ".egg-info"}

def collect_ruoxuan_files(base: Path, prefix: str = "") -> dict:
    """收集婼瑄下 references/*.md, scripts/*, SKILL.md（排除 .venv 等）"""
    out = {}
    for f in base.rglob("*"):
        if not f.is_file():
            continue
        rel = f.relative_to(base)
        if any(p in SKIP_PARTS for p in rel.parts):
            continue
        if rel.suffix in SKIP_SUFFIX:
            continue
        if "references" in rel.parts and rel.suffix == ".md":
            out[str(rel)] = f
        elif "scripts" in rel.parts:
            out[str(rel)] = f
        elif f.name == "SKILL.md":
            out[str(rel)] = f
    return out

def collect_karuo_files(base: Path) -> dict:
    out = {}
    for f in base.rglob("*"):
        if not f.is_file():
            continue
        rel = f.relative_to(base)
        if "references" in rel.parts or "scripts" in rel.parts or f.name == "SKILL.md":
            out[str(rel)] = f
    return out

def extract_paths_from_transcript(content: str) -> set:
    paths = set()
    for m in re.finditer(r'path:\s*([^\s\n"\']{15,})', content):
        p = m.group(1).strip()
        if "卡若AI" in p or "references" in p or "scripts" in p:
            paths.add(p)
    for m in re.finditer(r'["\']([^"\']*卡若AI[^"\']*(?:references|scripts)[^"\']*)["\']', content):
        paths.add(m.group(1))
    return paths

def get_transcripts_since_cutoff():
    """获取 1/30 后修改的 agent-transcripts"""
    found = []
    for proj in CURSOR_PROJECTS.iterdir():
        if not proj.is_dir():
            continue
        at = proj / "agent-transcripts"
        if not at.exists():
            continue
        for tf in at.glob("*.txt"):
            try:
                mtime = datetime.fromtimestamp(tf.stat().st_mtime)
                if mtime >= CUTOFF:
                    found.append(tf)
            except Exception:
                pass
    return found

def main():
    log = []
    log.append("# 技能合并报告：1月30日～2月13日")
    log.append("")
    log.append("## 一、基线说明")
    log.append("- **婼瑄 卡若AI**：1月30日版本，作为基线")
    log.append("- **agent-transcripts**：1月30日后修改的对话记录")
    log.append("- **目标**：卡若AI 全量恢复 + 去重合并")
    log.append("")

    # 1. 婼瑄 → 卡若AI 补充
    if RUOXUAN.exists():
        rx_files = collect_ruoxuan_files(RUOXUAN)
        ka_files = collect_karuo_files(KARUO_AI)
        copied = []
        for rel, src in rx_files.items():
            mapped_rel = map_ruoxuan_to_karuo(rel)
            dest = KARUO_AI / mapped_rel
            if str(mapped_rel) in ka_files:
                continue  # 卡若AI已有则跳过
            if dest.exists():
                continue  # 目标已存在跳过
            dest.parent.mkdir(parents=True, exist_ok=True)
            try:
                shutil.copy2(src, dest)
                copied.append(mapped_rel)
            except Exception as e:
                log.append(f"- 复制失败 {rel}: {e}")
        log.append("## 二、从婼瑄补充到卡若AI")
        log.append(f"- 复制文件数: {len(copied)}")
        for c in copied[:50]:
            log.append(f"  - `{c}`")
        if len(copied) > 50:
            log.append(f"  - ... 共 {len(copied)} 个")
        log.append("")
    else:
        log.append("## 二、婼瑄路径不存在，跳过")
        log.append("")

    # 2. agent-transcripts 1/30 后 提取路径
    transcripts = get_transcripts_since_cutoff()
    all_paths = set()
    for tf in transcripts:
        try:
            content = tf.read_text(encoding="utf-8", errors="ignore")
            all_paths.update(extract_paths_from_transcript(content))
        except Exception:
            pass

    log.append("## 三、1/30-2/13 agent-transcripts 涉及路径")
    log.append(f"- 扫描 transcript 数: {len(transcripts)}")
    log.append(f"- 提取卡若AI相关路径: {len(all_paths)}")
    karuo_paths = [p for p in sorted(all_paths) if "卡若AI" in p]
    for p in karuo_paths[:80]:
        log.append(f"  - `{p}`")
    if len(karuo_paths) > 80:
        log.append(f"  - ... 共 {len(karuo_paths)} 条")
    log.append("")

    log.append("## 四、关键恢复来源")
    log.append("| 来源 | 说明 |")
    log.append("|------|------|")
    log.append("| 婼瑄 卡若AI | 1/30 基线 |")
    log.append("| agent-transcripts | 1/30-2/13 新增内容路径 |")
    log.append("| SynologyDrive Skill | 飞书/纪要/小程序完整脚本 |")
    log.append("")

    OUTPUT_MERGE.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_MERGE.write_text("\n".join(log), encoding="utf-8")
    print(f"已生成: {OUTPUT_MERGE}")

if __name__ == "__main__":
    main()

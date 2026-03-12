#!/usr/bin/env python3
"""
卡若AI 记忆冲突检测

在写入长期记忆（记忆.md）前，扫描已有规则/路由/偏好是否与新内容冲突。
生成 structured/memory-conflict-report.json。

用法：
  python memory_conflict_check.py "新写入的内容"
  python memory_conflict_check.py --file /path/to/new_content.txt
"""

import json
import re
import sys
from datetime import datetime
from pathlib import Path

MEMORY_FILE = Path("/Users/karuo/Documents/个人/1、卡若：本人/记忆.md")
REPORT_FILE = Path(__file__).parent / "structured" / "memory-conflict-report.json"

CONFLICT_PATTERNS = [
    (r"默认.*(?:使用|用|改为|切换)", "默认行为变更"),
    (r"禁止|不得|不要|不允许", "禁止规则"),
    (r"一律|统一|强制|必须", "强制规则"),
    (r"路径.*(?:改为|迁移|移动)", "路径变更"),
    (r"密码|token|key|密钥", "敏感信息"),
]


def load_memory():
    if not MEMORY_FILE.exists():
        return ""
    return MEMORY_FILE.read_text(encoding="utf-8")


def extract_rules(text):
    rules = []
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        for pattern, category in CONFLICT_PATTERNS:
            if re.search(pattern, stripped, re.IGNORECASE):
                rules.append({"line": stripped[:120], "category": category})
                break
    return rules


def check_conflicts(new_content, existing_rules):
    conflicts = []
    new_lines = [l.strip() for l in new_content.splitlines() if l.strip()]
    for new_line in new_lines:
        for rule in existing_rules:
            if rule["category"] in ("禁止规则", "强制规则", "默认行为变更"):
                new_keywords = set(re.findall(r"[\u4e00-\u9fff]+", new_line))
                old_keywords = set(re.findall(r"[\u4e00-\u9fff]+", rule["line"]))
                overlap = new_keywords & old_keywords
                if len(overlap) >= 3:
                    conflicts.append({
                        "new": new_line[:120],
                        "existing": rule["line"][:120],
                        "category": rule["category"],
                        "overlap_keywords": list(overlap)[:8],
                    })
    return conflicts


def main():
    if len(sys.argv) < 2:
        print("用法: python memory_conflict_check.py \"新内容\" 或 --file path")
        sys.exit(1)

    if sys.argv[1] == "--file":
        new_content = Path(sys.argv[2]).read_text(encoding="utf-8")
    else:
        new_content = sys.argv[1]

    existing_text = load_memory()
    existing_rules = extract_rules(existing_text)
    conflicts = check_conflicts(new_content, existing_rules)

    report = {
        "updated": datetime.now().isoformat(),
        "existing_rules_count": len(existing_rules),
        "new_content_lines": len([l for l in new_content.splitlines() if l.strip()]),
        "conflicts_found": len(conflicts),
        "conflicts": conflicts[:20],
        "status": "conflict" if conflicts else "clean",
    }

    REPORT_FILE.parent.mkdir(parents=True, exist_ok=True)
    REPORT_FILE.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    if conflicts:
        print(f"⚠️ 发现 {len(conflicts)} 个潜在冲突：")
        for c in conflicts[:5]:
            print(f"  - [{c['category']}] 新: {c['new'][:60]}… vs 已有: {c['existing'][:60]}…")
        print(f"详见 {REPORT_FILE}")
    else:
        print(f"✅ 无冲突，可安全写入。报告: {REPORT_FILE}")


if __name__ == "__main__":
    main()

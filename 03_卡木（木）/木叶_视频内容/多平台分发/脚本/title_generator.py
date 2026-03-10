#!/usr/bin/env python3
"""
智能标题生成 — 从视频文件名生成各平台标题
规则：
1. 优先使用各平台脚本的 TITLES 字典（手动优化过的标题）
2. 未在字典中的视频，基于文件名自动生成
3. 自动添加话题标签
"""
import re
from pathlib import Path

DEFAULT_TAGS = "#Soul派对 #创业日记"


def clean_filename(name: str) -> str:
    """将视频文件名转为可读标题"""
    stem = Path(name).stem
    stem = re.sub(r'^\d+[._\-\s]*', '', stem)
    stem = stem.replace('_', ' ').replace('  ', ' ').strip()
    return stem


def generate_title(filename: str, titles_dict: dict = None, max_len: int = 60) -> str:
    """生成发布标题：优先字典 → 否则从文件名生成"""
    if titles_dict and filename in titles_dict:
        return titles_dict[filename]

    base = clean_filename(filename)
    if not base:
        base = Path(filename).stem

    if "#" not in base:
        remaining = max_len - len(DEFAULT_TAGS) - 1
        if len(base) > remaining:
            base = base[:remaining]
        base = f"{base} {DEFAULT_TAGS}"

    return base[:max_len]


def generate_title_xhs(filename: str, titles_dict: dict = None) -> tuple[str, str]:
    """小红书需要分标题(≤20字)和正文描述"""
    full = generate_title(filename, titles_dict, max_len=80)
    parts = re.split(r'[,，!！?？\s]+', full)
    title_part = parts[0][:20] if parts else full[:20]
    return title_part, full

#!/usr/bin/env python3
"""多平台分发统一浏览器配置。"""
from __future__ import annotations

import os
from pathlib import Path

PROFILE_ROOT = Path(
    os.environ.get("SOUL_DISTRIBUTION_BROWSER_ROOT", "~/.soul-distribution-browser")
).expanduser()

_PLATFORM_DIR = {
    "视频号": "channels",
    "抖音": "douyin",
    "B站": "bilibili",
    "小红书": "xiaohongshu",
    "快手": "kuaishou",
}


def get_browser_profile_dir(platform: str) -> Path:
    """返回平台固定 Profile 目录（自动创建）。"""
    name = _PLATFORM_DIR.get(platform, platform)
    p = PROFILE_ROOT / name
    p.mkdir(parents=True, exist_ok=True)
    return p


def profile_root_str() -> str:
    return str(PROFILE_ROOT)

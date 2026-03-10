#!/usr/bin/env python3
"""
统一发布结果模块 — 所有平台的 publish_one 都返回此结构。
"""
import json
import time
from dataclasses import dataclass, field, asdict
from datetime import datetime
from pathlib import Path
from typing import Optional

RESULT_LOG = Path(__file__).parent / "publish_log.json"


@dataclass
class PublishResult:
    platform: str
    video_path: str
    title: str
    success: bool
    status: str  # "published" | "reviewing" | "failed" | "error"
    message: str = ""
    error_code: Optional[str] = None
    screenshot: Optional[str] = None
    content_url: Optional[str] = None
    elapsed_sec: float = 0.0
    timestamp: str = field(default_factory=lambda: datetime.now().strftime("%Y-%m-%d %H:%M:%S"))

    def to_dict(self) -> dict:
        return {k: v for k, v in asdict(self).items() if v is not None}

    def log_line(self) -> str:
        icon = "✓" if self.success else "✗"
        return f"[{icon}] {self.platform} | {Path(self.video_path).name} | {self.status} | {self.message}"


def save_results(results: list[PublishResult]):
    """追加写入 JSON Lines 日志"""
    with open(RESULT_LOG, "a", encoding="utf-8") as f:
        for r in results:
            f.write(json.dumps(r.to_dict(), ensure_ascii=False) + "\n")


def print_summary(results: list[PublishResult]):
    """控制台打印汇总表"""
    if not results:
        return
    print("\n" + "=" * 72)
    print("  发布结果汇总")
    print("=" * 72)
    for r in results:
        icon = "✓" if r.success else "✗"
        name = Path(r.video_path).stem[:30]
        print(f"  [{icon}] {r.platform:<6} | {name:<32} | {r.status}")
        if not r.success and r.message:
            print(f"         └─ {r.message[:60]}")
    ok = sum(1 for r in results if r.success)
    print("-" * 72)
    print(f"  成功: {ok}/{len(results)}  |  耗时: {sum(r.elapsed_sec for r in results):.1f}s")
    print("=" * 72 + "\n")

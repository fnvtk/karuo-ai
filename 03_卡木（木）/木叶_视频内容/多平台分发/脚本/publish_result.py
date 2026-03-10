#!/usr/bin/env python3
"""
统一发布结果模块 — 所有平台的 publish_one 都返回此结构。
含：结果日志、去重检查、失败重试加载、飞书通知。
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


def load_published_set() -> set[tuple[str, str]]:
    """加载已成功发布的 (platform, video_filename) 集合，用于去重"""
    published = set()
    if not RESULT_LOG.exists():
        return published
    with open(RESULT_LOG, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                rec = json.loads(line)
                if rec.get("success"):
                    fname = Path(rec.get("video_path", "")).name
                    published.add((rec["platform"], fname))
            except json.JSONDecodeError:
                continue
    return published


def load_failed_tasks() -> list[dict]:
    """加载失败任务列表（用于重试）"""
    failed = []
    if not RESULT_LOG.exists():
        return failed
    seen = {}
    with open(RESULT_LOG, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                rec = json.loads(line)
                key = (rec.get("platform", ""), Path(rec.get("video_path", "")).name)
                seen[key] = rec
            except json.JSONDecodeError:
                continue
    for key, rec in seen.items():
        if not rec.get("success"):
            failed.append(rec)
    return failed


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

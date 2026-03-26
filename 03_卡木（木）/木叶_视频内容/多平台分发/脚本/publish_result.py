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
UPLOAD_LIBRARY_LOG = Path(__file__).parent / "upload_library.jsonl"
# 平台侧已删除/作废发布时追加一行，从去重集合中排除（避免仅删 upload_library 仍被 publish_log 卡住）
DEDUP_REVOKE_LOG = Path(__file__).parent / "publish_dedup_revoke.jsonl"


def _video_signature(video_path: str) -> str:
    p = Path(video_path)
    try:
        st = p.stat()
        return f"{p.name}|{st.st_size}"
    except Exception:
        return p.name


def _load_dedup_revoke_names() -> set[tuple[str, str]]:
    """(platform, video basename) 不再视为已发布去重。"""
    out: set[tuple[str, str]] = set()
    if not DEDUP_REVOKE_LOG.exists():
        return out
    with open(DEDUP_REVOKE_LOG, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                rec = json.loads(line)
                pf = (rec.get("platform") or "").strip()
                name = (rec.get("video_name") or "").strip()
                if pf and name:
                    out.add((pf, name))
            except json.JSONDecodeError:
                continue
    return out


def _load_library_set() -> set[tuple[str, str]]:
    out = set()
    revoked_names = _load_dedup_revoke_names()
    if not UPLOAD_LIBRARY_LOG.exists():
        return out
    with open(UPLOAD_LIBRARY_LOG, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                rec = json.loads(line)
                pf = rec.get("platform", "")
                sig = rec.get("video_signature", "")
                if pf and sig:
                    fname = sig.split("|", 1)[0]
                    if (pf, fname) in revoked_names:
                        continue
                    out.add((pf, sig))
            except json.JSONDecodeError:
                continue
    return out

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
    """追加写入 JSON Lines 日志，并同步上传库去重记录"""
    with open(RESULT_LOG, "a", encoding="utf-8") as f:
        for r in results:
            f.write(json.dumps(r.to_dict(), ensure_ascii=False) + "\n")

    # 仅成功条目写入上传库（全平台统一去重）
    with open(UPLOAD_LIBRARY_LOG, "a", encoding="utf-8") as lib:
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        for r in results:
            if not r.success:
                continue
            rec = {
                "timestamp": now,
                "platform": r.platform,
                "video_path": r.video_path,
                "video_signature": _video_signature(r.video_path),
                "status": r.status,
            }
            lib.write(json.dumps(rec, ensure_ascii=False) + "\n")


def load_published_set() -> set[tuple[str, str]]:
    """加载已成功发布集合（兼容旧日志 + 上传库）。"""
    published = set()
    revoked_names = _load_dedup_revoke_names()
    if RESULT_LOG.exists():
        with open(RESULT_LOG, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    rec = json.loads(line)
                    if rec.get("success"):
                        fname = Path(rec.get("video_path", "")).name
                        plat = rec.get("platform", "")
                        if fname and (plat, fname) in revoked_names:
                            continue
                        published.add((plat, fname))
                except json.JSONDecodeError:
                    continue

    # 同步上传库签名映射回文件名集合（保障去重不遗漏）
    for platform, sig in _load_library_set():
        fname = sig.split("|", 1)[0]
        if fname and (platform, fname) not in revoked_names:
            published.add((platform, fname))
    return published


def is_published(platform: str, video_path: str) -> bool:
    """检查某条视频是否已成功发布到某平台（全平台上传库去重）。"""
    fname = Path(video_path).name
    if (platform, fname) in _load_dedup_revoke_names():
        return False
    if (platform, fname) in load_published_set():
        return True
    sig = _video_signature(video_path)
    return (platform, sig) in _load_library_set()


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

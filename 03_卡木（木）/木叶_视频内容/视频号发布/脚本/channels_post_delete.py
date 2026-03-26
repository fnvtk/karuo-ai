#!/usr/bin/env python3
"""
视频号批量删除：按切片目录用 VideoMeta 标题关键词匹配 post_list 描述，
再调用 mmfinderassistant-bin/post/post_delete（body: {"objectId": "export/..."}）。

匹配规则与发布验收一致：描述须含 channels_publish.REQUIRED_DESC_FRAGMENTS。
"""
from __future__ import annotations

import argparse
import hashlib
import sys
import time
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR.parent.parent / "多平台分发" / "脚本"))

import httpx
from video_metadata import VideoMeta

import channels_publish as ch

POST_DELETE_URL = "https://channels.weixin.qq.com/cgi-bin/mmfinderassistant-bin/post/post_delete"


def _md5_file(path: Path) -> str:
    h = hashlib.md5()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest().lower()


def _media_md5s_from_item(it: dict) -> set[str]:
    out: set[str] = set()
    for med in (it.get("desc") or {}).get("media") or []:
        m = (med.get("md5sum") or "").strip().lower()
        if m:
            out.add(m)
    return out


def match_posts_for_dir(
    video_dir: Path,
    items: list,
    glob_pat: str,
    required_frags: list[str] | None = None,
    md5_fallback: bool = True,
) -> dict[str, tuple[str, str]]:
    """
    每个 mp4 至多一条：{filename: (objectId, matched_keyword)}。
    关键词按长度降序，优先最长匹配；列表顺序与 post_list 返回一致（通常新在前）。
    """
    if required_frags is None:
        required_frags = ch.REQUIRED_DESC_FRAGMENTS
    out: dict[str, tuple[str, str]] = {}
    paths = sorted(video_dir.glob(glob_pat))
    if not paths:
        paths = sorted(video_dir.glob("*.mp4"))
    for p in paths:
        meta = VideoMeta.from_filename(p.name)
        title = meta.title("视频号")
        kws = ch._title_keywords_for_list_check(title, str(p))
        kws_sorted = sorted({k for k in kws if (k or "").strip()}, key=len, reverse=True)
        for it in items:
            desc = (it.get("desc") or {}).get("description") or ""
            dl = desc.lower()
            if any((f or "").lower() not in dl for f in required_frags):
                continue
            hit_kw = None
            for kw in kws_sorted:
                if kw in desc:
                    hit_kw = kw
                    break
            if not hit_kw:
                continue
            oid = it.get("objectId")
            if not oid:
                continue
            out[p.name] = (str(oid), hit_kw)
            break
    if md5_fallback:
        paths = sorted(video_dir.glob(glob_pat)) or sorted(video_dir.glob("*.mp4"))
        for p in paths:
            if p.name in out:
                continue
            try:
                fmd5 = _md5_file(p)
            except OSError:
                continue
            for it in items:
                if fmd5 not in _media_md5s_from_item(it):
                    continue
                oid = it.get("objectId")
                if not oid:
                    continue
                out[p.name] = (str(oid), f"md5:{fmd5[:8]}…")
                break
    return out


def post_delete_one(cookie_str: str, object_id: str) -> dict:
    r = httpx.post(
        POST_DELETE_URL,
        json={"objectId": object_id},
        headers={
            "Cookie": cookie_str,
            "User-Agent": ch.UA,
            "Content-Type": "application/json",
        },
        timeout=httpx.Timeout(15.0, connect=5.0),
    )
    try:
        return r.json()
    except Exception:
        return {"errCode": -9, "errMsg": r.text[:200]}


def main() -> int:
    ap = argparse.ArgumentParser(description="视频号：按目录匹配列表并 post_delete")
    ap.add_argument("--video-dir", type=Path, required=True, help="切片目录")
    ap.add_argument("--glob", default="*.mp4", help="匹配切片，如 soul130_*.mp4")
    ap.add_argument("--max-pages", type=int, default=35, help="post_list 最大翻页数")
    ap.add_argument("--dry-run", action="store_true", help="只打印将删条目，不调用删除")
    ap.add_argument(
        "--no-md5-fallback",
        action="store_true",
        help="禁用本地文件 MD5 与列表 media.md5sum 兜底匹配",
    )
    args = ap.parse_args()
    d = args.video_dir.expanduser().resolve()
    if not d.is_dir():
        print(f"目录不存在: {d}", flush=True)
        return 1
    cs = ch._cookie_str_from_file()
    ok, msg, _ = ch.verify_session_cookie()
    if not ok:
        print(msg, flush=True)
        return 1
    items = ch._gather_post_list(cs, args.max_pages)
    matched = match_posts_for_dir(
        d, items, args.glob, md5_fallback=not args.no_md5_fallback
    )
    mp4s = sorted(d.glob(args.glob)) or sorted(d.glob("*.mp4"))
    # 同一 objectId 只删一次（避免误配两条文件名指向同一动态）
    by_oid: dict[str, tuple[str, str]] = {}
    for fname, (oid, kw) in matched.items():
        if oid in by_oid:
            print(f"  [skip dup oid] {fname} same as {by_oid[oid][0]}", flush=True)
            continue
        by_oid[oid] = (fname, kw)

    missing = [p.name for p in mp4s if p.name not in matched]
    print(f"目录 mp4: {len(mp4s)} | 匹配到动态: {len(by_oid)} | 未匹配文件: {len(missing)}", flush=True)
    for oid, (fname, kw) in by_oid.items():
        print(f"  DEL? {fname} | kw={kw[:40]}… | {oid[:56]}…", flush=True)
    if missing:
        print("  未匹配:", ", ".join(missing[:20]), ("…" if len(missing) > 20 else ""), flush=True)

    if args.dry_run:
        return 2 if missing else 0

    errs = 0
    for oid, (fname, _) in by_oid.items():
        data = post_delete_one(cs, oid)
        code = data.get("errCode")
        em = (data.get("errMsg") or "")[:120]
        print(f"  {fname} errCode={code} {em}", flush=True)
        if code != 0:
            errs += 1
        time.sleep(0.35)
    return 1 if errs else 0


if __name__ == "__main__":
    raise SystemExit(main())

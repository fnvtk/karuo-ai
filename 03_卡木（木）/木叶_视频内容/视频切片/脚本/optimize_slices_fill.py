#!/usr/bin/env python3
"""
Soul 切片优化：统一输出 1080x1920 竖屏，内容占满整个画面，无黑边

用法:
  python optimize_slices_fill.py --dir "/Users/karuo/Movies/soul视频/soul 派对 106场 20260221_output"
  python optimize_slices_fill.py --dir "/Users/karuo/Movies/soul视频" --recursive
"""

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path


def get_video_size(path: str) -> tuple:
    """返回 (width, height)"""
    cmd = [
        "ffprobe", "-v", "error", "-select_streams", "v:0",
        "-show_entries", "stream=width,height", "-of", "json", path
    ]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        return 0, 0
    d = json.loads(r.stdout)
    s = d.get("streams", [{}])[0]
    return int(s.get("width", 0)), int(s.get("height", 0))


def optimize_one(in_path: Path, out_path: Path, overwrite: bool = True) -> bool:
    """
    将任意尺寸视频转为 1080x1920，内容占满画面（scale 覆盖 + 居中 crop）
    """
    import tempfile
    w, h = get_video_size(str(in_path))
    if w <= 0 or h <= 0:
        print(f"  ⚠ 无法读取: {in_path.name}")
        return False
    if w == 1080 and h == 1920:
        print(f"  ⊘ 已是 1080x1920: {in_path.name}")
        return True
    out_path.parent.mkdir(parents=True, exist_ok=True)
    # 原地覆盖时先写临时文件，再替换
    dest = out_path
    if in_path.resolve() == out_path.resolve():
        dest = Path(tempfile.mktemp(suffix=".mp4", dir=out_path.parent))
    vf = "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920:(iw-1080)/2:(ih-1920)/2"
    cmd = [
        "ffmpeg", "-y", "-i", str(in_path),
        "-vf", vf, "-c:v", "libx264", "-preset", "fast", "-crf", "23",
        "-c:a", "aac", "-b:a", "128k", str(dest)
    ]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode == 0:
        if dest != out_path:
            dest.replace(out_path)
        print(f"  ✓ {in_path.name} ({w}x{h} → 1080x1920)")
        return True
    err = (r.stderr or "").strip().split("\n")[-3:] if r.stderr else ["unknown"]
    print(f"  ✗ {in_path.name}: {err}")
    if dest != out_path and dest.exists():
        dest.unlink(missing_ok=True)
    return False


def main():
    ap = argparse.ArgumentParser(description="切片优化：统一 1080x1920，内容占满")
    ap.add_argument("--dir", "-d", required=True, help="目录路径")
    ap.add_argument("--recursive", "-r", action="store_true", help="递归子目录")
    ap.add_argument("--inplace", action="store_true", default=True, help="原地覆盖（默认）")
    ap.add_argument("--no-inplace", action="store_false", dest="inplace", help="输出到 _filled 子目录")
    args = ap.parse_args()
    root = Path(args.dir)
    if not root.exists():
        print(f"❌ 目录不存在: {root}")
        sys.exit(1)
    if args.recursive:
        files = list(root.rglob("*.mp4"))
    else:
        files = list(root.glob("*.mp4"))
    # 排除源视频（未切片的长视频）
    def is_source(v: Path) -> bool:
        n = v.stem.lower()
        if "派对" in v.name and "output" not in str(v) and "_" not in v.stem:
            return True
        if re.match(r"soul\s*\d+场", v.name) and "output" not in str(v):
            return True
        return False
    files = [f for f in files if not is_source(f)]
    if not files:
        print(f"❌ 未找到 mp4: {root}")
        sys.exit(1)
    print("=" * 60)
    print("📱 Soul 切片优化：1080x1920，内容占满")
    print("=" * 60)
    print(f"目录: {root} | 文件数: {len(files)}")
    print("=" * 60)
    ok = 0
    for fp in sorted(files):
        if args.inplace:
            out = fp
        else:
            out = fp.parent / "_filled" / fp.name
        if optimize_one(fp, out, overwrite=True):
            ok += 1
    print()
    print(f"✅ 完成 {ok}/{len(files)}")


if __name__ == "__main__":
    main()

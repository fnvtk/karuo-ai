#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Soul 竖屏中段裁剪（批量）
横版 1920×1080 → 竖条（高 1080，宽 = analyze 包络宽，默认不横向压扁）。
每场先用 analyze_feishu_ui_crop 得到 CROP_VF 后，可改本文件 CROP_VF 或后续加 CLI。
"""
import argparse
import re
import subprocess
import sys
from pathlib import Path

# 与 soul_enhance 默认一致；他场次请用 analyze_feishu_ui_crop.py 打印的 CROP_VF 覆盖
# 需旧版 498 宽：在末尾加 ,scale=498:1080:flags=lanczos
CROP_VF = "crop=598:1080:493:0"
OUT_SUFFIX = "_竖屏中段"


def main():
    parser = argparse.ArgumentParser(description="Soul 竖屏中段批量裁剪")
    parser.add_argument("--dir", "-d", required=True, help="切片目录（clips 或 clips_enhanced）")
    parser.add_argument("--suffix", "-s", default=OUT_SUFFIX, help="输出文件名后缀")
    parser.add_argument("--pattern", "-p", default="*_enhanced.mp4", help="匹配文件，如 *.mp4 表示所有 mp4")
    parser.add_argument("--out-dir", "-o", default="", help="输出目录（默认同 --dir）")
    parser.add_argument("--title-only", action="store_true", help="输出文件名仅用标题（去掉序号、竖屏中段等）")
    parser.add_argument("--dry-run", action="store_true", help="只列文件不执行")
    args = parser.parse_args()

    base = Path(args.dir).resolve()
    if not base.is_dir():
        print(f"❌ 目录不存在: {base}", file=sys.stderr)
        sys.exit(1)

    out_dir = Path(args.out_dir).resolve() if args.out_dir else base
    out_dir.mkdir(parents=True, exist_ok=True)

    files = sorted(base.glob(args.pattern))
    files = [f for f in files if OUT_SUFFIX not in f.stem and "_竖屏中段" not in f.stem]
    if not files:
        print(f"  未找到 {args.pattern}（已排除竖屏中段）: {base}")
        return

    print(f"📁 {base} → {out_dir}")
    print(f"   共 {len(files)} 个将做竖屏中段裁剪")
    if args.dry_run:
        for f in files:
            print(f"   - {f.name}")
        return

    for f in files:
        if getattr(args, "title_only", False):
            # 仅标题：去掉 soul112_01_、_enhanced、_竖屏中段 等，只保留标题
            stem = re.sub(r"^soul\d+_\d+_", "", f.stem)
            stem = re.sub(r"_enhanced$", "", stem)
            stem = re.sub(r"_竖屏中段$", "", stem)
            out_name = stem + f.suffix
        else:
            out_name = f.stem + args.suffix + f.suffix
        out_path = out_dir / out_name
        cmd = [
            "ffmpeg", "-y", "-i", str(f),
            "-vf", CROP_VF,
            "-c:a", "copy",
            str(out_path),
        ]
        print(f"   {f.name} → {out_name}")
        r = subprocess.run(cmd, capture_output=True, text=True)
        if r.returncode != 0:
            print(f"   ❌ 失败: {r.stderr[:200]}", file=sys.stderr)
        else:
            print(f"   ✅ {out_path.name}")
    print("Done.")


if __name__ == "__main__":
    main()

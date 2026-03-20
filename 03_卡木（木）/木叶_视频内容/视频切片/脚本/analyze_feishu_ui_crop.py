#!/usr/bin/env python3
"""
从飞书/Soul 录屏的一帧全画面（1920×1080）估计「深色小程序主体」左右边界，
输出两段 crop + overlay_x，保证界面整段入画、尽量不夹右侧白底。

用法:
  python3 analyze_feishu_ui_crop.py /path/to/frame.jpg
  python3 analyze_feishu_ui_crop.py /path/to/video.mp4 --at 0.2
"""

import argparse
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image


def load_frame(path: Path, at_ratio: float | None) -> np.ndarray:
    path = path.resolve()
    if path.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}:
        return np.asarray(Image.open(path).convert("RGB"), dtype=np.float32)
    if at_ratio is None:
        at_ratio = 0.2
    dur = float(
        subprocess.check_output(
            [
                "ffprobe",
                "-v",
                "error",
                "-show_entries",
                "format=duration",
                "-of",
                "default=noprint_wrappers=1:nokey=1",
                str(path),
            ],
            text=True,
        ).strip()
    )
    t = max(0.0, dur * at_ratio)
    raw = subprocess.check_output(
        [
            "ffmpeg",
            "-v",
            "error",
            "-ss",
            f"{t:.3f}",
            "-i",
            str(path),
            "-frames:v",
            "1",
            "-f",
            "image2pipe",
            "-vcodec",
            "png",
            "-",
        ]
    )
    from io import BytesIO

    return np.asarray(Image.open(BytesIO(raw)).convert("RGB"), dtype=np.float32)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("input", type=Path, help="全画面截图 jpg/png 或视频 mp4")
    ap.add_argument("--at", type=float, default=None, help="视频取样比例 0~1，默认 0.2")
    args = ap.parse_args()

    arr = load_frame(args.input, args.at)
    h, w, _ = arr.shape
    gray = 0.299 * arr[:, :, 0] + 0.587 * arr[:, :, 1] + 0.114 * arr[:, :, 2]
    col_mean = gray.mean(axis=0)

    win = 31
    pad = win // 2
    kernel = np.ones(win) / win
    smooth = np.convolve(np.pad(col_mean, (pad, pad), mode="edge"), kernel, mode="valid")

    dark = smooth < 105
    best = (0, 0)
    i = 0
    while i < w:
        if not dark[i]:
            i += 1
            continue
        j = i
        while j < w and dark[j]:
            j += 1
        if j - i > best[1] - best[0]:
            best = (i, j)
        i = j
    L0, R0 = best
    if R0 - L0 < 200:
        print("未找到足够宽的深色带，请换一帧或检查分辨率", file=sys.stderr)
        sys.exit(1)

    # 右缘：深色带结束后出现的持续高亮（白底）
    right = R0
    for x in range(R0, min(R0 + 500, w)):
        if smooth[x] > 195 and col_mean[x] > 200 and x + 5 < w and smooth[x : x + 5].min() > 185:
            right = x
            break

    # 严格包络：只用最长深色块 [L0,R0)，避免把右侧灰白过渡算进画面（用户要求无白边）
    L = max(0, L0)
    W_strict = R0 - L0
    if W_strict < 498:
        print(f"深色带宽度 {W_strict} < 498，需 scale 或换源", file=sys.stderr)
        sys.exit(1)
    inner = (W_strict - 498) // 2
    ox = L + inner
    vf = f"crop={W_strict}:1080:{L}:0,crop=498:1080:{inner}:0"
    print(f"# {w}x{h} 最长深色列区间 [{L0},{R0}) 宽={W_strict}；白底高亮约从 x>={right} 起")
    print(f"CROP_VF={vf!r}")
    print(f"OVERLAY_X={ox}")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
从飞书/Soul 录屏的一帧全画面（1920×1080）估计「深色核心」后**扩边到桌面白**，
默认输出 **仅 crop=包络宽×1080**，保持截图真实横纵比、不横向拉伸；可选 `--squeeze-498` 压宽到 498 或 `--center-in-band` 带内居中裁 498。

用法:
  python3 analyze_feishu_ui_crop.py /path/to/frame.jpg
  python3 analyze_feishu_ui_crop.py /path/to/video.mp4 --at 0.2
  python3 analyze_feishu_ui_crop.py /path/to/video.mp4 --at 0.2 --save-dir ./裁剪检查
    → 写入「全画面取样」与「竖条塑形预览 Wx1080」，便于对照后再跑 soul_enhance --crop-vf
  可选 --edge-shrink N（左右内收减白边）、--edge-expand N（左右外扩露头像），宜对照 PNG 验收后再定稿。
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


def compute_feishu_band(arr: np.ndarray, strict_core: bool = False) -> dict:
    """
    从 RGB float32 帧估计飞书会议深色主内容区包络 [L, L+W_band)。
    失败时抛出 ValueError（消息给人读）。
    """
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
        raise ValueError("未找到足够宽的深色带，请换一帧或检查分辨率")

    right = R0
    for x in range(R0, min(R0 + 500, w)):
        if smooth[x] > 195 and col_mean[x] > 200 and x + 5 < w and smooth[x : x + 5].min() > 185:
            right = x
            break

    if strict_core:
        L = max(0, L0)
        W_band = R0 - L0
    else:
        white_mean = 248.0
        white_smooth = 228.0

        def col_is_desktop_white(x: int) -> bool:
            if x < 0 or x >= w:
                return True
            return col_mean[x] >= white_mean and smooth[x] >= white_smooth

        L = L0
        while L > 0 and not col_is_desktop_white(L - 1):
            L -= 1

        R = R0
        while R < w and not col_is_desktop_white(R):
            R += 1

        W_band = R - L
        if W_band < 200:
            L, W_band = max(0, L0), R0 - L0

    if W_band < 200:
        raise ValueError(f"可用宽度 {W_band} 过窄，请换一帧")

    return {
        "w": w,
        "h": h,
        "L0": L0,
        "R0": R0,
        "L": L,
        "W_band": W_band,
        "right": right,
        "arr": arr,
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("input", type=Path, help="全画面截图 jpg/png 或视频 mp4")
    ap.add_argument("--at", type=float, default=None, help="视频取样比例 0~1，默认 0.2")
    ap.add_argument(
        "--save-dir",
        type=Path,
        default=None,
        help="可选：保存全画面标定帧 PNG、竖条 498×1080 预览 PNG、塑形参数 txt",
    )
    ap.add_argument(
        "--strict-core",
        action="store_true",
        help="仅用最深色核心宽度（旧逻辑，可能偏窄）；默认会向左右扩到桌面白边",
    )
    ap.add_argument(
        "--center-in-band",
        action="store_true",
        help="扩边后在带内居中再裁成 498 宽（不拉伸；带宽不足则退化为 scale 到 498）",
    )
    ap.add_argument(
        "--squeeze-498",
        action="store_true",
        help="扩边后横向压到 498 宽（会拉伸变形，仅兼容旧抖音尺寸）",
    )
    ap.add_argument(
        "--edge-shrink",
        type=int,
        default=0,
        metavar="N",
        help="包络确定后左右各向内收 N 像素再 crop，减轻竖条里残留浅底/白边（0=关闭；可试 12～36）",
    )
    ap.add_argument(
        "--edge-expand",
        type=int,
        default=0,
        metavar="N",
        help="在上述结果上左右各再外扩 N 像素（含进画面），便于露出两侧头像/参会条；与 edge-shrink 可同时用：先缩后扩。过大可能带入过多白边，须对照竖条预览验收",
    )
    args = ap.parse_args()

    arr = load_frame(args.input, args.at)
    try:
        geo = compute_feishu_band(arr, strict_core=args.strict_core)
    except ValueError as e:
        print(str(e), file=sys.stderr)
        sys.exit(1)

    w, h = geo["w"], geo["h"]
    L0, R0 = geo["L0"], geo["R0"]
    L, W_band, right = geo["L"], geo["W_band"], geo["right"]

    es = max(0, int(getattr(args, "edge_shrink", 0) or 0))
    if es > 0:
        L2 = L + es
        W2 = W_band - 2 * es
        if W2 >= 200:
            L, W_band = L2, W2
            print(f"# edge-shrink={es}px → 包络改为 L={L} W={W_band}", flush=True)
        else:
            print(
                f"# edge-shrink={es}px 跳过（带宽将变为 {W2}<200，保持原包络）",
                file=sys.stderr,
            )

    ex = max(0, int(getattr(args, "edge_expand", 0) or 0))
    if ex > 0:
        Ln = max(0, L - ex)
        Wn = min(w - Ln, W_band + 2 * ex)
        if Wn >= 200:
            L, W_band = Ln, Wn
            print(f"# edge-expand={ex}px → 包络改为 L={L} W={W_band}（左右各尽量外扩）", flush=True)
        else:
            print(
                f"# edge-expand={ex}px 跳过（带宽将变为 {Wn}<200）",
                file=sys.stderr,
            )

    if args.squeeze_498 and args.center_in_band:
        print("同时指定 --squeeze-498 与 --center-in-band 时以 --center-in-band 为准", file=sys.stderr)

    if args.center_in_band:
        if W_band >= 498:
            inner = (W_band - 498) // 2
            ox = L + inner
            vf = f"crop={W_band}:1080:{L}:0,crop=498:1080:{inner}:0"
            mode = "center_crop_498"
        else:
            ox = L
            vf = f"crop={W_band}:1080:{L}:0,scale=498:1080:flags=lanczos"
            mode = "center_band_fallback_scale498"
            print(
                f"包络宽 {W_band}<498，center-in-band 退化为横向 scale 至 498",
                file=sys.stderr,
            )
    elif args.squeeze_498:
        ox = L
        vf = f"crop={W_band}:1080:{L}:0,scale=498:1080:flags=lanczos"
        mode = "squeeze_to_498"
    else:
        # 默认：保持包络真实像素比，成片宽 = W_band（常见 560～750，随场次而变）
        ox = L
        vf = f"crop={W_band}:1080:{L}:0"
        mode = "native_aspect_strip"

    geo = "strict_core" if args.strict_core else f"expand_edge"
    if ",crop=498:1080" in vf.replace(" ", "") or "scale=498:1080" in vf.replace(" ", ""):
        out_px = 498
    else:
        out_px = W_band

    print(
        f"# {w}x{h} 深色核心 [{L0},{R0}) 宽={R0-L0}；{geo}+{mode}；包络 [{L},{L+W_band}) 宽={W_band}；成片约 {out_px}x1080；白底约 x>={right}"
    )
    print(f"CROP_VF={vf!r}")
    print(f"OVERLAY_X={ox}")
    print(f"OUTPUT_SIZE={out_px}x1080")

    if args.save_dir:
        args.save_dir = args.save_dir.resolve()
        args.save_dir.mkdir(parents=True, exist_ok=True)
        ratio = float(args.at) if args.at is not None else 0.2
        stem = args.input.stem.replace(" ", "_")[:40]
        u8 = np.clip(arr, 0, 255).astype(np.uint8)
        full_path = args.save_dir / f"{stem}_全画面_{ratio:.0%}.png"
        Image.fromarray(u8).save(full_path, optimize=True)
        strip = u8[:, L : L + W_band, :]
        if args.center_in_band and W_band >= 498:
            inner_sv = (W_band - 498) // 2
            strip_img = Image.fromarray(strip[:, inner_sv : inner_sv + 498, :])
            strip_name = f"{stem}_竖条预览_498x1080.png"
        elif (args.center_in_band and W_band < 498) or args.squeeze_498:
            strip_img = Image.fromarray(strip).resize((498, 1080), Image.LANCZOS)
            strip_name = f"{stem}_竖条预览_498x1080.png"
        else:
            strip_img = Image.fromarray(strip)
            strip_name = f"{stem}_竖条塑形预览_{W_band}x1080.png"
        strip_path = args.save_dir / strip_name
        strip_img.save(strip_path, optimize=True)
        txt_path = args.save_dir / f"{stem}_塑形裁剪参数.txt"
        txt_path.write_text(
            f"# 取样: {args.input.name}  ratio={ratio}\n"
            f"# edge-shrink: {es}px（左右各内收，减轻白边；0=关）\n"
            f"# edge-expand: {ex}px（左右各外扩，便于露两侧头像；0=关）\n"
            f"# 成片宽高（竖条）\n"
            f"CROP_VF={vf!r}\nOVERLAY_X={ox}\nOUTPUT_SIZE={out_px}x1080\n\n"
            f"soul_enhance 示例:\n"
            f'  --crop-vf "{vf}" --overlay-x {ox}\n',
            encoding="utf-8",
        )
        print(f"SAVED_FULL={full_path}")
        print(f"SAVED_STRIP={strip_path}")
        print(f"SAVED_TXT={txt_path}")


if __name__ == "__main__":
    main()

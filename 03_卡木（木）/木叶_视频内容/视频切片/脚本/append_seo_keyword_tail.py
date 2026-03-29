#!/usr/bin/env python3
"""
在竖屏成片末尾拼接「SEO 关键字页」静帧（无声），用于搜一搜/长尾曝光。
词表默认：../参考资料/视频尾帧_SEO关键词200.txt（每行一词，按成片序号取一段不重复块）。
用法：
  python3 append_seo_keyword_tail.py --dir ~/Movies/soul视频/第98场_20260212_output/成片 \\
    --keywords ../参考资料/视频尾帧_SEO关键词200.txt --duration 2.8
"""
from __future__ import annotations

import argparse
import os
import re
import subprocess
import tempfile
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    Image = ImageDraw = ImageFont = None  # type: ignore


SCRIPT_DIR = Path(__file__).resolve().parent
DEFAULT_KW = SCRIPT_DIR.parent / "参考资料" / "视频尾帧_SEO关键词200.txt"
FONTS_DIR = SCRIPT_DIR.parent / "fonts"
FALLBACK_FONT = Path("/System/Library/Fonts/PingFang.ttc")


def load_keywords(path: Path) -> list[str]:
    lines = []
    for raw in path.read_text(encoding="utf-8").splitlines():
        s = raw.strip()
        if s and not s.startswith("#"):
            lines.append(s)
    return lines


def clip_index_from_name(name: str) -> int:
    m = re.search(r"_(\d{2})\.mp4$", name)
    if m:
        return int(m.group(1))
    nums = re.findall(r"_(\d+)_", name)
    if nums:
        return min(int(x) for x in nums)
    return 1


def sort_mp4_by_clip_index(paths: list[Path]) -> list[Path]:
    """按文件名末尾 _01._02 排序，避免中文 locale 下漏处理第一条。"""
    return sorted(paths, key=lambda p: clip_index_from_name(p.name))


def pick_block(words: list[str], clip_idx: int, per_clip: int) -> list[str]:
    n = len(words)
    if n == 0:
        return ["卡若创业派对"]
    start = ((clip_idx - 1) * per_clip) % n
    out = []
    for i in range(per_clip):
        out.append(words[(start + i) % n])
    return out


def probe_size_rate(main_mp4: Path) -> tuple[int, int, int]:
    w = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-select_streams",
            "v:0",
            "-show_entries",
            "stream=width,height",
            "-of",
            "csv=p=0:s=x",
            str(main_mp4),
        ],
        capture_output=True,
        text=True,
    )
    wh = w.stdout.strip().split("x")
    width, height = int(wh[0]), int(wh[1])
    r = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-select_streams",
            "a:0",
            "-show_entries",
            "stream=sample_rate",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            str(main_mp4),
        ],
        capture_output=True,
        text=True,
    )
    sr = int(float(r.stdout.strip() or "48000"))
    return width, height, sr


def render_keyword_page(
    width: int,
    height: int,
    lines: list[str],
    png_path: Path,
    font_path: Path | None,
) -> None:
    if Image is None:
        raise RuntimeError("需要安装 Pillow: pip install pillow")
    img = Image.new("RGB", (width, height), (18, 22, 32))
    draw = ImageDraw.Draw(img)
    fp = font_path if font_path and font_path.exists() else FALLBACK_FONT
    try:
        title_font = ImageFont.truetype(str(fp), 28)
        body_font = ImageFont.truetype(str(fp), 22)
    except OSError:
        title_font = body_font = ImageFont.load_default()

    title = "搜索关键词 · 卡若创业派对"
    draw.text((24, 20), title, fill=(0, 200, 140), font=title_font)
    y = 72
    for line in lines:
        draw.text((24, y), f"· {line}", fill=(240, 245, 250), font=body_font)
        y += 34
        if y > height - 40:
            break
    img.save(str(png_path), "PNG")


def make_tail_clip(
    png: Path,
    out_mp4: Path,
    duration: float,
    width: int,
    height: int,
    sample_rate: int,
) -> None:
    cmd = [
        "ffmpeg",
        "-y",
        "-loop",
        "1",
        "-i",
        str(png),
        "-f",
        "lavfi",
        "-i",
        f"anullsrc=channel_layout=stereo:sample_rate={sample_rate}",
        "-t",
        str(duration),
        "-vf",
        f"scale={width}:{height}:force_original_aspect_ratio=decrease,pad={width}:{height}:(ow-iw)/2:(oh-ih)/2",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        "-shortest",
        str(out_mp4),
    ]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0 or not out_mp4.exists():
        raise RuntimeError((r.stderr or r.stdout or "")[-800:])


def concat_videos(main: Path, tail: Path, final_out: Path) -> None:
    lst = final_out.parent / "_concat_tail_list.txt"
    fd, tmp_path = tempfile.mkstemp(
        suffix="_tailconcat.mp4", dir=str(final_out.parent)
    )
    os.close(fd)
    tmp = Path(tmp_path)
    try:
        with open(lst, "w", encoding="utf-8") as f:
            f.write(f"file '{main.resolve()}'\n")
            f.write(f"file '{tail.resolve()}'\n")
        r = subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-f",
                "concat",
                "-safe",
                "0",
                "-i",
                str(lst),
                "-c",
                "copy",
                str(tmp),
            ],
            capture_output=True,
            text=True,
        )
        if r.returncode != 0 or not tmp.exists():
            raise RuntimeError((r.stderr or "")[-600:])
        os.replace(str(tmp), str(final_out))
    finally:
        if lst.exists():
            lst.unlink(missing_ok=True)
        if tmp.exists():
            tmp.unlink(missing_ok=True)


def main() -> None:
    ap = argparse.ArgumentParser(description="成片末尾拼接 SEO 关键字静帧页")
    ap.add_argument("--dir", "-d", required=True, type=Path, help="成片目录（处理其中 .mp4）")
    ap.add_argument("--keywords", "-k", type=Path, default=DEFAULT_KW, help="关键词文件，每行一词")
    ap.add_argument("--duration", type=float, default=2.8, help="尾帧时长（秒）")
    ap.add_argument("--per-clip", type=int, default=16, help="每条成片展示的关键词行数")
    ap.add_argument(
        "--font",
        type=Path,
        default=None,
        help="可选 TTF/TTC，默认尝试 fonts/SmileySans 或系统苹方",
    )
    ap.add_argument(
        "files",
        nargs="*",
        help="可选：只处理这些文件名（相对于 --dir），不填则处理目录下全部 .mp4",
    )
    args = ap.parse_args()
    words = load_keywords(args.keywords)
    font_try = args.font
    if font_try is None:
        for name in ("SmileySans-Oblique.ttf", "SourceHanSansSC-Medium.otf"):
            p = FONTS_DIR / name
            if p.exists():
                font_try = p
                break

    d = args.dir.resolve()
    if args.files:
        mp4s = []
        for f in args.files:
            p = Path(f) if Path(f).is_absolute() else d / f
            if p.suffix.lower() == ".mp4" and p.is_file():
                mp4s.append(p)
        mp4s = sort_mp4_by_clip_index(mp4s)
    else:
        mp4s = sort_mp4_by_clip_index(list(d.glob("*.mp4")))
    if not mp4s:
        print(f"❌ 目录无 mp4: {d}")
        return

    for main in mp4s:
        idx = clip_index_from_name(main.name)
        try:
            block = pick_block(words, idx, args.per_clip)
            w, h, sr = probe_size_rate(main)
            with tempfile.TemporaryDirectory(prefix="seo_tail_") as td:
                tdir = Path(td)
                png = tdir / "kw.png"
                tail = tdir / "tail.mp4"
                render_keyword_page(w, h, block, png, font_try)
                make_tail_clip(png, tail, args.duration, w, h, sr)
                concat_videos(main, tail, main)
            print(f"✅ 已加关键字尾帧: {main.name}（序号 {idx}，{len(block)} 词）")
        except Exception as e:
            print(f"❌ 跳过 {main.name}: {e}")


if __name__ == "__main__":
    main()

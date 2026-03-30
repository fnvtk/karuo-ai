#!/usr/bin/env python3
"""
在竖屏成片末尾拼接「SEO 关键字页」静帧（无声），用于搜一搜/长尾曝光。

默认 **两张** 尾图：RGBA 高透明（整体约 95% 透明）、字色与底色同色系、低对比，
叠在黑底上编码进 MP4（观感极淡，接近「看不见」但仍含可检索文案）。

词表：../参考资料/视频尾帧_SEO关键词200.txt（按成片序号 _01～ 取连续词块，拆成两页）。

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

# 观感：约 95% 透明 → 整层 alpha 约 5%～12%；字与底同色相、略亮一点
_BASE_RGB = (26, 28, 34)  # 与字同系深灰蓝
_WASH_ALPHA = int(255 * 0.05)  # 整屏极淡底雾（约 95% 透）
_TITLE_ALPHA = int(255 * 0.09)
_BODY_ALPHA = int(255 * 0.11)


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


def pick_two_blocks(words: list[str], clip_idx: int, per_page: int) -> tuple[list[str], list[str]]:
    """每条成片两页：连续取 per_page*2 个词，前半第一图、后半第二图。"""
    n = len(words)
    if n == 0:
        pad = ["卡若创业派对"]
        return pad * per_page, pad * per_page
    total = per_page * 2
    start = ((clip_idx - 1) * total) % n
    a = [words[(start + i) % n] for i in range(per_page)]
    b = [words[(start + per_page + i) % n] for i in range(per_page)]
    return a, b


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


def render_keyword_page_subtle_rgba(
    width: int,
    height: int,
    lines: list[str],
    png_path: Path,
    font_path: Path | None,
    page_label: str,
) -> None:
    """全透明底 + 极淡同色系雾 + 同色系略亮字（低对比、高透明）。"""
    if Image is None:
        raise RuntimeError("需要安装 Pillow: pip install pillow")
    img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    wash = Image.new("RGBA", (width, height), (*_BASE_RGB, _WASH_ALPHA))
    img = Image.alpha_composite(img, wash)

    draw = ImageDraw.Draw(img)
    fp = font_path if font_path and font_path.exists() else FALLBACK_FONT
    try:
        title_font = ImageFont.truetype(str(fp), 26)
        body_font = ImageFont.truetype(str(fp), 20)
    except OSError:
        title_font = body_font = ImageFont.load_default()

    # 标题：与底同系，仅略亮 + 极低 alpha
    tr, tg, tb = _BASE_RGB
    title_rgb = (min(tr + 6, 255), min(tg + 6, 255), min(tb + 8, 255))
    draw.text(
        (24, 18),
        f"{page_label} · 卡若创业派对",
        fill=(*title_rgb, _TITLE_ALPHA),
        font=title_font,
    )
    y = 64
    br, bg_, bb = min(tr + 4, 255), min(tg + 4, 255), min(tb + 6, 255)
    body_fill = (br, bg_, bb, _BODY_ALPHA)
    for line in lines:
        draw.text((24, y), f"· {line}", fill=body_fill, font=body_font)
        y += 32
        if y > height - 36:
            break
    img.save(str(png_path), "PNG")


def make_tail_clip_from_rgba_overlay(
    png: Path,
    out_mp4: Path,
    duration: float,
    width: int,
    height: int,
    sample_rate: int,
) -> None:
    """黑底 + RGBA PNG 正片叠底，h264 无 alpha 通道但观感为极淡浮字。"""
    fc = (
        f"[1:v]scale={width}:{height}:flags=lanczos:force_original_aspect_ratio=decrease,"
        f"pad={width}:{height}:(ow-iw)/2:(oh-ih)/2:color=0x00000000[fg];"
        f"[0:v][fg]overlay=0:0:format=auto[vout]"
    )
    # 输入顺序：0 黑底 1 PNG 2 静音；先声明全部输入再 filter_complex，避免 -map 错位
    cmd = [
        "ffmpeg",
        "-y",
        "-f",
        "lavfi",
        "-i",
        f"color=black:s={width}x{height}:r=30",
        "-loop",
        "1",
        "-i",
        str(png),
        "-f",
        "lavfi",
        "-i",
        f"anullsrc=channel_layout=stereo:sample_rate={sample_rate}",
        "-filter_complex",
        fc,
        "-map",
        "[vout]",
        "-map",
        "2:a",
        "-t",
        str(duration),
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        str(out_mp4),
    ]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0 or not out_mp4.exists():
        raise RuntimeError((r.stderr or r.stdout or "")[-800:])


def concat_videos_list(final_out: Path, segments: list[Path]) -> None:
    lst = final_out.parent / "_concat_tail_list.txt"
    fd, tmp_path = tempfile.mkstemp(
        suffix="_tailconcat.mp4", dir=str(final_out.parent)
    )
    os.close(fd)
    tmp = Path(tmp_path)
    try:
        with open(lst, "w", encoding="utf-8") as f:
            for s in segments:
                f.write(f"file '{s.resolve()}'\n")
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


def concat_two_mp4s(a: Path, b: Path, out_path: Path) -> None:
    concat_videos_list(out_path, [a, b])


def main() -> None:
    ap = argparse.ArgumentParser(description="成片末尾拼接 SEO 关键字静帧（默认两页、高透明低对比）")
    ap.add_argument("--dir", "-d", required=True, type=Path, help="成片目录（处理其中 .mp4）")
    ap.add_argument("--keywords", "-k", type=Path, default=DEFAULT_KW, help="关键词文件，每行一词")
    ap.add_argument(
        "--duration",
        type=float,
        default=2.8,
        help="两页合计时长（秒），均分到每张",
    )
    ap.add_argument(
        "--per-page",
        type=int,
        default=8,
        help="每页关键词行数（两页共 per_page*2 词）",
    )
    ap.add_argument(
        "--pages",
        type=int,
        default=2,
        choices=(1, 2),
        help="尾图张数：1=单页（旧式可再叠加强对比）；默认 2",
    )
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

    dur_each = args.duration / max(1, args.pages)

    for main in mp4s:
        idx = clip_index_from_name(main.name)
        try:
            w, h, sr = probe_size_rate(main)
            block_a, block_b = pick_two_blocks(words, idx, args.per_page)
            with tempfile.TemporaryDirectory(prefix="seo_tail_") as td:
                tdir = Path(td)
                tails: list[Path] = []
                if args.pages == 2:
                    png_a = tdir / "kw_a.png"
                    png_b = tdir / "kw_b.png"
                    ta = tdir / "tail_a.mp4"
                    tb = tdir / "tail_b.mp4"
                    render_keyword_page_subtle_rgba(
                        w, h, block_a, png_a, font_try, "搜索关键词 1/2"
                    )
                    render_keyword_page_subtle_rgba(
                        w, h, block_b, png_b, font_try, "搜索关键词 2/2"
                    )
                    make_tail_clip_from_rgba_overlay(
                        png_a, ta, dur_each, w, h, sr
                    )
                    make_tail_clip_from_rgba_overlay(
                        png_b, tb, dur_each, w, h, sr
                    )
                    dual = tdir / "tail_dual.mp4"
                    concat_two_mp4s(ta, tb, dual)
                    tails.append(dual)
                else:
                    png = tdir / "kw.png"
                    one = tdir / "tail_one.mp4"
                    render_keyword_page_subtle_rgba(
                        w, h, block_a + block_b, png, font_try, "搜索关键词"
                    )
                    make_tail_clip_from_rgba_overlay(
                        png, one, args.duration, w, h, sr
                    )
                    tails.append(one)

                concat_videos_list(main, [main, *tails])
            nkw = len(block_a) + len(block_b)
            print(
                f"✅ 已加关键字尾帧×{args.pages}: {main.name}（序号 {idx}，共 {nkw} 词，"
                f"高透明低对比）"
            )
        except Exception as e:
            print(f"❌ 跳过 {main.name}: {e}")


if __name__ == "__main__":
    main()

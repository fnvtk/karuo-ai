#!/usr/bin/env python3
"""
纳瓦尔切片专用：仅加封面（无字幕）
- 封面 2.5 秒，毛玻璃+标题
- 字体优先：苹方 > 思源黑体 Heavy > NotoSansCJK Black
- 输出重编码控制体积
"""

import argparse
import json
import math
import os
import re
import subprocess
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageFilter

SCRIPT_DIR = Path(__file__).resolve().parent
SKILL_DIR = SCRIPT_DIR.parent
FONTS_DIR = SKILL_DIR / "fonts"

# 封面字体优先级（好看、清晰）
COVER_FONT_PATHS = [
    "/System/Library/Fonts/PingFang.ttc",           # 苹方
    "/System/Library/Fonts/Supplemental/Songti.ttc", # 宋体
    str(FONTS_DIR / "SourceHanSansSC-Heavy.otf"),   # 思源黑体 Heavy
    str(FONTS_DIR / "NotoSansCJK-Black.ttc"),
    str(FONTS_DIR / "SourceHanSansSC-Bold.otf"),
    "/System/Library/Fonts/STHeiti Medium.ttc",
]

COVER_DURATION = 2.5
COVER_STYLE = {
    "bg_blur": 35,
    "overlay_alpha": 200,
    "font_size": 88,  # 稍大更醒目
    "color": (255, 255, 255),
    "outline_color": (30, 30, 50),
    "outline_width": 5,
}


def _to_simplified(text: str) -> str:
    try:
        from opencc import OpenCC
        return OpenCC("t2s").convert(str(text))
    except ImportError:
        return str(text)


def get_cover_font(size: int) -> ImageFont.FreeTypeFont:
    """封面专用字体"""
    for p in COVER_FONT_PATHS:
        if p and os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                continue
    return ImageFont.load_default()


def get_text_size(draw, text, font):
    bbox = draw.textbbox((0, 0), text, font=font)
    return bbox[2] - bbox[0], bbox[3] - bbox[1]


def draw_text_outline(draw, pos, text, font, color, outline_color, outline_width):
    x, y = pos
    for angle in range(0, 360, 45):
        dx = int(outline_width * math.cos(math.radians(angle)))
        dy = int(outline_width * math.sin(math.radians(angle)))
        draw.text((x + dx, y + dy), text, font=font, fill=outline_color)
    draw.text((x, y), text, font=font, fill=color)


def create_cover_image(title: str, width: int, height: int, output_path: str, video_path: str = None) -> str:
    """生成封面图（毛玻璃+标题）"""
    title = _to_simplified(str(title or "").strip()) or "精彩切片"
    font = get_cover_font(COVER_STYLE["font_size"])

    # 背景
    if video_path and os.path.exists(video_path):
        tmp = output_path.replace(".png", "_bg.jpg")
        subprocess.run(
            ["ffmpeg", "-y", "-ss", "1", "-i", video_path, "-vframes", "1", "-q:v", "2", tmp],
            capture_output=True,
        )
        if os.path.exists(tmp):
            bg = Image.open(tmp).resize((width, height))
            bg = bg.filter(ImageFilter.GaussianBlur(radius=COVER_STYLE["bg_blur"]))
            os.remove(tmp)
        else:
            bg = Image.new("RGB", (width, height), (30, 30, 50))
    else:
        bg = Image.new("RGB", (width, height), (30, 30, 50))

    overlay = Image.new("RGBA", (width, height), (0, 0, 0, COVER_STYLE["overlay_alpha"]))
    img = Image.alpha_composite(bg.convert("RGBA"), overlay)
    draw = ImageDraw.Draw(img)

    # 装饰线
    for i in range(3):
        alpha = 150 - i * 40
        draw.rectangle([0, i * 3, width, i * 3 + 2], fill=(255, 215, 0, alpha))
        draw.rectangle([0, height - i * 3 - 2, width, height - i * 3], fill=(255, 215, 0, alpha))

    # 标题换行
    max_w = width - 80
    lines, cur = [], ""
    for c in title:
        test = cur + c
        w, _ = get_text_size(draw, test, font)
        if w <= max_w:
            cur = test
        else:
            if cur:
                lines.append(cur)
            cur = c
    if cur:
        lines.append(cur)

    # 居中绘制
    lh = COVER_STYLE["font_size"] + 16
    total_h = len(lines) * lh
    start_y = (height - total_h) // 2
    for i, line in enumerate(lines):
        lw, _ = get_text_size(draw, line, font)
        x = (width - lw) // 2
        y = start_y + i * lh
        draw_text_outline(
            draw, (x, y), line, font,
            COVER_STYLE["color"],
            COVER_STYLE["outline_color"],
            COVER_STYLE["outline_width"],
        )

    img.save(output_path, "PNG")
    return output_path


def get_video_info(path: str) -> dict:
    cmd = [
        "ffprobe", "-v", "error", "-select_streams", "v:0",
        "-show_entries", "stream=width,height", "-of", "json", path,
    ]
    r = subprocess.run(cmd, capture_output=True, text=True)
    s = {}
    if r.returncode == 0:
        import json as _j
        data = _j.loads(r.stdout)
        st = data.get("streams", [{}])[0]
        s["width"] = int(st.get("width", 1080))
        s["height"] = int(st.get("height", 1920))
    else:
        s["width"], s["height"] = 1080, 1920
    return s


def add_cover_to_clip(clip_path: str, title: str, output_path: str, temp_dir: str) -> bool:
    """为单个切片添加封面（前 2.5 秒毛玻璃标题）"""
    info = get_video_info(clip_path)
    w, h = info["width"], info["height"]
    cover_png = os.path.join(temp_dir, "cover.png")
    create_cover_image(title, w, h, cover_png, clip_path)

    cover_dur = COVER_DURATION
    # 封面图转 2.5 秒视频流，叠加到正片前段
    cmd = [
        "ffmpeg", "-y",
        "-i", clip_path, "-loop", "1", "-i", cover_png,
        "-filter_complex",
        f"[1:v]scale={w}:{h},trim=duration={cover_dur},setpts=PTS-STARTPTS[cover];"
        f"[0:v][cover]overlay=0:0:enable='lte(t,{cover_dur})'[v]",
        "-map", "[v]", "-map", "0:a",
        "-c:v", "libx264", "-preset", "fast", "-crf", "22", "-b:v", "3M",
        "-c:a", "aac", "-b:a", "128k",
        output_path,
    ]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print(f"   FFmpeg err: {r.stderr[:500]}")
        return False
    return os.path.exists(output_path)


def _parse_index(name: str) -> int:
    m = re.search(r"\d+", name)
    return int(m.group()) if m else 0


def main():
    parser = argparse.ArgumentParser(description="纳瓦尔切片：仅加封面（无字幕）")
    parser.add_argument("--clips", "-c", required=True, help="切片目录")
    parser.add_argument("--manifest", "-m", help="clips_manifest.json 路径")
    parser.add_argument("--highlights", "-l", help="highlights.json 路径（与 manifest 二选一）")
    parser.add_argument("--output", "-o", required=True, help="输出目录")
    args = parser.parse_args()

    clips_dir = Path(args.clips)
    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)

    # 加载标题映射
    titles = {}
    if args.manifest and Path(args.manifest).exists():
        with open(args.manifest, "r", encoding="utf-8") as f:
            data = json.load(f)
        for c in data.get("clips", []):
            titles[c["index"]] = c.get("title", "")
    elif args.highlights and Path(args.highlights).exists():
        with open(args.highlights, "r", encoding="utf-8") as f:
            data = json.load(f)
        for i, item in enumerate(data if isinstance(data, list) else data.get("clips", []), 1):
            titles[i] = item.get("title", item.get("name", ""))

    clips = sorted(clips_dir.glob("*.mp4"))
    print("=" * 60)
    print("🎬 纳瓦尔切片 · 仅加封面（无字幕）")
    print("=" * 60)
    print(f"输入: {clips_dir}\n输出: {output_dir}\n")
    success = 0
    for i, cp in enumerate(clips):
        idx = _parse_index(cp.name) or (i + 1)
        title = titles.get(idx, "")
        if not title:
            m = re.search(r"\d+[_\s]+(.+?)(?:_enhanced)?\.mp4$", cp.name)
            title = m.group(1).strip() if m else "片段"
        print(f"  [{idx}] {title}")
        td = tempfile.mkdtemp(prefix="naval_cover_")
        try:
            out = output_dir / cp.name.replace(".mp4", "_cover.mp4")
            if add_cover_to_clip(str(cp), title, str(out), td):
                success += 1
                size_mb = out.stat().st_size / (1024 * 1024)
                print(f"       ✅ {out.name} ({size_mb:.1f}MB)")
            else:
                print(f"       ❌ 失败")
        finally:
            import shutil
            shutil.rmtree(td, ignore_errors=True)
    print("\n" + "=" * 60)
    print(f"✅ 完成: {success}/{len(clips)}")
    print(f"📁 输出: {output_dir}")
    print("=" * 60)


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
视觉增强 v8：苹果毛玻璃底部浮层（终版）

改动：
- 去掉所有图标 badge、问号圆圈、Unicode 图标前缀、白块
- 左上角加载卡若创业派对 Logo + "第 N 场"
- 场景按主题段落切换：开头提问 → 中间要点总结 → 结尾 CTA
- 配色与 Soul 绿协调的青绿色系
- 芯片改为渐变描边胶囊
"""
import argparse
import hashlib
import json
import math
import os
import subprocess
import sys
import tempfile
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFilter, ImageFont
except ImportError:
    sys.exit("pip3 install Pillow")

SCRIPT_DIR = Path(__file__).resolve().parent
SKILL_DIR = SCRIPT_DIR.parent
FONTS_DIR = SKILL_DIR / "fonts"
if not FONTS_DIR.exists():
    FONTS_DIR = Path("/Users/karuo/Documents/个人/卡若AI/03_卡木（木）/木叶_视频内容/视频切片/fonts")
LOGO_PATH = SKILL_DIR / "参考资料" / "karuo_logo.png"

VW, VH = 498, 1080
PANEL_W, PANEL_H = 428, 310
PANEL_X = (VW - PANEL_W) // 2
PANEL_Y = VH - PANEL_H - 30
FPS = 8
CURRENT_SEED = "default"

GLASS_TOP = (12, 15, 26, 248)
GLASS_BTM = (8, 10, 20, 252)
GLASS_BORDER = (255, 255, 255, 26)
GLASS_INNER = (255, 255, 255, 12)

SOUL_GREEN = (0, 210, 106)
ACCENT_A = (0, 200, 140, 255)
ACCENT_B = (52, 211, 238, 255)

TEXT_PRI = (240, 244, 255, 255)
TEXT_SEC = (163, 177, 206, 255)
TEXT_MUT = (100, 116, 145, 255)
WHITE = (248, 250, 255, 255)

_logo_cache = None


def _load_logo(height=26):
    global _logo_cache
    if _logo_cache is not None:
        return _logo_cache
    if LOGO_PATH.exists():
        try:
            img = Image.open(str(LOGO_PATH)).convert("RGBA")
            ratio = height / img.height
            new_w = int(img.width * ratio)
            _logo_cache = img.resize((new_w, height), Image.LANCZOS)
        except Exception:
            _logo_cache = None
    else:
        _logo_cache = None
    return _logo_cache


def font(size, weight="medium"):
    mapping = {
        "regular": [FONTS_DIR / "NotoSansCJK-Regular.ttc", FONTS_DIR / "SourceHanSansSC-Medium.otf", Path("/System/Library/Fonts/PingFang.ttc")],
        "medium": [FONTS_DIR / "SourceHanSansSC-Medium.otf", FONTS_DIR / "NotoSansCJK-Regular.ttc", Path("/System/Library/Fonts/PingFang.ttc")],
        "semibold": [FONTS_DIR / "SourceHanSansSC-Bold.otf", FONTS_DIR / "NotoSansCJK-Bold.ttc", Path("/System/Library/Fonts/PingFang.ttc")],
    }
    for p in mapping.get(weight, mapping["medium"]):
        if p.exists():
            try:
                return ImageFont.truetype(str(p), size)
            except Exception:
                continue
    return ImageFont.load_default()


def ease_out(t):
    t = max(0.0, min(1.0, t))
    return 1 - (1 - t) ** 3


def blend(c1, c2, t):
    return tuple(int(a + (b - a) * max(0, min(1, t))) for a, b in zip(c1, c2))


def tw(f, t):
    bb = f.getbbox(t)
    return bb[2] - bb[0]


def th(f, t):
    bb = f.getbbox(t)
    return bb[3] - bb[1]


def draw_center(d, text, f, y, fill, cw=PANEL_W):
    d.text(((cw - tw(f, text)) // 2, y), text, font=f, fill=fill)


def draw_wrap(d, text, f, max_w, x, y, fill, gap=6):
    lines, cur = [], ""
    for ch in text:
        t = cur + ch
        if tw(f, t) > max_w and cur:
            lines.append(cur); cur = ch
        else:
            cur = t
    if cur:
        lines.append(cur)
    for line in lines:
        d.text((x, y), line, font=f, fill=fill)
        y += th(f, line) + gap
    return y


def draw_wrap_center(d, text, f, max_w, y, fill, cw=PANEL_W, gap=6):
    lines, cur = [], ""
    for ch in text:
        t = cur + ch
        if tw(f, t) > max_w and cur:
            lines.append(cur); cur = ch
        else:
            cur = t
    if cur:
        lines.append(cur)
    for line in lines:
        draw_center(d, line, f, y, fill, cw)
        y += th(f, line) + gap
    return y


def _shadow():
    img = Image.new("RGBA", (PANEL_W, PANEL_H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((14, 20, PANEL_W - 16, PANEL_H - 4), radius=28, fill=(0, 0, 0, 150))
    return img.filter(ImageFilter.GaussianBlur(22))


def _glass():
    img = Image.new("RGBA", (PANEL_W, PANEL_H), (0, 0, 0, 0))
    grad = Image.new("RGBA", (PANEL_W, PANEL_H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(grad)
    for y in range(PANEL_H):
        t = y / max(PANEL_H - 1, 1)
        gd.line([(0, y), (PANEL_W, y)], fill=blend(GLASS_TOP, GLASS_BTM, t))
    mask = Image.new("L", (PANEL_W, PANEL_H), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, PANEL_W - 1, PANEL_H - 1), radius=26, fill=255)
    img = Image.composite(grad, img, mask)
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((0, 0, PANEL_W - 1, PANEL_H - 1), radius=26, outline=GLASS_BORDER, width=1)
    d.rounded_rectangle((3, 3, PANEL_W - 4, PANEL_H - 4), radius=24, outline=GLASS_INNER, width=1)
    for y in range(8):
        a = int(20 * (1 - y / 8))
        d.line([(20, y + 4), (PANEL_W - 20, y + 4)], fill=(255, 255, 255, a))
    return img


def _chip(text, active=1.0):
    pad = 12
    ff = font(12, "medium")
    w = max(60, tw(ff, text) + pad * 2)
    h = 28
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    border = blend(ACCENT_A, ACCENT_B, 0.5)[:3] + (int(140 * active),)
    d.rounded_rectangle((0, 0, w - 1, h - 1), radius=14, fill=(255, 255, 255, int(10 * active)), outline=border, width=1)
    d.text((pad, (h - th(ff, text)) // 2 - 1), text, font=ff, fill=(TEXT_PRI[0], TEXT_PRI[1], TEXT_PRI[2], int(255 * active)))
    return img


def _place_chips(base, chips, t):
    gap = 8
    imgs = [_chip(c) for c in chips]
    total = sum(im.width for im in imgs) + gap * (len(imgs) - 1)
    x = (PANEL_W - total) // 2
    y = PANEL_H - 38
    for i, im in enumerate(imgs):
        ct = ease_out(max(0, min(1, (t - 0.6 - i * 0.1) / 0.35)))
        if ct > 0:
            base.alpha_composite(im, (x, y + int((1 - ct) * 8)))
        x += im.width + gap


def _header(base, episode, sub_label, t):
    d = ImageDraw.Draw(base)
    logo = _load_logo(24)
    x = 18
    if logo:
        la = ease_out(min(1.0, t * 3))
        if la > 0.1:
            base.alpha_composite(logo, (x, 16))
        x += logo.width + 8

    ff = font(11, "regular")
    ep_text = f"第 {episode} 场" if episode else ""
    la = ease_out(min(1.0, max(0, (t - 0.1) / 0.4)))
    if la > 0 and ep_text:
        d.text((x, 20), ep_text, font=ff, fill=(TEXT_SEC[0], TEXT_SEC[1], TEXT_SEC[2], int(200 * la)))

    if sub_label:
        sa = ease_out(min(1.0, max(0, (t - 0.15) / 0.4)))
        if sa > 0:
            fs = font(10, "regular")
            d.text((x, 36), sub_label, font=fs, fill=(TEXT_MUT[0], TEXT_MUT[1], TEXT_MUT[2], int(170 * sa)))

    dot_r = 3 + int(1 * math.sin(t * 3))
    dc = ACCENT_A[:3] + (180,)
    d.ellipse((PANEL_W - 26 - dot_r, 22 - dot_r, PANEL_W - 26 + dot_r, 22 + dot_r), fill=dc)


def _render_title(base, params, t):
    d = ImageDraw.Draw(base)
    q = params.get("question", "")
    sub = params.get("subtitle", "")
    ff = font(20, "medium")
    type_t = ease_out(min(1.0, t / 1.8))
    chars = max(1, int(len(q) * type_t))
    shown = q[:chars]
    cursor = "▍" if type_t < 0.95 else ""
    draw_wrap(d, shown + cursor, ff, PANEL_W - 40, 20, 62, TEXT_PRI)

    if sub and t > 1.0:
        sa = ease_out(min(1.0, (t - 1.0) / 0.7))
        fs = font(13, "regular")
        d.text((20, 120), sub, font=fs, fill=(TEXT_SEC[0], TEXT_SEC[1], TEXT_SEC[2], int(200 * sa)))

    _place_chips(base, params.get("chips", []), t)


def _render_summary(base, params, t):
    d = ImageDraw.Draw(base)
    headline = params.get("headline", "")
    points = params.get("points", [])
    cta = params.get("cta", "")

    ha = ease_out(min(1.0, max(0, t / 0.5)))
    if ha > 0:
        d.rounded_rectangle((16, 56, PANEL_W - 16, 96), radius=18,
                             fill=blend(ACCENT_A, ACCENT_B, 0.5)[:3] + (int(20 * ha),),
                             outline=blend(ACCENT_A, ACCENT_B, 0.5)[:3] + (int(80 * ha),), width=1)
        draw_wrap_center(d, headline, font(18, "medium"), PANEL_W - 60, 66, TEXT_PRI)

    y = 110
    for i, pt in enumerate(points):
        ia = ease_out(min(1.0, max(0, (t - 0.25 - i * 0.1) / 0.45)))
        if ia <= 0:
            continue
        ac = blend(ACCENT_A, ACCENT_B, i / max(len(points) - 1, 1))
        d.ellipse((22, y + i * 30 + 5, 28, y + i * 30 + 11), fill=ac[:3] + (int(220 * ia),))
        fp = font(13, "regular")
        d.text((36 + int((1 - ia) * 10), y + i * 30), pt, font=fp,
               fill=(TEXT_PRI[0], TEXT_PRI[1], TEXT_PRI[2], int(250 * ia)))

    if cta:
        ca = ease_out(min(1.0, max(0, (t - 0.9) / 0.4)))
        if ca > 0:
            by = PANEL_H - 48 - int((1 - ca) * 6)
            for x in range(36, PANEL_W - 36):
                tf = (x - 36) / max(PANEL_W - 72, 1)
                col = blend(ACCENT_A, ACCENT_B, tf)[:3] + (int(200 * ca),)
                d.line([(x, by), (x, by + 26)], fill=col)
            d.rounded_rectangle((36, by, PANEL_W - 36, by + 26), radius=13,
                                 outline=(255, 255, 255, int(30 * ca)), width=1)
            draw_center(d, cta, font(12, "medium"), by + 6, WHITE)


RENDERERS = {
    "title_card": _render_title,
    "summary_card": _render_summary,
}


def compose_frame(scene, local_t):
    params = scene.get("params", {})
    episode = scene.get("episode", "")
    sub_label = scene.get("sub_label", "")
    scene_type = scene.get("type", "title_card")

    base = Image.new("RGBA", (PANEL_W, PANEL_H), (0, 0, 0, 0))
    base.alpha_composite(_shadow(), (0, 0))
    base.alpha_composite(_glass(), (0, 0))
    _header(base, episode, sub_label, local_t)
    renderer = RENDERERS.get(scene_type, _render_title)
    renderer(base, params, local_t)
    return base


def render_overlay(scene, local_t):
    panel = compose_frame(scene, local_t)
    intro = ease_out(min(1.0, local_t / 0.55))
    breath = 1 + math.sin(local_t * 1.2) * 0.01
    scale = (0.94 + intro * 0.06) * breath
    yd = int((1 - intro) * 16 + math.sin(local_t * 0.9) * 3)
    xd = int(math.sin(local_t * 0.6) * 2)
    ps = panel.resize((int(PANEL_W * scale), int(PANEL_H * scale)), Image.LANCZOS)
    frame = Image.new("RGBA", (VW, VH), (0, 0, 0, 0))
    px = (VW - ps.width) // 2 + xd
    py = PANEL_Y - (ps.height - PANEL_H) // 2 + yd
    frame.alpha_composite(ps, (max(0, px), max(0, py)))
    return frame


DEFAULT_SCENES = [
    {"start": 0, "end": 30, "type": "title_card", "episode": 121, "sub_label": "Soul创业派对",
     "params": {"question": "哪个AI模型才是真正意义上的AI？", "subtitle": "深度AI vs 语言模型", "chips": ["AI评测", "深度AI", "实操"]}},
    {"start": 30, "end": 90, "type": "summary_card", "episode": 121, "sub_label": "核心要点",
     "params": {"headline": "选AI就选能执行的", "points": ["语言模型只回答文字", "深度AI理解后执行", "先跑一遍再说"], "cta": "关注了解更多"}},
]


def render_scene_clip(scene, idx, tmp):
    dur = float(scene["end"] - scene["start"])
    sdir = os.path.join(tmp, f"s{idx:02d}")
    os.makedirs(sdir, exist_ok=True)
    nf = max(1, int(dur * FPS))
    concat = []
    last = None
    print(f"  [{idx+1}] {scene.get('type','')} {scene['start']:.0f}s-{scene['end']:.0f}s ({nf}f)...", end="", flush=True)
    for i in range(nf):
        lt = i / FPS
        frame = render_overlay(scene, lt)
        fp = os.path.join(sdir, f"f{i:04d}.png")
        frame.save(fp, "PNG")
        concat.append(f"file '{fp}'")
        concat.append(f"duration {1.0 / FPS:.4f}")
        last = fp
    concat.append(f"file '{last}'")
    cf = os.path.join(sdir, "c.txt")
    with open(cf, "w") as f:
        f.write("\n".join(concat))
    mov = os.path.join(sdir, "s.mov")
    r = subprocess.run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", cf,
                        "-vf", "fps=25,format=rgba", "-c:v", "png", "-t", f"{dur:.3f}", mov],
                       capture_output=True, text=True)
    if r.returncode != 0:
        print(" ERR", flush=True); return None
    print(" OK", flush=True)
    return {"path": mov, "start": scene["start"], "end": scene["end"]}


def build_overlay(clips, duration, tmp):
    blank = Image.new("RGBA", (VW, VH), (0, 0, 0, 0))
    bp = os.path.join(tmp, "b.png")
    blank.save(bp, "PNG")
    concat = []
    prev = 0.0
    for c in clips:
        if c["start"] > prev + 0.05:
            concat += [f"file '{bp}'", f"duration {c['start'] - prev:.3f}"]
        concat.append(f"file '{c['path']}'")
        prev = c["end"]
    if prev < duration:
        concat += [f"file '{bp}'", f"duration {duration - prev:.3f}"]
    concat.append(f"file '{bp}'")
    cf = os.path.join(tmp, "oc.txt")
    with open(cf, "w") as f:
        f.write("\n".join(concat))
    out = os.path.join(tmp, "ov.mov")
    print("  叠加流...", end="", flush=True)
    r = subprocess.run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", cf,
                        "-vf", "fps=25,format=rgba", "-c:v", "png", "-t", f"{duration:.3f}", out],
                       capture_output=True, text=True)
    if r.returncode != 0:
        print(" ERR", flush=True); return None
    mb = os.path.getsize(out) // 1024 // 1024
    print(f" OK ({mb}MB)", flush=True)
    return out


def compose_final(inp, ov, outp, dur):
    r = subprocess.run([
        "ffmpeg", "-y", "-i", inp, "-i", ov,
        "-filter_complex", "[1:v]format=rgba[o];[0:v][o]overlay=0:0:format=auto:shortest=1[v]",
        "-map", "[v]", "-map", "0:a?",
        "-c:v", "libx264", "-preset", "medium", "-crf", "20",
        "-c:a", "aac", "-b:a", "128k", "-t", f"{dur:.3f}", "-movflags", "+faststart", outp,
    ], capture_output=True, text=True)
    if r.returncode != 0:
        return False
    mb = os.path.getsize(outp) // 1024 // 1024
    print(f"  合成 OK ({mb}MB)", flush=True)
    return True


def get_dur(v):
    r = subprocess.run(["ffprobe", "-v", "quiet", "-print_format", "json", "-show_format", v], capture_output=True, text=True)
    return float(json.loads(r.stdout)["format"]["duration"])


def main():
    global CURRENT_SEED
    ap = argparse.ArgumentParser(description="视觉增强 v8")
    ap.add_argument("-i", "--input", required=True)
    ap.add_argument("-o", "--output", required=True)
    ap.add_argument("--scenes")
    args = ap.parse_args()
    CURRENT_SEED = Path(args.input).stem
    scenes = DEFAULT_SCENES
    if args.scenes and os.path.exists(args.scenes):
        with open(args.scenes, "r", encoding="utf-8") as f:
            scenes = json.load(f)
    dur = get_dur(args.input)
    for s in scenes:
        s["end"] = min(s["end"], dur)
    os.makedirs(os.path.dirname(args.output) or ".", exist_ok=True)
    print(f"输入: {Path(args.input).name} ({dur:.0f}s)")
    print(f"场景: {len(scenes)} 段 v8\n")
    with tempfile.TemporaryDirectory(prefix="ve8_") as tmp:
        print("【1/3】动态帧...", flush=True)
        clips = [c for c in (render_scene_clip(s, i, tmp) for i, s in enumerate(scenes)) if c]
        if not clips:
            sys.exit(1)
        print(f"\n【2/3】叠加流 ({len(clips)} 段)...", flush=True)
        ov = build_overlay(clips, dur, tmp)
        if not ov:
            sys.exit(1)
        print("\n【3/3】合成...", flush=True)
        if not compose_final(args.input, ov, args.output, dur):
            sys.exit(1)
    print(f"\n完成: {args.output}")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
小说插画场景：生成 5 张图并保存到 卡若Ai的文件夹/图片/
优先：若存在 OPENAI_API_KEY（sk- 开头）则用 DALL-E 3 生成；否则用本地 PIL 绘制漫画风格占位图。
"""

from __future__ import annotations

import os
import time
from pathlib import Path

OUT_DIR = Path("/Users/karuo/Documents/卡若Ai的文件夹/图片")

# DALL-E 用提示词（仅当有 sk- key 时使用）
PROMPTS = [
    ("novel_scene1_embrace.png", "Japanese manga style novel illustration. Warm indoor light. Young woman long black hair, black lace blindfold, hands bound behind back, black lace bra and short dark slip. Young man short brown hair light grey T-shirt embracing her from front, face near her neck. Both fully clothed, emotional embrace. Soft speed lines, romantic mood. Tasteful fiction only, no nudity."),
    ("novel_scene2_side.png", "Same manga novel illustration. Woman long black hair blindfold lace hands bound behind, black lingerie and slip; man brown hair light grey tee holds her from the side, arm around her waist. Warm indoor light, emotional embrace, both clothed. Romantic fiction only, no explicit content."),
    ("novel_scene3_touch.png", "Manga style novel illustration. Woman blindfolded hands behind back black lace and slip; man in grey tee gently touches her hair, foreheads close. Warm room, tender mood, both fully clothed. Fiction scene only."),
    ("novel_sequel1_gaze.png", "Manga style novel illustration, sequel. Same couple, warm room. Blindfold and restraint removed. Woman long black hair in dark slip, man in light grey tee. They face each other, gentle eye contact, slight smile. Fully clothed. Fiction only."),
    ("novel_sequel2_peace.png", "Manga novel illustration, ending. Same couple sitting side by side on bed or sofa, warm room. Woman long black hair dark slip, man light grey tee. She leans on his shoulder, they hold hands. Peaceful, calm. Fiction only."),
]


def _load_openai_key():
    if os.environ.get("OPENAI_API_KEY", "").strip().startswith("sk-"):
        return True
    base = Path(__file__).resolve().parent
    for _ in range(5):
        base = base.parent
        if base.name == "卡若AI":
            break
    for f in (base / "运营中枢/scripts/karuo_ai_gateway/.env.api_keys.local",
              base / "运营中枢/scripts/karuo_ai_gateway/.env"):
        if f.exists():
            for line in f.read_text().splitlines():
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, _, v = line.partition("=")
                    if k.strip() == "OPENAI_API_KEY":
                        v = v.strip().strip('"').strip("'")
                        if v.startswith("sk-"):
                            os.environ["OPENAI_API_KEY"] = v
                            return True
    return False


def generate_with_dalle():
    try:
        from openai import OpenAI
    except ImportError:
        return False
    key = os.environ.get("OPENAI_API_KEY")
    if not key or not key.startswith("sk-"):
        return False
    import requests
    client = OpenAI(api_key=key)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for i, (filename, prompt) in enumerate(PROMPTS):
        out_path = OUT_DIR / filename
        if out_path.exists():
            print("已存在，跳过:", out_path)
            continue
        try:
            resp = client.images.generate(
                model="dall-e-3",
                prompt=prompt,
                n=1,
                size="1024x1024",
                quality="standard",
                response_format="url",
            )
            r = requests.get(resp.data[0].url, timeout=60)
            r.raise_for_status()
            out_path.write_bytes(r.content)
            print("OK:", out_path)
        except Exception as e:
            print("DALL-E 失败", filename, ":", e)
            return False
        if i < len(PROMPTS) - 1:
            time.sleep(2)
    return True


def _font(size: int):
    from PIL import ImageFont
    for p in ["/System/Library/Fonts/PingFang.ttc", "/System/Library/Fonts/STHeiti Medium.ttc"]:
        try:
            return ImageFont.truetype(p, size)
        except Exception:
            continue
    return ImageFont.load_default()


def generate_with_pil():
    """用 PIL 绘制 5 张漫画风格占位图（渐变+标题+简单构图）"""
    from PIL import Image, ImageDraw
    W, H = 1024, 1024
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    titles = ["场景1 · 蒙眼拥抱", "场景2 · 侧抱", "场景3 · 额相抵", "后续1 · 温柔对视", "后续2 · 并肩"]
    colors = [
        ((180, 100, 120), (80, 40, 60)),
        ((120, 80, 140), (50, 30, 70)),
        ((100, 120, 160), (40, 50, 80)),
        ((140, 160, 180), (60, 70, 90)),
        ((160, 140, 120), (70, 60, 50)),
    ]
    for (filename, _), title, (c1, c2) in zip(PROMPTS, titles, colors):
        out_path = OUT_DIR / filename
        img = Image.new("RGB", (W, H))
        draw = ImageDraw.Draw(img)
        for y in range(H):
            t = y / (H - 1)
            r = int(c1[0] + (c2[0] - c1[0]) * t)
            g = int(c1[1] + (c2[1] - c1[1]) * t)
            b = int(c1[2] + (c2[2] - c1[2]) * t)
            draw.line([(0, y), (W, y)], fill=(r, g, b))
        font = _font(52)
        bbox = draw.textbbox((0, 0), title, font=font)
        tw = bbox[2] - bbox[0]
        draw.text(((W - tw) // 2, H // 2 - 40), title, font=font, fill=(255, 255, 255, 230))
        draw.rounded_rectangle([W//4, H//3, 3*W//4, 2*H//3], radius=24, outline=(255, 255, 255, 120), width=3)
        img.save(out_path, "PNG")
        print("OK:", out_path)
    return True


def main():
    _load_openai_key()
    if generate_with_dalle():
        return
    print("未检测到有效 OPENAI_API_KEY（sk- 开头），改用本地绘制占位图。")
    generate_with_pil()


if __name__ == "__main__":
    main()

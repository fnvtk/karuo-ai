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


def _radial_gradient(img, cx, cy, r_inner, r_outer, c_center, c_edge):
    """从中心到边缘的径向渐变"""
    from PIL import ImageDraw
    W, H = img.size
    pix = img.load()
    for y in range(H):
        for x in range(W):
            d = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5
            t = min(1.0, max(0.0, (d - r_inner) / (r_outer - r_inner))) if r_outer > r_inner else 0
            r = int(c_center[0] + (c_edge[0] - c_center[0]) * t)
            g = int(c_center[1] + (c_edge[1] - c_center[1]) * t)
            b = int(c_center[2] + (c_edge[2] - c_center[2]) * t)
            pix[x, y] = (max(0, min(255, r)), max(0, min(255, g)), max(0, min(255, b)))


def _draw_speed_lines(draw, W, H, n=40, color=(255, 220, 230, 80)):
    """漫画速度线（从一角放射）"""
    import random
    random.seed(42)
    for _ in range(n):
        x0, y0 = random.randint(0, W // 3), random.randint(0, H // 3)
        dx, dy = random.randint(W // 2, W), random.randint(H // 2, H)
        draw.line([(x0, y0), (x0 + dx, y0 + dy)], fill=(color[0], color[1], color[2]), width=2)


def _draw_vignette(img, strength=0.4):
    """四角暗角"""
    from PIL import Image, ImageDraw
    W, H = img.size
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    for y in range(H):
        for x in range(W):
            nx, ny = 2 * x / W - 1, 2 * y / H - 1
            d = (nx * nx + ny * ny) ** 0.5
            a = int(255 * strength * min(1, d * 1.2))
            if a > 0:
                draw.point((x, y), fill=(0, 0, 0, a))
    out = Image.new("RGB", (W, H))
    out.paste(img, (0, 0))
    out.paste(overlay, (0, 0), overlay)
    return out


def generate_with_pil():
    """用 PIL 绘制 5 张漫画风格插画（双人剪影+光效+速度线+层次）"""
    from PIL import Image, ImageDraw
    W, H = 1024, 1024
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    # 场景配置：背景中心色、边缘色、剪影色、标题、副标题
    scenes = [
        {
            "center": (220, 160, 200),
            "edge": (60, 35, 55),
            "silhouette": (45, 30, 45),
            "title": "蒙眼拥抱",
            "sub": "—— 场景一",
            "speed_lines": True,
        },
        {
            "center": (200, 150, 220),
            "edge": (50, 40, 70),
            "silhouette": (40, 32, 55),
            "title": "侧抱",
            "sub": "—— 场景二",
            "speed_lines": True,
        },
        {
            "center": (210, 170, 230),
            "edge": (55, 45, 75),
            "silhouette": (42, 35, 58),
            "title": "额相抵",
            "sub": "—— 场景三",
            "speed_lines": True,
        },
        {
            "center": (230, 200, 220),
            "edge": (70, 60, 85),
            "silhouette": (50, 42, 62),
            "title": "温柔对视",
            "sub": "—— 后续一",
            "speed_lines": False,
        },
        {
            "center": (240, 210, 200),
            "edge": (75, 65, 80),
            "silhouette": (52, 45, 65),
            "title": "并肩",
            "sub": "—— 后续二",
            "speed_lines": False,
        },
    ]

    for idx, ((filename, _), sc) in enumerate(zip(PROMPTS, scenes)):
        out_path = OUT_DIR / filename
        img = Image.new("RGB", (W, H))
        cx, cy = W // 2, H // 2
        _radial_gradient(img, cx, cy, 0, int((W * W + H * H) ** 0.5 * 0.6), sc["center"], sc["edge"])

        # 中心柔光
        glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        gdraw = ImageDraw.Draw(glow)
        for r in range(350, 100, -15):
            alpha = 25 if r > 200 else 15
            gdraw.ellipse([cx - r, cy - r, cx + r, cy + r], outline=(255, 245, 255, alpha), width=4)
        img_rgba = img.convert("RGBA")
        img = Image.alpha_composite(img_rgba, glow).convert("RGB")

        draw = ImageDraw.Draw(img)
        s = sc["silhouette"]

        if idx == 0:
            # 场景1：正面拥抱（女前男后，女有长发+蒙眼带，男环抱）
            # 女性剪影：椭圆头+长发轮廓+身体
            draw.ellipse([cx - 85, cy - 220, cx + 85, cy - 70], fill=s, outline=(60, 45, 60))
            draw.ellipse([cx - 75, cy - 200, cx + 75, cy - 90], fill=(30, 22, 30))  # 蒙眼带区域
            draw.polygon([(cx - 95, cy - 80), (cx - 110, cy + 180), (cx - 60, cy + 200), (cx - 50, cy - 60)], fill=s)
            draw.polygon([(cx + 95, cy - 80), (cx + 110, cy + 180), (cx + 60, cy + 200), (cx + 50, cy - 60)], fill=s)
            draw.ellipse([cx - 70, cy - 30, cx + 70, cy + 120], fill=s)
            # 男性剪影：从后环抱
            draw.ellipse([cx - 100, cy - 180, cx + 100, cy - 30], fill=(s[0] + 15, s[1] + 12, s[2] + 15))
            draw.polygon([(cx - 120, cy - 50), (cx - 130, cy + 220), (cx + 130, cy + 220), (cx + 120, cy - 50)], fill=(s[0] + 15, s[1] + 12, s[2] + 15))
        elif idx == 1:
            # 场景2：侧抱（男在侧，一手环腰）
            draw.ellipse([cx - 90, cy - 200, cx + 90, cy - 50], fill=s)
            draw.ellipse([cx - 70, cy - 180, cx + 70, cy - 70], fill=(28, 20, 28))
            draw.polygon([(cx - 100, cy - 40), (cx - 115, cy + 200), (cx - 55, cy + 210), (cx - 45, cy - 50)], fill=s)
            draw.polygon([(cx + 100, cy - 40), (cx + 115, cy + 200), (cx + 55, cy + 210), (cx + 45, cy - 50)], fill=s)
            draw.ellipse([cx - 75, cy + 10, cx + 75, cy + 140], fill=s)
            # 男性侧影
            draw.ellipse([cx + 60, cy - 160, cx + 220, cy + 20], fill=(s[0] + 12, s[1] + 10, s[2] + 12))
            draw.polygon([(cx + 80, cy - 20), (cx + 100, cy + 220), (cx + 230, cy + 200), (cx + 200, cy - 40)], fill=(s[0] + 12, s[1] + 10, s[2] + 12))
            draw.ellipse([cx + 140, cy - 50, cx + 220, cy + 50], fill=(s[0] + 12, s[1] + 10, s[2] + 12))
        elif idx == 2:
            # 场景3：额相抵、抚发
            draw.ellipse([cx - 88, cy - 210, cx + 88, cy - 65], fill=s)
            draw.ellipse([cx - 68, cy - 190, cx + 68, cy - 85], fill=(28, 22, 30))
            draw.polygon([(cx - 98, cy - 55), (cx - 112, cy + 190), (cx - 52, cy + 200), (cx - 48, cy - 55)], fill=s)
            draw.polygon([(cx + 98, cy - 55), (cx + 112, cy + 190), (cx + 52, cy + 200), (cx + 48, cy - 55)], fill=s)
            draw.ellipse([cx - 72, cy - 10, cx + 72, cy + 115], fill=s)
            draw.ellipse([cx - 95, cy - 175, cx + 95, cy - 25], fill=(s[0] + 10, s[1] + 8, s[2] + 10))
            draw.polygon([(cx - 105, cy - 35), (cx - 118, cy + 210), (cx + 118, cy + 210), (cx + 105, cy - 35)], fill=(s[0] + 10, s[1] + 8, s[2] + 10))
        elif idx == 3:
            # 后续1：面对面温柔对视（无蒙眼，两人相对）
            draw.ellipse([cx - 200, cy - 180, cx - 20, cy + 20], fill=s)  # 女左
            draw.polygon([(cx - 210, cy + 10), (cx - 230, cy + 220), (cx - 50, cy + 230), (cx - 30, cy + 30)], fill=s)
            draw.ellipse([cx - 180, cy - 30, cx - 40, cy + 100], fill=s)
            draw.ellipse([cx + 20, cy - 180, cx + 200, cy + 20], fill=(s[0] + 12, s[1] + 10, s[2] + 12))  # 男右
            draw.polygon([(cx + 30, cy + 10), (cx + 50, cy + 230), (cx + 230, cy + 220), (cx + 210, cy + 30)], fill=(s[0] + 12, s[1] + 10, s[2] + 12))
            draw.ellipse([cx + 40, cy - 30, cx + 180, cy + 100], fill=(s[0] + 12, s[1] + 10, s[2] + 12))
        else:
            # 后续2：并肩坐（两人并排，女靠肩）
            draw.ellipse([cx - 220, cy - 80, cx - 80, cy + 80], fill=s)
            draw.polygon([(cx - 230, cy + 50), (cx - 250, cy + 230), (cx - 120, cy + 240), (cx - 100, cy + 60)], fill=s)
            draw.ellipse([cx - 210, cy + 30, cx - 100, cy + 180], fill=s)
            draw.ellipse([cx + 60, cy - 100, cx + 200, cy + 60], fill=(s[0] + 10, s[1] + 8, s[2] + 12))
            draw.polygon([(cx + 90, cy + 40), (cx + 70, cy + 230), (cx + 220, cy + 220), (cx + 210, cy + 50)], fill=(s[0] + 10, s[1] + 8, s[2] + 12))
            draw.ellipse([cx + 100, cy + 50, cx + 200, cy + 170], fill=(s[0] + 10, s[1] + 8, s[2] + 12))

        if sc.get("speed_lines"):
            _draw_speed_lines(draw, W, H, n=55, color=(255, 235, 245))

        # 暗角
        img = _draw_vignette(img, strength=0.35)

        draw = ImageDraw.Draw(img)
        font_t = _font(56)
        font_s = _font(28)
        bbox_t = draw.textbbox((0, 0), sc["title"], font=font_t)
        tw = bbox_t[2] - bbox_t[0]
        draw.text(((W - tw) // 2, H - 140), sc["title"], font=font_t, fill=(255, 252, 255))
        bbox_s = draw.textbbox((0, 0), sc["sub"], font=font_s)
        sw = bbox_s[2] - bbox_s[0]
        draw.text(((W - sw) // 2, H - 78), sc["sub"], font=font_s, fill=(220, 210, 225))

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

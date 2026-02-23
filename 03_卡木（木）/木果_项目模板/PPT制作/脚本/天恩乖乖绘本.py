#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
天恩和乖乖 - 二年级绘本风格 PPT 生成脚本
参考格式：我的植物故事：花草和胡萝卜.pptx
"""

import os
from pathlib import Path
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor

DIR_BASE = Path("/Users/karuo/Library/Mobile Documents/com~apple~CloudDocs/Documents/婼瑄/天恩/ppt 202060223")
OUT_PATH = DIR_BASE / "我和乖乖的故事.pptx"


def ensure_images():
    """获取目录下所有 JPG，按文件名排序"""
    imgs = sorted(DIR_BASE.glob("*.jpg"))
    return [str(p) for p in imgs]


def add_title_slide(prs):
    """第1页：封面"""
    layout = prs.slide_layouts[6]  # 空白
    slide = prs.slides.add_slide(layout)
    # 主标题
    tb = slide.shapes.add_textbox(Inches(0.5), Inches(2), Inches(12.3), Inches(1.2))
    tf = tb.text_frame
    p = tf.paragraphs[0]
    p.text = "我和乖乖的故事"
    p.font.size = Pt(44)
    p.font.bold = True
    p.font.color.rgb = RGBColor(60, 120, 180)
    p.alignment = 1  # 居中
    # 副标题
    tb2 = slide.shapes.add_textbox(Inches(0.5), Inches(3.5), Inches(12.3), Inches(1))
    tf2 = tb2.text_frame
    p2 = tf2.paragraphs[0]
    p2.text = "汇报人：天恩"
    p2.font.size = Pt(24)
    p2.alignment = 1
    p3 = tf2.add_paragraph()
    p3.text = "班级：二年级4班"
    p3.font.size = Pt(24)
    p3.alignment = 1


def add_content_slide(prs, title, body_lines, img_path=None, img_path2=None):
    """通用内容页：标题+正文，可选1-2张图"""
    layout = prs.slide_layouts[6]
    slide = prs.slides.add_slide(layout)
    left = Inches(0.5)
    top = Inches(0.4)
    tb = slide.shapes.add_textbox(left, top, Inches(12.3), Inches(0.8))
    p = tb.text_frame.paragraphs[0]
    p.text = title
    p.font.size = Pt(28)
    p.font.bold = True
    p.font.color.rgb = RGBColor(60, 120, 180)
    body_top = Inches(1.3)
    txt_width = Inches(6) if (img_path or img_path2) else Inches(12.3)
    tb2 = slide.shapes.add_textbox(left, body_top, txt_width, Inches(5))
    tf = tb2.text_frame
    tf.word_wrap = True
    for i, line in enumerate(body_lines):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.text = line
        p.font.size = Pt(20)
        p.space_after = Pt(8)
    if img_path2 and os.path.exists(img_path2):
        slide.shapes.add_picture(img_path, Inches(6.8), Inches(1.5), width=Inches(2.7))
        slide.shapes.add_picture(img_path2, Inches(9.8), Inches(1.5), width=Inches(2.7))
    elif img_path and os.path.exists(img_path):
        slide.shapes.add_picture(img_path, Inches(6.8), Inches(1.5), width=Inches(5.8))


def add_story_slide(prs, title, story_text, img_path=None):
    """故事页：左文右图"""
    layout = prs.slide_layouts[6]
    slide = prs.slides.add_slide(layout)
    tb = slide.shapes.add_textbox(Inches(0.5), Inches(0.4), Inches(12.3), Inches(0.7))
    tb.text_frame.paragraphs[0].text = title
    tb.text_frame.paragraphs[0].font.size = Pt(26)
    tb.text_frame.paragraphs[0].font.bold = True
    tb.text_frame.paragraphs[0].font.color.rgb = RGBColor(60, 120, 180)
    txt_width = Inches(6) if img_path else Inches(12.3)
    tb2 = slide.shapes.add_textbox(Inches(0.5), Inches(1.2), txt_width, Inches(5))
    tf = tb2.text_frame
    tf.word_wrap = True
    lines = [x.strip() for x in story_text.split("\n") if x.strip()]
    for i, line in enumerate(lines):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.text = line
        p.font.size = Pt(20)
        p.space_after = Pt(6)
    if img_path and os.path.exists(img_path):
        slide.shapes.add_picture(img_path, Inches(6.8), Inches(1.5), width=Inches(5.8))


def main():
    imgs = ensure_images()
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    add_title_slide(prs)
    # 第2页
    add_content_slide(
        prs,
        "这是我和乖乖！",
        [
            "乖乖是我家的小狗，它是我的好朋友。",
            "每天放学回家，乖乖都会在门口等我，摇着尾巴欢迎我。",
            "我们一起玩耍、一起散步，乖乖让我的生活变得更快乐！",
        ],
        imgs[0] if len(imgs) > 0 else None,
    )
    # 第3页
    add_story_slide(
        prs,
        "乖乖是怎么来到我家的？",
        "乖乖是爸爸妈妈送给我的惊喜。\n第一次见到它的时候，它小小的、毛茸茸的，一双黑溜溜的眼睛望着我。\n从那天起，我们就成了形影不离的好伙伴！",
        imgs[1] if len(imgs) > 1 else None,
    )
    # 第4页
    add_story_slide(
        prs,
        "我和乖乖每天做什么？",
        "早上，乖乖会叫醒我起床。\n放学后，我们一起在小区里跑步、追球。\n乖乖最喜欢我摸它的脑袋，每次摸它，它都会舒服地眯起眼睛。\n我们还会一起看绘本，乖乖趴在我身边，好像在听故事呢！",
        imgs[2] if len(imgs) > 2 else None,
    )
    # 第5页
    add_content_slide(
        prs,
        "乖乖最可爱的地方",
        [
            "乖乖的耳朵软软的，跑起来一甩一甩的。",
            "它特别聪明，听得懂「坐下」「握手」这些口令。",
            "乖乖还很懂事，我写作业的时候它会安静地陪着我。",
        ],
        imgs[3] if len(imgs) > 3 else None,
        imgs[4] if len(imgs) > 4 else None,
    )
    # 第6页 - 小诗
    add_content_slide(
        prs,
        "我为乖乖写了一首小诗",
        [
            "《我的小伙伴乖乖》",
            "软软的耳朵，黑黑的眼睛，",
            "乖乖是我最好的朋友。",
            "一起奔跑，一起玩耍，",
            "有乖乖的日子，每天都很快乐！",
        ],
        imgs[5] if len(imgs) > 5 else None,
    )
    # 第7页 - 结尾
    layout = prs.slide_layouts[6]
    slide = prs.slides.add_slide(layout)
    tb = slide.shapes.add_textbox(Inches(0.5), Inches(2.2), Inches(12.3), Inches(2))
    tf = tb.text_frame
    tf.paragraphs[0].text = "我的故事讲完啦，希望大家喜欢！"
    tf.paragraphs[0].font.size = Pt(28)
    tf.paragraphs[0].font.bold = True
    tf.paragraphs[0].alignment = 1
    p2 = tf.add_paragraph()
    p2.text = "你们家里也有小动物好朋友吗？"
    p2.font.size = Pt(22)
    p2.alignment = 1
    p3 = tf.add_paragraph()
    p3.text = "谢谢大家！"
    p3.font.size = Pt(26)
    p3.font.bold = True
    p3.alignment = 1
    prs.save(str(OUT_PATH))
    print("✅ PPT 已生成:", OUT_PATH)


if __name__ == "__main__":
    main()

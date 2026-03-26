#!/usr/bin/env python3
"""
Soul切片增强脚本 v2.0
功能：
1. 封面贴片：高光 hook_3sec 优先（吸睛），竖屏底图为**清晰帧 + 约 10% 轻模糊混入**（非全糊）+ 冷色渐变；**顶栏单条 Soul 绿 + 底部电影感渐隐 + 细内框 + 柔阴影标题**（避免粗描边与多条绿边廉价感）。**竖条成片**：封面取帧须与最终成片同一 `-vf`（如 `crop=598:1080:493:0`），禁止用整幅 1920 横版再压成竖条（会与正片取景不一致）。
2. 烧录字幕（关键词高亮、可选逐字）
3. 切除检出的长静音并重映射字幕时间轴
4. 片尾 CTA（cta_ending）字幕条
5. 视频加速约 10%（字幕在加速前已烧进中间成片，再与音轨同倍率 setpts/atempo，相对口播不因此漂移）
6. 转录纠错 / 语气词过滤（见 CORRECTIONS、FILLER 等）
"""

import argparse
import atexit
import json
import os
import random
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter


def _kill_child_ffmpeg_on_exit():
    """脚本退出时（含 Ctrl+C）杀死本进程启动的 ffmpeg 子进程，避免剪辑结束后仍占用 CPU。"""
    try:
        subprocess.run(
            ["pkill", "-P", str(os.getpid()), "ffmpeg"],
            capture_output=True,
            timeout=2,
        )
    except Exception:
        pass


atexit.register(_kill_child_ffmpeg_on_exit)

# ============ 配置（可被命令行覆盖）============

SCRIPT_DIR = Path(__file__).resolve().parent
SKILL_DIR = SCRIPT_DIR.parent
CLIPS_DIR = Path("/Users/karuo/Movies/soul视频/soul81_final/clips")
OUTPUT_DIR = Path("/Users/karuo/Movies/soul视频/soul81_final/clips_enhanced")
HIGHLIGHTS_PATH = Path("/Users/karuo/Movies/soul视频/soul81_final/highlights.json")
TRANSCRIPT_PATH = Path("/Users/karuo/Movies/soul视频/soul81_final/transcript.srt")
STICKER_LIBRARY_DIR = SKILL_DIR / "贴片库" / "emoji_png_72"

# 字体路径（兼容多种目录结构）
FONTS_DIR = SKILL_DIR / "fonts" if (SKILL_DIR / "fonts").exists() else Path("/Users/karuo/Documents/个人/卡若AI/03_卡木（木）/视频切片/fonts")
FONT_SMILEY = str(FONTS_DIR / "SmileySans-Oblique.ttf")
FONT_HEAVY = str(FONTS_DIR / "SourceHanSansSC-Heavy.otf")
FONT_BOLD = str(FONTS_DIR / "SourceHanSansSC-Bold.otf")
FALLBACK_FONT = "/System/Library/Fonts/STHeiti Medium.ttc"
# 成片字幕：macOS 系统中文黑体（苹方 → 冬青黑体 → 华文黑体）
_FONT_APPLE_SUBTITLE_CANDIDATES = (
    "/System/Library/Fonts/PingFang.ttc",
    "/System/Library/Fonts/Hiragino Sans GB.ttc",
    "/System/Library/Fonts/STHeiti Medium.ttc",
)
FONT_APPLE_SUBTITLE = next(
    (p for p in _FONT_APPLE_SUBTITLE_CANDIDATES if os.path.exists(p)),
    FONT_BOLD,
)

# 视频增强参数
SPEED_FACTOR = 1.10  # 加速10%
# 默认「剃空白」偏激进：略提高 noise 阈值（更接近 0）+ 更短 min_duration，多剪掉会议留白
SILENCE_THRESHOLD = -32
SILENCE_MIN_DURATION = 0.22
SILENCE_TRIM_MARGIN = 0.04
# --silence-gentle 时回退旧参数，避免个别素材被切太碎
SILENCE_GENTLE_THRESHOLD = -38
SILENCE_GENTLE_MIN_DURATION = 0.32
SILENCE_GENTLE_TRIM_MARGIN = 0.06
# 字幕轴上相邻两条间隔 ≥ 此值（秒）也视为可剪「空白」（与 silencedetect 结果并集）
SILENCE_SUBTITLE_GAP_MIN_SEC = 0.52
# 片尾若干秒不参与「去静音」切除，避免成片最后几秒被剪成完全无声（需保留收尾人声）
SILENCE_TAIL_PRESERVE_SEC = 2.85

# Soul 竖屏裁剪（与 soul_vertical_crop 一致，成片直出用）
# 默认与 analyze_feishu_ui_crop.py（20% 帧、扩边到桌面白 + 横向 scale）典型输出一致；他场次请先跑分析再 --crop-vf。
# 默认与 analyze_feishu_ui_crop 一致：仅 crop 包络宽×1080，不横向压扁；旧 498 见 --crop-vf 两段裁或 scale。
CROP_VF = "crop=598:1080:493:0"
VERTICAL_H = 1080
VERTICAL_W_LEGACY = 498  # 两段裁 / squeeze-498 时输出宽
OVERLAY_X = 493

# 竖屏「全画面入画」：不裁中间竖条；整幅横版等比缩放入 498×1080，上下黑边（letterbox）
VERTICAL_FIT_FULL_VF = (
    "scale=w=498:h=1080:force_original_aspect_ratio=decrease:flags=lanczos,"
    "pad=498:1080:(ow-iw)/2:(oh-ih)/2:color=black"
)


def _overlay_x_from_crop_vf(crop_vf: str):
    """从滤镜链解析字幕/封面叠在横版上的 x。
    - 两段 crop：crop=W:1080:X:0,crop=498:1080:Y:0 → X+Y
    - crop + scale=498：crop=W:1080:L:0,scale=498:1080... → L
    - 仅 crop 包络：crop=W:1080:L:0 → L"""
    s = (crop_vf or "").strip().replace(" ", "")
    m = re.match(r"crop=\d+:1080:(\d+):0,crop=498:1080:(\d+):0", s)
    if m:
        return int(m.group(1)) + int(m.group(2))
    m = re.match(r"crop=\d+:1080:(\d+):0,scale=498:1080", s)
    if m:
        return int(m.group(1))
    m = re.match(r"^crop=\d+:1080:(\d+):0$", s)
    if m:
        return int(m.group(1))
    return None


def vertical_out_dimensions_from_vf(crop_vf: str) -> tuple[int, int]:
    """竖条成片像素尺寸：原生包络宽×1080，或强制 498 宽。"""
    s = (crop_vf or "").strip().replace(" ", "")
    if not s:
        return VERTICAL_W_LEGACY, VERTICAL_H
    if re.match(r"^crop=\d+:1080:\d+:0,crop=498:1080:\d+:0$", s):
        return VERTICAL_W_LEGACY, VERTICAL_H
    if re.search(r",scale=498:1080", s):
        return VERTICAL_W_LEGACY, VERTICAL_H
    m = re.match(r"^crop=(\d+):1080:\d+:0$", s)
    if m:
        return int(m.group(1)), VERTICAL_H
    return VERTICAL_W_LEGACY, VERTICAL_H


def _is_vertical_strip_canvas(w: int, h: int) -> bool:
    """竖条成片画布：固定高度 1080、宽度小于全幅横版（封面/字幕走竖条样式）。"""
    return h == VERTICAL_H and w < 1600


def build_typewriter_subtitle_images(
    subtitles,
    temp_dir,
    out_w,
    out_h,
    subtitle_overlay_start,
    min_step_sec=0.03,
    max_steps_per_line=28,
):
    """
    逐字渐显（跟语速）：
    - 若字幕带 word_times：每个 ASR 词的时间段内再按字权重切分，一字一帧，整体对齐口播；
    - 否则整句时长按字权重逐字切分（兜底）。
    subtitle_overlay_start：最早显示字幕的时间轴（秒），须 ≥ 封面结束。
    """
    sub_images = []
    img_idx = 0

    for sub in subtitles:
        s, e = float(sub["start"]), float(sub["end"])
        s = max(s, subtitle_overlay_start)
        if s >= e - 0.02:
            continue

        word_times = sub.get("word_times")

        # ── 路径 A：word-level：词边界内再按字拆时间 ─────────────────────────
        if word_times and len(word_times) >= 1:
            accumulated = ""
            for wi, wt in enumerate(word_times):
                raw_w = _to_simplified((wt.get("word") or "").strip())
                if not raw_w:
                    continue
                word_t0 = max(float(wt["start"]), subtitle_overlay_start, s)
                if wi + 1 < len(word_times):
                    word_t1 = float(word_times[wi + 1]["start"])
                else:
                    word_t1 = e
                we = wt.get("end")
                if we is not None:
                    we = float(we)
                    if we > word_t0 + 0.02:
                        word_t1 = min(word_t1, max(we, word_t0 + min_step_sec))
                word_t1 = min(word_t1, e)
                word_t1 = max(word_t1, word_t0 + min_step_sec)
                dur_w = word_t1 - word_t0
                chars_w = list(raw_w)
                if not chars_w:
                    continue
                weights = [_subtitle_char_weight(c) for c in chars_w]
                total_ww = sum(max(w, 0.01) for w in weights)
                prev_tw = word_t0
                for ci, ch in enumerate(chars_w):
                    accumulated += ch
                    frac_end = (
                        sum(max(weights[j], 0.01) for j in range(ci + 1)) / total_ww
                        if total_ww > 0
                        else (ci + 1) / len(chars_w)
                    )
                    t1 = word_t0 + dur_w * frac_end
                    if ci == len(chars_w) - 1:
                        t1 = word_t1
                    t0 = prev_tw
                    t1 = max(t1, t0 + min_step_sec * 0.25)
                    clean = _normalize_subtitle_text_strict(
                        improve_subtitle_punctuation(_improve_subtitle_text(accumulated))
                    )
                    if not (clean or "").strip():
                        prev_tw = t1
                        continue
                    img_path = os.path.join(temp_dir, f"sub_{img_idx:04d}.png")
                    create_subtitle_image(clean, out_w, out_h, img_path)
                    sub_images.append({"path": img_path, "start": t0, "end": t1})
                    img_idx += 1
                    prev_tw = t1
            continue

        # ── 路径 B：无词轴：整句按字权重切时间（一字一帧）────────────────────
        safe_text = _normalize_subtitle_text_strict(
            improve_subtitle_punctuation(_improve_subtitle_text(sub["text"]))
        )
        if not safe_text or not safe_text.strip():
            continue
        dur = e - s
        chars = list(safe_text)
        n = len(chars)
        if n <= 1:
            img_path = os.path.join(temp_dir, f"sub_{img_idx:04d}.png")
            create_subtitle_image(safe_text, out_w, out_h, img_path)
            sub_images.append({"path": img_path, "start": s, "end": e})
            img_idx += 1
            continue
        weights = [_subtitle_char_weight(ch) for ch in chars]
        total_w = sum(max(w, 0.01) for w in weights)
        prev_t = s
        for ci in range(n):
            partial = "".join(chars[: ci + 1])
            frac_end = (
                sum(max(weights[j], 0.01) for j in range(ci + 1)) / total_w
                if total_w > 0
                else (ci + 1) / n
            )
            t1 = s + dur * frac_end if ci < n - 1 else e
            t0 = prev_t
            t1 = max(t1, t0 + min_step_sec * 0.25)
            partial = _normalize_subtitle_text_strict(partial)
            if not partial:
                continue
            img_path = os.path.join(temp_dir, f"sub_{img_idx:04d}.png")
            create_subtitle_image(partial, out_w, out_h, img_path)
            sub_images.append({"path": img_path, "start": t0, "end": t1})
            img_idx += 1
            prev_t = t1

    return sub_images

# 繁转简（OpenCC 优先，否则用映射）
_OPENCC = None
def _get_opencc():
    global _OPENCC
    if _OPENCC is None:
        try:
            from opencc import OpenCC
            _OPENCC = OpenCC('t2s')
        except ImportError:
            _OPENCC = False
    return _OPENCC

def _to_simplified(text: str) -> str:
    """转为简体中文"""
    cc = _get_opencc()
    if cc:
        return cc.convert(text)
    # 常用繁简映射（无 opencc 时）
    trad_simp = {
        '這': '这', '個': '个', '們': '们', '來': '来', '說': '说',
        '會': '会', '裡': '里', '麼': '么', '還': '还', '點': '点',
        '時': '时', '對': '对', '電': '电', '體': '体', '為': '为',
    }
    for t, s in trad_simp.items():
        text = text.replace(t, s)
    return text

# 常见转录错误修正（与 one_video 一致，按长度降序排列避免短词误替换）
# 运行时会再合并 `运营中枢/参考资料/卡若闽南口音_ASR纠错库.json`（同名 key 以 JSON 为准）
_CORRECTIONS_BASE = {
    # AI 工具名称 ─────────────────────────────────────────────────
    '小龙俠': 'AI工具', '小龍俠': 'AI工具', '小龍蝦': 'AI工具',
    '龍蝦': 'AI工具', '小龙虾': 'AI工具', '龙虾': 'AI工具',
    '克劳德': 'Claude', '科劳德': 'Claude', '吹': 'Claude',
    '颗色': 'Cursor', '库色': 'Cursor', '可索': 'Cursor',
    '蝌蚁': '科技AI', '千万': '千问', '豆包': 'AI工具',
    '暴电码': '暴电码', '蝌蚪': 'Cursor',
    # Soul 平台别字 ──────────────────────────────────────────────
    '受上': 'Soul上', '搜上': 'Soul上', '售上': 'Soul上',
    '寿上': 'Soul上', '瘦上': 'Soul上', '亭上': 'Soul上',
    '这受': '这Soul', '受的': 'Soul的', '受里': 'Soul里',
    '受平台': 'Soul平台',
    '受推流': '售推流',  # ASR 常把「soul」听成「受」
    '做个数据': '整场数据',
    '整个售的': '整个场的', '整个售': '整个场',
    # 私域/商业用语 ─────────────────────────────────────────────
    '私余': '私域', '施育': '私域', '私育': '私域',
    '统安': '同安', '信一下': '线上', '头里': '投入',
    '幅画': '负责', '经历论': '净利润', '成于': '乘以',
    '马的': '码的', '猜济': '拆解', '巨圣': '矩阵',
    '货客': '获客', '甲为师': '(AI助手)',
    '基因交狼': '技能包', '基因交流': '技能传授',
    '受伤命': '搜索引擎', '附身': '副业', '附产': '副产',
    # AI 工作流 / 编程词汇 ──────────────────────────────────────
    'Ski-er': '智能体', 'Skier': '智能体', 'SKI-er': '智能体',
    '工作流': '工作流', '智能体': '智能体',
    '蝌蛇': 'Cursor', '科色': 'Cursor',
    'Cloud': 'Claude',  # 转录常把 Claude 误识别为 Cloud
    # 繁体常见 ──────────────────────────────────────────────────
    '麥': '麦', '頭': '头', '讓': '让', '說': '说', '開': '开',
    '這': '这', '個': '个', '們': '们', '來': '来', '會': '会',
    '裡': '里', '還': '还', '點': '点', '時': '时', '對': '对',
    '電': '电', '體': '体', '為': '为', '們': '们', '後': '后',
    '關': '关', '單': '单', '號': '号', '幹': '干', '達': '达',
    '傳': '传', '統': '统', '際': '际', '應': '应', '問': '问',
    '產': '产', '業': '业', '學': '学', '發': '发', '種': '种',
    '從': '从', '給': '给', '認': '认', '過': '过', '當': '当',
    '誰': '谁', '動': '动', '圖': '图', '報': '报', '費': '费',
    '務': '务', '與': '与', '於': '于', '錢': '钱', '帳': '账',
    '臺': '台', '台灣': '台湾', '臺灣': '台湾',
    # 噪音符号/单字符 ────────────────────────────────────────────
    # （在 parse_srt 里过滤，这里不做）
}

_KARUO_VOICE_JSON = Path(__file__).resolve().parents[4] / "运营中枢" / "参考资料" / "卡若闽南口音_ASR纠错库.json"


def _merge_karuo_voice_corrections(base: dict) -> dict:
    """合并卡若闽南口音 ASR 纠错库；JSON 覆盖内置表中同名 key。"""
    merged = dict(base)
    try:
        if _KARUO_VOICE_JSON.exists():
            with open(_KARUO_VOICE_JSON, encoding="utf-8") as f:
                blob = json.load(f)
            extra = blob.get("corrections") if isinstance(blob, dict) else None
            if isinstance(extra, dict):
                for k, v in extra.items():
                    if k is not None and v is not None:
                        merged[str(k)] = str(v)
    except Exception:
        pass
    return merged


CORRECTIONS = _merge_karuo_voice_corrections(_CORRECTIONS_BASE)

# 各平台违禁词 → 谐音/替代词（用于字幕、封面、文件名）
# 原则：意思不变，表达更安全，避免平台限流/封号
PLATFORM_VIOLATIONS = {
    # 网络访问
    '科学上网': '特殊网络访问',
    '翻墙': '访问海外工具',
    '梯子': '访问工具',
    'VPN': '网络工具',
    # 资金/收益（部分平台敏感）
    '引流': '涌流',
    '拉人': '邀请',
    '加微信': '加联系方式',
    '私聊': '后台联系',
    # 内容规范
    '炸房': '被限流',
    '封号': '账号受限',
    '洗稿': '参考改写',
    # 灰色表述
    '灰色': '特殊',
    '黑产': '地下产业',
    '套利': '差价空间',
    # 平台专属敏感
    'API': 'A接口',
    'token消耗': '算力成本',
}

# 语助词列表（需清理，含常见口头禅）
FILLER_WORDS = [
    '嗯', '啊', '呃', '额', '哦', '噢', '唉', '哎', '诶', '喔',
    '那个', '就是', '然后', '这个', '所以说', '怎么说', '怎么说呢',
    '对吧', '是吧', '好吧', '行吧', '那', '就', '就是那个',
    '其实', '那么', '然后呢', '还有就是', '以及', '另外', '等等',
    '怎么说呢', '你知道吗', '我跟你说', '好', '对', 'OK', 'ok',
]

# 不烧录的无关/模板句（仅整句完全匹配或极短规则说明，避免误杀正片对白）
SKIP_SUBTITLE_PHRASES = (
    "回复1", "回复 1", "排序分享", "上麦后按格式介绍自己", "进资源泡泡群", "做矩阵切片",
    "合作私聊", "群主必", "时间5~10分钟", "我能帮到大家什么", "我需要什么帮助",
    "廿四先生", "进来陪你聊天", "建房领开工红包",
)

# 关键词高亮（重点突出，按长度排序避免短词覆盖长词）
KEYWORDS = [
    '100万', '50万', '30万', '10万', '5万', '1万',
    '存客宝', '私域', '自动化', '阿米巴', '矩阵', '获客', '变现',
    '分润', '转化', '复购', '裂变', 'AI', 'SOP', 'IP',
    '电商', '创业', '项目', '收益', '流量', '引流',
    '抖音', 'Soul', '微信', '美团', '方法', '技巧', '干货',
    '核心', '关键', '重点', '赚钱', '收入', '利润',
    # 127 场及同类话题常见词
    '消耗', '算力', '工资', '月薪', '两万', '2万', '面试', '三面', '实操', '学历',
    '推流', '三板斧', '后端', '前端', '暴利', '缺口', '保镖', '辅助', '两头扛',
    '剪辑', '成片', '模型', '规则', '组织',
]

# 字体优先级（封面用更好看的字体）
FONT_PRIORITY = [
    "/System/Library/Fonts/PingFang.ttc",           # 苹方-简
    "/System/Library/Fonts/Supplemental/Songti.ttc", # 宋体-简
    "/System/Library/Fonts/STHeiti Medium.ttc",
    "/Library/Fonts/Arial Unicode.ttf",
]
COVER_FONT_PRIORITY = [
    FONT_BOLD,  # 思源黑体 Bold，标题更有海报感
    "/System/Library/Fonts/PingFang.ttc",
    "/System/Library/Fonts/Supplemental/Songti.ttc",
]

# Soul 品牌绿（绿点/绿色社交）
SOUL_GREEN = (0, 210, 106)   # #00D26A
SOUL_GREEN_DARK = (0, 160, 80)
# 竖屏封面高级背景：冷灰青渐变（比纯墨绿更显质感，与 Soul 绿顶栏形成对比）
VERTICAL_COVER_TOP = (18, 26, 34)    # 深板岩
VERTICAL_COVER_BOTTOM = (8, 14, 22)  # 近黑蓝
VERTICAL_COVER_PADDING = 48  # 左右留白，保证文字不贴边、不超出
# 成片封面半透明质感：背景层 alpha，便于透出底层画面（略降，减少发灰）
VERTICAL_COVER_ALPHA = 148  # 0~255，越大越不透明
# 点缀金（细线用，低存在感）
COVER_ACCENT_GOLD = (201, 169, 98)

# 样式配置
STYLE = {
    'cover': {
        # 封面底图：原画与「高斯模糊层」按 bg_blur_mix 混合（0.1≈10% 模糊感），保留界面可辨；勿再用全幅强模糊
        'bg_blur_mix': 0.10,
        'bg_blur_radius': 14,  # 仅用于生成模糊层的高斯半径，再与清晰帧 blend
        'overlay_alpha': 200,
        'duration': 2.5,
        # 竖屏「高级封面」装饰（横版仍走原 overlay 逻辑）
        'dim_alpha': 88,  # 首帧压暗，略提亮画面层次
        'top_accent_px': 6,  # 顶栏 Soul 绿实条高度
        'gold_hairline': True,  # 顶栏下 1px 淡金线
        'vignette_from_ratio': 0.46,  # 从下往上渐隐起点（占画面高度比例）
        'vignette_max_alpha': 138,
        'frame_inset_alpha': 42,  # 内框白边透明度
    },
    'hook': {
        'font_size': 82,  # 更大更清晰
        'color': (255, 255, 255),
        'outline_color': (30, 30, 50),
        'outline_width': 5,
        # 竖屏主标题：略暖白，与冷底对比
        'vertical_fill': (252, 252, 250),
    },
    'subtitle': {
        'font_size': 48,
        'font_path': FONT_APPLE_SUBTITLE,
        'color': (252, 252, 254),
        'outline_color': (0, 0, 0),
        'outline_width': 0,
        'keyword_color': (255, 220, 120),
        'keyword_outline': (40, 28, 0),
        'keyword_outline_width': 0,
        'keyword_size_add': 0,
        # 大号「毛玻璃感」底条：竖条模式下横向拉满（留边），内边距加大；无底条描边
        'bg_color': (24, 26, 34, 228),
        'border_color': None,
        'border_width': 0,
        'gloss_alpha': 26,
        'shadow_alpha': 52,
        'bg_padding_v': 28,
        'bg_padding_h': 22,
        'bg_full_strip': True,
        'bg_side_margin': 12,
        'bg_corner_radius': 20,
        'margin_bottom': 72,
    }
}

# 字幕与语音同步：已导出的切片文件时间轴从 0 起，与 transcript 绝对时间对齐，默认不再整体平移。
# 仅当 ffprobe 发现音轨与视频首帧 PTS 差 > 阈值时，才加小量补偿（应对「未重封装、seek 错位」的源）。
SUBTITLE_DELAY_SEC = 0.0
SUBTITLE_PTS_OFFSET_THRESHOLD = 0.18  # 超过此秒数才加 delay
SUBTITLE_DELAY_MAX = 1.2
SUBS_START_AFTER_COVER_SEC = 0.0
# 至少切除的静音总时长（秒）才触发重编码，避免无意义抖动
MIN_SILENCE_TRIM_TOTAL_SEC = 0.12
COVER_TITLE_MAX_CJK = 6
# 封面优先用 hook_3sec（吸睛高光句），可略长于纯标题字数上限
COVER_HOOK_MAX_CJK = 16
CTA_END_MIN_SEC = 2.0
CTA_END_MAX_SEC = 3.8

# ============ 工具函数 ============

def get_font(font_path, size):
    """获取字体，优先苹方（支持中文），避免 default 导致封面文字不显示"""
    for path in FONT_PRIORITY + [font_path, FONT_BOLD, FALLBACK_FONT]:
        if path and os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                continue
    return ImageFont.load_default()


def get_font_subtitle(size):
    """成片字幕专用：固定走 macOS 苹方/冬青/华文黑，再回退思源，避免与通用 get_font 混链。"""
    for path in list(_FONT_APPLE_SUBTITLE_CANDIDATES) + [FONT_BOLD, FALLBACK_FONT]:
        if path and os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                continue
    return ImageFont.load_default()

def get_text_size(draw, text, font):
    """获取文字尺寸"""
    bbox = draw.textbbox((0, 0), text, font=font)
    return bbox[2] - bbox[0], bbox[3] - bbox[1]

def draw_text_with_outline(draw, pos, text, font, color, outline_color, outline_width):
    """绘制带描边的文字；outline_width<=0 时不描边（无字框）。"""
    x, y = pos
    if not text:
        return
    ow = int(outline_width or 0)
    if ow <= 0:
        draw.text((x, y), text, font=font, fill=color)
        return
    import math
    for angle in range(0, 360, 45):
        dx = int(ow * math.cos(math.radians(angle)))
        dy = int(ow * math.sin(math.radians(angle)))
        draw.text((x + dx, y + dy), text, font=font, fill=outline_color)
    draw.text((x, y), text, font=font, fill=color)


def draw_text_with_soft_shadow(draw, pos, text, font, fill_rgb):
    """竖屏封面标题：右下柔阴影 + 主字，比粗描边更偏杂志/海报质感"""
    x, y = pos
    if len(fill_rgb) == 4:
        main = fill_rgb
    else:
        main = (*fill_rgb, 255)
    layers = [
        (6, 6, 72),
        (5, 5, 100),
        (4, 4, 130),
        (3, 3, 155),
        (2, 2, 175),
        (1, 1, 195),
    ]
    for dx, dy, a in layers:
        draw.text((x + dx, y + dy), text, font=font, fill=(0, 0, 0, a))
    draw.text((x, y), text, font=font, fill=main)


def _apply_cover_bottom_vignette(img_rgba, from_ratio: float, max_alpha: int):
    """底部电影感渐隐，压暗杂边、托住标题区；返回合成后的新图"""
    w, h = img_rgba.size
    y0 = int(max(0, min(1, from_ratio)) * h)
    if y0 >= h - 2:
        return img_rgba
    layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    ld = ImageDraw.Draw(layer)
    span = max(h - y0, 1)
    for y in range(y0, h):
        t = (y - y0) / span
        a = int(max_alpha * (t ** 1.35))
        a = max(0, min(255, a))
        ld.rectangle([0, y, w, y + 1], fill=(0, 0, 0, a))
    return Image.alpha_composite(img_rgba, layer)

def _normalize_title_for_display(title: str) -> str:
    """标题去杠去下划线：将 ：｜、—、/、_ 等全部替换为空格，避免文件名和封面出现杂符号"""
    if not title:
        return ""
    s = _to_simplified(str(title).strip())
    for char in "：:｜|—－-/、_":
        s = s.replace(char, " ")
    s = re.sub(r"\s+", " ", s).strip()
    return s


def _limit_cover_title_cjk(text: str, max_cjk: int = COVER_TITLE_MAX_CJK) -> str:
    """封面标题最多保留 max_cjk 个汉字（含汉字即计数）；超长截断，避免封面字过小或换行过多。"""
    if not text or max_cjk <= 0:
        return text or ""
    out = []
    n_cjk = 0
    for ch in text:
        if "\u4e00" <= ch <= "\u9fff":
            n_cjk += 1
            if n_cjk > max_cjk:
                break
        out.append(ch)
    return "".join(out).strip()


def pick_cover_hook_text(highlight_info: dict) -> str:
    """高光成片封面：优先 viral_hook（热点向刺激标题），再 hook_3sec / 问句 / 标题。全程简体。"""
    if not highlight_info:
        return ""
    v = _to_simplified((highlight_info.get("viral_hook") or "").strip())
    if v:
        return v
    h = _to_simplified((highlight_info.get("hook_3sec") or "").strip())
    if h:
        return h
    q = highlight_info.get("question")
    if q is not None and str(q).strip():
        return _to_simplified(str(q).strip())
    return _to_simplified((highlight_info.get("title") or "").strip())


def _limit_cover_hook_display(text: str, max_cjk: int = COVER_HOOK_MAX_CJK) -> str:
    """Hook 可略长，仍以汉字数封顶，避免竖屏换行爆炸。"""
    return _limit_cover_title_cjk(text, max_cjk=max_cjk)


# macOS/APFS 文件名允许的中文标点（保留刺激性标题所需的标点）
_SAFE_CJK_PUNCT = set("，。？！；：·、…（）【】「」《》～—·+｜")

def sanitize_filename(name: str, max_length: int = 50) -> str:
    """成片文件名：先去杠去下划线，再保留中文、ASCII字母数字、安全标点与空格。
    
    保留英文大写（如 MBTI、ENFJ）和数字（如 170万、1000曝光），避免因过度过滤
    导致标题残缺（如原来 ENFJ 等被删掉变成 '组建团队 初期找'）。
    """
    name = _normalize_title_for_display(name) or _to_simplified(str(name))
    safe = []
    for c in name:
        if (c == " "
                or "\u4e00" <= c <= "\u9fff"   # 中文字符
                or c.isalnum()                  # ASCII 字母+数字（MBTI、ENFJ、AI、30、170…）
                or c in _SAFE_CJK_PUNCT):       # 中文标点（？！，。）
            safe.append(c)
    result = "".join(safe).strip()
    result = re.sub(r"\s+", " ", result).strip()
    if len(result) > max_length:
        result = result[:max_length]
    return result.strip() or "片段"


def clean_filler_words(text):
    """清理语助词 + 去除多余空格"""
    result = text
    # 按长度降序，先删长词避免残留
    for word in sorted(FILLER_WORDS, key=len, reverse=True):
        if not word:
            continue
        result = re.sub(rf'^{re.escape(word)}[,，、\s]*', '', result)
        result = re.sub(rf'[,，、\s]*{re.escape(word)}$', '', result)
        result = re.sub(rf'\s+{re.escape(word)}\s+', ' ', result)
        result = re.sub(rf'[,，、]+{re.escape(word)}[,，、\s]*', '，', result)
    # 合并多余空格、去除首尾空格
    result = re.sub(r'\s+', ' ', result)
    result = re.sub(r'\s*[,，]\s*', '，', result)
    result = re.sub(r'[,，]+', '，', result).strip(' ，,')
    return result


def apply_platform_safety(text: str) -> str:
    """将各平台违禁词/敏感词替换为安全谐音词，适用于字幕、封面、文件名。
    
    按词长降序替换，避免短词截断长词。
    """
    if not text:
        return text
    result = str(text)
    # 先做 CORRECTIONS（转录错误修正），再做 VIOLATIONS（平台安全替换）
    for w, c in sorted(CORRECTIONS.items(), key=lambda x: len(x[0]), reverse=True):
        result = result.replace(w, c)
    for w, c in sorted(PLATFORM_VIOLATIONS.items(), key=lambda x: len(x[0]), reverse=True):
        result = result.replace(w, c)
    return result


def _collapse_cjk_interchar_spaces(text: str) -> str:
    """去掉 CJK 字符之间的空白（Whisper 词级时间轴常插空格，逐字/逐词显字时会像字间被撑开）。"""
    if not text:
        return text
    s = text
    prev = None
    while prev != s:
        prev = s
        s = re.sub(r"([\u4e00-\u9fff])\s+([\u4e00-\u9fff])", r"\1\2", s)
    s = re.sub(r" +", " ", s)
    return s.strip()


def _normalize_subtitle_text_strict(text: str) -> str:
    """字幕严格清洗：去空白、去空字、去多余标点空格，避免出现空字幕帧。"""
    if not text:
        return ""
    t = _collapse_cjk_interchar_spaces(_to_simplified(str(text)))
    t = re.sub(r"\s+", " ", t).strip()
    t = re.sub(r"\s+([，。！？；：,.!?;:])", r"\1", t)
    t = re.sub(r"([（【《])\s+", r"\1", t)
    t = re.sub(r"\s+([）】》])", r"\1", t)
    if not re.search(r"[\u4e00-\u9fffA-Za-z0-9]", t):
        return ""
    return t


def _subtitle_char_weight(ch: str) -> float:
    """逐字节奏权重：标点更慢、普通字适中，实现轻重缓急。"""
    if not ch or ch.isspace():
        return 0.0
    if ch in "。！？!?":
        return 2.6
    if ch in "，、；：,;:":
        return 1.8
    if ch in "…":
        return 2.2
    if re.match(r"[A-Za-z0-9]", ch):
        return 0.9
    return 1.0


EMOJI_STICKER_MAP = {
    "money": ["1f4b0", "1f4b8", "1f911"],
    "fire": ["1f525", "2728"],
    "idea": ["1f4a1", "1f9e0"],
    "growth": ["1f680", "1f4c8", "1f3af"],
    "risk": ["26a0", "1f6a8"],
    "happy": ["1f973", "1f44f", "1f60e"],
    "psych": ["1f9e0", "1f4a1", "1f4af"],
    "team": ["1f44d", "1f44f", "1f389"],
}


def _detect_sticker_theme(text: str) -> str:
    u = text or ""
    t = u.lower()
    if any(k in u for k in ["MBTI", "性格", "心理", "咨询", "测试", "测评", "抑郁", "情绪"]):
        return "psych"
    if any(k in u for k in ["团队", "合伙", "椅子", "分工", "小林", "陈总", "宋总"]):
        return "team"
    if any(k in t for k in ["营收", "赚钱", "成交", "变现", "利润", "现金流", "money"]):
        return "money"
    if any(k in t for k in ["风险", "封号", "告警", "风控", "risk"]):
        return "risk"
    if any(k in t for k in ["增长", "裂变", "爆发", "拉升", "增长率", "growth"]):
        return "growth"
    if any(k in t for k in ["方法", "模型", "方案", "思路", "idea"]):
        return "idea"
    if any(k in t for k in ["高光", "爆", "冲", "火", "热点", "fire"]):
        return "fire"
    return "happy"


def _build_sticker_events(highlight_info: dict, duration: float):
    """按时长和主题生成贴片事件。超过2分钟至少2次，避免干扰字幕区域。"""
    if duration < 45:
        return []
    source_text = " ".join(
        [
            str(highlight_info.get("hook_3sec") or ""),
            str(highlight_info.get("title") or ""),
            str(highlight_info.get("question") or ""),
        ]
    )
    theme = _detect_sticker_theme(source_text)
    sticker_codes = EMOJI_STICKER_MAP.get(theme) or EMOJI_STICKER_MAP["happy"]
    base_count = 2 if duration >= 120 else 1
    if duration >= 180:
        base_count = 3
    if duration >= 90 and theme in ("psych", "team", "money"):
        base_count = min(5, base_count + 2)
    events = []
    random.seed(int(duration * 1000) ^ len(source_text))
    for i in range(base_count):
        code = random.choice(sticker_codes)
        seg = duration / (base_count + 1)
        t0 = max(3.0, seg * (i + 1) + random.uniform(-2.2, 2.2))
        t1 = min(duration - 2.0, t0 + random.uniform(1.1, 1.8))
        if t1 <= t0 + 0.2:
            continue
        events.append(
            {
                "code": code,
                "start": t0,
                "end": t1,
                "x": random.choice(["w*0.09", "w*0.74"]),
                "y": random.choice(["h*0.16", "h*0.28"]),
                "scale_w": random.choice([64, 72, 80]),
            }
        )
    return events


def apply_sticker_overlays(video_path: str, output_path: str, highlight_info: dict, duration: float):
    """把表情贴片叠到视频里。贴片库缺失时自动跳过。"""
    sticker_dir = Path(STICKER_LIBRARY_DIR)
    if not sticker_dir.exists():
        return False
    events = _build_sticker_events(highlight_info, float(duration))
    if not events:
        return False

    sticker_inputs = []
    valid_events = []
    for ev in events:
        p = sticker_dir / f"{ev['code']}.png"
        if p.exists():
            sticker_inputs.append(str(p))
            valid_events.append(ev)
    if not valid_events:
        return False

    cmd = ["ffmpeg", "-y", "-i", video_path]
    for p in sticker_inputs:
        cmd += ["-i", p]

    chains = []
    last_label = "0:v"
    for idx, ev in enumerate(valid_events, start=1):
        s_label = f"s{idx}"
        o_label = f"v{idx}"
        chains.append(
            f"[{idx}:v]scale={ev['scale_w']}:-1,format=rgba,colorchannelmixer=aa=0.88[{s_label}]"
        )
        chains.append(
            f"[{last_label}][{s_label}]overlay=x={ev['x']}:y={ev['y']}:enable='between(t,{ev['start']:.3f},{ev['end']:.3f})'[{o_label}]"
        )
        last_label = o_label

    filter_complex = ";".join(chains)
    cmd += [
        "-filter_complex",
        filter_complex,
        "-map",
        f"[{last_label}]",
        "-map",
        "0:a",
        "-c:v",
        "libx264",
        "-preset",
        "fast",
        "-crf",
        "22",
        "-c:a",
        "copy",
        output_path,
    ]
    r = subprocess.run(cmd, capture_output=True, text=True)
    return r.returncode == 0 and os.path.exists(output_path)


def _audio_enhance_filter_str(strong_clean: bool) -> str:
    """嘈杂会议室：strong 时抬高高通、加深 FFT 降噪。"""
    if strong_clean:
        return (
            "highpass=f=200,"
            "lowpass=f=9800,"
            "afftdn=nf=-38,"
            "compand=0.02|0.02:0.05|0.05:-60/-60|-32/-16|-22/-11|0/-3:6:0:0:0.02,"
            "loudnorm=I=-16:LRA=7:TP=-1.5"
        )
    return (
        "highpass=f=120,"
        "lowpass=f=10000,"
        "afftdn=nf=-30,"
        "compand=0.02|0.02:0.05|0.05:-60/-60|-30/-15|-20/-10|0/-3:6:0:0:0.02,"
        "loudnorm=I=-16:LRA=7:TP=-1.5"
    )


def apply_keyword_pin_overlays(
    video_path: str,
    output_path: str,
    highlight_info: dict,
    duration: float,
    overlay_x: int,
    strip_w: int,
    temp_dir: str,
) -> bool:
    """在竖条主区域内烧录 1～2 条半透明关键词条（与高光文案相关，非外链视频）。"""
    lines = []
    for key in ("hook_3sec", "title", "transcript_excerpt"):
        s = (highlight_info.get(key) or "").strip()
        s = _to_simplified(s)
        s = re.sub(r"\s+", " ", s)
        if len(s) >= 6:
            lines.append(s[:22] + ("…" if len(s) > 22 else ""))
        if len(lines) >= 2:
            break
    if not lines:
        return False
    paths = []
    for i, line in enumerate(lines[:2]):
        pin_w = min(680, max(320, strip_w + 80))
        pin_h = 52
        img = Image.new("RGBA", (pin_w, pin_h), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)
        draw.rounded_rectangle([0, 0, pin_w - 1, pin_h - 1], radius=10, fill=(8, 12, 20, 210))
        fp = FONT_SMILEY if os.path.exists(FONT_SMILEY) else FALLBACK_FONT
        try:
            font = ImageFont.truetype(fp, 26)
        except Exception:
            font = ImageFont.load_default()
        draw.text((16, 12), line, fill=(255, 255, 255, 255), font=font)
        p = os.path.join(temp_dir, f"kw_pin_{i}.png")
        img.save(p, "PNG")
        paths.append(p)
    if not paths:
        return False
    t0 = max(4.0, min(18.0, duration * 0.06))
    t1 = max(t0 + 2.4, min(duration - 4.0, duration * 0.42))
    pin_x = max(8, int(overlay_x + strip_w // 2 - (min(680, max(320, strip_w + 80)) // 2)))
    pin_y = max(80, int(220))
    cmd = ["ffmpeg", "-y", "-i", video_path]
    for p in paths:
        cmd += ["-i", p]
    if len(paths) == 1:
        fc = (
            f"[1:v]format=rgba,colorchannelmixer=aa=0.92[p1];"
            f"[0:v][p1]overlay=x={pin_x}:y={pin_y}:enable='between(t,{t0:.3f},{t0+2.8:.3f})'[v]"
        )
    else:
        # enable= 表达式必须在引号内闭合，输出标签 [v] 在引号外（否则 ffmpeg 会把 [v] 吃进表达式）
        fc = (
            f"[1:v]format=rgba,colorchannelmixer=aa=0.92[p1];"
            f"[2:v]format=rgba,colorchannelmixer=aa=0.92[p2];"
            f"[0:v][p1]overlay=x={pin_x}:y={pin_y}:enable='between(t,{t0:.3f},{t0+2.8:.3f})'[v1];"
            f"[v1][p2]overlay=x={pin_x}:y={pin_y+58}:enable='between(t,{t1:.3f},{t1+2.8:.3f})'[v]"
        )
    cmd += [
        "-filter_complex",
        fc,
        "-map",
        "[v]",
        "-map",
        "0:a",
        "-c:v",
        "libx264",
        "-preset",
        "fast",
        "-crf",
        "22",
        "-c:a",
        "copy",
        output_path,
    ]
    r = subprocess.run(cmd, capture_output=True, text=True)
    return r.returncode == 0 and os.path.exists(output_path)


def improve_subtitle_punctuation(text: str) -> str:
    """为字幕句子补充标点，让意思更清晰。
    
    规则：
    1. 疑问句（含疑问词）加问号
    2. 感叹、强调语气加感叹号
    3. 普通陈述句末加句号（如果长度 >= 5）
    4. 修正多余标点
    全程先走繁体→简体（与成片规范一致）。
    """
    t = _to_simplified((text or "").strip())
    if not t:
        return t
    # 末尾已有标点则不重复加
    if t and t[-1] in '，。？！,.:!?；':
        return apply_platform_safety(_collapse_cjk_interchar_spaces(_to_simplified(t)))
    # 疑问词检测
    question_words = ('吗', '吧', '呢', '么', '嘛', '什么', '怎么', '为什么',
                      '哪', '哪里', '谁', '几', '多少', '是否', '可以吗', '对吗')
    is_question = any(t.endswith(w) for w in question_words) or '?' in t or '？' in t
    # 感叹语气
    exclaim_patterns = ('太', '好', '真', '完全', '绝对', '必须', '一定', '非常', '超级')
    is_exclaim = any(t.startswith(p) for p in exclaim_patterns) and len(t) >= 6
    # 加标点
    if is_question:
        t = t + '？'
    elif is_exclaim:
        t = t + '！'
    elif len(t) >= 5:
        t = t + '。'
    return apply_platform_safety(_collapse_cjk_interchar_spaces(_to_simplified(t)))

def _detect_clip_pts_offset(clip_path: str) -> float:
    """探测切片实际起始 PTS（秒），用于补偿 -ss input seeking 的关键帧偏移。
    
    batch_clip 用 -ss before -i（input seeking），FFmpeg 会 seek 到最近关键帧，
    实际起始帧可能比请求的 start_time 早 0~3 秒。探测这个偏移量，字幕做相应延迟。
    """
    try:
        r = subprocess.run(
            ['ffprobe', '-v', 'error', '-select_streams', 'v:0',
             '-show_entries', 'frame=pts_time', '-read_intervals', '%+#1',
             '-of', 'csv=p=0', clip_path],
            capture_output=True, text=True, timeout=10
        )
        if r.returncode == 0 and r.stdout.strip():
            first_pts = float(r.stdout.strip().splitlines()[0])
            return first_pts  # 通常是 0 或接近 0
    except Exception:
        pass
    return 0.0


def _is_noise_line(text: str) -> bool:
    """检测是否为噪声行（单字母、重复符号、ASR幻觉等）"""
    if not text:
        return True
    stripped = text.strip()
    # 单字母（L、A、B 等 ASR 幻觉）
    if len(stripped) <= 2 and all(c.isalpha() or c in '…、。，' for c in stripped):
        return True
    # 全是相同字符
    if len(set(stripped)) == 1 and len(stripped) >= 3:
        return True
    # 纯 ASR 幻觉词
    NOISE_TOKENS = {'Agent', 'agent', 'L', 'B', 'A', 'OK', 'ok',
                    '...',  '……', '嗯嗯嗯', '啊啊', '哈哈哈',
                    '呃呃', 'hmm', 'Hmm', 'Um', 'Uh'}
    if stripped in NOISE_TOKENS:
        return True
    return False


def _improve_subtitle_text(text: str) -> str:
    """字幕文字质量提升：纠错 + 上下文通畅 + 违禁词替换"""
    if not text:
        return text
    # 繁转简
    t = _to_simplified(text.strip())
    # 错词修正（按词典长度降序，避免短词覆盖长词）
    for w, c in sorted(CORRECTIONS.items(), key=lambda x: len(x[0]), reverse=True):
        t = t.replace(w, c)
    # 违禁词替换
    for w, c in PLATFORM_VIOLATIONS.items():
        t = t.replace(w, c)
    # 清理语助词
    t = clean_filler_words(t)
    # 去多余空格
    t = re.sub(r'\s+', ' ', t).strip()
    # 末尾加句号让阅读更顺畅（如果没有标点的话）
    END_PUNCTS = set('。！？…，')
    if t and t[-1] not in END_PUNCTS and len(t) >= 6:
        t += '。'
    return t


def _detect_word_level_srt(srt_path: str) -> bool:
    """检测 SRT 是否为 whisper word-level 输出（每条时长 <= 1.0s 且文字极短）。"""
    try:
        with open(srt_path, 'r', encoding='utf-8') as f:
            content = f.read()
        blocks = [b.strip() for b in content.strip().split('\n\n') if b.strip()]
        if len(blocks) < 20:
            return False
        short = 0
        for b in blocks[:60]:
            lines = b.splitlines()
            if len(lines) < 3:
                continue
            text = ' '.join(lines[2:]).strip()
            m = re.match(r'\d{2}:\d{2}:\d{2},\d{3} --> (\d{2}:\d{2}:\d{2},\d{3})', lines[1])
            if m and len(text) <= 6 and not ' ' in text:
                short += 1
        return short >= 25  # 大多数条目都是单词/单字
    except Exception:
        return False


def parse_srt_for_clip(srt_path, start_sec, end_sec, delay_sec=None):
    """解析SRT，提取指定时间段的字幕。

    优化：
    1. 字幕延迟补偿（delay_sec）：已导出切片默认 0；仅音画 PTS 错位时用较小正值
    2. 噪声行过滤：去掉单字母 L / Agent 等 ASR 幻觉行
    3. 文字质量提升：纠错 + 违禁词替换 + 通畅度修正
    4. whisper word-level SRT 自动识别：把单字/词条目先聚合成完整句，再用词时间轴做逐词显示
    5. 合并过短字幕：相邻 <1.5s 且总长 <28字自动合并，减少闪烁
    6. 最小显示时长：每条至少 1.5s，避免一闪而过
    """
    if delay_sec is None:
        delay_sec = SUBTITLE_DELAY_SEC

    with open(srt_path, 'r', encoding='utf-8') as f:
        content = f.read()

    pattern = r'(\d+)\n(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})\n(.*?)(?=\n\n|\Z)'
    matches = re.findall(pattern, content, re.DOTALL)

    def time_to_sec(t):
        t = t.replace(',', '.')
        parts = t.split(':')
        return int(parts[0]) * 3600 + int(parts[1]) * 60 + float(parts[2])

    # --- word-level SRT：聚合后附带词时间轴 ---
    is_word_level = _detect_word_level_srt(srt_path)
    if is_word_level:
        # 收集时间窗口内的所有单词条目
        word_entries = []
        for match in matches:
            ws = time_to_sec(match[1])
            we = time_to_sec(match[2])
            text = _to_simplified(match[3].strip())
            if _is_noise_line(text):
                continue
            if we > start_sec and ws < end_sec + 2:
                word_entries.append({
                    'abs_start': ws,
                    'abs_end': we,
                    'word': text,
                })

        # 将连续词按句子边界聚合（间隔 > 0.7s 切句）
        SENT_GAP = 0.7
        MAX_SENT_CHARS = 22
        sentences = []
        cur_words = []
        for w in word_entries:
            if cur_words:
                gap = w['abs_start'] - cur_words[-1]['abs_end']
                cur_len = sum(len(x['word']) for x in cur_words) + len(w['word'])
                if gap > SENT_GAP or cur_len > MAX_SENT_CHARS:
                    sentences.append(cur_words)
                    cur_words = []
            cur_words.append(w)
        if cur_words:
            sentences.append(cur_words)

        # 每句生成一条带词时间轴的字幕
        result_subs = []
        for sent_words in sentences:
            full_text = ''.join(x['word'] for x in sent_words)
            improved = _improve_subtitle_text(full_text)
            if not improved or len(improved) < 2:
                continue
            rel_start = max(0, sent_words[0]['abs_start'] - start_sec + delay_sec)
            rel_end   = sent_words[-1]['abs_end'] - start_sec + delay_sec
            if rel_start >= rel_end:
                rel_end = rel_start + max(1.5, len(improved) * 0.12)
            result_subs.append({
                'start': rel_start,
                'end': rel_end,
                'text': improved,
                'word_times': [
                    {
                        'word': w['word'],
                        'start': max(0, w['abs_start'] - start_sec + delay_sec),
                        'end':   w['abs_end']   - start_sec + delay_sec,
                    }
                    for w in sent_words
                ],
            })
        return result_subs

    raw_subs = []
    for match in matches:
        sub_start = time_to_sec(match[1])
        sub_end   = time_to_sec(match[2])
        text = _to_simplified(match[3].strip())

        # 噪声行提前过滤
        if _is_noise_line(text):
            continue

        if sub_end > start_sec and sub_start < end_sec + 2:
            rel_start = max(0, sub_start - start_sec + delay_sec)
            rel_end   = sub_end - start_sec + delay_sec

            improved = _improve_subtitle_text(text)
            if improved and len(improved) > 1:
                raw_subs.append({
                    'start': max(0, rel_start),
                    'end':   max(rel_start + 0.5, rel_end),
                    'text':  improved,
                })

    # 合并过短的连续字幕（<1.5s 且总长 <28字），让每条有足够阅读时间
    MIN_DISPLAY = 1.5
    merged = []
    i = 0
    while i < len(raw_subs):
        cur = dict(raw_subs[i])
        dur = cur['end'] - cur['start']
        while dur < MIN_DISPLAY and i + 1 < len(raw_subs):
            nxt = raw_subs[i + 1]
            gap = nxt['start'] - cur['end']
            # 去掉句尾句号再合并
            base_text = cur['text'].rstrip('。！？，')
            combined  = base_text + '，' + nxt['text']
            if gap <= 0.6 and len(combined) <= 28:
                cur['end']  = nxt['end']
                cur['text'] = combined
                dur = cur['end'] - cur['start']
                i += 1
            else:
                break
        if cur['end'] - cur['start'] < MIN_DISPLAY:
            cur['end'] = cur['start'] + MIN_DISPLAY
        merged.append(cur)
        i += 1

    return merged


def _filter_relevant_subtitles(subtitles):
    """只过滤整句为规则/模板的条目，保留所有对白与重复句以便字幕连续"""
    out = []
    for sub in subtitles:
        text = (sub.get("text") or "").strip()
        if len(text) < 2:
            continue
        if text in SKIP_SUBTITLE_PHRASES:
            continue
        out.append(sub)
    return out


def _is_bad_transcript(subtitles, min_lines=15, max_repeat_ratio=0.85):
    """检测是否为异常转录（如整篇同一句话）。

    只对“较长、信息量更高”的字幕做重复检测，避免正常口语里大量
    “对/嗯/是/那”这类短句把整段误判成坏转录。
    """
    if not subtitles or len(subtitles) < min_lines:
        return False

    from collections import Counter

    texts = [(s.get("text") or "").strip() for s in subtitles]
    meaningful = [t for t in texts if len(t) >= 4]
    if len(meaningful) < max(6, min_lines // 2):
        return False

    counter = Counter(meaningful)
    most_common = counter.most_common(1)
    if not most_common:
        return False

    _, count = most_common[0]
    repeat_ratio = count / max(1, len(meaningful))
    unique_ratio = len(counter) / max(1, len(meaningful))

    # 真正的异常转录一般表现为：大部分较长字幕都完全相同，且去重后种类极少。
    return repeat_ratio >= max_repeat_ratio and unique_ratio <= 0.2


def _sec_to_srt_time(sec):
    """秒数转为 SRT 时间格式 HH:MM:SS,mmm"""
    h = int(sec) // 3600
    m = (int(sec) % 3600) // 60
    s = int(sec) % 60
    ms = int((sec - int(sec)) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def write_clip_srt(srt_path, subtitles, cover_duration, subs_after_cover_sec=SUBS_START_AFTER_COVER_SEC):
    """写出用于烧录的 SRT（仅保留封面结束后的字幕，时间已相对片段）"""
    safe_start = cover_duration + subs_after_cover_sec + 0.05
    lines = []
    idx = 1
    for sub in subtitles:
        start, end = sub['start'], sub['end']
        if end <= safe_start:
            continue
        start = max(start, safe_start)
        text = (sub.get('text') or '').strip().replace('\n', ' ')
        if not text:
            continue
        lines.append(str(idx))
        lines.append(f"{_sec_to_srt_time(start)} --> {_sec_to_srt_time(end)}")
        lines.append(text)
        lines.append("")
        idx += 1
    if not lines:
        return None
    with open(srt_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))
    return srt_path


def _is_mostly_chinese(text):
    if not text or not isinstance(text, str):
        return False
    chinese = sum(1 for c in text if "\u4e00" <= c <= "\u9fff")
    return chinese / max(1, len(text.strip())) > 0.3


def _translate_to_chinese(text):
    """Ollama 翻译英文为中文"""
    if not text or _is_mostly_chinese(text):
        return text
    try:
        import requests
        r = requests.post(
            "http://localhost:11434/api/generate",
            json={
                "model": "qwen2.5:1.5b",
                "prompt": f"将以下翻译成简体中文，只输出中文：\n{text[:150]}",
                "stream": False,
                "options": {"temperature": 0.1, "num_predict": 80},
            },
            timeout=15,
        )
        if r.status_code == 200:
            out = r.json().get("response", "").strip().split("\n")[0][:80]
            if out:
                return out
    except Exception:
        pass
    return text


def detect_burned_subs(video_path, num_samples=2):
    """检测视频是否已有烧录字幕/图片（OCR 采样底部区域）"""
    try:
        import pytesseract
        pytesseract.get_tesseract_version()
    except Exception:
        return False  # 无 tesseract 则假定无字幕，执行烧录
    try:
        duration = get_video_info(video_path).get("duration", 0)
        if duration < 1:
            return False
        for i in range(num_samples):
            t = duration * (0.25 + 0.25 * i)
            frame = tempfile.mktemp(suffix=".jpg")
            subprocess.run([
                "ffmpeg", "-y", "-ss", str(t), "-i", video_path,
                "-vframes", "1", "-q:v", "2", frame
            ], capture_output=True)
            if os.path.exists(frame):
                try:
                    img = Image.open(frame)
                    w, h = img.size
                    crop = img.crop((0, int(h * 0.65), w, h))  # 底部 35%
                    text = pytesseract.image_to_string(crop, lang="chi_sim+eng")
                    os.remove(frame)
                    if text and len(text.strip()) > 15:
                        return True
                except Exception:
                    if os.path.exists(frame):
                        os.remove(frame)
    except Exception:
        pass
    return False


def get_video_info(video_path):
    """获取视频信息"""
    cmd = [
        'ffprobe', '-v', 'error',
        '-select_streams', 'v:0',
        '-show_entries', 'stream=width,height,duration',
        '-of', 'json', video_path
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    info = json.loads(result.stdout or "{}")
    streams = info.get("streams") or []
    if not streams:
        raise ValueError(f"ffprobe 无视频流: {video_path}")
    stream = streams[0]
    
    # 获取时长
    cmd2 = [
        'ffprobe', '-v', 'error',
        '-show_entries', 'format=duration',
        '-of', 'json', video_path
    ]
    result2 = subprocess.run(cmd2, capture_output=True, text=True)
    format_info = json.loads(result2.stdout)
    
    return {
        'width': int(stream.get('width', 570)),
        'height': int(stream.get('height', 1080)),
        'duration': float(format_info.get('format', {}).get('duration', 0))
    }

# ============ 封面生成 ============

def get_cover_font(size):
    """封面专用字体（更好看）"""
    for path in COVER_FONT_PRIORITY + FONT_PRIORITY + [FONT_BOLD]:
        if path and os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                continue
    return ImageFont.load_default()


def _draw_vertical_gradient(draw, width, height, top_rgb, bottom_rgb, alpha=255):
    """绘制竖屏封面用深色渐变背景；alpha<255 时为半透明质感"""
    for y in range(height):
        t = y / max(height - 1, 1)
        r = int(top_rgb[0] + (bottom_rgb[0] - top_rgb[0]) * t)
        g = int(top_rgb[1] + (bottom_rgb[1] - top_rgb[1]) * t)
        b = int(top_rgb[2] + (bottom_rgb[2] - top_rgb[2]) * t)
        draw.rectangle([0, y, width, y + 1], fill=(r, g, b, alpha))


def _strip_cover_number_prefix(text):
    """封面标题不显示序号：去掉开头的 1. 2. 01、切片1、123 等"""
    if not text:
        return text
    text = re.sub(r'^\s*切片\s*\d+\s*[\.\s、：:]*\s*', '', text)
    text = re.sub(r'^\s*\d+[\.\s、：:]*\s*', '', text)
    return text.strip()


def create_cover_image(
    hook_text,
    width,
    height,
    output_path,
    video_path=None,
    cover_extract_vf=None,
):
    """创建封面贴片。竖条：视频底 + 冷色渐变 + 底栏渐隐 + 顶栏 Soul 绿与细金线 + 内框 + 柔阴影标题 + 左上角标。

    cover_extract_vf：竖条模式时与成片最终 `-vf` 一致（如 crop 竖条），从横版切片中截取与成片同取景的底图；不传则仍用整幅帧拉伸（易与成片不一致，仅兼容旧行为）。
    """
    hook_text = _to_simplified(str(hook_text or "").strip())
    hook_text = _strip_cover_number_prefix(hook_text)
    if not hook_text:
        hook_text = "精彩切片"
    style = STYLE['cover']
    hook_style = STYLE['hook']
    is_vertical = _is_vertical_strip_canvas(width, height)
    
    if is_vertical:
        # 竖屏成片：底层为「清晰帧 + 少量模糊混入（默认约 10%）」+ 渐变，避免全糊看不清界面
        base = Image.new("RGBA", (width, height), (*VERTICAL_COVER_TOP, 255))
        if video_path and os.path.exists(video_path):
            temp_frame = output_path.replace(".png", "_vframe.jpg")
            vf = (cover_extract_vf or "").strip()
            cmd = [
                "ffmpeg",
                "-y",
                "-ss",
                "0.35",
                "-i",
                video_path,
            ]
            if vf:
                cmd.extend(["-vf", vf])
            cmd.extend(["-vframes", "1", "-q:v", "3", temp_frame])
            subprocess.run(cmd, capture_output=True)
            if os.path.exists(temp_frame):
                try:
                    sharp = Image.open(temp_frame).convert("RGBA")
                    if sharp.size != (width, height):
                        sharp = sharp.resize(
                            (width, height), Image.Resampling.LANCZOS
                        )
                    mix = float(style.get("bg_blur_mix", 0.10))
                    r = float(style.get("bg_blur_radius", 14))
                    if mix > 0.001:
                        blurred = sharp.filter(ImageFilter.GaussianBlur(radius=r))
                        bf = Image.blend(sharp, blurred, mix)
                    else:
                        bf = sharp
                    da = int(style.get("dim_alpha", 88))
                    dim = Image.new("RGBA", (width, height), (0, 0, 0, da))
                    base = Image.alpha_composite(bf, dim)
                finally:
                    try:
                        os.remove(temp_frame)
                    except OSError:
                        pass
        grad = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        gdraw = ImageDraw.Draw(grad)
        _draw_vertical_gradient(
            gdraw, width, height, VERTICAL_COVER_TOP, VERTICAL_COVER_BOTTOM, alpha=VERTICAL_COVER_ALPHA
        )
        img = Image.alpha_composite(base, grad)
        overlay = Image.new("RGBA", (width, height), (0, 0, 0, 36))
        img = Image.alpha_composite(img, overlay)
        img = _apply_cover_bottom_vignette(
            img,
            float(style.get("vignette_from_ratio", 0.46)),
            int(style.get("vignette_max_alpha", 138)),
        )
        draw = ImageDraw.Draw(img)
        apx = int(style.get("top_accent_px", 6))
        draw.rectangle([0, 0, width, apx], fill=(*SOUL_GREEN, 255))
        if style.get("gold_hairline", True):
            draw.rectangle([0, apx, width, apx + 1], fill=(*COVER_ACCENT_GOLD, 105))
        fa = int(style.get("frame_inset_alpha", 42))
        if fa > 0:
            draw.rectangle(
                [2, 2, width - 3, height - 3],
                outline=(255, 255, 255, fa),
                width=1,
            )
    else:
        # 横版：清晰帧 + 少量模糊混入（与竖条封面一致）
        if video_path and os.path.exists(video_path):
            temp_frame = output_path.replace('.png', '_frame.jpg')
            subprocess.run([
                'ffmpeg', '-y', '-ss', '1', '-i', video_path,
                '-vframes', '1', '-q:v', '2', temp_frame
            ], capture_output=True)
            if os.path.exists(temp_frame):
                sharp = Image.open(temp_frame).resize((width, height)).convert('RGBA')
                mix = float(style.get("bg_blur_mix", 0.10))
                r = float(style.get("bg_blur_radius", 14))
                if mix > 0.001:
                    blurred = sharp.filter(ImageFilter.GaussianBlur(radius=r))
                    bg = Image.blend(sharp, blurred, mix)
                else:
                    bg = sharp
                os.remove(temp_frame)
            else:
                bg = Image.new('RGB', (width, height), (25, 35, 30))
        else:
            bg = Image.new('RGB', (width, height), (25, 35, 30))
        overlay = Image.new('RGBA', (width, height), (0, 25, 15, style['overlay_alpha']))
        img = bg.convert('RGBA')
        img = Image.alpha_composite(img, overlay)
        draw = ImageDraw.Draw(img)
    
    # 横版保留原「上下 Soul 绿条」；竖屏已用顶栏 + 渐隐，不再叠多条绿边
    if not is_vertical:
        for i in range(3):
            alpha = 180 - i * 50
            draw.rectangle([0, i * 3, width, i * 3 + 2], fill=(*SOUL_GREEN, alpha))
        for i in range(3):
            alpha = 180 - i * 50
            draw.rectangle([0, height - i * 3 - 2, width, height - i * 3], fill=(*SOUL_GREEN, alpha))

    apx_v = int(style.get("top_accent_px", 6)) if is_vertical else 0
    hair_v = (1 if style.get("gold_hairline", True) else 0) if is_vertical else 0
    top_bar_h = apx_v + hair_v
    if is_vertical:
        logo_x, logo_y = 30, max(34, top_bar_h + 18)
        logo_r = 21
        draw.ellipse(
            [
                logo_x - logo_r - 2,
                logo_y - logo_r - 2,
                logo_x + logo_r + 2,
                logo_y + logo_r + 2,
            ],
            outline=(255, 255, 255, 100),
            width=2,
        )
        draw.ellipse(
            [logo_x - logo_r, logo_y - logo_r, logo_x + logo_r, logo_y + logo_r],
            fill=SOUL_GREEN,
            outline=(255, 255, 255, 165),
            width=1,
        )
    else:
        logo_x, logo_y = 28, 28
        logo_r = 20
        draw.ellipse(
            [logo_x - logo_r, logo_y - logo_r, logo_x + logo_r, logo_y + logo_r],
            fill=SOUL_GREEN,
            outline=(255, 255, 255),
        )
    try:
        logo_font = get_cover_font(27 if is_vertical else 26)
        sx = logo_x - (6 if is_vertical else 5)
        sy = logo_y - (13 if is_vertical else 12)
        draw.text((sx, sy), "S", font=logo_font, fill=(255, 255, 255))
    except Exception:
        pass
    
    # 标题文字：竖屏时严格限制在 padding 内，多行居中，绝不超出界面
    if is_vertical:
        max_text_width = width - 2 * VERTICAL_COVER_PADDING
        cover_font_size = 50
        font = get_cover_font(cover_font_size)
        vfill = hook_style.get("vertical_fill", (252, 252, 250))
        lines = []
        for _ in range(20):
            current_line = ""
            lines = []  # 本轮换行结果
            for char in hook_text:
                test_line = current_line + char
                test_w, _ = get_text_size(draw, test_line, font)
                if test_w <= max_text_width:
                    current_line = test_line
                else:
                    if current_line:
                        lines.append(current_line)
                    current_line = char
            if current_line:
                lines.append(current_line)
            if cover_font_size <= 28 or len(lines) <= 6:
                break
            cover_font_size -= 2
            font = get_cover_font(cover_font_size)
        line_height = cover_font_size + 14
        total_height = len(lines) * line_height
        start_y = (height - total_height) // 2
        for i, line in enumerate(lines):
            line_w, line_h = get_text_size(draw, line, font)
            x = (width - line_w) // 2
            x = max(VERTICAL_COVER_PADDING, min(width - VERTICAL_COVER_PADDING - line_w, x))
            y = start_y + i * line_height
            draw_text_with_soft_shadow(draw, (x, y), line, font, vfill)
    else:
        cover_font_size = hook_style['font_size']
        font = get_cover_font(cover_font_size)
        max_width = width - 80
        lines = []
        current_line = ""
        for char in hook_text:
            test_line = current_line + char
            test_w, _ = get_text_size(draw, test_line, font)
            if test_w <= max_width:
                current_line = test_line
            else:
                if current_line:
                    lines.append(current_line)
                current_line = char
        if current_line:
            lines.append(current_line)
        line_height = cover_font_size + 12
        total_height = len(lines) * line_height
        start_y = (height - total_height) // 2
        for i, line in enumerate(lines):
            line_w, line_h = get_text_size(draw, line, font)
            x = (width - line_w) // 2
            y = start_y + i * line_height
            draw_text_with_outline(
                draw, (x, y), line, font,
                hook_style['color'],
                hook_style['outline_color'],
                hook_style['outline_width']
            )
    
    img.save(output_path, 'PNG')
    return output_path

# ============ 字幕图片生成 ============

def create_subtitle_image(text, width, height, output_path):
    """创建字幕图片（纠错+关键词加大加亮）。竖条画布时居中；全幅横版时偏下居中（为 --vertical-fit-full）。"""
    style = STYLE['subtitle']
    # 强制简体：字幕烧录最后一关，无论上游路径如何，所有繁体一律转简体
    text = _to_simplified(text or "")
    # 成片前再跑一遍纠错/标点，与 parse 阶段互补（逐字帧也走本函数）
    text = _normalize_subtitle_text_strict(
        improve_subtitle_punctuation(_improve_subtitle_text(text))
    )
    if not (text or "").strip():
        img = Image.new('RGBA', (width, height), (0, 0, 0, 0))
        img.save(output_path, 'PNG')
        return output_path

    img = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    base_size = style['font_size']
    if _is_vertical_strip_canvas(width, height):
        base_size = min(base_size, 42)
    elif height == 1080 and width >= 1280:
        base_size = min(max(base_size, 46), 56)
    font = get_font_subtitle(base_size)
    text_w, text_h = get_text_size(draw, text, font)
    margin_x = 120 if width >= 1280 else 80
    while text_w > width - margin_x and base_size > 22:
        base_size -= 2
        font = get_font_subtitle(base_size)
        text_w, text_h = get_text_size(draw, text, font)
    kw_size = base_size + style.get('keyword_size_add', 0)
    kw_font = get_font_subtitle(kw_size) if kw_size != base_size else font
    
    base_x = (width - text_w) // 2
    if _is_vertical_strip_canvas(width, height):
        pad = 24
        base_x = max(pad, min(width - pad - text_w, base_x))
        base_y = (height - text_h) // 2
    elif height == 1080 and width >= 1280:
        pad = 40
        base_x = max(pad, min(width - pad - text_w, base_x))
        base_y = height - text_h - 100
    else:
        base_y = (height - text_h) // 2
    
    # 背景条（bg_color 为 None 时跳过，纯描边模式）
    fill = style.get('bg_color')
    if fill:
        pad_v = int(style.get('bg_padding_v', 20))
        pad_h = int(style.get('bg_padding_h', 18))
        bg_rect = [
            max(0, base_x - pad_h),
            max(0, base_y - pad_v),
            min(width, base_x + text_w + pad_h),
            min(height, base_y + text_h + pad_v),
        ]
        if style.get('bg_full_strip') and _is_vertical_strip_canvas(width, height):
            sm = int(style.get('bg_side_margin', 12))
            bg_rect[0] = sm
            bg_rect[2] = width - sm
        bg_layer = Image.new('RGBA', (width, height), (0, 0, 0, 0))
        bg_draw = ImageDraw.Draw(bg_layer)
        r = int(style.get('bg_corner_radius', 14))
        outline = style.get('border_color')
        ow = int(style.get('border_width', 0) or 0)
        if outline and ow > 0:
            bg_draw.rounded_rectangle(bg_rect, radius=r, fill=fill, outline=outline[:3], width=ow)
        else:
            bg_draw.rounded_rectangle(bg_rect, radius=r, fill=fill)
        sa = int(style.get('shadow_alpha', 0))
        if sa > 0:
            shadow_rect = [bg_rect[0], min(height, bg_rect[3] + 8), bg_rect[2], min(height, bg_rect[3] + 16)]
            bg_draw.rounded_rectangle(shadow_rect, radius=r, fill=(0, 0, 0, sa))
        ga = int(style.get('gloss_alpha', 0))
        if ga > 0:
            gloss_h = max(8, int((bg_rect[3] - bg_rect[1]) * 0.22))
            gloss_rect = [bg_rect[0] + 2, bg_rect[1] + 2, bg_rect[2] - 2, min(bg_rect[1] + gloss_h, bg_rect[3] - 2)]
            bg_draw.rounded_rectangle(gloss_rect, radius=max(8, r - 4), fill=(255, 255, 255, ga))
        img = Image.alpha_composite(img, bg_layer)
        draw = ImageDraw.Draw(img)
    
    # 识别关键词位置（按长度降序，长词优先避免短词截断）
    highlights = []
    for keyword in sorted(KEYWORDS, key=len, reverse=True):
        start = 0
        while True:
            pos = text.find(keyword, start)
            if pos == -1:
                break
            # 避免重叠
            overlap = any(s <= pos < e or s < pos + len(keyword) <= e for s, e in highlights)
            if not overlap:
                highlights.append((pos, pos + len(keyword)))
            start = pos + 1
    highlights = sorted(highlights, key=lambda x: x[0])
    
    # 逐字符绘制
    current_x = base_x
    char_idx = 0
    
    while char_idx < len(text):
        # 检查是否在关键词中
        in_keyword = False
        keyword_end = char_idx
        for start, end in highlights:
            if start <= char_idx < end:
                in_keyword = True
                keyword_end = end
                break
        
        if in_keyword:
            # 关键词：亮金黄字；描边宽度用 keyword_outline_width，默认与正文一致（可为 0 无边框）
            keyword_text = text[char_idx:keyword_end]
            kw_outline = style.get('keyword_outline', (60, 40, 0))
            kw_ow = int(style.get('keyword_outline_width', style.get('outline_width', 0)) or 0)
            draw_text_with_outline(
                draw, (current_x, base_y), keyword_text, kw_font,
                style['keyword_color'],
                kw_outline,
                kw_ow
            )
            kw_w, _ = get_text_size(draw, keyword_text, kw_font)
            current_x += kw_w
            char_idx = keyword_end
        else:
            # 绘制单个字符
            char = text[char_idx]
            draw_text_with_outline(
                draw, (current_x, base_y), char, font,
                style['color'],
                style['outline_color'],
                style['outline_width']
            )
            char_w, _ = get_text_size(draw, char, font)
            current_x += char_w
            char_idx += 1
    
    img.save(output_path, 'PNG')
    return output_path


def append_cta_ending_subtitle(
    sub_images,
    highlight_info,
    temp_dir,
    out_w,
    out_h,
    duration,
    subtitle_overlay_start,
):
    """片尾 CTA：叠加在最后一条真实字幕的结尾处（有声段），不延伸到静音区域。

    锚点：取 sub_images 里已有字幕的最大 end 时间（即最后一条语音字幕结束时间）作为
    CTA 的 end，而不是视频总时长 duration。这样 CTA 永远出现在有声音的帧上，
    不会产生「字幕悬在无声段」的空洞感。
    """
    cta = (highlight_info.get("cta_ending") or "").strip()
    if not cta:
        return sub_images
    cta = apply_platform_safety(_to_simplified(cta))
    if not cta:
        return sub_images
    dur = float(duration)

    # 找最后一条真实字幕的结尾时间作为 CTA 的锚点
    real_subs = [s for s in sub_images if "sub_cta_ending" not in s.get("path", "")]
    if real_subs:
        last_sub_end = max(float(s["end"]) for s in real_subs)
        # CTA 结束时间 = 最后一条字幕结束，不超过视频时长
        anchor_end = min(last_sub_end, dur)
    else:
        anchor_end = dur

    if anchor_end < CTA_END_MIN_SEC + float(subtitle_overlay_start) * 0.5:
        return sub_images

    span = min(CTA_END_MAX_SEC, max(CTA_END_MIN_SEC, anchor_end * 0.08))
    cta_start = max(float(subtitle_overlay_start), anchor_end - span)
    if cta_start >= anchor_end - 0.15:
        cta_start = max(0.0, anchor_end - CTA_END_MIN_SEC)

    img_path = os.path.join(temp_dir, "sub_cta_ending.png")
    create_subtitle_image(cta, out_w, out_h, img_path)
    sub_images.append({"path": img_path, "start": cta_start, "end": anchor_end})
    sub_images.sort(key=lambda x: (float(x["start"]), float(x["end"])))
    return sub_images


# ============ 视频处理 ============

def detect_silence(video_path, threshold=-40, min_duration=0.5):
    """检测静音段落"""
    cmd = [
        'ffmpeg', '-i', video_path,
        '-af', f'silencedetect=noise={threshold}dB:d={min_duration}',
        '-f', 'null', '-'
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    
    silences = []
    lines = result.stderr.split('\n')
    
    silence_start = None
    for line in lines:
        if 'silence_start:' in line:
            match = re.search(r'silence_start: ([\d.]+)', line)
            if match:
                silence_start = float(match.group(1))
        elif 'silence_end:' in line and silence_start is not None:
            match = re.search(r'silence_end: ([\d.]+)', line)
            if match:
                silence_end = float(match.group(1))
                silences.append((silence_start, silence_end))
                silence_start = None
    
    return silences


def filter_silences_keep_tail_audio(silences, duration, tail_sec=None):
    """片尾 tail_sec 内不把静音段计入「可切除」区间，避免成片最后几秒被剪成完全无声。

    silencedetect 可能把收尾人声误判为静音；或长静音延伸到片尾时，原先会把尾段整块剪掉。
    本函数在 [duration-tail_sec, duration] 内丢弃/截断静音区间，使 kept_segments 保留该段原音轨。
    """
    if tail_sec is None:
        tail_sec = float(SILENCE_TAIL_PRESERVE_SEC)
    duration = float(duration)
    if duration <= 0 or tail_sec <= 0:
        return silences
    cut = max(0.0, duration - tail_sec)
    out = []
    for s, e in sorted(silences):
        s, e = float(s), float(e)
        if s >= cut:
            continue
        if e <= cut:
            out.append((s, e))
        else:
            e2 = min(e, cut)
            if e2 - s > 0.08:
                out.append((s, e2))
    return out


def create_silence_filter(silences, duration, margin=0.1):
    """创建去除静音的filter表达式"""
    if not silences:
        return None
    
    # 构建保留段落
    segments = []
    last_end = 0
    
    for start, end in silences:
        # 保留静音前的内容
        if start > last_end + margin:
            segments.append((last_end, start - margin))
        last_end = end + margin
    
    # 保留最后一段
    if last_end < duration:
        segments.append((last_end, duration))
    
    if not segments:
        return None
    
    # 构建select filter
    selects = []
    for start, end in segments:
        selects.append(f"between(t,{start:.3f},{end:.3f})")
    
    return '+'.join(selects)


def kept_segments_from_silences(silences, duration, margin=0.1):
    """与 create_silence_filter 一致：返回保留播放的时间段列表 [(s,e), ...]。"""
    duration = float(duration)
    if not silences:
        return [(0.0, duration)]
    silences = sorted(silences)
    segments = []
    last_end = 0.0
    for start, end in silences:
        if start > last_end + margin:
            segments.append((last_end, start - margin))
        last_end = max(last_end, end + margin)
    if last_end < duration:
        segments.append((last_end, duration))
    if not segments:
        return [(0.0, duration)]
    return segments


def _subtitle_gap_intervals(subtitles, duration, min_gap_sec: float) -> list[tuple[float, float]]:
    """相邻字幕条之间的「空白段」，用于与 silencedetect 并集后一起剃掉。"""
    if not subtitles or min_gap_sec <= 0:
        return []
    dur = float(duration)
    subs = sorted(subtitles, key=lambda x: float(x.get("start", 0)))
    gaps: list[tuple[float, float]] = []
    head = float(subs[0].get("start", 0))
    if head >= min_gap_sec:
        gaps.append((0.0, head))
    for i in range(len(subs) - 1):
        a = float(subs[i].get("end", subs[i].get("start", 0)))
        b = float(subs[i + 1].get("start", 0))
        if b - a >= min_gap_sec:
            gaps.append((a, b))
    tail = float(subs[-1].get("end", 0))
    if dur - tail >= min_gap_sec:
        gaps.append((tail, dur))
    return gaps


def _merge_time_intervals(
    intervals: list[tuple[float, float]],
    join_eps: float = 0.03,
) -> list[tuple[float, float]]:
    """合并重叠或紧挨的时间段（用于音频静音 ∪ 字幕间隙）。"""
    cleaned = [(float(s), float(e)) for s, e in intervals if e > s + 1e-6]
    if not cleaned:
        return []
    cleaned.sort(key=lambda x: x[0])
    out: list[list[float]] = [[cleaned[0][0], cleaned[0][1]]]
    for s, e in cleaned[1:]:
        if s <= out[-1][1] + join_eps:
            out[-1][1] = max(out[-1][1], e)
        else:
            out.append([s, e])
    return [(a, b) for a, b in out]


def map_time_remove_silences(t, kept_segments):
    """原片时间 t（秒）→ 去掉静音后的新时间。"""
    t = float(t)
    acc = 0.0
    for s, e in kept_segments:
        if t <= s:
            return acc
        if t < e:
            return acc + (t - s)
        acc += (e - s)
    return acc


def remap_subtitles_after_trim(subtitles, kept_segments):
    """就地更新字幕 start/end 与 word_times。"""
    if not subtitles or not kept_segments:
        return subtitles
    for sub in subtitles:
        ns = map_time_remove_silences(sub["start"], kept_segments)
        ne = map_time_remove_silences(sub["end"], kept_segments)
        if ne <= ns + 0.05:
            ne = ns + 0.35
        sub["start"], sub["end"] = ns, ne
        wt = sub.get("word_times")
        if wt:
            for w in wt:
                ws = map_time_remove_silences(w["start"], kept_segments)
                we = map_time_remove_silences(w.get("end", w["start"]), kept_segments)
                w["start"] = ws
                w["end"] = max(we, ws + 0.02)
    return subtitles


def _valid_kept_segments(kept_segments, duration, min_dur=0.03):
    out = []
    duration = float(duration)
    for s, e in kept_segments:
        s = max(0.0, float(s))
        e = min(float(e), duration)
        if e - s >= min_dur:
            out.append((s, e))
    return out


def ffmpeg_trim_kept_segments(input_path, output_path, kept_segments, duration):
    """用 trim+atrim+concat 切除静音，音画同步。失败返回 False。"""
    segs = _valid_kept_segments(kept_segments, duration)
    if not segs:
        return False
    dur = float(duration)
    kept_total = sum(e - s for s, e in segs)
    if kept_total <= 0:
        return False
    # 几乎未剪：直接复制
    if kept_total >= dur - 0.08:
        try:
            shutil.copy(input_path, output_path)
            return True
        except OSError:
            return False

    n = len(segs)
    parts = []
    if n == 1:
        s, e = segs[0]
        d = e - s
        fc = (
            f"[0:v]trim=start={s}:duration={d},setpts=PTS-STARTPTS[outv];"
            f"[0:a]atrim=start={s}:duration={d},asetpts=PTS-STARTPTS[outa]"
        )
    else:
        for i, (s, e) in enumerate(segs):
            d = e - s
            parts.append(f"[0:v]trim=start={s}:duration={d},setpts=PTS-STARTPTS[v{i}]")
            parts.append(f"[0:a]atrim=start={s}:duration={d},asetpts=PTS-STARTPTS[a{i}]")
        vconcat = "".join(f"[v{i}]" for i in range(n))
        aconcat = "".join(f"[a{i}]" for i in range(n))
        parts.append(f"{vconcat}concat=n={n}:v=1:a=0[outv]")
        parts.append(f"{aconcat}concat=n={n}:v=0:a=1[outa]")
        fc = ";".join(parts)

    cmd = [
        "ffmpeg",
        "-y",
        "-i",
        input_path,
        "-filter_complex",
        fc,
        "-map",
        "[outv]",
        "-map",
        "[outa]",
        "-c:v",
        "libx264",
        "-preset",
        "fast",
        "-crf",
        "22",
        "-c:a",
        "aac",
        "-b:a",
        "192k",
        output_path,
    ]
    r = subprocess.run(cmd, capture_output=True, text=True)
    return r.returncode == 0 and os.path.exists(output_path)


def _parse_clip_index(filename: str) -> int:
    """从文件名解析切片序号。
    
    格式：prefix场次_序号_标题，如 soul119_01_xxx → 1，soul_01_xxx → 1。
    取所有 _数字_ 模式中最小的值（序号通常是 01/02，场次如 112/119 是大数）。
    避免把视频场次号误认为切片序号。
    """
    matches = re.findall(r'_(\d+)_', filename)
    if matches:
        return min(int(m) for m in matches)
    # 兜底：取文件名中最后一段数字
    m = re.search(r'(\d+)', filename)
    return int(m.group(1)) if m else 0


# 横屏单中屏：先按竖条塑形 crop，再左右 pad 到 16:9（整屏仅一条画面，非左右双视频拼屏）
HORIZONTAL_CENTER_PAD_VF = "pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=black"


def enhance_clip(clip_path, output_path, highlight_info, temp_dir, transcript_path, 
                 force_burn_subs=False, skip_subs=False, vertical=False,
                 crop_vf=None, overlay_x=None, typewriter_subs=False,
                 vertical_fit_full=False, trim_silence=True,
                 subtitle_extra_delay=0.0, use_stickers=True,
                 horizontal_center_pad=False,
                 strong_audio_clean=False, keyword_pins=False,
                 silence_noise_db=None, silence_min_duration=None, silence_trim_margin=None,
                 merge_subtitle_gap_silences=True):
    """增强单个切片。vertical=True 时输出竖条，宽由 --crop-vf 决定（原生包络常见 560～750×1080；旧 498 为两段裁或 scale）。
    vertical_fit_full：整幅 16:9 缩放入 498×1080 + 上下黑边。
    horizontal_center_pad：与竖条塑形相同链路（封面/字幕仍按竖条叠在横版上），最后输出 1920×1080，中间为裁切条、左右黑边。
    """
    
    print(f"  输入: {os.path.basename(clip_path)}", flush=True)
    
    video_info = get_video_info(clip_path)
    width, height = video_info['width'], video_info['height']
    duration = float(video_info['duration'])
    original_duration = duration
    working_clip = clip_path

    print(f"  分辨率: {width}x{height}, 时长: {duration:.1f}秒")
    
    # 封面文案：高光规则 — hook_3sec（吸睛）> question > title；文件名仍可用 --title-only 同步 Hook
    raw_hook = pick_cover_hook_text(highlight_info)
    if not raw_hook and clip_path:
        m = re.search(r"\d+[_\s]+(.+?)(?:_enhanced)?\.mp4$", os.path.basename(clip_path))
        if m:
            raw_hook = m.group(1).strip()
    hook_text = _normalize_title_for_display(raw_hook) or raw_hook or "精彩切片"
    hook_text = apply_platform_safety(hook_text)
    hook_text = _limit_cover_hook_display(hook_text) or hook_text
    cover_duration = STYLE['cover']['duration']
    subtitle_overlay_start = cover_duration + SUBS_START_AFTER_COVER_SEC
    
    # 竖屏：封面/字幕按解析出的竖条宽×1080 叠在横版上；全画面模式按原分辨率全屏叠加再整体缩放
    if vertical and vertical_fit_full:
        out_w, out_h = width, height
        vf_use = ""
        overlay_pos = "0:0"
        strip_overlay_x, strip_overlay_w = 0, width
    elif vertical:
        vf_use = (crop_vf or CROP_VF).strip()
        out_w, out_h = vertical_out_dimensions_from_vf(vf_use)
        ox = overlay_x
        if ox is None and crop_vf:
            ox = _overlay_x_from_crop_vf(crop_vf)
        if ox is None:
            ox = _overlay_x_from_crop_vf(vf_use)
        if ox is None:
            ox = OVERLAY_X
        overlay_pos = f"{int(ox)}:0"
        strip_overlay_x, strip_overlay_w = int(ox), int(out_w)
    else:
        out_w, out_h = width, height
        vf_use = CROP_VF
        overlay_pos = "0:0"
        strip_overlay_x, strip_overlay_w = 0, width
    
    # 1. 字幕解析（相对原切片时间轴；去静音后会整体平移时间）
    sub_images = []
    subtitles = []
    do_burn_subs = not skip_subs and (force_burn_subs or not detect_burned_subs(clip_path))
    if skip_subs:
        print(f"  ⊘ 跳过字幕烧录（--skip-subs）")
    elif not do_burn_subs:
        print(f"  ⊘ 跳过字幕烧录（检测到原片已有字幕/图片）")
    else:
        start_time = highlight_info.get('start_time', '00:00:00')
        try:
            if isinstance(start_time, (int, float)):
                start_sec = float(start_time)
            else:
                parts = str(start_time).strip().split(':')
                start_sec = int(parts[0]) * 3600 + int(parts[1]) * 60 + float(parts[2])
        except (IndexError, ValueError):
            start_sec = 0
        end_sec = start_sec + original_duration

        # 已导出切片：默认 delay=0。仅当音/视频首帧 PTS 明显不一致时小幅推迟字幕，贴人声。
        # subtitle_extra_delay：整场微调（秒），正数整体推迟字幕，用于个别素材仍略有偏差时手工对齐。
        actual_delay = float(SUBTITLE_DELAY_SEC) + float(subtitle_extra_delay or 0.0)
        try:
            pts_cmd = [
                "ffprobe", "-v", "quiet", "-select_streams", "v:0",
                "-show_entries", "frame=pts_time",
                "-read_intervals", "%+0.1",
                "-print_format", "csv=p=0",
                str(clip_path),
            ]
            pts_r = subprocess.run(pts_cmd, capture_output=True, text=True, timeout=10)
            audio_cmd = [
                "ffprobe", "-v", "quiet", "-select_streams", "a:0",
                "-show_entries", "frame=pts_time",
                "-read_intervals", "%+0.5",
                "-print_format", "csv=p=0",
                str(clip_path),
            ]
            audio_r = subprocess.run(audio_cmd, capture_output=True, text=True, timeout=10)
            if (
                pts_r.returncode == 0
                and pts_r.stdout.strip()
                and audio_r.returncode == 0
                and audio_r.stdout.strip()
            ):
                first_pts = float(pts_r.stdout.strip().split("\n")[0].strip())
                audio_pts = float(audio_r.stdout.strip().split("\n")[0].strip())
                offset = abs(first_pts - audio_pts)
                if offset > SUBTITLE_PTS_OFFSET_THRESHOLD:
                    pts_delay = min(SUBTITLE_DELAY_MAX, offset * 0.85)
                    actual_delay = float(SUBTITLE_DELAY_SEC) + float(subtitle_extra_delay or 0.0) + pts_delay
                    print(f"  ✓ 音画 PTS 差 {offset:.2f}s → 字幕延迟补偿 +{pts_delay:.2f}s（含基准与 extra）", flush=True)
        except Exception:
            pass

        if abs(float(subtitle_extra_delay or 0.0)) > 1e-6:
            print(f"  ✓ 字幕额外延迟 --subtitle-extra-delay={float(subtitle_extra_delay):.3f}s", flush=True)

        subtitles = parse_srt_for_clip(transcript_path, start_sec, end_sec, delay_sec=actual_delay)
        for sub in subtitles:
            if not _is_mostly_chinese(sub['text']):
                sub['text'] = _translate_to_chinese(sub['text']) or sub['text']
        subtitles = _filter_relevant_subtitles(subtitles)
        if _is_bad_transcript(subtitles):
            print(
                f"  ⚠ 转录稿异常（大量重复同一句），已跳过字幕烧录；请用 MLX Whisper 对该视频重新生成 transcript.srt 后再跑成片",
                flush=True,
            )
            sys.stdout.flush()
            subtitles = []
        else:
            mode = "逐字渐显" if typewriter_subs else "随语音走动"
            print(f"  ✓ 字幕解析 ({len(subtitles)}条)，将烧录为{mode}字幕", flush=True)

    # 2. 去静音：silencedetect ∪ 字幕条间长间隙，trim+concat 重编码，并 remap 字幕时间轴
    thr = float(silence_noise_db) if silence_noise_db is not None else float(SILENCE_THRESHOLD)
    mind = float(silence_min_duration) if silence_min_duration is not None else float(SILENCE_MIN_DURATION)
    marg = float(silence_trim_margin) if silence_trim_margin is not None else float(SILENCE_TRIM_MARGIN)
    silences = detect_silence(clip_path, thr, mind)
    if merge_subtitle_gap_silences and subtitles:
        gaps = _subtitle_gap_intervals(subtitles, original_duration, SILENCE_SUBTITLE_GAP_MIN_SEC)
        if gaps:
            silences = _merge_time_intervals(list(silences) + gaps)
    silences = filter_silences_keep_tail_audio(silences, original_duration)
    kept = kept_segments_from_silences(silences, original_duration, margin=marg)
    removed_total = original_duration - sum(e - s for s, e in kept)
    if trim_silence and removed_total >= MIN_SILENCE_TRIM_TOTAL_SEC:
        trim_out = os.path.join(temp_dir, "trim_silence.mp4")
        if ffmpeg_trim_kept_segments(clip_path, trim_out, kept, original_duration):
            working_clip = trim_out
            duration = float(get_video_info(working_clip)["duration"])
            if subtitles:
                remap_subtitles_after_trim(subtitles, kept)
            print(
                f"  ✓ 去静音：约减 {removed_total:.1f}s → 基长 {duration:.1f}s"
                f"（检出 {len(silences)} 段，片尾 {SILENCE_TAIL_PRESERVE_SEC:.1f}s 不剪静音保收尾）",
                flush=True,
            )
        else:
            print(f"  ⚠ 去静音编码失败，沿用原片", flush=True)
            duration = original_duration
    else:
        print(
            f"  ✓ 静音 {len(silences)} 段，可剪 {removed_total:.2f}s（<{MIN_SILENCE_TRIM_TOTAL_SEC}s 不剪；"
            f"片尾 {SILENCE_TAIL_PRESERVE_SEC:.1f}s 不剪静音）",
            flush=True,
        )

    # 3. 封面图（与去静音后首帧一致；竖条须与成片同 crop-vf 取底图，勿整幅横版压竖条）
    print(f"  [1/5] 封面生成中…", flush=True)
    cover_img = os.path.join(temp_dir, "cover.png")
    cover_extract_vf = None
    if vertical and not vertical_fit_full:
        cover_extract_vf = vf_use
    create_cover_image(
        hook_text, out_w, out_h, cover_img, working_clip, cover_extract_vf=cover_extract_vf
    )
    print(f"  ✓ 封面生成", flush=True)

    if subtitles:
        if typewriter_subs:
            sub_images = build_typewriter_subtitle_images(
                subtitles, temp_dir, out_w, out_h, subtitle_overlay_start
            )
        else:
            for i, sub in enumerate(subtitles):
                img_path = os.path.join(temp_dir, f"sub_{i:04d}.png")
                create_subtitle_image(sub["text"], out_w, out_h, img_path)
                sub_images.append({"path": img_path, "start": sub["start"], "end": sub["end"]})
    if do_burn_subs and not skip_subs:
        append_cta_ending_subtitle(
            sub_images,
            highlight_info,
            temp_dir,
            out_w,
            out_h,
            duration,
            subtitle_overlay_start,
        )
    if sub_images:
        cta_note = "（含片尾引导）" if (highlight_info.get("cta_ending") or "").strip() else ""
        print(f"  ✓ 字幕图片 ({len(sub_images)}张){cta_note}", flush=True)

    # 4. 构建 FFmpeg 链（从去静音后的 working_clip 起）
    current_video = working_clip
    
    # 5.1 添加封面（封面图 -loop 1 保证前若干秒完整显示；竖条时叠在 overlay_pos）
    print(f"  [2/5] 封面烧录中…", flush=True)
    cover_output = os.path.join(temp_dir, 'with_cover.mp4')
    cmd = [
        'ffmpeg', '-y', '-i', current_video,
        '-loop', '1', '-i', cover_img,
        '-filter_complex', f"[0:v][1:v]overlay={overlay_pos}:enable='lt(t,{cover_duration})'[v]",
        '-map', '[v]', '-map', '0:a', '-shortest',
        '-c:v', 'libx264', '-preset', 'fast', '-crf', '22',
        '-c:a', 'copy', cover_output
    ]
    subprocess.run(cmd, capture_output=True)
    
    if os.path.exists(cover_output):
        current_video = cover_output
    print(f"  ✓ 封面烧录", flush=True)
    
    # 5.2 烧录字幕
    # 策略：concat 图片序列 + 单次 overlay（最快正确方案）
    # 原理：
    #   - -loop 1 + enable=between：每帧都要判断所有overlay节点，极慢（163条/270s需30min+）
    #   - -ss/-t 对PNG：PNG只有1帧，seek到>0时返回空流，字幕消失
    #   - concat 图片序列（每条字幕是精确时长的帧段）+单次overlay：一次pass，速度快几十倍
    if sub_images:
        print(f"  [3/5] 字幕烧录中（{len(sub_images)} 条，concat+overlay 单次 pass）…", flush=True)

        # 创建透明空白帧（与竖条/全画面 out_w×out_h 一致）
        blank_path = os.path.join(temp_dir, 'sub_blank.png')
        if not os.path.exists(blank_path):
            blank = Image.new('RGBA', (out_w, out_h), (0, 0, 0, 0))
            blank.save(blank_path, 'PNG')

        # 构建 concat 文件：把所有字幕帧描述为"时间段→图片"的序列
        # concat demuxer 输出时间轴从 0 起连续累加，必须与主视频对齐：
        # 须先在开头插入 [0, subtitle_overlay_start) 的透明段，否则字幕轨总长比主视频短
        # subtitle_overlay_start 秒，overlay 时整轨会前移，表现为与封面重叠、与语音不同步。
        # concat demuxer 格式：
        #   file 'path'
        #   duration X.XXX
        # 最后一行不写 duration（用于循环/截断防报错）
        concat_lines = []
        lead = float(subtitle_overlay_start)
        if lead > 0.001:
            concat_lines.append(f"file '{blank_path}'")
            concat_lines.append(f"duration {lead:.3f}")
        prev_end = subtitle_overlay_start  # 视频时间轴上「下一段」应从封面后留白处接续

        for img in sub_images:
            sub_start = max(img['start'], subtitle_overlay_start)
            sub_end = img['end']
            if sub_start >= sub_end:
                continue
            # 空白段（上一条字幕结束 → 本条开始）
            gap = sub_start - prev_end
            if gap > 0.04:
                concat_lines.append(f"file '{blank_path}'")
                concat_lines.append(f"duration {gap:.3f}")
            # 字幕段
            concat_lines.append(f"file '{img['path']}'")
            concat_lines.append(f"duration {sub_end - sub_start:.3f}")
            prev_end = sub_end

        # 末尾空白（最后一条字幕结束 → 视频结束）
        tail = duration - prev_end
        if tail > 0.04:
            concat_lines.append(f"file '{blank_path}'")
            concat_lines.append(f"duration {tail:.3f}")
        concat_lines.append(f"file '{blank_path}'")  # concat demuxer 必须的结束帧

        concat_file = os.path.join(temp_dir, 'sub_concat.txt')
        with open(concat_file, 'w') as f:
            f.write('\n'.join(concat_lines))

        # 单次 FFmpeg overlay：-f concat 读图片序列 → overlay 到主视频
        sub_out = os.path.join(temp_dir, 'with_subs.mp4')
        cmd = [
            'ffmpeg', '-y',
            '-i', current_video,
            '-f', 'concat', '-safe', '0', '-i', concat_file,
            '-filter_complex', f'[0:v][1:v]overlay={overlay_pos}[v]',
            '-map', '[v]', '-map', '0:a',
            '-c:v', 'libx264', '-preset', 'fast', '-crf', '22',
            '-c:a', 'copy', sub_out
        ]
        r = subprocess.run(cmd, capture_output=True, text=True)
        if r.returncode == 0 and os.path.exists(sub_out):
            current_video = sub_out
            print(f"  ✓ 字幕烧录完成（concat 单次 pass，{len(sub_images)} 条）", flush=True)
        else:
            print(f"  ⚠ 字幕烧录失败: {(r.stderr or '')[-400:]}", file=sys.stderr)
    else:
        if do_burn_subs and os.path.exists(transcript_path):
            print(f"  ⚠ 未烧录字幕：解析后无有效字幕（请用 MLX Whisper 重新生成 transcript.srt）", flush=True)
        print(f"  [3/5] 字幕跳过", flush=True)

    # 5.25 贴片库（emoji）叠加：按主题自动插入，增强趣味但不遮挡字幕主体
    sticker_out = os.path.join(temp_dir, "with_stickers.mp4")
    if use_stickers and apply_sticker_overlays(current_video, sticker_out, highlight_info, duration):
        current_video = sticker_out
        print(f"  ✓ 表情贴片已叠加（自动主题匹配）", flush=True)
    else:
        print(f"  ⊘ 表情贴片跳过", flush=True)

    # 5.26 关键词条（PIL PNG，与高光文案一致；非外链视频）
    kw_out = os.path.join(temp_dir, "with_kw_pins.mp4")
    if (
        keyword_pins
        and vertical
        and not vertical_fit_full
        and apply_keyword_pin_overlays(
            current_video,
            kw_out,
            highlight_info,
            duration,
            strip_overlay_x,
            strip_overlay_w,
            temp_dir,
        )
    ):
        current_video = kw_out
        print(f"  ✓ 关键词条已烧录（竖条主区内）", flush=True)
    
    # 5.3 加速10% + 音频增强 + 同步（成片必做）
    mode_audio = "强降噪会议室" if strong_audio_clean else "标准"
    print(f"  [4/5] 加速 10% + 音频清晰化（{mode_audio}）…", flush=True)
    speed_output = os.path.join(temp_dir, 'speed.mp4')

    audio_enhance = _audio_enhance_filter_str(bool(strong_audio_clean))
    # 加速 + 音频增强 合并成一次 ffmpeg
    cmd = [
        'ffmpeg', '-y', '-i', current_video,
        '-filter_complex',
        f"[0:v]setpts={1/SPEED_FACTOR}*PTS[v];"
        f"[0:a]atempo={SPEED_FACTOR},{audio_enhance}[a]",
        '-map', '[v]', '-map', '[a]',
        '-c:v', 'libx264', '-preset', 'fast', '-crf', '22',
        '-c:a', 'aac', '-b:a', '192k',
        speed_output
    ]
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode == 0 and os.path.exists(speed_output):
        current_video = speed_output
        print(f"  ✓ 加速 10% + 音频增强完成", flush=True)
    else:
        print(f"  ⚠ 加速步骤失败，尝试仅加速（跳过音频增强）", file=sys.stderr)
        # 降级：只做加速，不做音频增强
        cmd_fallback = [
            'ffmpeg', '-y', '-i', current_video,
            '-filter_complex', f"[0:v]setpts={1/SPEED_FACTOR}*PTS[v];[0:a]atempo={SPEED_FACTOR}[a]",
            '-map', '[v]', '-map', '[a]',
            '-c:v', 'libx264', '-preset', 'fast', '-crf', '22',
            '-c:a', 'aac', '-b:a', '128k',
            speed_output
        ]
        result2 = subprocess.run(cmd_fallback, capture_output=True, text=True)
        if result2.returncode == 0 and os.path.exists(speed_output):
            current_video = speed_output
            print(f"  ✓ 加速完成（降级版，无音频增强）", flush=True)
        else:
            print(f"  ⚠ 加速步骤失败，沿用当前视频继续", file=sys.stderr)
            if result2.stderr:
                print(f"     {str(result2.stderr)[:300]}", file=sys.stderr)
    
    # 5.4 输出：竖条（宽由 vf）或全画面 letterbox
    if vertical and not vertical_fit_full:
        if horizontal_center_pad:
            print(
                f"  [5/5] 横屏单中屏（竖条 {out_w}×{out_h} → 1920×1080，左右黑边、单画面）…",
                flush=True,
            )
        else:
            print(f"  [5/5] 竖屏输出（{out_w}×{out_h}）…", flush=True)
    elif vertical and vertical_fit_full:
        print(f"  [5/5] 竖屏输出（全画面 letterbox）…", flush=True)
    else:
        print(f"  [5/5] 横版输出（未开竖屏）…", flush=True)
    if vertical and vertical_fit_full:
        r = subprocess.run([
            'ffmpeg', '-y', '-i', current_video,
            '-vf', VERTICAL_FIT_FULL_VF, '-c:a', 'copy', output_path
        ], capture_output=True, text=True)
        if r.returncode == 0 and os.path.exists(output_path):
            print(f"  ✓ 全画面缩放+上下黑边完成（未裁中间竖条）", flush=True)
        else:
            print(f"  ❌ 全画面缩放失败: {(r.stderr or '')[:400]}", file=sys.stderr)
            shutil.copy(current_video, output_path)
            print(f"  ⚠ 已回退为未缩放版本", flush=True)
    elif vertical:
        vf_out = vf_use
        if horizontal_center_pad:
            vf_out = f"{vf_use},{HORIZONTAL_CENTER_PAD_VF}"
        out_p = Path(output_path)
        out_p.parent.mkdir(parents=True, exist_ok=True)
        r = subprocess.run([
            'ffmpeg', '-y', '-i', current_video,
            '-vf', vf_out, '-c:a', 'copy', str(out_p)
        ], capture_output=True, text=True)
        if r.returncode == 0 and out_p.exists():
            if horizontal_center_pad:
                print(f"  ✓ 横屏单中屏输出完成（整屏仅一条画面）", flush=True)
            else:
                print(f"  ✓ 竖屏竖条裁剪完成", flush=True)
        else:
            tag = "横屏单中屏" if horizontal_center_pad else "竖屏裁剪"
            print(f"  ❌ {tag}失败(copy音频): {(r.stderr or '')[:400]}", file=sys.stderr)
            r2 = subprocess.run([
                'ffmpeg', '-y', '-i', current_video,
                '-vf', vf_out,
                '-c:v', 'libx264', '-preset', 'fast', '-crf', '22',
                '-c:a', 'aac', '-b:a', '128k',
                str(out_p),
            ], capture_output=True, text=True)
            if r2.returncode == 0 and out_p.exists():
                print(f"  ✓ {tag}完成（已改用 AAC+H264 重编码）", flush=True)
            else:
                print(f"  ❌ {tag}重编码仍失败: {(r2.stderr or '')[:400]}", file=sys.stderr)
                shutil.copy(current_video, str(out_p))
                print(f"  ⚠ 已回退为未裁剪横版，请检查 FFmpeg/素材", flush=True)
    else:
        shutil.copy(current_video, output_path)
        print(f"  ✓ 横版输出", flush=True)
    
    if os.path.exists(output_path):
        size_mb = os.path.getsize(output_path) / (1024 * 1024)
        print(f"  ✅ 完成: {os.path.basename(output_path)} ({size_mb:.1f}MB)")
        return True
    
    return False

def main():
    """主函数（支持命令行参数）"""
    parser = argparse.ArgumentParser(description="Soul切片增强 - 封面+字幕+加速+去语气词")
    parser.add_argument("--clips", "-c", help="切片目录")
    parser.add_argument("--highlights", "-l", help="highlights.json 路径")
    parser.add_argument("--transcript", "-t", help="transcript.srt 路径")
    parser.add_argument("--output", "-o", help="输出目录（成片时填 成片 文件夹路径）")
    parser.add_argument(
        "--vertical",
        action="store_true",
        help="成片直出竖条（高1080，宽由 analyze / --crop-vf 决定，默认保持界面真实比例）",
    )
    parser.add_argument("--title-only", action="store_true", help="输出文件名为纯标题（无序号、无_enhanced），与 --vertical 搭配用于成片")
    parser.add_argument("--skip-subs", action="store_true", help="跳过字幕烧录（原片已有字幕时用）")
    parser.add_argument("--force-burn-subs", action="store_true", help="强制烧录字幕（忽略检测）")
    parser.add_argument(
        "--crop-vf",
        default="",
        help="竖屏时覆盖裁剪链；默认仅单段 crop 保持真实比例；旧抖音可两段裁或加 scale=498（先 analyze_feishu_ui_crop 再粘贴）",
    )
    parser.add_argument(
        "--overlay-x",
        type=int,
        default=-1,
        help="竖屏时封面/字幕在 1920 横版上的叠加 x；默认 -1 表示用全局或从 --crop-vf 解析",
    )
    parser.add_argument(
        "--typewriter-subs",
        action="store_true",
        help="字幕在同一条时间内前缀逐字渐显（更通顺、更跟读）",
    )
    parser.add_argument(
        "--vertical-fit-full",
        action="store_true",
        help="竖屏成片不裁中间竖条：整幅 16:9 等比缩放入 498×1080，上下黑边，画面显示全；封面/字幕先叠满横版再缩放",
    )
    parser.add_argument(
        "--no-trim-silence",
        action="store_true",
        help="不去除静音长停顿（默认会切除 silencedetect 检出的静音并同步平移字幕时间轴）",
    )
    parser.add_argument(
        "--silence-gentle",
        action="store_true",
        help="去静音参数改温和（少剃），成片仍留白较多时用默认即可，被切太碎时再开",
    )
    parser.add_argument(
        "--no-subtitle-gap-merge",
        action="store_true",
        help="不把「字幕条之间长间隙」并入剃除，仅用音频 silencedetect",
    )
    parser.add_argument(
        "--subtitle-extra-delay",
        type=float,
        default=0.0,
        help="字幕整体时间轴再加若干秒（正数=字幕更晚出现），用于个别素材在精确切片后仍须微调时",
    )
    parser.add_argument(
        "--stickers",
        action="store_true",
        default=True,
        help="启用表情贴片库自动叠加（默认开启）",
    )
    parser.add_argument(
        "--no-stickers",
        action="store_true",
        help="关闭表情贴片",
    )
    parser.add_argument(
        "--horizontal-center-pad",
        action="store_true",
        help="横屏单中屏成片：与竖条塑形相同（封面/字幕/贴片），最后输出 1920×1080，中间一条画面、左右黑边；禁止与 --vertical-fit-full 同用",
    )
    parser.add_argument(
        "--horizontal-full",
        action="store_true",
        help="横屏全幅成片：整幅 16:9（无左右黑边），高光/字幕/封面与竖屏 Skill 同源；不要与 --vertical / --crop-vf / --horizontal-center-pad 同用",
    )
    parser.add_argument(
        "--strong-audio-clean",
        action="store_true",
        help="嘈杂会议室：加强高通与 FFT 降噪（仍保留片尾人声保护窗）",
    )
    parser.add_argument(
        "--keyword-pins",
        action="store_true",
        help="竖条成片时在主画面内烧录 1～2 条半透明关键词条（来自 hook/摘要，非外链视频）",
    )
    args = parser.parse_args()
    
    clips_dir = Path(args.clips) if args.clips else CLIPS_DIR
    output_dir = Path(args.output) if args.output else OUTPUT_DIR
    highlights_path = Path(args.highlights) if args.highlights else HIGHLIGHTS_PATH
    transcript_path = Path(args.transcript) if args.transcript else TRANSCRIPT_PATH
    
    if not clips_dir.exists():
        print(f"❌ 切片目录不存在: {clips_dir}")
        return
    if not highlights_path.exists():
        print(f"❌ highlights 不存在: {highlights_path}")
        return
    if not transcript_path.exists():
        print(f"❌ transcript 不存在: {transcript_path}")
        return
    
    vertical = getattr(args, 'vertical', False)
    title_only = getattr(args, 'title_only', False)
    crop_vf_arg = (getattr(args, "crop_vf", "") or "").strip()
    overlay_x_arg = getattr(args, "overlay_x", -1)
    overlay_x_arg = None if overlay_x_arg < 0 else overlay_x_arg
    typewriter = getattr(args, "typewriter_subs", False)
    vfit = getattr(args, "vertical_fit_full", False)
    hpad = getattr(args, "horizontal_center_pad", False)
    hfull = getattr(args, "horizontal_full", False)
    if hfull and getattr(args, "vertical", False):
        print("❌ --horizontal-full 与 --vertical 互斥", flush=True)
        return
    if hfull and hpad:
        print("❌ --horizontal-full 与 --horizontal-center-pad 互斥", flush=True)
        return
    if hfull and crop_vf_arg:
        print("⚠️ --horizontal-full 将忽略 --crop-vf（全幅 16:9 不裁竖条）", flush=True)
        crop_vf_arg = ""
    if hfull and vfit:
        print("⚠️ --horizontal-full 与 --vertical-fit-full 互斥，已关闭 letterbox 竖屏模式。", flush=True)
        vfit = False
        args.vertical_fit_full = False
    if hpad and vfit:
        print("⚠️ --horizontal-center-pad 与 --vertical-fit-full 互斥，已关闭全画面 letterbox。", flush=True)
        vfit = False
        args.vertical_fit_full = False
    # 横屏全幅：整幅叠字幕，成片 1920×1080，无左右黑边
    if hfull:
        vertical = False
        print("ℹ️ 横屏全幅成片：--title-only 仍生效，但不会强制竖屏。", flush=True)
    # 横屏单中屏必须先走竖条链路（叠字幕/封面），再 pad
    if hpad:
        vertical = True
        if not crop_vf_arg:
            print(
                "❌ --horizontal-center-pad 须配合 --crop-vf（或先跑 analyze_feishu_ui_crop 写入塑形参数）",
                flush=True,
            )
            return
    # Soul 成片：--title-only 或塑形相关参数时默认竖屏直出，避免只传 --crop-vf 却漏 --vertical 误出 1920×1080 横版
    if not vertical and not hfull and (title_only or crop_vf_arg or vfit):
        vertical = True
        print(
            "ℹ️ 已默认启用竖屏直出（因 --title-only 和/或 --crop-vf / --vertical-fit-full）；"
            "显式加 --vertical 亦同。",
            flush=True,
        )
    print("="*60)
    print(
        "🎬 Soul切片增强"
        + ("（成片竖屏直出）" if vertical and not hpad else "")
        + ("（横屏单中屏 1920×1080）" if hpad else "")
        + ("（横屏全幅 16:9 无黑边）" if hfull else "")
    )
    print("="*60)
    print(
        f"功能: 封面+字幕+加速10%+去语气词"
        + (
            "+去长静音"
            + (
                "(温和)"
                if getattr(args, "silence_gentle", False)
                else "(剃空白+字幕间隙)"
            )
            if not getattr(args, "no_trim_silence", False)
            else ""
        )
        + ("+竖屏条(高1080宽随vf)" if vertical and not hpad else "")
        + ("+横屏单中屏(竖条+左右黑边)" if hpad else "")
        + ("+横屏全幅(整幅叠字幕)" if hfull else "")
        + ("+全画面letterbox(不裁竖条)" if vertical and vfit else "")
        + ("+逐字字幕" if typewriter else "")
        + ("+强降噪" if getattr(args, "strong_audio_clean", False) else "")
        + ("+关键词条" if getattr(args, "keyword_pins", False) else "")
    )
    if vertical and crop_vf_arg and not vfit:
        print(f"取景: --crop-vf {crop_vf_arg}")
    print(f"输入: {clips_dir}")
    print(f"输出: {output_dir}" + ("（成片，文件名=标题）" if title_only else ""))
    print("="*60)
    
    output_dir.mkdir(parents=True, exist_ok=True)
    # 同名直接覆盖，不预先清空
    
    with open(highlights_path, 'r', encoding='utf-8') as f:
        highlights = json.load(f)
    if isinstance(highlights, dict) and "clips" in highlights:
        highlights = highlights["clips"]
    highlights = highlights if isinstance(highlights, list) else []
    if not highlights:
        print("❌ highlights 为空，无法按高光表成片")
        return

    clips = sorted(clips_dir.glob('*.mp4'))
    total = len(clips)
    print(f"\n找到 {total} 个 mp4，highlights {len(highlights)} 条；仅处理序号 1～{len(highlights)} 的切片\n", flush=True)

    if getattr(args, "silence_gentle", False):
        snd, smin, smar = (
            SILENCE_GENTLE_THRESHOLD,
            SILENCE_GENTLE_MIN_DURATION,
            SILENCE_GENTLE_TRIM_MARGIN,
        )
    else:
        snd = smin = smar = None

    success_count = 0
    for i, clip_path in enumerate(clips):
        clip_num = _parse_clip_index(clip_path.name) or (i + 1)
        if clip_num < 1 or clip_num > len(highlights):
            print(
                f"  ⊘ 跳过 {clip_path.name}（序号 {clip_num} 无对应 highlights）",
                flush=True,
            )
            continue
        highlight_info = highlights[clip_num - 1]
        title_display = (
            highlight_info.get("viral_hook")
            or highlight_info.get("hook_3sec")
            or highlight_info.get("title")
            or clip_path.stem
        )[:36]
        print("=" * 60, flush=True)
        print(f"【成片进度】 {i+1}/{total}  {title_display}", flush=True)
        print("=" * 60, flush=True)
        
        if getattr(args, "title_only", False):
            # 文件名：优先 highlights「title」完整抖音向长标题（sanitize 72 字内）；封面仍由 enhance_clip 内 pick_cover_hook（viral_hook 短句）
            long_t = (highlight_info.get("title") or "").strip()
            short_fallback = pick_cover_hook_text(highlight_info) or long_t or clip_path.stem
            fn_src = long_t if long_t else short_fallback
            fn_norm = _normalize_title_for_display(str(fn_src)) or str(fn_src)
            stem = sanitize_filename(fn_norm, max_length=72)
            if not stem or stem == "片段":
                stem = sanitize_filename(
                    _normalize_title_for_display(str(short_fallback)) or str(short_fallback),
                    max_length=50,
                )
            # 同场多条高光标题可能相同，必须带切片序号防覆盖
            name = f"{stem}_{clip_num:02d}.mp4"
            output_path = output_dir / name
        else:
            output_path = output_dir / clip_path.name.replace('.mp4', '_enhanced.mp4')
        
        temp_dir = tempfile.mkdtemp(prefix='enhance_')
        try:
            if enhance_clip(
                str(clip_path),
                str(output_path),
                highlight_info,
                temp_dir,
                str(transcript_path),
                force_burn_subs=getattr(args, "force_burn_subs", False),
                skip_subs=getattr(args, "skip_subs", False),
                vertical=vertical,
                crop_vf=(None if hfull else (crop_vf_arg or None)),
                overlay_x=overlay_x_arg,
                typewriter_subs=typewriter,
                vertical_fit_full=vfit,
                trim_silence=not getattr(args, "no_trim_silence", False),
                subtitle_extra_delay=float(getattr(args, "subtitle_extra_delay", 0.0) or 0.0),
                use_stickers=getattr(args, "stickers", True) and not getattr(args, "no_stickers", False),
                horizontal_center_pad=hpad,
                strong_audio_clean=getattr(args, "strong_audio_clean", False),
                keyword_pins=getattr(args, "keyword_pins", False),
                silence_noise_db=snd,
                silence_min_duration=smin,
                silence_trim_margin=smar,
                merge_subtitle_gap_silences=not getattr(args, "no_subtitle_gap_merge", False),
            ):
                success_count += 1
        finally:
            shutil.rmtree(temp_dir, ignore_errors=True)
    
    print("\n" + "="*60)
    print(f"✅ 增强完成: {success_count}/{len(highlights)}（按 highlights 条数计）")
    print(f"📁 输出目录: {output_dir}")
    print("="*60)
    
    generate_index(
        highlights,
        output_dir,
        title_only=getattr(args, "title_only", False),
    )


def generate_index(highlights, output_dir, title_only: bool = False):
    """生成目录索引：源时段、源窗/成片时长、标题、Hook、成片文件名。"""
    generate_index_v2(highlights, Path(output_dir), title_only=title_only)


def _parse_hhmmss_to_sec(t: str) -> float | None:
    t = str(t).strip()
    if not t:
        return None
    parts = t.split(":")
    try:
        if len(parts) == 3:
            return int(parts[0]) * 3600 + int(parts[1]) * 60 + float(parts[2])
        if len(parts) == 2:
            return int(parts[0]) * 60 + float(parts[1])
        return float(parts[0])
    except (TypeError, ValueError):
        return None


def _ffprobe_duration_sec(path: Path) -> float | None:
    if not path.exists():
        return None
    try:
        r = subprocess.run(
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
            capture_output=True,
            text=True,
            timeout=60,
        )
        if r.returncode != 0:
            return None
        return float(r.stdout.strip())
    except (ValueError, subprocess.TimeoutExpired, OSError):
        return None


def _find_title_only_output(output_dir: Path, clip_index: int) -> Path | None:
    """title-only 成片：*_{idx:02d}.mp4（取字典序最后一条，兼容重跑残留）。"""
    pat = re.compile(r"_(\d{2})\.mp4$")
    hits: list[Path] = []
    for p in output_dir.glob("*.mp4"):
        m = pat.search(p.name)
        if m and int(m.group(1)) == clip_index:
            hits.append(p)
    if not hits:
        return None
    return sorted(hits)[-1]


def generate_index_v2(highlights, output_dir: Path, title_only: bool = False):
    """生成目录索引：含源时段、源窗时长(秒)、成片时长(ffprobe，title-only 时尽力匹配文件)。"""
    index_path = output_dir / "目录索引.md"

    with open(index_path, "w", encoding="utf-8") as f:
        f.write("# Soul派对 - 成片目录\n\n")
        f.write(
            "**优化**: 高光 Hook 封面 + 逐字字幕 + 去长静音 + 片尾 CTA；"
            "源窗时长为 highlights 起止差，成片时长为 ffprobe（trim 后与源窗可能不同）。\n\n"
        )
        f.write(
            "| 序号 | 源时段 | 源窗秒 | 成片秒 | 标题 | Hook | 成片文件 |\n"
            "|------|--------|--------|--------|------|------|----------|\n"
        )

        for i, clip in enumerate(highlights, 1):
            title = _to_simplified(clip.get("title", f"clip_{i}"))
            hook = _to_simplified(clip.get("hook_3sec", ""))
            st = clip.get("start_time") or clip.get("start") or ""
            et = clip.get("end_time") or clip.get("end") or ""
            span = None
            ss = _parse_hhmmss_to_sec(st) if st else None
            es = _parse_hhmmss_to_sec(et) if et else None
            if ss is not None and es is not None:
                span = max(0.0, es - ss)
            span_s = f"{span:.0f}" if span is not None else "—"

            out_name = "—"
            final_d = "—"
            if title_only:
                outp = _find_title_only_output(output_dir, i)
                if outp:
                    out_name = outp.name
                    fd = _ffprobe_duration_sec(outp)
                    if fd is not None:
                        final_d = f"{fd:.1f}"
            else:
                # 非 title-only：沿用原名 _enhanced
                stem_guess = sorted(output_dir.glob(f"*{i:02d}*.mp4"))
                for p in stem_guess:
                    if "_enhanced" in p.name or p.suffix == ".mp4":
                        fd = _ffprobe_duration_sec(p)
                        if fd is not None:
                            out_name = p.name
                            final_d = f"{fd:.1f}"
                            break

            f.write(
                f"| {i} | {st}→{et} | {span_s} | {final_d} | {title} | {hook} | {out_name} |\n"
            )

    print(f"\n📋 目录索引: {index_path}")


if __name__ == "__main__":
    main()

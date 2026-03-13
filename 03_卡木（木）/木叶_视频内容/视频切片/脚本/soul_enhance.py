#!/usr/bin/env python3
"""
Soul切片增强脚本 v2.0
功能：
1. 添加封面贴片（前3秒Hook）
2. 烧录字幕（关键词高亮）
3. 视频加速10%
4. 删除静音停顿
5. 清理语气词字幕
"""

import argparse
import atexit
import json
import os
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

# 字体路径（兼容多种目录结构）
FONTS_DIR = SKILL_DIR / "fonts" if (SKILL_DIR / "fonts").exists() else Path("/Users/karuo/Documents/个人/卡若AI/03_卡木（木）/视频切片/fonts")
FONT_HEAVY = str(FONTS_DIR / "SourceHanSansSC-Heavy.otf")
FONT_BOLD = str(FONTS_DIR / "SourceHanSansSC-Bold.otf")
FALLBACK_FONT = "/System/Library/Fonts/STHeiti Medium.ttc"

# 视频增强参数
SPEED_FACTOR = 1.10  # 加速10%
SILENCE_THRESHOLD = -40  # 静音阈值(dB)
SILENCE_MIN_DURATION = 0.5  # 最短静音时长(秒)

# Soul 竖屏裁剪（与 soul_vertical_crop 一致，成片直出用）
CROP_VF = "crop=608:1080:483:0,crop=498:1080:60:0"
# 竖屏成片时封面/字幕用此尺寸，叠在横版上的 x 位置（与 crop 后保留区域对齐）
VERTICAL_W, VERTICAL_H = 498, 1080
OVERLAY_X = 543  # 1920 下保留区域左缘：483+60

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
CORRECTIONS = {
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
]

# 字体优先级（封面用更好看的字体）
FONT_PRIORITY = [
    "/System/Library/Fonts/PingFang.ttc",           # 苹方-简
    "/System/Library/Fonts/Supplemental/Songti.ttc", # 宋体-简
    "/System/Library/Fonts/STHeiti Medium.ttc",
    "/Library/Fonts/Arial Unicode.ttf",
]
COVER_FONT_PRIORITY = [
    "/System/Library/Fonts/PingFang.ttc",  # 苹方，封面优先
    "/System/Library/Fonts/Supplemental/Songti.ttc",
]

# Soul 品牌绿（绿点/绿色社交）
SOUL_GREEN = (0, 210, 106)   # #00D26A
SOUL_GREEN_DARK = (0, 160, 80)
# 竖屏封面高级背景：深色渐变（不超出界面）
VERTICAL_COVER_TOP = (12, 32, 24)    # 深墨绿
VERTICAL_COVER_BOTTOM = (8, 48, 36)  # 略亮绿
VERTICAL_COVER_PADDING = 44  # 左右留白，保证文字不贴边、不超出
# 成片封面半透明质感：背景层 alpha，便于透出底层画面
VERTICAL_COVER_ALPHA = 165  # 0~255，越大越不透明

# 样式配置
STYLE = {
    'cover': {
        'bg_blur': 35,
        'overlay_alpha': 200,
        'duration': 2.5,
    },
    'hook': {
        'font_size': 82,  # 更大更清晰
        'color': (255, 255, 255),
        'outline_color': (30, 30, 50),
        'outline_width': 5,
    },
    'subtitle': {
        'font_size': 44,
        'color': (255, 255, 255),
        'outline_color': (25, 25, 25),
        'outline_width': 4,
        'keyword_color': (255, 200, 50),   # 亮金黄
        'keyword_outline': (80, 50, 0),    # 深黄描边
        'keyword_size_add': 4,              # 关键词字号+4
        'bg_color': (15, 15, 35, 200),
        'margin_bottom': 70,
    }
}

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

def get_text_size(draw, text, font):
    """获取文字尺寸"""
    bbox = draw.textbbox((0, 0), text, font=font)
    return bbox[2] - bbox[0], bbox[3] - bbox[1]

def draw_text_with_outline(draw, pos, text, font, color, outline_color, outline_width):
    """绘制带描边的文字"""
    x, y = pos
    import math
    # 8方向描边
    for angle in range(0, 360, 45):
        dx = int(outline_width * math.cos(math.radians(angle)))
        dy = int(outline_width * math.sin(math.radians(angle)))
        draw.text((x + dx, y + dy), text, font=font, fill=outline_color)
    # 主体
    draw.text((x, y), text, font=font, fill=color)

def _normalize_title_for_display(title: str) -> str:
    """标题去杠去下划线：将 ：｜、—、/、_ 等全部替换为空格，避免文件名和封面出现杂符号"""
    if not title:
        return ""
    s = _to_simplified(str(title).strip())
    for char in "：:｜|—－-/、_":
        s = s.replace(char, " ")
    s = re.sub(r"\s+", " ", s).strip()
    return s


# macOS/APFS 文件名允许的中文标点（保留刺激性标题所需的标点）
_SAFE_CJK_PUNCT = set("，。？！；：·、…（）【】「」《》～—·+")

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


def improve_subtitle_punctuation(text: str) -> str:
    """为字幕句子补充标点，让意思更清晰。
    
    规则：
    1. 疑问句（含疑问词）加问号
    2. 感叹、强调语气加感叹号
    3. 普通陈述句末加句号（如果长度 >= 5）
    4. 修正多余标点
    """
    t = text.strip()
    if not t:
        return t
    # 末尾已有标点则不重复加
    if t and t[-1] in '，。？！,.:!?；':
        return apply_platform_safety(t)
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
    return apply_platform_safety(t)

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


# 字幕与语音同步的全局延迟补偿（秒）
# batch_clip -ss input seeking 导致实际切割比请求早 0~3 秒（关键帧对齐）
# 字幕按 highlights.start_time 算相对时间，会比实际音频提前
# 加正值延迟 = 字幕往后推 = 与声音更同步
# 2025-03 实测：Soul派对直播视频关键帧间距 2-4 秒，补偿需约 2.0s
SUBTITLE_DELAY_SEC = 2.0  # 增大到 2.0，避免字幕超前于说话


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


def parse_srt_for_clip(srt_path, start_sec, end_sec, delay_sec=None):
    """解析SRT，提取指定时间段的字幕。

    优化：
    1. 字幕延迟补偿（delay_sec）：补偿 FFmpeg input seeking 关键帧偏移（2s 默认）
    2. 噪声行过滤：去掉单字母 L / Agent 等 ASR 幻觉行
    3. 文字质量提升：纠错 + 违禁词替换 + 通畅度修正
    4. 合并过短字幕：相邻 <1.5s 时自动合并，减少闪烁
    5. 最小显示时长：每条至少 1.5s，避免一闪而过
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

    raw_subs = []
    for match in matches:
        sub_start = time_to_sec(match[1])
        sub_end   = time_to_sec(match[2])
        text = match[3].strip()

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


def write_clip_srt(srt_path, subtitles, cover_duration):
    """写出用于烧录的 SRT（仅保留封面结束后的字幕，时间已相对片段）"""
    safe_start = cover_duration + 0.3
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
    info = json.loads(result.stdout)
    stream = info['streams'][0]
    
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


def create_cover_image(hook_text, width, height, output_path, video_path=None):
    """创建封面贴片。竖屏 498x1080 时：高级渐变背景、文字严格在界面内居中不超出、左上角 Soul logo；封面不显示 123 等序号。"""
    hook_text = _to_simplified(str(hook_text or "").strip())
    hook_text = _strip_cover_number_prefix(hook_text)
    if not hook_text:
        hook_text = "精彩切片"
    style = STYLE['cover']
    hook_style = STYLE['hook']
    is_vertical = (width, height) == (VERTICAL_W, VERTICAL_H)
    
    if is_vertical:
        # 竖屏成片：半透明质感封面，渐变背景带 alpha，透出底层画面
        img = Image.new('RGBA', (width, height), (*VERTICAL_COVER_TOP, VERTICAL_COVER_ALPHA))
        draw = ImageDraw.Draw(img)
        _draw_vertical_gradient(draw, width, height, VERTICAL_COVER_TOP, VERTICAL_COVER_BOTTOM, alpha=VERTICAL_COVER_ALPHA)
        # 轻微半透明暗角，不盖死
        overlay = Image.new('RGBA', (width, height), (0, 0, 0, 60))
        img = Image.alpha_composite(img, overlay)
        draw = ImageDraw.Draw(img)
    else:
        # 横版：沿用视频帧模糊背景
        if video_path and os.path.exists(video_path):
            temp_frame = output_path.replace('.png', '_frame.jpg')
            subprocess.run([
                'ffmpeg', '-y', '-ss', '1', '-i', video_path,
                '-vframes', '1', '-q:v', '2', temp_frame
            ], capture_output=True)
            if os.path.exists(temp_frame):
                bg = Image.open(temp_frame).resize((width, height))
                bg = bg.filter(ImageFilter.GaussianBlur(radius=style['bg_blur']))
                os.remove(temp_frame)
            else:
                bg = Image.new('RGB', (width, height), (25, 35, 30))
        else:
            bg = Image.new('RGB', (width, height), (25, 35, 30))
        overlay = Image.new('RGBA', (width, height), (0, 25, 15, style['overlay_alpha']))
        img = bg.convert('RGBA')
        img = Image.alpha_composite(img, overlay)
        draw = ImageDraw.Draw(img)
    
    # Soul 绿装饰线（顶部、底部）
    for i in range(3):
        alpha = 180 - i * 50
        draw.rectangle([0, i * 3, width, i * 3 + 2], fill=(*SOUL_GREEN, alpha))
    for i in range(3):
        alpha = 180 - i * 50
        draw.rectangle([0, height - i * 3 - 2, width, height - i * 3], fill=(*SOUL_GREEN, alpha))
    
    # 左上角 Soul logo 小图标（绿圆 + 白字 S），保证在界面内
    logo_x, logo_y = 28, 28
    logo_r = 20
    draw.ellipse([logo_x - logo_r, logo_y - logo_r, logo_x + logo_r, logo_y + logo_r], fill=SOUL_GREEN, outline=(255, 255, 255))
    try:
        logo_font = get_cover_font(26)
        draw.text((logo_x - 5, logo_y - 12), "S", font=logo_font, fill=(255, 255, 255))
    except Exception:
        pass
    
    # 标题文字：竖屏时严格限制在 padding 内，多行居中，绝不超出界面
    if is_vertical:
        max_text_width = width - 2 * VERTICAL_COVER_PADDING  # 498 - 88 = 410
        cover_font_size = 48
        font = get_cover_font(cover_font_size)
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
            draw_text_with_outline(
                draw, (x, y), line, font,
                hook_style['color'],
                hook_style['outline_color'],
                min(hook_style['outline_width'], 3)
            )
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
    """创建字幕图片（关键词加粗加大突出）。竖屏 498 宽时字号略小、保证居中且不溢出。"""
    style = STYLE['subtitle']
    
    img = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # 竖屏窄幅时缩小字号，保证整行在画面内且居中
    base_size = style['font_size']
    if (width, height) == (VERTICAL_W, VERTICAL_H):
        base_size = min(base_size, 38)
    font = get_font(FONT_BOLD, base_size)
    text_w, text_h = get_text_size(draw, text, font)
    while text_w > width - 80 and base_size > 24:
        base_size -= 2
        font = get_font(FONT_BOLD, base_size)
        text_w, text_h = get_text_size(draw, text, font)
    kw_size = base_size + style.get('keyword_size_add', 4)
    kw_font = get_font(FONT_HEAVY, kw_size)
    
    # 字幕完全居中（水平+垂直正中间）；竖屏时限制在界面内不超出
    base_x = (width - text_w) // 2
    if (width, height) == (VERTICAL_W, VERTICAL_H):
        pad = 24
        base_x = max(pad, min(width - pad - text_w, base_x))
    base_y = (height - text_h) // 2
    
    # 背景条（不超出画布）
    padding = 15
    bg_rect = [
        max(0, base_x - padding - 10),
        max(0, base_y - padding),
        min(width, base_x + text_w + padding + 10),
        min(height, base_y + text_h + padding)
    ]
    
    # 绘制圆角背景
    bg_layer = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    bg_draw = ImageDraw.Draw(bg_layer)
    bg_draw.rounded_rectangle(bg_rect, radius=10, fill=style['bg_color'])
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
            # 关键词：粗体+大字+亮金黄+深色描边
            keyword_text = text[char_idx:keyword_end]
            kw_outline = style.get('keyword_outline', (60, 40, 0))
            kw_ow = style.get('outline_width', 3) + 1
            draw_text_with_outline(
                draw, (current_x, base_y - 1), keyword_text, kw_font,
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


def enhance_clip(clip_path, output_path, highlight_info, temp_dir, transcript_path,
                 force_burn_subs=False, skip_subs=False, vertical=False):
    """增强单个切片。vertical=True 时最后裁成竖屏 498x1080 直出成片。"""
    
    print(f"  输入: {os.path.basename(clip_path)}", flush=True)
    
    video_info = get_video_info(clip_path)
    width, height = video_info['width'], video_info['height']
    duration = video_info['duration']
    
    print(f"  分辨率: {width}x{height}, 时长: {duration:.1f}秒")
    
    # 封面与成片文件名统一：都用主题 title（去杠），名字与标题一致、无杠更清晰
    raw_title = highlight_info.get('title') or highlight_info.get('hook_3sec') or ''
    if not raw_title and clip_path:
        m = re.search(r'\d+[_\s]+(.+?)(?:_enhanced)?\.mp4$', os.path.basename(clip_path))
        if m:
            raw_title = m.group(1).strip()
    hook_text = _normalize_title_for_display(raw_title) or raw_title or '精彩切片'
    # 封面文字同样做安全处理
    hook_text = apply_platform_safety(hook_text)
    cover_duration = STYLE['cover']['duration']
    
    # 竖屏成片：封面/字幕按 498x1080 做，叠在裁切区域，文字与字幕在竖屏上完整且居中
    out_w, out_h = (VERTICAL_W, VERTICAL_H) if vertical else (width, height)
    overlay_pos = f"{OVERLAY_X}:0" if vertical else "0:0"
    
    # 1. 生成封面
    print(f"  [1/5] 封面生成中…", flush=True)
    cover_img = os.path.join(temp_dir, 'cover.png')
    create_cover_image(hook_text, out_w, out_h, cover_img, clip_path)
    print(f"  ✓ 封面生成", flush=True)
    
    # 2. 字幕逻辑：有字幕则烧录（图像 overlay：每张图 -loop 1 才能按时间 enable 显示）
    sub_images = []
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
        end_sec = start_sec + duration

        # 动态字幕延迟：检测切片实际首帧 PTS，与请求 start_time 做差
        actual_delay = SUBTITLE_DELAY_SEC
        try:
            pts_cmd = [
                "ffprobe", "-v", "quiet", "-select_streams", "v:0",
                "-show_entries", "frame=pts_time",
                "-read_intervals", "%+0.1",
                "-print_format", "csv=p=0",
                str(clip_path),
            ]
            pts_r = subprocess.run(pts_cmd, capture_output=True, text=True, timeout=10)
            if pts_r.returncode == 0 and pts_r.stdout.strip():
                first_pts = float(pts_r.stdout.strip().split("\n")[0].strip())
                # batch_clip 把 -ss 放在 -i 前面，FFmpeg 将 PTS 重置为 0
                # 但实际音频起点可能比请求的 start_sec 早 0-4 秒（关键帧对齐）
                # first_pts 接近 0，真正的偏移量在 batch_clip 的 seeking 行为里
                # 更可靠的方法：检测音频首个有效帧的 PTS
                audio_cmd = [
                    "ffprobe", "-v", "quiet", "-select_streams", "a:0",
                    "-show_entries", "frame=pts_time",
                    "-read_intervals", "%+0.5",
                    "-print_format", "csv=p=0",
                    str(clip_path),
                ]
                audio_r = subprocess.run(audio_cmd, capture_output=True, text=True, timeout=10)
                if audio_r.returncode == 0 and audio_r.stdout.strip():
                    audio_pts = float(audio_r.stdout.strip().split("\n")[0].strip())
                    # 视频帧 PTS 与音频帧 PTS 的差值揭示了 seeking 偏移
                    offset = abs(first_pts - audio_pts)
                    # 关键帧对齐通常导致视频比音频早 0-3s
                    # 字幕需要额外推迟这个偏移量
                    actual_delay = max(1.5, SUBTITLE_DELAY_SEC + offset * 0.5)
                    if actual_delay > 4.0:
                        actual_delay = SUBTITLE_DELAY_SEC
        except Exception:
            pass

        subtitles = parse_srt_for_clip(transcript_path, start_sec, end_sec, delay_sec=actual_delay)
        for sub in subtitles:
            if not _is_mostly_chinese(sub['text']):
                sub['text'] = _translate_to_chinese(sub['text']) or sub['text']
        # 仅过滤整句为规则/模板的条目，保留所有对白（含重复句，保证字幕连续）
        subtitles = _filter_relevant_subtitles(subtitles)
        # 异常转录检测：若整篇几乎同一句话，不烧录错误字幕，避免成片出现“像图片”的无效字
        if _is_bad_transcript(subtitles):
            print(f"  ⚠ 转录稿异常（大量重复同一句），已跳过字幕烧录；请用 MLX Whisper 对该视频重新生成 transcript.srt 后再跑成片", flush=True)
            sys.stdout.flush()
            subtitles = []
        else:
            print(f"  ✓ 字幕解析 ({len(subtitles)}条)，将烧录为随语音走动的字幕", flush=True)
        for i, sub in enumerate(subtitles):
            img_path = os.path.join(temp_dir, f'sub_{i:04d}.png')
            # 应用违禁词替换 + 标点优化（让字幕更清晰、安全）
            safe_text = improve_subtitle_punctuation(sub['text'])
            create_subtitle_image(safe_text, out_w, out_h, img_path)
            sub_images.append({'path': img_path, 'start': sub['start'], 'end': sub['end']})
    if sub_images:
        print(f"  ✓ 字幕图片 ({len(sub_images)}张)", flush=True)
    
    # 4. 检测静音
    silences = detect_silence(clip_path, SILENCE_THRESHOLD, SILENCE_MIN_DURATION)
    print(f"  ✓ 静音检测 ({len(silences)}段)")
    
    # 5. 构建FFmpeg命令
    current_video = clip_path
    
    # 5.1 添加封面（封面图 -loop 1 保证前 3 秒完整显示；竖屏时叠在 x=543）
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

        # 创建透明空白帧（RGBA 498x1080，所有像素透明）
        blank_path = os.path.join(temp_dir, 'sub_blank.png')
        if not os.path.exists(blank_path):
            blank = Image.new('RGBA', (out_w, out_h), (0, 0, 0, 0))
            blank.save(blank_path, 'PNG')

        # 构建 concat 文件：把所有字幕帧描述为"时间段→图片"的序列
        # concat demuxer 格式：
        #   file 'path'
        #   duration X.XXX
        # 最后一行不写 duration（用于循环/截断防报错）
        concat_lines = []
        prev_end = cover_duration  # 字幕从封面结束后开始

        for img in sub_images:
            sub_start = max(img['start'], cover_duration)
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
    
    # 5.3 加速10% + 音频同步（成片必做）
    print(f"  [4/5] 加速 10% + 去语助词（已在上步字幕解析中清理）…", flush=True)
    speed_output = os.path.join(temp_dir, 'speed.mp4')
    atempo = 1.0 / SPEED_FACTOR  # 音频需要反向调整
    
    cmd = [
        'ffmpeg', '-y', '-i', current_video,
        '-filter_complex', f"[0:v]setpts={1/SPEED_FACTOR}*PTS[v];[0:a]atempo={SPEED_FACTOR}[a]",
        '-map', '[v]', '-map', '[a]',
        '-c:v', 'libx264', '-preset', 'fast', '-crf', '22',
        '-c:a', 'aac', '-b:a', '128k',
        speed_output
    ]
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode == 0 and os.path.exists(speed_output):
        current_video = speed_output
        print(f"  ✓ 加速 10% 完成", flush=True)
    else:
        print(f"  ⚠ 加速步骤失败，沿用当前视频继续", file=sys.stderr)
        if result.stderr:
            print(f"     {str(result.stderr)[:300]}", file=sys.stderr)
    
    # 5.4 输出：竖屏则裁成 498x1080 直出（高光区域裁剪，成片必做）
    print(f"  [5/5] 竖屏裁剪中（498×1080）…", flush=True)
    if vertical:
        r = subprocess.run([
            'ffmpeg', '-y', '-i', current_video,
            '-vf', CROP_VF, '-c:a', 'copy', output_path
        ], capture_output=True, text=True)
        if r.returncode == 0 and os.path.exists(output_path):
            print(f"  ✓ 竖屏裁剪完成", flush=True)
        else:
            print(f"  ❌ 竖屏裁剪失败: {(r.stderr or '')[:300]}", file=sys.stderr)
            shutil.copy(current_video, output_path)
            print(f"  ⚠ 已回退为未裁剪版本，请检查 FFmpeg", flush=True)
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
    parser.add_argument("--vertical", action="store_true", help="成片直出竖屏 498x1080，与封面+字幕一起输出到 -o 目录")
    parser.add_argument("--title-only", action="store_true", help="输出文件名为纯标题（无序号、无_enhanced），与 --vertical 搭配用于成片")
    parser.add_argument("--skip-subs", action="store_true", help="跳过字幕烧录（原片已有字幕时用）")
    parser.add_argument("--force-burn-subs", action="store_true", help="强制烧录字幕（忽略检测）")
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
    print("="*60)
    print("🎬 Soul切片增强" + ("（成片竖屏直出）" if vertical else ""))
    print("="*60)
    print(f"功能: 封面+字幕+加速10%+去语气词" + ("+竖屏498x1080" if vertical else ""))
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
    
    clips = sorted(clips_dir.glob('*.mp4'))
    total = len(clips)
    print(f"\n找到 {total} 个切片，开始成片（封面+字幕+加速10%+竖屏裁剪）\n", flush=True)
    
    success_count = 0
    for i, clip_path in enumerate(clips):
        clip_num = _parse_clip_index(clip_path.name) or (i + 1)
        highlight_info = highlights[clip_num - 1] if 0 < clip_num <= len(highlights) else {}
        title_display = (highlight_info.get('title') or clip_path.stem)[:36]
        print("=" * 60, flush=True)
        print(f"【成片进度】 {i+1}/{total}  {title_display}", flush=True)
        print("=" * 60, flush=True)
        
        if getattr(args, 'title_only', False):
            title = (highlight_info.get('title') or highlight_info.get('hook_3sec') or clip_path.stem)
            name = sanitize_filename(title) + '.mp4'
            output_path = output_dir / name
        else:
            output_path = output_dir / clip_path.name.replace('.mp4', '_enhanced.mp4')
        
        temp_dir = tempfile.mkdtemp(prefix='enhance_')
        try:
            if enhance_clip(str(clip_path), str(output_path), highlight_info, temp_dir, str(transcript_path),
                           force_burn_subs=getattr(args, 'force_burn_subs', False),
                           skip_subs=getattr(args, 'skip_subs', False),
                           vertical=getattr(args, 'vertical', False)):
                success_count += 1
        finally:
            shutil.rmtree(temp_dir, ignore_errors=True)
    
    print("\n" + "="*60)
    print(f"✅ 增强完成: {success_count}/{len(clips)}")
    print(f"📁 输出目录: {output_dir}")
    print("="*60)
    
    generate_index(highlights, output_dir)

def generate_index(highlights, output_dir):
    """生成目录索引（标题/Hook/CTA 统一简体中文），索引写在输出目录内"""
    index_path = output_dir / "目录索引.md"
    
    with open(index_path, 'w', encoding='utf-8') as f:
        f.write("# Soul派对 - 成片目录\n\n")
        f.write("**优化**: 封面+字幕+加速10%+去语气词（成片含竖屏时已裁为498×1080）\n\n")
        f.write("## 切片列表\n\n")
        f.write("| 序号 | 标题 | Hook | CTA |\n")
        f.write("|------|------|------|-----|\n")
        
        for i, clip in enumerate(highlights, 1):
            title = _to_simplified(clip.get("title", f"clip_{i}"))
            hook = _to_simplified(clip.get("hook_3sec", ""))
            cta = _to_simplified(clip.get("cta_ending", ""))
            f.write(f"| {i} | {title} | {hook} | {cta} |\n")
    
    print(f"\n📋 目录索引: {index_path}")

if __name__ == "__main__":
    main()

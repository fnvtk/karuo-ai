#!/usr/bin/env python3
"""
字幕清洗脚本
- 去除语气词（嗯、啊、那个、就是、然后等）
- 优化过长停顿
- 合并短句
- 生成抓眼球的字幕
"""

import argparse
import re
import json
from pathlib import Path


# 需要删除的语气词列表
FILLER_WORDS = [
    # 中文语气词
    r'\b嗯+\b', r'\b啊+\b', r'\b呃+\b', r'\b哦+\b', r'\b噢+\b',
    r'\b哎+\b', r'\b唉+\b', r'\b呀+\b', r'\b吧+\b', r'\b呢+\b',
    r'\b喂+\b', r'\b嘿+\b', r'\b哈+\b', r'\b嘛+\b',
    # 口头禅
    r'那个+', r'就是说?', r'然后的?话?', r'其实的?话?',
    r'所以说?', r'这个+', r'那么+', r'就是那个',
    r'对对对', r'是是是', r'好好好',
    r'怎么说呢', r'你知道吗', r'我跟你说',
    # 重复词
    r'(\S+)\1{2,}',  # 连续重复3次以上的词
]

# 繁体转简体映射（常用字）
TRAD_TO_SIMP = {
    '這': '这', '個': '个', '們': '们', '來': '来', '說': '说',
    '會': '会', '裡': '里', '麼': '么', '還': '还', '進': '进',
    '過': '过', '時': '时', '對': '对', '後': '后', '電': '电',
    '競': '竞', '連': '连', '發': '发', '開': '开', '關': '关',
    '點': '点', '當': '当', '選': '选', '邊': '边', '頭': '头',
    '題': '题', '體': '体', '應': '应', '問': '问', '間': '间',
    '機': '机', '與': '与', '為': '为', '從': '从', '給': '给',
    '話': '话', '號': '号', '買': '买', '賣': '卖', '單': '单',
    '網': '网', '線': '线', '訂': '订', '課': '课', '練': '练',
    '變': '变', '聯': '联', '繫': '系', '係': '系', '隨': '随',
    '則': '则', '稱': '称', '種': '种', '場': '场', '塊': '块',
    '區': '区', '廣': '广', '態': '态', '業': '业', '產': '产',
    '務': '务', '實': '实', '認': '认', '識': '识', '記': '记',
    '錄': '录', '設': '设', '計': '计', '訪': '访', '問': '问',
    '閱': '阅', '讀': '读', '視': '视', '頻': '频', '聲': '声',
    '響': '响', '顯': '显', '現': '现', '見': '见', '觀': '观',
    '親': '亲', '紹': '绍', '經': '经', '歷': '历', '專': '专',
    '屬': '属', '組': '组', '織': '织', '結': '结', '構': '构',
    '達': '达', '運': '运', '動': '动', '場': '场', '環': '环',
    '節': '节', '費': '费', '賠': '赔', '預': '预', '訂': '订',
    '價': '价', '號': '号', '碼': '码', '據': '据', '數': '数',
    '樣': '样', '標': '标', '簽': '签', '無': '无', '論': '论',
    '議': '议', '華': '华', '國': '国', '書': '书', '學': '学',
    '習': '习', '練': '练', '師': '师', '員': '员', '長': '长',
    '張': '张', '廳': '厅', '廠': '厂', '層': '层', '樓': '楼',
    '條': '条', '舊': '旧', '萬': '万', '億': '亿', '兩': '两',
    '幾': '几', '歲': '岁', '歡': '欢', '氣': '气', '鏈': '链',
    '鑰': '钥', '鑽': '钻', '愛': '爱', '戀': '恋', '戶': '户',
    '戲': '戏', '聯': '联', '繫': '系', '擊': '击', '據': '据',
    '擔': '担', '擋': '挡', '據': '据', '換': '换', '損': '损',
    '搶': '抢', '報': '报', '場': '场', '塊': '块', '墻': '墙',
    '壓': '压', '壞': '坏', '塵': '尘', '夠': '够', '奪': '夺',
    '獎': '奖', '奮': '奋', '類': '类', '顧': '顾', '顏': '颜',
    '願': '愿', '額': '额', '風': '风', '飛': '飞', '養': '养',
    '餐': '餐', '館': '馆', '駕': '驾', '駛': '驶', '驗': '验',
    '騰': '腾', '魚': '鱼', '鳥': '鸟', '麗': '丽', '黃': '黄',
    '齊': '齐', '齡': '龄', '龍': '龙', '龜': '龟',
}


def trad_to_simp(text: str) -> str:
    """繁体转简体"""
    for trad, simp in TRAD_TO_SIMP.items():
        text = text.replace(trad, simp)
    return text


def remove_filler_words(text: str) -> str:
    """去除语气词"""
    for pattern in FILLER_WORDS:
        text = re.sub(pattern, '', text)
    # 清理多余空格
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def parse_srt(srt_path: str) -> list:
    """解析SRT文件"""
    with open(srt_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    segments = []
    blocks = content.strip().split('\n\n')
    
    for block in blocks:
        lines = block.strip().split('\n')
        if len(lines) >= 3:
            try:
                seg_id = int(lines[0])
            except ValueError:
                continue
            
            time_line = lines[1]
            if ' --> ' in time_line:
                start_str, end_str = time_line.split(' --> ')
            else:
                continue
            
            text = ' '.join(lines[2:])
            
            segments.append({
                'id': seg_id,
                'start': start_str.strip(),
                'end': end_str.strip(),
                'text': text
            })
    
    return segments


def time_to_seconds(time_str: str) -> float:
    """时间字符串转秒数"""
    # 格式: 00:00:00,000 或 00:00:00.000
    time_str = time_str.replace(',', '.')
    parts = time_str.split(':')
    if len(parts) == 3:
        h, m, s = parts
        return int(h) * 3600 + int(m) * 60 + float(s)
    return 0


def seconds_to_time(seconds: float) -> str:
    """秒数转时间字符串"""
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = seconds % 60
    ms = int((s % 1) * 1000)
    s = int(s)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def merge_short_segments(segments: list, min_duration: float = 1.0, max_gap: float = 0.5) -> list:
    """合并过短的字幕段"""
    if not segments:
        return segments
    
    merged = []
    current = segments[0].copy()
    
    for seg in segments[1:]:
        current_end = time_to_seconds(current['end'])
        seg_start = time_to_seconds(seg['start'])
        seg_end = time_to_seconds(seg['end'])
        
        gap = seg_start - current_end
        current_duration = current_end - time_to_seconds(current['start'])
        
        # 如果间隔小且当前段较短，合并
        if gap < max_gap and current_duration < min_duration:
            current['end'] = seg['end']
            current['text'] = current['text'] + ' ' + seg['text']
        else:
            merged.append(current)
            current = seg.copy()
    
    merged.append(current)
    return merged


def clean_subtitles(segments: list) -> list:
    """清洗字幕"""
    cleaned = []
    
    for seg in segments:
        text = seg['text']
        
        # 1. 繁体转简体
        text = trad_to_simp(text)
        
        # 2. 去除语气词
        text = remove_filler_words(text)
        
        # 3. 去除多余标点
        text = re.sub(r'[，。！？、]+$', '', text)  # 去除结尾标点
        text = re.sub(r'^[，。！？、]+', '', text)  # 去除开头标点
        
        # 4. 跳过空字幕
        if not text.strip():
            continue
        
        seg['text'] = text.strip()
        cleaned.append(seg)
    
    return cleaned


def generate_srt(segments: list, output_path: str):
    """生成SRT文件"""
    with open(output_path, 'w', encoding='utf-8') as f:
        for i, seg in enumerate(segments, 1):
            f.write(f"{i}\n")
            f.write(f"{seg['start']} --> {seg['end']}\n")
            f.write(f"{seg['text']}\n\n")


def generate_txt(segments: list, output_path: str):
    """生成纯文本文件"""
    with open(output_path, 'w', encoding='utf-8') as f:
        for seg in segments:
            f.write(f"{seg['text']}\n")


def main():
    parser = argparse.ArgumentParser(description="字幕清洗工具")
    parser.add_argument("--input", "-i", required=True, help="输入SRT文件")
    parser.add_argument("--output", "-o", help="输出SRT文件（默认覆盖原文件）")
    parser.add_argument("--merge", action="store_true", help="合并短句")
    parser.add_argument("--min_duration", type=float, default=1.0, help="最短字幕时长（秒）")
    
    args = parser.parse_args()
    
    input_path = Path(args.input)
    if not input_path.exists():
        print(f"❌ 文件不存在: {input_path}")
        return
    
    output_path = args.output or str(input_path)
    
    print(f"📝 清洗字幕: {input_path}")
    
    # 解析
    segments = parse_srt(str(input_path))
    print(f"   原始字幕: {len(segments)} 条")
    
    # 清洗
    segments = clean_subtitles(segments)
    print(f"   清洗后: {len(segments)} 条")
    
    # 合并短句
    if args.merge:
        segments = merge_short_segments(segments, args.min_duration)
        print(f"   合并后: {len(segments)} 条")
    
    # 重新编号
    for i, seg in enumerate(segments):
        seg['id'] = i + 1
    
    # 输出
    generate_srt(segments, output_path)
    print(f"✅ 已保存: {output_path}")
    
    # 同时生成txt
    txt_path = str(Path(output_path).with_suffix('.txt'))
    generate_txt(segments, txt_path)
    print(f"✅ 纯文本: {txt_path}")


if __name__ == "__main__":
    main()

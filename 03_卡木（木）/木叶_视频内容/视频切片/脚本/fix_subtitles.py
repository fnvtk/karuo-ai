#!/usr/bin/env python3
"""
字幕修正脚本
修复常见的Whisper转录错误
"""

import os
import re
from pathlib import Path

# 转录错误修正表
CORRECTIONS = {
    # 常见错误 → 正确
    '私余': '私域',
    '猜济': '拆解',
    '感绪': '感觉',
    '感情受': '感觉收',
    '准客': '存客',
    '动创': '动创',
    'IPG证': 'IP矩阵',
    '巨圣': '矩阵',
    '贵接': '归集',
    '幼年团队': '运营团队',
    '本次': '本刺',
    '思愿': '私域',
    '施予': '私域',
    '便线': '变现',
    '有场': '流程',
    '一拜开始': '好，开始',
    '一个相': '一起',
    '分论': '分润',
    '带式': '待式',
    '全语': '全域',
    '平海公众号': '公众号',
    '短报': '传单',
    '图书广': '图书馆',
    '实体文件': '实体门店',
    '磨磨的私域': '某某的私域',
    '锤子的一个私余': '垂直的一个私域',
    '附了': '赋能',
    '宣设群': '建设群',
    '搭较': '大大',
    '会总': '汇总',
    '招商招合伙人': '招商、招合伙人',
    '覆盖': '复盖',
    '组号': '主号',
    '小号': '小号',
    '货客': '获客',
    '一点个帐': '点一个账号',
    '走一点个帐': '扫一个二维码',
    '付宽': '付款',
    '道路': '导入',
    '天天': '甜甜',
    '存客宝': '存客宝',
}

# 语助词（需要删除的）
FILLER_WORDS_FULL = [
    '嗯', '啊', '呃', '哦', '唉', '诶', '喔', '噢', '哎',
    '来', '好', '对', 'OK', 'ok', '是啦',
]

def fix_subtitle_file(srt_path):
    """修正单个SRT文件"""
    with open(srt_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 应用修正
    for wrong, correct in CORRECTIONS.items():
        content = content.replace(wrong, correct)
    
    # 删除纯语助词的字幕行
    lines = content.split('\n')
    cleaned_lines = []
    i = 0
    while i < len(lines):
        line = lines[i]
        # 检查是否是字幕文本行（不是序号也不是时间戳）
        if line.strip() and not line.strip().isdigit() and '-->' not in line:
            # 检查是否是纯语助词
            if line.strip() in FILLER_WORDS_FULL:
                # 跳过这个字幕块（序号、时间、文本、空行）
                # 回退删除序号和时间戳
                if len(cleaned_lines) >= 2:
                    cleaned_lines = cleaned_lines[:-2]
                i += 1  # 跳过空行
                continue
        cleaned_lines.append(line)
        i += 1
    
    # 重新编号
    result = renumber_srt('\n'.join(cleaned_lines))
    
    # 写回文件
    with open(srt_path, 'w', encoding='utf-8') as f:
        f.write(result)
    
    return srt_path

def renumber_srt(content):
    """重新编号SRT字幕"""
    pattern = r'(\d+)\n(\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3})\n(.*?)(?=\n\n|\Z)'
    matches = re.findall(pattern, content, re.DOTALL)
    
    result = ""
    for i, match in enumerate(matches, 1):
        result += f"{i}\n{match[1]}\n{match[2]}\n\n"
    
    return result

def main():
    clips_dir = "/Users/karuo/Movies/存客宝/output/clips"
    
    print("=" * 60)
    print("字幕修正处理")
    print("=" * 60)
    
    # 处理所有SRT文件
    srt_files = list(Path(clips_dir).glob("*.srt"))
    print(f"找到 {len(srt_files)} 个字幕文件")
    
    for srt_file in srt_files:
        print(f"正在修正: {srt_file.name}")
        fix_subtitle_file(str(srt_file))
        print(f"  ✅ 完成")
    
    print("\n" + "=" * 60)
    print("修正完成！")
    print("=" * 60)

if __name__ == '__main__':
    main()

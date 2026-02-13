#!/usr/bin/env python3
"""
视频转录脚本
使用OpenAI Whisper（命令行版本）将视频/音频转为文字稿
"""

import argparse
import json
import os
import re
import subprocess
import sys
from pathlib import Path


def format_timestamp(seconds: float) -> str:
    """格式化时间戳 HH:MM:SS"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    return f"{hours:02d}:{minutes:02d}:{secs:02d}"


def parse_srt_timestamp(time_str: str) -> float:
    """解析SRT时间戳为秒数"""
    # 格式: HH:MM:SS,mmm
    match = re.match(r'(\d+):(\d+):(\d+),(\d+)', time_str)
    if match:
        h, m, s, ms = map(int, match.groups())
        return h * 3600 + m * 60 + s + ms / 1000
    return 0


def parse_srt_file(srt_path: str) -> list:
    """解析SRT文件为segments列表"""
    segments = []
    
    with open(srt_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 分割为块
    blocks = content.strip().split('\n\n')
    
    for block in blocks:
        lines = block.strip().split('\n')
        if len(lines) >= 3:
            # 第一行是序号
            try:
                seg_id = int(lines[0])
            except ValueError:
                continue
            
            # 第二行是时间戳
            time_line = lines[1]
            if ' --> ' in time_line:
                start_str, end_str = time_line.split(' --> ')
                start = parse_srt_timestamp(start_str.strip())
                end = parse_srt_timestamp(end_str.strip())
            else:
                continue
            
            # 剩余行是文本
            text = ' '.join(lines[2:])
            
            segments.append({
                "id": seg_id - 1,
                "start": start,
                "end": end,
                "text": text
            })
    
    return segments


def transcribe(input_path: str, output_dir: str = None, model: str = "medium", language: str = None):
    """
    转录视频/音频文件（使用命令行whisper）
    
    Args:
        input_path: 输入文件路径
        output_dir: 输出目录（默认与输入文件同目录）
        model: Whisper模型（tiny/base/small/medium/large）
        language: 语言代码（如zh/en，None为自动检测）
    """
    input_path = Path(input_path)
    if not input_path.exists():
        print(f"❌ 文件不存在: {input_path}")
        sys.exit(1)
    
    # 确定输出目录
    if output_dir:
        output_dir = Path(output_dir)
    else:
        output_dir = input_path.parent
    output_dir.mkdir(parents=True, exist_ok=True)
    
    base_name = input_path.stem
    
    print(f"🎤 开始转录: {input_path}")
    print(f"   模型: {model}")
    print(f"   语言: {language or '自动检测'}")
    print(f"   输出目录: {output_dir}")
    print()
    
    # 构建whisper命令
    cmd = [
        "whisper",
        str(input_path),
        "--model", model,
        "--output_dir", str(output_dir),
        "--output_format", "all",  # 输出所有格式（srt, txt, json等）
        "--verbose", "True",
    ]
    
    if language:
        cmd.extend(["--language", language])
    
    print("🔄 转录中（可能需要几分钟）...")
    print(f"   命令: {' '.join(cmd)}")
    print()
    
    try:
        subprocess.run(cmd, check=True)
    except FileNotFoundError:
        print("❌ whisper 命令未找到，请安装: brew install openai-whisper")
        sys.exit(1)
    except subprocess.CalledProcessError as e:
        print(f"❌ 转录失败: {e}")
        sys.exit(1)
    
    # 检查输出文件
    srt_path = output_dir / f"{base_name}.srt"
    txt_path = output_dir / f"{base_name}.txt"
    
    if not srt_path.exists():
        print(f"❌ SRT文件未生成: {srt_path}")
        sys.exit(1)
    
    # 解析SRT生成JSON
    segments = parse_srt_file(str(srt_path))
    
    # 读取纯文本
    full_text = ""
    if txt_path.exists():
        with open(txt_path, 'r', encoding='utf-8') as f:
            full_text = f.read()
    
    # 保存JSON
    json_path = output_dir / f"{base_name}_transcript.json"
    output_data = {
        "text": full_text,
        "language": language or "auto",
        "segments": segments
    }
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)
    print(f"✅ JSON保存: {json_path}")
    
    # 生成带时间戳的纯文本（用于AI分析）
    timestamp_txt_path = output_dir / f"{base_name}_with_timestamp.txt"
    with open(timestamp_txt_path, "w", encoding="utf-8") as f:
        for seg in segments:
            timestamp = format_timestamp(seg["start"])
            text = seg["text"].strip()
            f.write(f"[{timestamp}] {text}\n")
    print(f"✅ 带时间戳TXT保存: {timestamp_txt_path}")
    
    # 统计信息
    duration = segments[-1]["end"] if segments else 0
    print()
    print("="*50)
    print(f"📊 转录统计")
    print("="*50)
    print(f"   总时长: {format_timestamp(duration)}")
    print(f"   片段数: {len(segments)}")
    print(f"   总字数: {len(full_text)}")
    print("="*50)
    
    return output_data


def main():
    parser = argparse.ArgumentParser(description="视频/音频转录工具")
    parser.add_argument("--input", "-i", required=True, help="输入文件路径")
    parser.add_argument("--output", "-o", help="输出目录（默认与输入文件同目录）")
    parser.add_argument("--model", "-m", default="medium", 
                        choices=["tiny", "base", "small", "medium", "large"],
                        help="Whisper模型（默认medium）")
    parser.add_argument("--language", "-l", help="语言代码（如zh/en，默认自动检测）")
    
    args = parser.parse_args()
    
    transcribe(args.input, args.output, args.model, args.language)


if __name__ == "__main__":
    main()

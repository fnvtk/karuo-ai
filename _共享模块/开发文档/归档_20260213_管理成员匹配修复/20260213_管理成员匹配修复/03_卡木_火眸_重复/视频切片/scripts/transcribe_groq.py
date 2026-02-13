#!/usr/bin/env python3
"""
Groq API 超快转录脚本
速度：164-216x 实时速度（1小时音频约30秒完成）
限制：单文件25MB，需要分片处理
"""

import os
import sys
import json
import time
import tempfile
import subprocess
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

try:
    from groq import Groq
except ImportError:
    print("请先安装groq: pip3 install groq")
    sys.exit(1)

# Groq API Key（从环境变量或直接设置）
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "gsk_xxxx")  # 替换为你的key

# 配置
MAX_FILE_SIZE_MB = 24  # Groq限制25MB，留1MB余量
CHUNK_DURATION_SEC = 300  # 每片5分钟（约10-15MB）
MODEL = "whisper-large-v3-turbo"  # 最快模型


def get_audio_duration(file_path):
    """获取音频时长（秒）"""
    cmd = ["ffprobe", "-v", "quiet", "-show_entries", "format=duration",
           "-of", "default=noprint_wrappers=1:nokey=1", file_path]
    result = subprocess.run(cmd, capture_output=True, text=True)
    return float(result.stdout.strip())


def split_audio(input_file, output_dir, chunk_duration=CHUNK_DURATION_SEC):
    """将音频分片"""
    duration = get_audio_duration(input_file)
    chunks = []
    
    for i, start in enumerate(range(0, int(duration), chunk_duration)):
        chunk_file = os.path.join(output_dir, f"chunk_{i:03d}.mp3")
        end = min(start + chunk_duration, duration)
        
        # 使用ffmpeg分片，转为mp3减小体积
        cmd = [
            "ffmpeg", "-y", "-i", input_file,
            "-ss", str(start), "-t", str(chunk_duration),
            "-ar", "16000", "-ac", "1",  # 16kHz单声道
            "-b:a", "64k",  # 64kbps，约0.5MB/分钟
            chunk_file
        ]
        subprocess.run(cmd, capture_output=True)
        
        if os.path.exists(chunk_file):
            chunks.append({
                "file": chunk_file,
                "start": start,
                "end": end,
                "index": i
            })
            print(f"  分片 {i+1}: {start:.0f}s - {end:.0f}s ({os.path.getsize(chunk_file)/1024/1024:.1f}MB)")
    
    return chunks


def transcribe_chunk(client, chunk):
    """转录单个分片"""
    try:
        with open(chunk["file"], "rb") as f:
            response = client.audio.transcriptions.create(
                file=(os.path.basename(chunk["file"]), f.read()),
                model=MODEL,
                response_format="verbose_json",
                language="zh"
            )
        
        # 调整时间戳（加上分片起始时间）
        segments = []
        if hasattr(response, 'segments') and response.segments:
            for seg in response.segments:
                segments.append({
                    "start": seg.start + chunk["start"],
                    "end": seg.end + chunk["start"],
                    "text": seg.text
                })
        else:
            # 如果没有segments，使用整体文本
            segments.append({
                "start": chunk["start"],
                "end": chunk["end"],
                "text": response.text
            })
        
        return {
            "index": chunk["index"],
            "segments": segments,
            "text": response.text
        }
    except Exception as e:
        print(f"  ❌ 分片 {chunk['index']} 转录失败: {e}")
        return {"index": chunk["index"], "segments": [], "text": ""}


def transcribe_with_groq(input_file, output_dir, api_key=None):
    """使用Groq API转录音频"""
    
    if api_key:
        client = Groq(api_key=api_key)
    else:
        client = Groq(api_key=GROQ_API_KEY)
    
    print(f"\n🚀 Groq超快转录")
    print(f"   模型: {MODEL}")
    print(f"   文件: {input_file}")
    
    # 获取音频时长
    duration = get_audio_duration(input_file)
    print(f"   时长: {duration/60:.1f}分钟")
    
    start_time = time.time()
    
    # 创建临时目录存放分片
    with tempfile.TemporaryDirectory() as temp_dir:
        # 分片
        print("\n📦 分片处理...")
        chunks = split_audio(input_file, temp_dir)
        print(f"   共 {len(chunks)} 个分片")
        
        # 并行转录
        print("\n🎯 并行转录中...")
        results = []
        
        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = {executor.submit(transcribe_chunk, client, chunk): chunk 
                      for chunk in chunks}
            
            for future in as_completed(futures):
                result = future.result()
                results.append(result)
                print(f"  ✅ 分片 {result['index']+1}/{len(chunks)} 完成")
        
        # 按顺序合并结果
        results.sort(key=lambda x: x["index"])
    
    # 合并所有segments
    all_segments = []
    full_text = []
    for result in results:
        all_segments.extend(result["segments"])
        full_text.append(result["text"])
    
    elapsed = time.time() - start_time
    speed_factor = duration / elapsed
    
    print(f"\n✅ 转录完成!")
    print(f"   耗时: {elapsed:.1f}秒")
    print(f"   速度: {speed_factor:.0f}x 实时")
    
    # 保存结果
    # JSON格式
    json_output = os.path.join(output_dir, "transcript.json")
    with open(json_output, "w", encoding="utf-8") as f:
        json.dump({"segments": all_segments}, f, ensure_ascii=False, indent=2)
    
    # TXT格式
    txt_output = os.path.join(output_dir, "transcript.txt")
    with open(txt_output, "w", encoding="utf-8") as f:
        f.write("\n".join(full_text))
    
    # SRT格式
    srt_output = os.path.join(output_dir, "transcript.srt")
    with open(srt_output, "w", encoding="utf-8") as f:
        for i, seg in enumerate(all_segments, 1):
            start = seg["start"]
            end = seg["end"]
            text = seg["text"]
            
            # 格式化时间
            def fmt_time(t):
                h = int(t // 3600)
                m = int((t % 3600) // 60)
                s = int(t % 60)
                ms = int((t % 1) * 1000)
                return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"
            
            f.write(f"{i}\n{fmt_time(start)} --> {fmt_time(end)}\n{text}\n\n")
    
    print(f"\n📁 输出文件:")
    print(f"   {json_output}")
    print(f"   {txt_output}")
    print(f"   {srt_output}")
    
    return {
        "segments": all_segments,
        "text": "\n".join(full_text),
        "duration": duration,
        "elapsed": elapsed,
        "speed_factor": speed_factor
    }


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Groq超快转录")
    parser.add_argument("-i", "--input", required=True, help="输入音频/视频文件")
    parser.add_argument("-o", "--output", default=".", help="输出目录")
    parser.add_argument("-k", "--api-key", help="Groq API Key")
    args = parser.parse_args()
    
    if not os.path.exists(args.input):
        print(f"❌ 文件不存在: {args.input}")
        sys.exit(1)
    
    os.makedirs(args.output, exist_ok=True)
    
    result = transcribe_with_groq(args.input, args.output, args.api_key)
    
    print(f"\n🎉 转录完成! 速度提升 {result['speed_factor']:.0f}x")


if __name__ == "__main__":
    main()

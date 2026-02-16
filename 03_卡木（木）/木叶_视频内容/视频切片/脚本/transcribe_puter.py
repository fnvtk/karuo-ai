#!/usr/bin/env python3
"""
Puter.js 免费无限转录
- 完全免费，无需API Key
- 无限制使用
- 支持多语言
"""

import os
import sys
import json
import time
import subprocess
import tempfile
import requests
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed


# Puter API 配置
PUTER_API_URL = "https://api.puter.com/ai/speech-to-text"
CHUNK_DURATION_SEC = 120  # 每片2分钟


def get_audio_duration(file_path):
    """获取音频时长"""
    cmd = ["ffprobe", "-v", "quiet", "-show_entries", "format=duration",
           "-of", "default=noprint_wrappers=1:nokey=1", file_path]
    result = subprocess.run(cmd, capture_output=True, text=True)
    return float(result.stdout.strip())


def convert_to_mp3(input_file, output_file):
    """转换为MP3格式"""
    cmd = [
        "ffmpeg", "-y", "-i", input_file,
        "-ar", "16000", "-ac", "1",
        "-b:a", "64k",
        output_file
    ]
    subprocess.run(cmd, capture_output=True)


def split_audio(input_file, output_dir, chunk_duration=CHUNK_DURATION_SEC):
    """将音频分片"""
    duration = get_audio_duration(input_file)
    chunks = []
    
    for i, start in enumerate(range(0, int(duration), chunk_duration)):
        chunk_file = os.path.join(output_dir, f"chunk_{i:03d}.mp3")
        
        cmd = [
            "ffmpeg", "-y", "-i", input_file,
            "-ss", str(start), "-t", str(chunk_duration),
            "-ar", "16000", "-ac", "1",
            "-b:a", "64k",
            chunk_file
        ]
        subprocess.run(cmd, capture_output=True)
        
        if os.path.exists(chunk_file):
            file_size = os.path.getsize(chunk_file) / 1024 / 1024
            chunks.append({
                "file": chunk_file,
                "start": start,
                "end": min(start + chunk_duration, duration),
                "index": i,
                "size_mb": file_size
            })
            print(f"  分片 {i+1}: {start//60:.0f}:{start%60:02.0f} - {min(start+chunk_duration, duration)//60:.0f}:{min(start+chunk_duration, duration)%60:02.0f} ({file_size:.1f}MB)")
    
    return chunks


def transcribe_with_puter(chunk):
    """使用Puter API转录"""
    try:
        with open(chunk["file"], "rb") as f:
            files = {"file": (os.path.basename(chunk["file"]), f, "audio/mpeg")}
            response = requests.post(
                PUTER_API_URL,
                files=files,
                data={"language": "zh"},
                timeout=300
            )
        
        if response.status_code == 200:
            result = response.json()
            text = result.get("text", "")
            
            # 构建segments（如果API返回了时间戳）
            segments = result.get("segments", [])
            if not segments:
                segments = [{
                    "start": chunk["start"],
                    "end": chunk["end"],
                    "text": text
                }]
            else:
                # 调整时间戳
                for seg in segments:
                    seg["start"] += chunk["start"]
                    seg["end"] += chunk["start"]
            
            return {
                "index": chunk["index"],
                "text": text,
                "segments": segments,
                "success": True
            }
        else:
            print(f"  ⚠️ 分片 {chunk['index']} API错误: {response.status_code}")
            return {"index": chunk["index"], "text": "", "segments": [], "success": False}
    
    except Exception as e:
        print(f"  ❌ 分片 {chunk['index']} 失败: {e}")
        return {"index": chunk["index"], "text": "", "segments": [], "success": False}


def transcribe_free(input_file, output_dir):
    """免费转录主函数"""
    
    print("="*60)
    print("🆓 Puter.js 免费无限转录")
    print("="*60)
    
    duration = get_audio_duration(input_file)
    print(f"输入: {input_file}")
    print(f"时长: {duration/60:.1f}分钟")
    
    start_time = time.time()
    
    with tempfile.TemporaryDirectory() as temp_dir:
        # 分片
        print("\n📦 分片处理...")
        chunks = split_audio(input_file, temp_dir)
        print(f"共 {len(chunks)} 个分片")
        
        # 并行转录
        print("\n🎯 并行转录中...")
        results = []
        
        with ThreadPoolExecutor(max_workers=3) as executor:
            futures = {executor.submit(transcribe_with_puter, chunk): chunk 
                      for chunk in chunks}
            
            for future in as_completed(futures):
                result = future.result()
                results.append(result)
                status = "✅" if result["success"] else "❌"
                print(f"  {status} 分片 {result['index']+1}/{len(chunks)}")
        
        results.sort(key=lambda x: x["index"])
    
    elapsed = time.time() - start_time
    speed = duration / elapsed
    
    # 合并结果
    all_segments = []
    full_text = []
    for r in results:
        all_segments.extend(r.get("segments", []))
        if r.get("text"):
            full_text.append(r["text"])
    
    print(f"\n✅ 转录完成!")
    print(f"   耗时: {elapsed:.1f}秒")
    print(f"   速度: {speed:.1f}x 实时")
    
    # 保存结果
    os.makedirs(output_dir, exist_ok=True)
    
    # JSON
    json_file = os.path.join(output_dir, "transcript.json")
    with open(json_file, "w", encoding="utf-8") as f:
        json.dump({"segments": all_segments}, f, ensure_ascii=False, indent=2)
    
    # TXT
    txt_file = os.path.join(output_dir, "transcript.txt")
    with open(txt_file, "w", encoding="utf-8") as f:
        f.write("\n".join(full_text))
    
    # SRT
    srt_file = os.path.join(output_dir, "transcript.srt")
    with open(srt_file, "w", encoding="utf-8") as f:
        for i, seg in enumerate(all_segments, 1):
            start = seg.get("start", 0)
            end = seg.get("end", 0)
            text = seg.get("text", "")
            
            def fmt_time(t):
                h = int(t // 3600)
                m = int((t % 3600) // 60)
                s = int(t % 60)
                ms = int((t % 1) * 1000)
                return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"
            
            f.write(f"{i}\n{fmt_time(start)} --> {fmt_time(end)}\n{text}\n\n")
    
    print(f"\n📁 输出:")
    print(f"   {json_file}")
    print(f"   {txt_file}")
    print(f"   {srt_file}")
    
    return {
        "duration": duration,
        "elapsed": elapsed,
        "speed": speed,
        "segments": all_segments
    }


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Puter.js免费转录")
    parser.add_argument("-i", "--input", required=True, help="输入文件")
    parser.add_argument("-o", "--output", default=".", help="输出目录")
    args = parser.parse_args()
    
    if not os.path.exists(args.input):
        print(f"❌ 文件不存在: {args.input}")
        sys.exit(1)
    
    transcribe_free(args.input, args.output)


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
本地快速转录脚本 - 自动选择最快方案
优先级：mlx-whisper > whisper.cpp(Metal) > whisper(CPU)
"""

import os
import sys
import time
import subprocess
import shutil
from pathlib import Path


def check_mlx_whisper():
    """检查mlx-whisper是否可用"""
    try:
        import mlx_whisper
        return True
    except ImportError:
        return False


def check_whisper_cli():
    """检查whisper-cli是否可用"""
    return shutil.which("whisper-cli") is not None


def get_audio_duration(file_path):
    """获取音频时长"""
    cmd = ["ffprobe", "-v", "quiet", "-show_entries", "format=duration",
           "-of", "default=noprint_wrappers=1:nokey=1", file_path]
    result = subprocess.run(cmd, capture_output=True, text=True)
    try:
        return float(result.stdout.strip())
    except:
        return 0


def transcribe_with_mlx(input_file, output_dir, model="small", language="zh"):
    """使用mlx-whisper转录（最快本地方案）"""
    import mlx_whisper
    
    print(f"🚀 使用 mlx-whisper (Apple Silicon GPU加速)")
    print(f"   模型: {model}")
    
    start_time = time.time()
    
    result = mlx_whisper.transcribe(
        input_file,
        path_or_hf_repo=f"mlx-community/whisper-{model}-mlx",
        language=language
    )
    
    elapsed = time.time() - start_time
    duration = get_audio_duration(input_file)
    speed = duration / elapsed if elapsed > 0 else 0
    
    # 保存结果
    save_results(result, output_dir, duration, elapsed)
    
    return result, speed


def transcribe_with_whisper_cli(input_file, output_dir, model="small", language="zh"):
    """使用whisper-cli转录（whisper.cpp Metal加速）"""
    print(f"🔧 使用 whisper-cli (whisper.cpp Metal)")
    print(f"   模型: {model}")
    
    # 检查模型文件
    model_path = os.path.expanduser(f"~/.cache/whisper/ggml-{model}.bin")
    if not os.path.exists(model_path):
        print(f"   ⚠️ 模型不存在，下载中...")
        download_whisper_model(model)
    
    # 转换为WAV（如果需要）
    wav_file = input_file
    if not input_file.endswith(".wav"):
        wav_file = os.path.join(output_dir, "temp_audio.wav")
        cmd = ["ffmpeg", "-y", "-i", input_file, "-ar", "16000", "-ac", "1", 
               "-c:a", "pcm_s16le", wav_file]
        subprocess.run(cmd, capture_output=True)
    
    start_time = time.time()
    
    # 运行whisper-cli
    output_base = os.path.join(output_dir, "transcript")
    cmd = [
        "whisper-cli",
        "-m", model_path,
        "-l", language,
        "-otxt", "-osrt", "-of", output_base,
        wav_file
    ]
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    
    elapsed = time.time() - start_time
    duration = get_audio_duration(input_file)
    speed = duration / elapsed if elapsed > 0 else 0
    
    # 清理临时文件
    if wav_file != input_file and os.path.exists(wav_file):
        os.remove(wav_file)
    
    print(f"   ✅ 完成! 耗时: {elapsed:.1f}秒, 速度: {speed:.1f}x")
    
    return None, speed


def download_whisper_model(model="small"):
    """下载whisper模型"""
    url = f"https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-{model}.bin"
    output = os.path.expanduser(f"~/.cache/whisper/ggml-{model}.bin")
    os.makedirs(os.path.dirname(output), exist_ok=True)
    
    print(f"   下载模型: {url}")
    subprocess.run(["curl", "-L", "-o", output, url])


def save_results(result, output_dir, duration, elapsed):
    """保存转录结果"""
    import json
    
    # JSON
    json_file = os.path.join(output_dir, "transcript.json")
    with open(json_file, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    
    # TXT
    txt_file = os.path.join(output_dir, "transcript.txt")
    with open(txt_file, "w", encoding="utf-8") as f:
        f.write(result.get("text", ""))
    
    # SRT
    srt_file = os.path.join(output_dir, "transcript.srt")
    with open(srt_file, "w", encoding="utf-8") as f:
        for i, seg in enumerate(result.get("segments", []), 1):
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
    
    speed = duration / elapsed if elapsed > 0 else 0
    print(f"\n✅ 转录完成!")
    print(f"   时长: {duration/60:.1f}分钟")
    print(f"   耗时: {elapsed:.1f}秒")
    print(f"   速度: {speed:.1f}x 实时")
    print(f"\n📁 输出:")
    print(f"   {json_file}")
    print(f"   {txt_file}")
    print(f"   {srt_file}")


def auto_transcribe(input_file, output_dir, model="small", language="zh"):
    """自动选择最快方案转录"""
    
    print("="*60)
    print("🎯 本地快速转录")
    print("="*60)
    
    duration = get_audio_duration(input_file)
    print(f"输入: {input_file}")
    print(f"时长: {duration/60:.1f}分钟")
    print()
    
    # 检查可用方案
    has_mlx = check_mlx_whisper()
    has_cli = check_whisper_cli()
    
    print("可用方案:")
    print(f"  mlx-whisper: {'✅' if has_mlx else '❌'}")
    print(f"  whisper-cli: {'✅' if has_cli else '❌'}")
    print()
    
    os.makedirs(output_dir, exist_ok=True)
    
    # 选择最快方案
    if has_mlx:
        return transcribe_with_mlx(input_file, output_dir, model, language)
    elif has_cli:
        return transcribe_with_whisper_cli(input_file, output_dir, model, language)
    else:
        print("❌ 没有可用的转录工具!")
        print("请安装: pip3 install mlx-whisper 或 brew install whisper-cpp")
        sys.exit(1)


def main():
    import argparse
    parser = argparse.ArgumentParser(description="本地快速转录")
    parser.add_argument("-i", "--input", required=True, help="输入文件")
    parser.add_argument("-o", "--output", default=".", help="输出目录")
    parser.add_argument("-m", "--model", default="small", 
                       choices=["tiny", "base", "small", "medium", "large"],
                       help="模型大小")
    parser.add_argument("-l", "--language", default="zh", help="语言")
    args = parser.parse_args()
    
    auto_transcribe(args.input, args.output, args.model, args.language)


if __name__ == "__main__":
    main()

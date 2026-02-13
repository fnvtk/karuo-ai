#!/usr/bin/env python3
"""
视频切片主程序
从长视频中自动识别高光片段，批量导出切片
"""

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path
from datetime import datetime

# 配置
SKILL_DIR = Path(__file__).parent.parent
OUTPUT_DIR = SKILL_DIR / "output"
SCRIPTS_DIR = SKILL_DIR / "scripts"


def check_dependencies():
    """检查必要依赖"""
    print("🔍 检查依赖...")
    
    # 检查 FFmpeg
    try:
        subprocess.run(["ffmpeg", "-version"], capture_output=True, check=True)
        print("  ✅ FFmpeg 已安装")
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("  ❌ FFmpeg 未安装，请运行: brew install ffmpeg")
        return False
    
    # 检查 Whisper
    try:
        import whisper
        print("  ✅ Whisper 已安装")
    except ImportError:
        print("  ❌ Whisper 未安装，请运行: pip install openai-whisper")
        return False
    
    # 检查 yt-dlp（可选）
    try:
        subprocess.run(["yt-dlp", "--version"], capture_output=True, check=True)
        print("  ✅ yt-dlp 已安装")
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("  ⚠️  yt-dlp 未安装（仅处理本地文件），如需下载视频请运行: pip install yt-dlp")
    
    return True


def download_video(url: str, output_path: str) -> str:
    """下载在线视频"""
    print(f"📥 下载视频: {url}")
    
    cmd = [
        "yt-dlp",
        "-f", "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
        "-o", output_path,
        "--merge-output-format", "mp4",
        url
    ]
    
    try:
        subprocess.run(cmd, check=True)
        print(f"  ✅ 下载完成: {output_path}")
        return output_path
    except subprocess.CalledProcessError as e:
        print(f"  ❌ 下载失败: {e}")
        sys.exit(1)


def transcribe_video(video_path: str, output_dir: Path, model: str = "medium", language: str = None) -> dict:
    """转录视频（使用命令行whisper）"""
    print(f"🎤 转录视频: {video_path}")
    print(f"   使用模型: {model}")
    
    # 构建whisper命令
    cmd = [
        "whisper",
        str(video_path),
        "--model", model,
        "--output_dir", str(output_dir),
        "--output_format", "all",
        "--verbose", "True",
    ]
    
    if language:
        cmd.extend(["--language", language])
    
    print("   开始转录（可能需要几分钟）...")
    print(f"   命令: {' '.join(cmd)}")
    
    try:
        subprocess.run(cmd, check=True)
    except FileNotFoundError:
        print("   ❌ whisper 命令未找到，请安装: brew install openai-whisper")
        sys.exit(1)
    except subprocess.CalledProcessError as e:
        print(f"   ❌ 转录失败: {e}")
        sys.exit(1)
    
    # 获取生成的文件
    video_name = Path(video_path).stem
    srt_path = output_dir / f"{video_name}.srt"
    txt_path = output_dir / f"{video_name}.txt"
    
    # 解析SRT生成segments
    segments = parse_srt_file(str(srt_path))
    
    # 读取纯文本
    full_text = ""
    if txt_path.exists():
        with open(txt_path, 'r', encoding='utf-8') as f:
            full_text = f.read()
    
    result = {
        "text": full_text,
        "language": language or "auto",
        "segments": segments
    }
    
    # 保存JSON
    transcript_path = output_dir / "transcript.json"
    with open(transcript_path, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    
    # 生成带时间戳的文本（用于AI分析）
    timestamp_txt_path = output_dir / "transcript_with_timestamp.txt"
    generate_timestamped_text(segments, timestamp_txt_path)
    
    print(f"  ✅ 转录完成")
    print(f"     - JSON: {transcript_path}")
    print(f"     - SRT:  {srt_path}")
    print(f"     - TXT:  {timestamp_txt_path}")
    
    return result


def parse_srt_file(srt_path: str) -> list:
    """解析SRT文件为segments列表"""
    import re
    segments = []
    
    with open(srt_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
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
                start = parse_srt_timestamp(start_str.strip())
                end = parse_srt_timestamp(end_str.strip())
            else:
                continue
            
            text = ' '.join(lines[2:])
            
            segments.append({
                "id": seg_id - 1,
                "start": start,
                "end": end,
                "text": text
            })
    
    return segments


def parse_srt_timestamp(time_str: str) -> float:
    """解析SRT时间戳为秒数"""
    import re
    match = re.match(r'(\d+):(\d+):(\d+),(\d+)', time_str)
    if match:
        h, m, s, ms = map(int, match.groups())
        return h * 3600 + m * 60 + s + ms / 1000
    return 0


def generate_srt(segments: list, output_path: Path):
    """生成SRT字幕文件"""
    with open(output_path, "w", encoding="utf-8") as f:
        for i, seg in enumerate(segments, 1):
            start = format_timestamp_srt(seg["start"])
            end = format_timestamp_srt(seg["end"])
            text = seg["text"].strip()
            f.write(f"{i}\n{start} --> {end}\n{text}\n\n")


def generate_timestamped_text(segments: list, output_path: Path):
    """生成带时间戳的文本（用于AI分析）"""
    with open(output_path, "w", encoding="utf-8") as f:
        for seg in segments:
            timestamp = format_timestamp(seg["start"])
            text = seg["text"].strip()
            f.write(f"[{timestamp}] {text}\n")


def format_timestamp(seconds: float) -> str:
    """格式化时间戳 HH:MM:SS"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    return f"{hours:02d}:{minutes:02d}:{secs:02d}"


def format_timestamp_srt(seconds: float) -> str:
    """格式化SRT时间戳 HH:MM:SS,mmm"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds % 1) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"


def parse_timestamp(time_str: str) -> float:
    """解析时间戳字符串为秒数"""
    parts = time_str.split(":")
    if len(parts) == 3:
        h, m, s = parts
        return int(h) * 3600 + int(m) * 60 + float(s)
    elif len(parts) == 2:
        m, s = parts
        return int(m) * 60 + float(s)
    else:
        return float(time_str)


def clip_video(video_path: str, start: str, end: str, output_path: str):
    """切片单个视频"""
    cmd = [
        "ffmpeg",
        "-i", video_path,
        "-ss", start,
        "-to", end,
        "-c:v", "libx264",
        "-c:a", "aac",
        "-y",  # 覆盖已存在文件
        output_path
    ]
    
    subprocess.run(cmd, capture_output=True, check=True)


def batch_clip(video_path: str, highlights: list, output_dir: Path):
    """批量切片"""
    clips_dir = output_dir / "clips"
    clips_dir.mkdir(exist_ok=True)
    
    print(f"✂️  开始批量切片...")
    print(f"   共 {len(highlights)} 个片段")
    
    for i, clip in enumerate(highlights, 1):
        title = clip.get("title", f"clip_{i}")
        # 清理文件名中的非法字符
        safe_title = "".join(c for c in title if c.isalnum() or c in " _-").strip()[:50]
        
        start_time = clip["start_time"]
        end_time = clip["end_time"]
        
        output_path = clips_dir / f"{i:02d}_{safe_title}.mp4"
        
        print(f"   [{i}/{len(highlights)}] {safe_title}")
        print(f"       {start_time} → {end_time}")
        
        try:
            clip_video(video_path, start_time, end_time, str(output_path))
            print(f"       ✅ 完成")
        except subprocess.CalledProcessError as e:
            print(f"       ❌ 失败: {e}")
    
    print(f"\n✅ 批量切片完成，输出目录: {clips_dir}")


def print_ai_prompt(transcript_path: Path, clip_count: int, min_duration: int, max_duration: int, default_cta: str = "关注我，获取更多干货"):
    """输出AI分析提示词（含Hook和CTA）"""
    prompt_template_path = SKILL_DIR / "references" / "高光识别提示词.md"
    
    print("\n" + "="*60)
    print("📋 下一步：将文字稿发送给Claude分析高光片段")
    print("="*60)
    
    print(f"\n1. 打开文字稿文件: {transcript_path}")
    print(f"2. 复制以下提示词，将 [粘贴文字稿] 替换为文字稿内容")
    print(f"3. 发送给Claude，获取高光片段JSON（含Hook和CTA）")
    print(f"4. 将JSON保存为 highlights.json")
    print(f"5. 运行切片命令完成切片")
    
    print("\n" + "-"*60)
    print("【提示词（含Hook和CTA）】")
    print("-"*60)
    
    prompt = f"""分析这段视频文字稿，找出{clip_count}个最适合做抖音短视频的高光片段。

要求：
1. 每段{min_duration}-{max_duration}秒
2. 必须是完整的话，不能话说一半
3. 按传播力从高到低排序
4. 为每个片段设计「前3秒Hook」和「结尾CTA」
5. 输出JSON格式

评判标准：
- 金句/观点（30%）：有冲击力、反常识
- 故事/案例（25%）：真实、有起伏
- 情绪高点（20%）：激动、搞笑、感动
- 实操干货（15%）：可复用的方法
- 悬念钩子（10%）：引发好奇

Hook类型（选一个最适合的）：
- 悬念型：99%的人都不知道...
- 冲击型：我用这招3天赚了10万
- 问题型：为什么你做私域总是不赚钱？
- 数据型：90%的创业者都在这个坑里

默认CTA：{default_cta}

输出JSON格式：
[
  {{
    "title": "简短标题",
    "start_time": "00:12:34",
    "end_time": "00:13:56",
    "duration_sec": 82,
    "hook_3sec": "前3秒抓眼球文案（15字内）",
    "hook_type": "悬念型",
    "cta_ending": "结尾引导文案（20字内）",
    "cta_type": "group",
    "reason": "推荐理由",
    "virality_score": 8.5,
    "suggested_title": "适合短视频的爆款标题"
  }}
]

文字稿：
---
[粘贴 transcript_with_timestamp.txt 的内容]
---

请严格按JSON格式输出，每个片段必须包含 hook_3sec 和 cta_ending。"""
    
    print(prompt)
    print("-"*60)


def main():
    parser = argparse.ArgumentParser(description="视频切片工具 - 从长视频自动提取高光片段")
    parser.add_argument("--input", "-i", required=True, help="视频路径或URL")
    parser.add_argument("--clips", "-c", type=int, default=5, help="切片数量（默认5）")
    parser.add_argument("--min_duration", type=int, default=30, help="最短片段秒数（默认30）")
    parser.add_argument("--max_duration", type=int, default=180, help="最长片段秒数（默认180）")
    parser.add_argument("--model", "-m", default="medium", help="Whisper模型（tiny/base/small/medium/large）")
    parser.add_argument("--language", "-l", help="视频语言（如zh/en，默认自动检测）")
    parser.add_argument("--highlights", help="高光片段JSON文件（跳过转录直接切片）")
    parser.add_argument("--skip_transcribe", action="store_true", help="跳过转录步骤")
    
    # 新增：Hook和CTA相关参数
    parser.add_argument("--cta", default="关注我，获取更多干货", help="结尾引导文案")
    parser.add_argument("--cta_type", choices=["follow", "comment", "group", "save", "share", "custom"],
                        default="follow", help="CTA类型")
    parser.add_argument("--hook_style", choices=["question", "shock", "conflict", "data", "auto"],
                        default="auto", help="Hook风格")
    
    # 新增：剪映和发布相关参数
    parser.add_argument("--to_jianying", action="store_true", help="自动导入剪映草稿")
    parser.add_argument("--enhance", action="store_true", help="使用FFmpeg添加Hook/CTA文字叠加")
    parser.add_argument("--publish", action="store_true", help="显示发布指南")
    
    args = parser.parse_args()
    
    # 创建输出目录
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_dir = OUTPUT_DIR / timestamp
    output_dir.mkdir(parents=True, exist_ok=True)
    
    print("="*60)
    print("🎬 视频切片工具（增强版）")
    print("="*60)
    print(f"输入: {args.input}")
    print(f"切片数量: {args.clips}")
    print(f"时长范围: {args.min_duration}-{args.max_duration}秒")
    print(f"结尾CTA: {args.cta}")
    print(f"Hook风格: {args.hook_style}")
    print(f"导入剪映: {'是' if args.to_jianying else '否'}")
    print(f"输出目录: {output_dir}")
    print("="*60 + "\n")
    
    # 检查依赖
    if not check_dependencies():
        sys.exit(1)
    
    # 确定视频路径
    video_path = args.input
    
    # 如果是URL，先下载
    if video_path.startswith("http"):
        downloaded_path = str(output_dir / "source_video.mp4")
        video_path = download_video(args.input, downloaded_path)
    
    # 检查文件是否存在
    if not os.path.exists(video_path):
        print(f"❌ 视频文件不存在: {video_path}")
        sys.exit(1)
    
    # 如果提供了highlights文件，直接切片
    if args.highlights:
        print(f"📂 使用已有的高光片段文件: {args.highlights}")
        with open(args.highlights, "r", encoding="utf-8") as f:
            highlights = json.load(f)
        batch_clip(video_path, highlights, output_dir)
        
        # 增强切片（添加Hook/CTA文字叠加）
        if args.enhance:
            print("\n🎨 增强切片（添加Hook/CTA文字）...")
            enhance_cmd = [
                sys.executable, str(SCRIPTS_DIR / "enhance_clips.py"),
                "--clips_dir", str(output_dir / "clips"),
                "--highlights", args.highlights,
                "--default_cta", args.cta
            ]
            subprocess.run(enhance_cmd, check=False)
        
        # 导入剪映
        if args.to_jianying:
            print("\n📱 导入剪映...")
            jianying_cmd = [
                sys.executable, str(SCRIPTS_DIR / "jianying_process.py"),
                "--clips_dir", str(output_dir / "clips_enhanced" if args.enhance else output_dir / "clips"),
                "--highlights", args.highlights,
                "--add_hook", "--add_cta",
                "--default_cta", args.cta,
                "--to_jianying"
            ]
            subprocess.run(jianying_cmd, check=False)
        
        # 显示发布指南
        if args.publish:
            print("\n📤 发布指南...")
            publish_cmd = [
                sys.executable, str(SCRIPTS_DIR / "publish_douyin.py"),
                "--method", "guide",
                "--clips_dir", str(output_dir / "clips"),
                "--highlights", args.highlights
            ]
            subprocess.run(publish_cmd, check=False)
        
        return
    
    # 转录
    if not args.skip_transcribe:
        result = transcribe_video(video_path, output_dir, args.model, args.language)
    
    # 输出AI分析提示词（含Hook和CTA）
    transcript_path = output_dir / "transcript_with_timestamp.txt"
    print_ai_prompt(transcript_path, args.clips, args.min_duration, args.max_duration, args.cta)
    
    print("\n" + "="*60)
    print("📝 完成转录！接下来请：")
    print("="*60)
    print(f"1. 复制 {transcript_path} 的内容")
    print("2. 使用上面的提示词发送给Claude")
    print("3. 将Claude返回的JSON保存为 highlights.json")
    print("4. 运行以下命令完成切片：")
    
    # 根据参数生成完整命令
    cmd_parts = [
        f"python {SCRIPTS_DIR}/main.py",
        f"--input \"{video_path}\"",
        f"--highlights \"{output_dir}/highlights.json\"",
        f"--cta \"{args.cta}\""
    ]
    if args.enhance:
        cmd_parts.append("--enhance")
    if args.to_jianying:
        cmd_parts.append("--to_jianying")
    if args.publish:
        cmd_parts.append("--publish")
    
    print(f"\n   {' '.join(cmd_parts)}\n")
    
    # 快速提示
    print("💡 提示：")
    print("   - 在Cursor中直接粘贴文字稿，即可让AI分析生成highlights.json")
    print("   - 使用 --enhance 参数可用FFmpeg直接添加文字")
    print("   - 使用 --to_jianying 参数可自动导入剪映草稿")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
飞书视频智能切片工具
功能：
1. 从飞书妙记链接下载视频
2. 转录视频
3. AI智能识别高光片段并生成主题
4. 批量切片
5. 发送到飞书群

使用：
    python feishu_video_clip.py --url "https://cunkebao.feishu.cn/minutes/obcnjnsx2mz7vj5q843172p8" --webhook "https://open.feishu.cn/open-apis/bot/v2/hook/xxx"
"""

import os
import sys
import json
import re
import argparse
import requests
import subprocess
import tempfile
from pathlib import Path
from datetime import datetime
from urllib.parse import urlparse, parse_qs

# 添加视频切片目录到路径
VIDEO_CLIP_DIR = Path(__file__).parent.parent.parent.parent / "03_卡木（木）" / "视频切片"
sys.path.insert(0, str(VIDEO_CLIP_DIR / "scripts"))

# API配置
API_BASE = "http://localhost:5050/api"
FEISHU_API_BASE = "https://open.feishu.cn/open-apis"

# 飞书应用凭证
CONFIG = {
    'APP_ID': 'cli_a48818290ef8100d',
    'APP_SECRET': 'dhjU0qWd5AzicGWTf4cTqhCWJOrnuCk4'
}

TOKEN_FILE = Path(__file__).parent / ".feishu_tokens.json"

# 颜色输出
class Color:
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    CYAN = '\033[96m'
    BLUE = '\033[94m'
    END = '\033[0m'

def log(msg, color=None):
    if color:
        print(f"{color}{msg}{Color.END}")
    else:
        print(msg)

def load_tokens():
    """加载Token"""
    if TOKEN_FILE.exists():
        with open(TOKEN_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}

def get_app_access_token():
    """获取应用Token"""
    url = f"{FEISHU_API_BASE}/auth/v3/app_access_token/internal/"
    try:
        response = requests.post(url, json={
            "app_id": CONFIG['APP_ID'],
            "app_secret": CONFIG['APP_SECRET']
        }, timeout=10)
        data = response.json()
        if data.get('code') == 0:
            return data.get('app_access_token')
    except Exception as e:
        log(f"获取app_token失败: {e}", Color.RED)
    return None

def get_user_token():
    """获取用户Token"""
    tokens = load_tokens()
    return tokens.get('access_token')

def api_get(endpoint, params=None):
    """调用飞书API"""
    token = get_user_token()
    if not token:
        log("❌ 未授权，请先运行 feishu_api.py 完成授权", Color.RED)
        return None
    
    try:
        response = requests.get(
            f'{FEISHU_API_BASE}{endpoint}',
            headers={'Authorization': f'Bearer {token}'},
            params=params, timeout=30
        )
        return response.json()
    except Exception as e:
        log(f"API请求失败: {e}", Color.RED)
        return None

def extract_minute_token(url):
    """从飞书链接提取minute_token"""
    # 匹配格式: https://cunkebao.feishu.cn/minutes/{token}
    match = re.search(r'/minutes/([a-zA-Z0-9]+)', url)
    if match:
        return match.group(1)
    return None

def get_minute_detail(minute_token):
    """获取妙记详情"""
    log(f"📋 获取妙记详情: {minute_token}", Color.CYAN)
    result = api_get(f'/minutes/v1/minutes/{minute_token}')
    
    if result and result.get('code') == 0:
        return result.get('data', {}).get('minute', {})
    return None

def get_minute_video_url(minute_token):
    """获取妙记视频下载链接"""
    minute = get_minute_detail(minute_token)
    if not minute:
        return None
    
    # 方法1: 从minute详情中获取file_token
    file_token = minute.get('file_token') or minute.get('media_token')
    if file_token:
        # 获取文件下载链接
        result = api_get(f'/drive/v1/medias/{file_token}/download')
        if result and result.get('code') == 0:
            download_url = result.get('data', {}).get('download_url')
            if download_url:
                return download_url
    
    # 方法2: 从transcript中获取视频信息
    transcript_result = api_get(f'/minutes/v1/minutes/{minute_token}/transcript')
    if transcript_result and transcript_result.get('code') == 0:
        data = transcript_result.get('data', {})
        # 检查是否有视频URL
        video_url = data.get('video_url') or data.get('media_url')
        if video_url:
            return video_url
        
        # 检查是否有file_token
        file_token = data.get('file_token') or data.get('media_token')
        if file_token:
            result = api_get(f'/drive/v1/medias/{file_token}/download')
            if result and result.get('code') == 0:
                download_url = result.get('data', {}).get('download_url')
                if download_url:
                    return download_url
    
    # 方法3: 尝试从minute的原始数据中查找
    # 飞书可能将视频存储在云盘中，需要查找关联的文件
    return None

def download_video(url, output_path):
    """下载视频"""
    log(f"⬇️  下载视频到: {output_path}", Color.CYAN)
    try:
        token = get_user_token()
        headers = {'Authorization': f'Bearer {token}'}
        
        response = requests.get(url, headers=headers, stream=True, timeout=300)
        response.raise_for_status()
        
        total_size = int(response.headers.get('content-length', 0))
        downloaded = 0
        
        with open(output_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)
                    downloaded += len(chunk)
                    if total_size > 0:
                        percent = (downloaded / total_size) * 100
                        print(f"\r   进度: {percent:.1f}% ({downloaded}/{total_size} bytes)", end='', flush=True)
        
        print()  # 换行
        log(f"✅ 下载完成: {output_path}", Color.GREEN)
        return True
    except Exception as e:
        log(f"❌ 下载失败: {e}", Color.RED)
        return False

def transcribe_video(video_path):
    """转录视频（使用MLX Whisper）"""
    log("🎤 开始转录视频...", Color.CYAN)
    
    # 提取音频
    audio_path = video_path.with_suffix('.wav')
    log("   1. 提取音频...", Color.CYAN)
    cmd = [
        "ffmpeg", "-y", "-i", str(video_path),
        "-vn", "-ar", "16000", "-ac", "1",
        str(audio_path)
    ]
    subprocess.run(cmd, capture_output=True, check=True)
    
    # MLX Whisper转录
    log("   2. MLX Whisper转录...", Color.CYAN)
    try:
        # 激活conda环境
        conda_env = "mlx-whisper"
        conda_hook = os.path.expanduser("~/miniforge3/bin/conda")
        
        cmd = f"""
        eval "$({conda_hook} shell.zsh hook)"
        conda activate {conda_env}
        mlx_whisper {audio_path} --model mlx-community/whisper-small-mlx --language zh --output-format all
        """
        
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, executable="/bin/zsh")
        
        if result.returncode != 0:
            log(f"转录失败: {result.stderr}", Color.RED)
            return None
        
        # 读取转录结果
        transcript_path = audio_path.with_suffix('.srt')
        if transcript_path.exists():
            with open(transcript_path, 'r', encoding='utf-8') as f:
                transcript = f.read()
            log("✅ 转录完成", Color.GREEN)
            return transcript
        
    except Exception as e:
        log(f"转录失败: {e}", Color.RED)
    
    return None

def parse_srt_to_timestamped_text(srt_content):
    """将SRT字幕转换为带时间戳的文本"""
    lines = srt_content.strip().split('\n')
    segments = []
    current_segment = {}
    
    for line in lines:
        line = line.strip()
        if not line:
            if current_segment:
                segments.append(current_segment)
                current_segment = {}
            continue
        
        # 时间戳行: 00:00:00,000 --> 00:00:05,000
        if '-->' in line:
            times = line.split('-->')
            start_time = times[0].strip().replace(',', '.')
            end_time = times[1].strip().replace(',', '.')
            current_segment['start'] = start_time
            current_segment['end'] = end_time
        # 序号行
        elif line.isdigit():
            continue
        # 文本行
        else:
            if 'text' not in current_segment:
                current_segment['text'] = line
            else:
                current_segment['text'] += ' ' + line
    
    if current_segment:
        segments.append(current_segment)
    
    # 转换为时间戳格式文本
    timestamped_text = []
    for seg in segments:
        start = seg.get('start', '00:00:00')
        text = seg.get('text', '')
        timestamped_text.append(f"[{start}] {text}")
    
    return '\n'.join(timestamped_text)

def identify_highlights_with_ai(transcript, clip_count=5):
    """使用AI识别高光片段"""
    log(f"🤖 AI识别高光片段（目标{clip_count}个）...", Color.CYAN)
    
    # 读取提示词模板
    prompt_file = VIDEO_CLIP_DIR / "references" / "高光识别提示词.md"
    if prompt_file.exists():
        with open(prompt_file, 'r', encoding='utf-8') as f:
            prompt_template = f.read()
    else:
        # 简化版提示词
        prompt_template = """分析这段视频文字稿，找出{clip_count}个最适合做短视频的片段。

要求：
1. 每段30-120秒
2. 必须是完整的话
3. 为每个片段设计前3秒的Hook（抓眼球开场）
4. 为每个片段设计结尾CTA（引导进群/关注）
5. 输出JSON格式

输出字段：
- title: 视频标题（主题）
- start_time / end_time: 时间戳（格式：HH:MM:SS）
- hook_3sec: 前3秒抓眼球文案
- cta_ending: 结尾引导文案
- reason: 推荐理由

文字稿：
---
{transcript}
---

请严格按JSON格式输出，只输出JSON数组，不要其他解释。"""

    prompt = prompt_template.format(
        clip_count=clip_count,
        transcript=transcript[:5000]  # 限制长度
    )
    
    # 调用OpenAI API（使用Gemini作为备选）
    try:
        import openai
        # 使用OpenAI API
        client = openai.OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "你是一个专业的短视频内容策划师，擅长从长视频中找出最有传播力的片段。"},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7
        )
        result_text = response.choices[0].message.content
        
        # 提取JSON
        json_match = re.search(r'\[.*\]', result_text, re.DOTALL)
        if json_match:
            highlights = json.loads(json_match.group())
            log(f"✅ 识别到 {len(highlights)} 个高光片段", Color.GREEN)
            return highlights
        
    except Exception as e:
        log(f"AI识别失败，尝试使用Gemini: {e}", Color.YELLOW)
        # 使用Gemini API
        try:
            import google.generativeai as genai
            genai.configure(api_key="AIzaSyCPARryq8o6MKptLoT4STAvCsRB7uZuOK8")
            model = genai.GenerativeModel('gemini-pro')
            response = model.generate_content(prompt)
            result_text = response.text
            
            json_match = re.search(r'\[.*\]', result_text, re.DOTALL)
            if json_match:
                highlights = json.loads(json_match.group())
                log(f"✅ 识别到 {len(highlights)} 个高光片段", Color.GREEN)
                return highlights
        except Exception as e2:
            log(f"Gemini也失败: {e2}", Color.RED)
    
    return []

def batch_clip_video(video_path, highlights, output_dir):
    """批量切片视频"""
    log(f"✂️  批量切片（{len(highlights)}个片段）...", Color.CYAN)
    
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    clips = []
    for i, highlight in enumerate(highlights, 1):
        title = highlight.get('title', f'片段{i}')
        start_time = highlight.get('start_time', '00:00:00')
        end_time = highlight.get('end_time', '00:00:10')
        
        # 清理文件名
        safe_title = re.sub(r'[^\w\s-]', '', title)[:50]
        output_file = output_dir / f"{i:02d}_{safe_title}.mp4"
        
        log(f"   [{i}/{len(highlights)}] {title} ({start_time} → {end_time})", Color.CYAN)
        
        # 使用ffmpeg切片
        cmd = [
            "ffmpeg", "-y",
            "-i", str(video_path),
            "-ss", start_time,
            "-to", end_time,
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "23",
            "-c:a", "aac",
            "-b:a", "128k",
            str(output_file)
        ]
        
        try:
            subprocess.run(cmd, capture_output=True, check=True)
            log(f"      ✅ {output_file.name}", Color.GREEN)
            clips.append({
                'file': str(output_file),
                'title': title,
                'hook': highlight.get('hook_3sec', ''),
                'cta': highlight.get('cta_ending', '')
            })
        except Exception as e:
            log(f"      ❌ 失败: {e}", Color.RED)
    
    return clips

def send_to_feishu_group(webhook_url, clips):
    """发送切片到飞书群"""
    log(f"📤 发送到飞书群（{len(clips)}个切片）...", Color.CYAN)
    
    # 先发送汇总消息
    summary_message = {
        "msg_type": "interactive",
        "card": {
            "config": {
                "wide_screen_mode": True
            },
            "header": {
                "title": {
                    "tag": "plain_text",
                    "content": "🎬 视频切片完成"
                },
                "template": "blue"
            },
            "elements": [
                {
                    "tag": "div",
                    "text": {
                        "tag": "lark_md",
                        "content": f"**共生成 {len(clips)} 个视频切片**\n\n每个切片都包含：\n- ✅ 主题标题\n- ✅ 前3秒Hook文案\n- ✅ 结尾CTA引导"
                    }
                }
            ]
        }
    }
    
    try:
        response = requests.post(webhook_url, json=summary_message, timeout=10)
        if response.status_code == 200:
            log("   ✅ 汇总消息已发送", Color.GREEN)
        else:
            log(f"   ⚠️  汇总消息发送失败: {response.text}", Color.YELLOW)
    except Exception as e:
        log(f"   ⚠️  汇总消息发送失败: {e}", Color.YELLOW)
    
    # 发送每个切片的详细信息
    for i, clip in enumerate(clips, 1):
        title = clip['title']
        hook = clip.get('hook', '')
        cta = clip.get('cta', '')
        file_path = Path(clip['file'])
        
        # 构建消息
        message = {
            "msg_type": "interactive",
            "card": {
                "config": {
                    "wide_screen_mode": True
                },
                "header": {
                    "title": {
                        "tag": "plain_text",
                        "content": f"🎬 切片 {i}/{len(clips)}: {title}"
                    },
                    "template": "blue"
                },
                "elements": [
                    {
                        "tag": "div",
                        "text": {
                            "tag": "lark_md",
                            "content": f"**前3秒Hook:**\n{hook}\n\n**结尾CTA:**\n{cta}"
                        }
                    },
                    {
                        "tag": "note",
                        "elements": [
                            {
                                "tag": "plain_text",
                                "content": f"📁 视频文件: {file_path.name}\n💾 文件大小: {file_path.stat().st_size / 1024 / 1024:.2f} MB\n📂 路径: {file_path}"
                            }
                        ]
                    }
                ]
            }
        }
        
        try:
            response = requests.post(webhook_url, json=message, timeout=10)
            if response.status_code == 200:
                result = response.json()
                if result.get('code') == 0:
                    log(f"   ✅ [{i}/{len(clips)}] {title}", Color.GREEN)
                else:
                    log(f"   ⚠️  [{i}] 发送失败: {result.get('msg', '未知错误')}", Color.YELLOW)
            else:
                log(f"   ⚠️  [{i}] HTTP错误: {response.status_code}", Color.YELLOW)
        except Exception as e:
            log(f"   ⚠️  [{i}] 发送失败: {e}", Color.YELLOW)
        
        # 注意：飞书webhook不支持直接上传文件
        # 如果需要上传视频文件，需要：
        # 1. 使用飞书云盘API上传文件
        # 2. 获取分享链接
        # 3. 在消息中发送链接

def main():
    parser = argparse.ArgumentParser(description="飞书视频智能切片工具")
    parser.add_argument("--url", "-u", help="飞书妙记链接")
    parser.add_argument("--video", "-v", help="本地视频文件路径（如果已下载）")
    parser.add_argument("--webhook", "-w", help="飞书群webhook地址")
    parser.add_argument("--output", "-o", help="输出目录", default=None)
    parser.add_argument("--clips", "-c", type=int, default=5, help="切片数量（默认5个）")
    
    args = parser.parse_args()
    
    # 如果提供了本地视频，直接处理
    if args.video:
        video_path = Path(args.video)
        if not video_path.exists():
            log(f"❌ 视频文件不存在: {video_path}", Color.RED)
            return
        
        output_dir = Path(args.output) if args.output else video_path.parent / "clips"
        output_dir.mkdir(parents=True, exist_ok=True)
        
        log("=" * 60, Color.BLUE)
        log("🎬 视频智能切片工具", Color.BLUE)
        log("=" * 60, Color.BLUE)
        log(f"✅ 使用本地视频: {video_path}", Color.GREEN)
        
        # 直接跳到转录步骤
        transcript = transcribe_video(video_path)
        if not transcript:
            log("❌ 转录失败", Color.RED)
            return
        
        timestamped_text = parse_srt_to_timestamped_text(transcript)
        highlights = identify_highlights_with_ai(timestamped_text, args.clips)
        if not highlights:
            log("❌ 未识别到高光片段", Color.RED)
            return
        
        highlights_file = output_dir / "highlights.json"
        with open(highlights_file, 'w', encoding='utf-8') as f:
            json.dump(highlights, f, ensure_ascii=False, indent=2)
        log(f"✅ 高光片段已保存: {highlights_file}", Color.GREEN)
        
        clips = batch_clip_video(video_path, highlights, output_dir)
        if not clips:
            log("❌ 切片失败", Color.RED)
            return
        
        log(f"✅ 切片完成，共 {len(clips)} 个", Color.GREEN)
        
        if args.webhook:
            send_to_feishu_group(args.webhook, clips)
        
        log("=" * 60, Color.BLUE)
        log("✅ 全部完成！", Color.GREEN)
        log("=" * 60, Color.BLUE)
        return
    
    # 如果没有提供视频文件，必须提供URL
    if not args.url:
        log("❌ 必须提供 --url 或 --video 参数", Color.RED)
        return
    
    log("=" * 60, Color.BLUE)
    log("🎬 飞书视频智能切片工具", Color.BLUE)
    log("=" * 60, Color.BLUE)
    
    # 1. 提取minute_token
    minute_token = extract_minute_token(args.url)
    if not minute_token:
        log("❌ 无法从链接中提取minute_token", Color.RED)
        return
    
    log(f"✅ 提取到minute_token: {minute_token}", Color.GREEN)
    
    # 2. 获取视频下载链接或检查本地视频
    output_dir = Path(args.output) if args.output else Path.home() / "Downloads" / "feishu_clips"
    output_dir.mkdir(parents=True, exist_ok=True)
    
    video_path = output_dir / f"video_{minute_token}.mp4"
    
    # 检查视频是否已存在
    if video_path.exists():
        log(f"✅ 视频已存在: {video_path}", Color.GREEN)
    else:
        # 尝试获取视频下载链接
        video_url = get_minute_video_url(minute_token)
        if video_url:
            log(f"✅ 获取到视频链接", Color.GREEN)
            if not download_video(video_url, video_path):
                log("❌ 视频下载失败，请手动下载视频后重试", Color.RED)
                log(f"   请将视频保存为: {video_path}", Color.YELLOW)
                return
        else:
            log("⚠️  无法通过API获取视频下载链接", Color.YELLOW)
            log("   请手动从飞书下载视频，然后运行脚本", Color.YELLOW)
            log(f"   视频保存路径: {video_path}", Color.CYAN)
            log("   下载完成后，重新运行此脚本即可继续处理", Color.CYAN)
            
            # 检查是否有其他视频文件
            existing_videos = list(output_dir.glob("*.mp4"))
            if existing_videos:
                log(f"\n   发现现有视频文件:", Color.CYAN)
                for i, v in enumerate(existing_videos, 1):
                    log(f"   {i}. {v.name}", Color.CYAN)
                choice = input("\n   是否使用现有视频？(输入序号，或按Enter跳过): ").strip()
                if choice.isdigit() and 1 <= int(choice) <= len(existing_videos):
                    video_path = existing_videos[int(choice) - 1]
                    log(f"✅ 使用视频: {video_path.name}", Color.GREEN)
                else:
                    return
            else:
                return
    
    # 4. 转录视频
    transcript = transcribe_video(video_path)
    if not transcript:
        log("❌ 转录失败", Color.RED)
        return
    
    # 转换为时间戳格式
    timestamped_text = parse_srt_to_timestamped_text(transcript)
    
    # 5. AI识别高光片段
    highlights = identify_highlights_with_ai(timestamped_text, args.clips)
    if not highlights:
        log("❌ 未识别到高光片段", Color.RED)
        return
    
    # 保存高光片段JSON
    highlights_file = output_dir / "highlights.json"
    with open(highlights_file, 'w', encoding='utf-8') as f:
        json.dump(highlights, f, ensure_ascii=False, indent=2)
    log(f"✅ 高光片段已保存: {highlights_file}", Color.GREEN)
    
    # 6. 批量切片
    clips_dir = output_dir / "clips"
    clips = batch_clip_video(video_path, highlights, clips_dir)
    
    if not clips:
        log("❌ 切片失败", Color.RED)
        return
    
    log(f"✅ 切片完成，共 {len(clips)} 个", Color.GREEN)
    
    # 7. 发送到飞书群
    if args.webhook:
        send_to_feishu_group(args.webhook, clips)
    else:
        log("⚠️  未提供webhook地址，跳过发送到群", Color.YELLOW)
        log(f"   切片文件保存在: {clips_dir}", Color.CYAN)
    
    log("=" * 60, Color.BLUE)
    log("✅ 全部完成！", Color.GREEN)
    log("=" * 60, Color.BLUE)

if __name__ == "__main__":
    main()

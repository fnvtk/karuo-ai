#!/usr/bin/env python3
"""
飞书视频切片 - 纯命令行版本
============================

直接使用API密钥完成：
1. 自动获取token
2. 下载视频（或使用转录）
3. AI识别高光片段
4. 批量切片
5. 发送到飞书群

用法：
    python3 feishu_clip_cli.py "飞书链接" [webhook]
"""

import os
import sys
import json
import re
import time
import subprocess
import argparse
import requests
from pathlib import Path
from datetime import datetime

# ============ 配置 ============

SCRIPT_DIR = Path(__file__).parent

# 飞书应用凭证（从rules读取）
APP_ID = "cli_a48818290ef8100d"
APP_SECRET = "dhjU0qWd5AzicGWTf4cTqhCWJOrnuCk4"

# Gemini API Key
GEMINI_API_KEY = "AIzaSyCPARryq8o6MKptLoT4STAvCsRB7uZuOK8"

# 输出目录
OUTPUT_DIR = Path.home() / "Downloads" / "feishu_clips"

# Token文件
TOKEN_FILE = SCRIPT_DIR / ".feishu_tokens.json"

# 颜色
class C:
    G = '\033[92m'  # Green
    Y = '\033[93m'  # Yellow
    R = '\033[91m'  # Red
    B = '\033[94m'  # Blue
    C = '\033[96m'  # Cyan
    E = '\033[0m'   # End

def log(msg, c=None):
    print(f"{c}{msg}{C.E}" if c else msg)

# ============ Token管理 ============

def get_tenant_token():
    """获取租户Token（应用级别，无需用户授权）"""
    url = "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal"
    resp = requests.post(url, json={"app_id": APP_ID, "app_secret": APP_SECRET}, timeout=10)
    data = resp.json()
    if data.get('code') == 0:
        return data.get('tenant_access_token')
    return None

def get_app_token():
    """获取应用Token"""
    url = "https://open.feishu.cn/open-apis/auth/v3/app_access_token/internal"
    resp = requests.post(url, json={"app_id": APP_ID, "app_secret": APP_SECRET}, timeout=10)
    data = resp.json()
    if data.get('code') == 0:
        return data.get('app_access_token')
    return None

def load_user_token():
    """加载保存的用户Token"""
    if TOKEN_FILE.exists():
        with open(TOKEN_FILE, 'r') as f:
            return json.load(f)
    return {}

def refresh_user_token():
    """刷新用户Token"""
    tokens = load_user_token()
    refresh = tokens.get('refresh_token')
    if not refresh:
        return None
    
    app_token = get_app_token()
    if not app_token:
        return None
    
    url = "https://open.feishu.cn/open-apis/authen/v1/oidc/refresh_access_token"
    resp = requests.post(url, 
        headers={"Authorization": f"Bearer {app_token}", "Content-Type": "application/json"},
        json={"grant_type": "refresh_token", "refresh_token": refresh},
        timeout=10
    )
    data = resp.json()
    if data.get('code') == 0:
        new_tokens = {
            'access_token': data['data']['access_token'],
            'refresh_token': data['data']['refresh_token'],
            'name': tokens.get('name', '飞书用户'),
            'auth_time': datetime.now().isoformat()
        }
        with open(TOKEN_FILE, 'w') as f:
            json.dump(new_tokens, f, ensure_ascii=False, indent=2)
        return new_tokens['access_token']
    return None

def get_best_token():
    """获取最佳可用Token"""
    # 优先租户token（可获取妙记基本信息）
    tenant_token = get_tenant_token()
    if tenant_token:
        return tenant_token, 'tenant'
    # 备用用户token
    user_token = refresh_user_token()
    if user_token:
        return user_token, 'user'
    return None, None

# ============ 飞书API ============

def extract_minute_token(url):
    """提取妙记Token"""
    match = re.search(r'/minutes/([a-zA-Z0-9]+)', url)
    return match.group(1) if match else None

def get_minute_info(minute_token, token):
    """获取妙记信息"""
    url = f"https://open.feishu.cn/open-apis/minutes/v1/minutes/{minute_token}"
    resp = requests.get(url, headers={"Authorization": f"Bearer {token}"}, timeout=30)
    data = resp.json()
    if data.get('code') == 0:
        return data.get('data', {}).get('minute', {})
    return None

def get_minute_transcript(minute_token, token):
    """获取妙记转录"""
    url = f"https://open.feishu.cn/open-apis/minutes/v1/minutes/{minute_token}/transcript"
    resp = requests.get(url, headers={"Authorization": f"Bearer {token}"}, timeout=30)
    data = resp.json()
    if data.get('code') == 0:
        return data.get('data', {})
    return None

# ============ 智能处理 ============

def generate_transcript_from_title(title, duration_ms):
    """根据标题和时长生成模拟转录（当无法获取真实转录时）"""
    duration_sec = int(duration_ms) // 1000
    duration_min = duration_sec // 60
    
    # 生成时间节点
    segments = []
    interval = max(30, duration_sec // 10)  # 每30秒或10等分
    
    for i in range(0, duration_sec, interval):
        h = i // 3600
        m = (i % 3600) // 60
        s = i % 60
        timestamp = f"{h:02d}:{m:02d}:{s:02d}"
        segments.append(f"[{timestamp}] 视频内容段落 {i//interval + 1}")
    
    return '\n'.join(segments), duration_sec

def identify_highlights_with_ai(info, transcript_text, clip_count=5):
    """使用AI识别高光片段"""
    log(f"🤖 AI识别高光片段（{clip_count}个）...", C.B)
    
    title = info.get('title', '未知标题')
    duration_ms = int(info.get('duration', 0))
    duration_sec = duration_ms // 1000
    duration_str = f"{duration_sec//3600}时{(duration_sec%3600)//60}分{duration_sec%60}秒"
    
    prompt = f"""你是短视频内容策划专家。请为这个视频设计{clip_count}个最适合做短视频的切片。

视频信息：
- 标题：{title}
- 时长：{duration_str}（{duration_sec}秒）

要求：
1. 每个切片30-90秒
2. 均匀分布在整个视频时间轴上
3. 为每个切片设计吸引人的标题
4. 设计前3秒Hook（抓眼球开场）
5. 设计结尾CTA（引导关注/进群）

严格按以下JSON格式输出（只输出JSON数组）：
[
  {{
    "title": "切片标题",
    "start_time": "HH:MM:SS",
    "end_time": "HH:MM:SS", 
    "hook_3sec": "前3秒文案",
    "cta_ending": "结尾引导语"
  }}
]

请确保时间戳在0到{duration_sec}秒范围内，格式为HH:MM:SS。"""

    try:
        import google.generativeai as genai
        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel('gemini-2.0-flash')
        response = model.generate_content(prompt)
        result = response.text
        
        # 提取JSON
        json_match = re.search(r'\[.*\]', result, re.DOTALL)
        if json_match:
            highlights = json.loads(json_match.group())
            log(f"   ✅ AI生成 {len(highlights)} 个切片方案", C.G)
            return highlights
    except Exception as e:
        log(f"   AI失败: {e}", C.Y)
    
    # 备用：均匀切片
    log("   使用均匀切片方案", C.Y)
    return generate_uniform_highlights(duration_sec, clip_count)

def generate_uniform_highlights(duration_sec, clip_count):
    """均匀生成切片"""
    highlights = []
    clip_duration = 60  # 每个切片60秒
    gap = (duration_sec - clip_count * clip_duration) // (clip_count + 1)
    gap = max(gap, 10)
    
    for i in range(clip_count):
        start = gap + i * (clip_duration + gap)
        if start + clip_duration > duration_sec:
            break
        
        end = start + clip_duration
        highlights.append({
            "title": f"精彩片段{i+1}",
            "start_time": f"{start//3600:02d}:{(start%3600)//60:02d}:{start%60:02d}",
            "end_time": f"{end//3600:02d}:{(end%3600)//60:02d}:{end%60:02d}",
            "hook_3sec": "这段内容值得看",
            "cta_ending": "关注获取更多干货"
        })
    
    return highlights

# ============ 视频处理 ============

def download_video_alternative(feishu_url, output_path, info):
    """备用视频下载方案"""
    log("📥 下载视频...", C.B)
    
    # 方案1: 使用yt-dlp + cookies
    log("   尝试yt-dlp下载...", C.C)
    cmd = [
        "yt-dlp",
        "--cookies-from-browser", "chrome",
        "-o", str(output_path),
        feishu_url
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode == 0 and output_path.exists():
        log(f"   ✅ 下载成功: {output_path}", C.G)
        return True
    
    # 方案2: 提示手动下载
    log("   ⚠️  自动下载失败", C.Y)
    log(f"   请手动下载视频到: {output_path}", C.Y)
    log(f"   视频链接: {feishu_url}", C.C)
    
    # 检查是否已有视频
    if output_path.exists():
        log(f"   ✅ 检测到视频文件", C.G)
        return True
    
    # 等待用户下载
    log("   下载完成后按Enter继续（或输入视频路径）...", C.C)
    user_input = input().strip()
    
    if user_input:
        alt_path = Path(user_input)
        if alt_path.exists():
            # 复制到目标位置
            import shutil
            shutil.copy(alt_path, output_path)
            log(f"   ✅ 使用视频: {alt_path}", C.G)
            return True
    
    if output_path.exists():
        return True
    
    return False

def batch_clip(video_path, highlights, output_dir):
    """批量切片"""
    log(f"✂️  批量切片（{len(highlights)}个）...", C.B)
    
    clips_dir = output_dir / "clips"
    clips_dir.mkdir(parents=True, exist_ok=True)
    
    clips = []
    for i, h in enumerate(highlights, 1):
        title = h.get('title', f'片段{i}')
        start = h.get('start_time', '00:00:00')
        end = h.get('end_time', '00:01:00')
        
        safe_title = re.sub(r'[^\w\s-]', '', title)[:30]
        output_file = clips_dir / f"{i:02d}_{safe_title}.mp4"
        
        log(f"   [{i}] {title} ({start}→{end})", C.C)
        
        cmd = [
            "ffmpeg", "-y", "-i", str(video_path),
            "-ss", start, "-to", end,
            "-c:v", "libx264", "-preset", "fast", "-crf", "23",
            "-c:a", "aac", "-b:a", "128k",
            str(output_file)
        ]
        
        result = subprocess.run(cmd, capture_output=True)
        if result.returncode == 0 and output_file.exists():
            log(f"       ✅ {output_file.name}", C.G)
            clips.append({
                'file': str(output_file),
                'title': title,
                'hook': h.get('hook_3sec', ''),
                'cta': h.get('cta_ending', ''),
                'start': start,
                'end': end
            })
        else:
            log(f"       ❌ 失败", C.R)
    
    return clips

def send_to_feishu(webhook, clips, source_url):
    """发送到飞书群"""
    log(f"📤 发送到飞书群（{len(clips)}个）...", C.B)
    
    # 汇总消息
    summary = {
        "msg_type": "interactive",
        "card": {
            "config": {"wide_screen_mode": True},
            "header": {"title": {"tag": "plain_text", "content": f"🎬 视频切片完成 - 共{len(clips)}个"}, "template": "blue"},
            "elements": [{"tag": "div", "text": {"tag": "lark_md", "content": f"**来源**: [原视频链接]({source_url})\n\n每个切片包含：主题、Hook、CTA"}}]
        }
    }
    
    try:
        resp = requests.post(webhook, json=summary, timeout=10)
        if resp.status_code == 200 and resp.json().get('code') == 0:
            log("   ✅ 汇总消息", C.G)
    except Exception as e:
        log(f"   ⚠️  汇总失败: {e}", C.Y)
    
    # 每个切片
    for i, clip in enumerate(clips, 1):
        msg = {
            "msg_type": "interactive",
            "card": {
                "config": {"wide_screen_mode": True},
                "header": {"title": {"tag": "plain_text", "content": f"📹 {i}. {clip['title']}"}, "template": "green"},
                "elements": [
                    {"tag": "div", "text": {"tag": "lark_md", "content": f"⏱ {clip['start']} → {clip['end']}\n\n**Hook**: {clip['hook']}\n\n**CTA**: {clip['cta']}"}},
                    {"tag": "note", "elements": [{"tag": "plain_text", "content": f"📁 {Path(clip['file']).name}"}]}
                ]
            }
        }
        try:
            resp = requests.post(webhook, json=msg, timeout=10)
            if resp.status_code == 200:
                log(f"   ✅ [{i}] {clip['title'][:20]}", C.G)
            time.sleep(0.3)
        except:
            pass

# ============ 主函数 ============

def main():
    parser = argparse.ArgumentParser(description="飞书视频切片CLI")
    parser.add_argument("url", help="飞书妙记链接")
    parser.add_argument("webhook", nargs='?', default="https://open.feishu.cn/open-apis/bot/v2/hook/14a7e0d3-864d-4709-ad40-0def6edba566", help="飞书群webhook")
    parser.add_argument("--clips", "-c", type=int, default=5, help="切片数量")
    parser.add_argument("--output", "-o", help="输出目录")
    
    args = parser.parse_args()
    
    print()
    log("=" * 55, C.B)
    log("🎬 飞书视频切片CLI", C.B)
    log("=" * 55, C.B)
    print()
    
    # 提取token
    minute_token = extract_minute_token(args.url)
    if not minute_token:
        log("❌ 无效的飞书链接", C.R)
        return
    
    # 获取Token
    log("🔑 获取API Token...", C.B)
    token, token_type = get_best_token()
    if not token:
        log("❌ 无法获取Token", C.R)
        return
    log(f"   ✅ 使用{token_type} token", C.G)
    
    # 获取妙记信息
    log("📋 获取妙记信息...", C.B)
    info = get_minute_info(minute_token, token)
    if not info:
        log("❌ 无法获取妙记信息", C.R)
        return
    
    title = info.get('title', '未知')
    duration_ms = int(info.get('duration', 0))
    duration_min = duration_ms // 60000
    log(f"   标题: {title}", C.C)
    log(f"   时长: {duration_min}分钟", C.C)
    print()
    
    # 设置输出目录
    output_dir = Path(args.output) if args.output else OUTPUT_DIR / minute_token
    output_dir.mkdir(parents=True, exist_ok=True)
    
    video_path = output_dir / "video.mp4"
    
    # 下载视频
    if not video_path.exists():
        if not download_video_alternative(args.url, video_path, info):
            log("❌ 需要视频文件才能切片", C.R)
            log(f"   请将视频保存到: {video_path}", C.Y)
            return
    else:
        log(f"📥 视频已存在: {video_path}", C.B)
    print()
    
    # AI识别高光
    highlights = identify_highlights_with_ai(info, "", args.clips)
    if not highlights:
        log("❌ 无法生成切片方案", C.R)
        return
    
    # 保存方案
    highlights_file = output_dir / "highlights.json"
    with open(highlights_file, 'w') as f:
        json.dump(highlights, f, ensure_ascii=False, indent=2)
    print()
    
    # 批量切片
    clips = batch_clip(video_path, highlights, output_dir)
    if not clips:
        log("❌ 切片失败", C.R)
        return
    print()
    
    # 发送到群
    if args.webhook:
        send_to_feishu(args.webhook, clips, args.url)
    print()
    
    log("=" * 55, C.B)
    log("✅ 完成！", C.G)
    log("=" * 55, C.B)
    log(f"📂 输出: {output_dir / 'clips'}", C.C)

if __name__ == "__main__":
    main()

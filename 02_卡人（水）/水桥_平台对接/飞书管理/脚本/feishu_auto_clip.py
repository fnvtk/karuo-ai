#!/usr/bin/env python3
"""
飞书视频一键切片工具 v2.0
===============================

功能：
1. 自动登录飞书（保存登录状态，只需首次扫码）
2. 自动下载视频
3. AI智能识别高光片段
4. 批量切片
5. 发送到飞书群

用法：
    python3 feishu_auto_clip.py "飞书妙记链接" "飞书群webhook"

示例：
    python3 feishu_auto_clip.py "https://cunkebao.feishu.cn/minutes/xxx" "https://open.feishu.cn/open-apis/bot/v2/hook/xxx"
"""

import os
import sys
import json
import re
import time
import subprocess
import argparse
from pathlib import Path
from datetime import datetime

# ============ 配置 ============

SCRIPT_DIR = Path(__file__).parent
KARUO_AI_DIR = SCRIPT_DIR.parent.parent.parent
VIDEO_CLIP_DIR = KARUO_AI_DIR / "03_卡木（木）" / "视频切片"

# 浏览器登录状态存储
BROWSER_STATE_DIR = SCRIPT_DIR / ".browser_state"

# 输出目录
OUTPUT_DIR = Path.home() / "Downloads" / "feishu_clips"

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

def extract_minute_token(url):
    """从URL提取minute_token"""
    match = re.search(r'/minutes/([a-zA-Z0-9]+)', url)
    return match.group(1) if match else None

# ============ 步骤1: 自动下载视频 ============

def download_video_with_playwright(feishu_url, output_path):
    """
    使用playwright自动化下载飞书视频
    - 保存登录状态，只需首次扫码
    - 后续自动复用登录状态
    """
    log("📥 步骤1: 下载视频", Color.BLUE)
    
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        log("   安装playwright...", Color.CYAN)
        subprocess.run([sys.executable, "-m", "pip", "install", "playwright", "-q"], check=True)
        subprocess.run([sys.executable, "-m", "playwright", "install", "chromium"], check=True)
        from playwright.sync_api import sync_playwright
    
    BROWSER_STATE_DIR.mkdir(parents=True, exist_ok=True)
    state_file = BROWSER_STATE_DIR / "feishu_state.json"
    
    with sync_playwright() as p:
        # 使用持久化上下文
        browser = p.chromium.launch_persistent_context(
            user_data_dir=str(BROWSER_STATE_DIR / "chromium_data"),
            headless=False,  # 首次需要显示界面扫码
            args=['--disable-blink-features=AutomationControlled']
        )
        
        page = browser.new_page()
        
        # 访问飞书链接
        log("   访问飞书链接...", Color.CYAN)
        page.goto(feishu_url, timeout=60000)
        
        # 检查是否需要登录
        time.sleep(3)
        current_url = page.url
        
        if "accounts.feishu.cn" in current_url or "login" in current_url:
            log("   ⚠️  需要登录，请在浏览器中扫码登录...", Color.YELLOW)
            log("   登录后会自动继续，登录状态会保存", Color.CYAN)
            
            # 等待登录完成（最多5分钟）
            for i in range(300):
                time.sleep(1)
                current_url = page.url
                if "minutes" in current_url and "login" not in current_url:
                    log("   ✅ 登录成功！", Color.GREEN)
                    break
            else:
                log("   ❌ 登录超时", Color.RED)
                browser.close()
                return False
        
        # 等待页面加载
        log("   等待页面加载...", Color.CYAN)
        time.sleep(5)
        
        # 尝试找到视频下载按钮或视频元素
        try:
            # 方法1: 查找下载按钮
            download_btn = page.query_selector('[data-testid="download-btn"]') or \
                          page.query_selector('button:has-text("下载")') or \
                          page.query_selector('[class*="download"]')
            
            if download_btn:
                log("   找到下载按钮，开始下载...", Color.CYAN)
                with page.expect_download(timeout=120000) as download_info:
                    download_btn.click()
                download = download_info.value
                download.save_as(str(output_path))
                log(f"   ✅ 视频已保存: {output_path}", Color.GREEN)
                browser.close()
                return True
            
            # 方法2: 查找视频URL
            video_element = page.query_selector('video')
            if video_element:
                video_src = video_element.get_attribute('src')
                if video_src:
                    log("   找到视频源，下载中...", Color.CYAN)
                    # 使用requests下载
                    import requests
                    cookies = {c['name']: c['value'] for c in page.context.cookies()}
                    response = requests.get(video_src, cookies=cookies, stream=True)
                    with open(output_path, 'wb') as f:
                        for chunk in response.iter_content(chunk_size=8192):
                            f.write(chunk)
                    log(f"   ✅ 视频已保存: {output_path}", Color.GREEN)
                    browser.close()
                    return True
            
            # 方法3: 从网络请求中获取视频URL
            log("   搜索视频资源...", Color.CYAN)
            
            # 监听网络请求
            video_urls = []
            
            def handle_response(response):
                url = response.url
                content_type = response.headers.get('content-type', '')
                if 'video' in content_type or '.mp4' in url or 'media' in url:
                    video_urls.append(url)
            
            page.on('response', handle_response)
            
            # 刷新页面触发请求
            page.reload()
            time.sleep(10)
            
            if video_urls:
                video_url = video_urls[0]
                log(f"   找到视频URL: {video_url[:50]}...", Color.CYAN)
                
                import requests
                cookies = {c['name']: c['value'] for c in page.context.cookies()}
                headers = {'User-Agent': page.evaluate('navigator.userAgent')}
                response = requests.get(video_url, cookies=cookies, headers=headers, stream=True)
                
                with open(output_path, 'wb') as f:
                    for chunk in response.iter_content(chunk_size=8192):
                        f.write(chunk)
                
                log(f"   ✅ 视频已保存: {output_path}", Color.GREEN)
                browser.close()
                return True
            
            # 方法4: 手动指定位置让用户下载
            log("   ⚠️  无法自动下载，请手动下载视频", Color.YELLOW)
            log(f"   保存到: {output_path}", Color.CYAN)
            log("   下载完成后按Enter继续...", Color.CYAN)
            input()
            
            if output_path.exists():
                log("   ✅ 检测到视频文件", Color.GREEN)
                browser.close()
                return True
            
        except Exception as e:
            log(f"   下载出错: {e}", Color.RED)
        
        browser.close()
        return False

# ============ 步骤2: 转录视频 ============

def transcribe_video(video_path):
    """使用MLX Whisper转录"""
    log("🎤 步骤2: 转录视频", Color.BLUE)
    
    audio_path = video_path.with_suffix('.wav')
    
    # 提取音频
    log("   提取音频...", Color.CYAN)
    cmd = ["ffmpeg", "-y", "-i", str(video_path), "-vn", "-ar", "16000", "-ac", "1", str(audio_path)]
    result = subprocess.run(cmd, capture_output=True)
    if result.returncode != 0:
        log("   ❌ 音频提取失败", Color.RED)
        return None
    
    # MLX Whisper转录
    log("   MLX Whisper转录中（约3分钟/小时视频）...", Color.CYAN)
    
    conda_hook = os.path.expanduser("~/miniforge3/bin/conda")
    cmd = f'''
    eval "$({conda_hook} shell.zsh hook)"
    conda activate mlx-whisper
    mlx_whisper "{audio_path}" --model mlx-community/whisper-small-mlx --language zh --output-format all
    '''
    
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True, executable="/bin/zsh")
    
    if result.returncode != 0:
        log(f"   ❌ 转录失败: {result.stderr[:200]}", Color.RED)
        return None
    
    # 读取SRT文件
    srt_path = audio_path.with_suffix('.srt')
    if srt_path.exists():
        with open(srt_path, 'r', encoding='utf-8') as f:
            transcript = f.read()
        log("   ✅ 转录完成", Color.GREEN)
        return transcript
    
    return None

def parse_srt_to_text(srt_content):
    """SRT转带时间戳文本"""
    lines = srt_content.strip().split('\n')
    segments = []
    current = {}
    
    for line in lines:
        line = line.strip()
        if not line:
            if current:
                segments.append(current)
                current = {}
            continue
        
        if '-->' in line:
            times = line.split('-->')
            current['start'] = times[0].strip().replace(',', '.').split('.')[0]
        elif not line.isdigit() and 'start' in current:
            current['text'] = current.get('text', '') + ' ' + line
    
    if current:
        segments.append(current)
    
    return '\n'.join([f"[{s.get('start', '00:00:00')}] {s.get('text', '').strip()}" for s in segments])

# ============ 步骤3: AI识别高光片段 ============

def identify_highlights(transcript_text, clip_count=5):
    """AI识别高光片段"""
    log(f"🤖 步骤3: AI识别高光片段（{clip_count}个）", Color.BLUE)
    
    prompt = f"""分析这段视频文字稿，找出{clip_count}个最适合做短视频的片段。

要求：
1. 每段30-120秒
2. 必须是完整的话
3. 为每个片段设计前3秒的Hook（抓眼球开场）
4. 为每个片段设计结尾CTA（引导关注/进群）

输出JSON格式（只输出JSON数组，不要其他内容）：
[
  {{
    "title": "视频标题/主题",
    "start_time": "HH:MM:SS",
    "end_time": "HH:MM:SS",
    "hook_3sec": "前3秒抓眼球文案",
    "cta_ending": "结尾引导文案",
    "reason": "推荐理由"
  }}
]

文字稿：
---
{transcript_text[:6000]}
---"""

    # 尝试Gemini API
    try:
        import google.generativeai as genai
        genai.configure(api_key="AIzaSyCPARryq8o6MKptLoT4STAvCsRB7uZuOK8")
        model = genai.GenerativeModel('gemini-2.0-flash')
        response = model.generate_content(prompt)
        result_text = response.text
        
        # 提取JSON
        json_match = re.search(r'\[.*\]', result_text, re.DOTALL)
        if json_match:
            highlights = json.loads(json_match.group())
            log(f"   ✅ 识别到 {len(highlights)} 个高光片段", Color.GREEN)
            
            # 显示片段信息
            for i, h in enumerate(highlights, 1):
                log(f"   [{i}] {h.get('title', '未命名')}", Color.CYAN)
                log(f"       时间: {h.get('start_time')} → {h.get('end_time')}", Color.CYAN)
                log(f"       Hook: {h.get('hook_3sec', '')[:30]}...", Color.CYAN)
            
            return highlights
    except Exception as e:
        log(f"   Gemini API失败: {e}", Color.YELLOW)
    
    # 备用：简单时间切片
    log("   使用备用方案：按时间均匀切片", Color.YELLOW)
    return generate_simple_highlights(transcript_text, clip_count)

def generate_simple_highlights(transcript_text, clip_count):
    """备用方案：按时间均匀生成切片"""
    lines = transcript_text.strip().split('\n')
    timestamps = []
    
    for line in lines:
        match = re.match(r'\[(\d{2}:\d{2}:\d{2})\]', line)
        if match:
            timestamps.append(match.group(1))
    
    if len(timestamps) < 2:
        return []
    
    # 均匀分布
    step = len(timestamps) // (clip_count + 1)
    highlights = []
    
    for i in range(clip_count):
        start_idx = (i + 1) * step
        end_idx = min(start_idx + step, len(timestamps) - 1)
        
        highlights.append({
            "title": f"精彩片段{i+1}",
            "start_time": timestamps[start_idx],
            "end_time": timestamps[end_idx],
            "hook_3sec": "这段内容很精彩",
            "cta_ending": "关注我，获取更多干货",
            "reason": "自动生成"
        })
    
    return highlights

# ============ 步骤4: 批量切片 ============

def batch_clip(video_path, highlights, output_dir):
    """批量切片视频"""
    log(f"✂️  步骤4: 批量切片（{len(highlights)}个）", Color.BLUE)
    
    clips_dir = output_dir / "clips"
    clips_dir.mkdir(parents=True, exist_ok=True)
    
    clips = []
    for i, h in enumerate(highlights, 1):
        title = h.get('title', f'片段{i}')
        start = h.get('start_time', '00:00:00')
        end = h.get('end_time', '00:00:10')
        
        safe_title = re.sub(r'[^\w\s-]', '', title)[:30]
        output_file = clips_dir / f"{i:02d}_{safe_title}.mp4"
        
        log(f"   [{i}/{len(highlights)}] {title}", Color.CYAN)
        
        cmd = [
            "ffmpeg", "-y", "-i", str(video_path),
            "-ss", start, "-to", end,
            "-c:v", "libx264", "-preset", "fast", "-crf", "23",
            "-c:a", "aac", "-b:a", "128k",
            str(output_file)
        ]
        
        result = subprocess.run(cmd, capture_output=True)
        if result.returncode == 0:
            log(f"       ✅ {output_file.name}", Color.GREEN)
            clips.append({
                'file': str(output_file),
                'title': title,
                'hook': h.get('hook_3sec', ''),
                'cta': h.get('cta_ending', ''),
                'start': start,
                'end': end
            })
        else:
            log(f"       ❌ 切片失败", Color.RED)
    
    return clips

# ============ 步骤5: 发送到飞书群 ============

def send_to_feishu(webhook_url, clips, source_url):
    """发送切片信息到飞书群"""
    log(f"📤 步骤5: 发送到飞书群", Color.BLUE)
    
    import requests
    
    # 发送汇总消息
    summary = {
        "msg_type": "interactive",
        "card": {
            "config": {"wide_screen_mode": True},
            "header": {
                "title": {"tag": "plain_text", "content": f"🎬 视频切片完成 - 共{len(clips)}个"},
                "template": "blue"
            },
            "elements": [
                {
                    "tag": "div",
                    "text": {
                        "tag": "lark_md",
                        "content": f"**来源**: {source_url[:50]}...\n\n每个切片包含：主题标题、前3秒Hook、结尾CTA"
                    }
                }
            ]
        }
    }
    
    try:
        resp = requests.post(webhook_url, json=summary, timeout=10)
        if resp.status_code == 200:
            log("   ✅ 汇总消息已发送", Color.GREEN)
    except Exception as e:
        log(f"   ⚠️  汇总消息发送失败: {e}", Color.YELLOW)
    
    # 发送每个切片
    for i, clip in enumerate(clips, 1):
        message = {
            "msg_type": "interactive",
            "card": {
                "config": {"wide_screen_mode": True},
                "header": {
                    "title": {"tag": "plain_text", "content": f"📹 切片{i}: {clip['title']}"},
                    "template": "green"
                },
                "elements": [
                    {
                        "tag": "div",
                        "text": {
                            "tag": "lark_md",
                            "content": f"**时间**: {clip['start']} → {clip['end']}\n\n**Hook**: {clip['hook']}\n\n**CTA**: {clip['cta']}"
                        }
                    },
                    {
                        "tag": "note",
                        "elements": [{"tag": "plain_text", "content": f"文件: {Path(clip['file']).name}"}]
                    }
                ]
            }
        }
        
        try:
            resp = requests.post(webhook_url, json=message, timeout=10)
            if resp.status_code == 200:
                log(f"   ✅ [{i}] {clip['title']}", Color.GREEN)
            else:
                log(f"   ⚠️  [{i}] 发送失败", Color.YELLOW)
        except Exception as e:
            log(f"   ⚠️  [{i}] 发送失败: {e}", Color.YELLOW)
        
        time.sleep(0.5)  # 避免频率限制

# ============ 主流程 ============

def main():
    parser = argparse.ArgumentParser(description="飞书视频一键切片工具")
    parser.add_argument("url", help="飞书妙记链接")
    parser.add_argument("webhook", nargs='?', help="飞书群webhook地址（可选）")
    parser.add_argument("--clips", "-c", type=int, default=5, help="切片数量（默认5）")
    parser.add_argument("--output", "-o", help="输出目录")
    
    args = parser.parse_args()
    
    # 打印banner
    print()
    log("=" * 60, Color.BLUE)
    log("🎬 飞书视频一键切片工具 v2.0", Color.BLUE)
    log("=" * 60, Color.BLUE)
    print()
    
    # 提取token
    minute_token = extract_minute_token(args.url)
    if not minute_token:
        log("❌ 无效的飞书链接", Color.RED)
        return
    
    log(f"📋 妙记Token: {minute_token}", Color.CYAN)
    
    # 设置输出目录
    output_dir = Path(args.output) if args.output else OUTPUT_DIR / minute_token
    output_dir.mkdir(parents=True, exist_ok=True)
    log(f"📂 输出目录: {output_dir}", Color.CYAN)
    print()
    
    # 视频路径
    video_path = output_dir / f"video.mp4"
    
    # 步骤1: 下载视频（如果不存在）
    if video_path.exists():
        log(f"📥 步骤1: 视频已存在，跳过下载", Color.BLUE)
        log(f"   {video_path}", Color.GREEN)
    else:
        if not download_video_with_playwright(args.url, video_path):
            log("❌ 视频下载失败", Color.RED)
            return
    print()
    
    # 步骤2: 转录
    srt_path = video_path.with_suffix('.srt')
    if srt_path.exists():
        log("🎤 步骤2: 字幕已存在，跳过转录", Color.BLUE)
        with open(srt_path, 'r', encoding='utf-8') as f:
            transcript = f.read()
    else:
        transcript = transcribe_video(video_path)
        if not transcript:
            log("❌ 转录失败", Color.RED)
            return
    print()
    
    # 步骤3: AI识别
    transcript_text = parse_srt_to_text(transcript)
    highlights = identify_highlights(transcript_text, args.clips)
    if not highlights:
        log("❌ 未识别到高光片段", Color.RED)
        return
    
    # 保存highlights
    highlights_file = output_dir / "highlights.json"
    with open(highlights_file, 'w', encoding='utf-8') as f:
        json.dump(highlights, f, ensure_ascii=False, indent=2)
    log(f"   保存到: {highlights_file}", Color.CYAN)
    print()
    
    # 步骤4: 切片
    clips = batch_clip(video_path, highlights, output_dir)
    if not clips:
        log("❌ 切片失败", Color.RED)
        return
    print()
    
    # 步骤5: 发送到群
    if args.webhook:
        send_to_feishu(args.webhook, clips, args.url)
    else:
        log("📤 步骤5: 未提供webhook，跳过发送", Color.BLUE)
    
    print()
    log("=" * 60, Color.BLUE)
    log("✅ 全部完成！", Color.GREEN)
    log("=" * 60, Color.BLUE)
    log(f"📂 切片目录: {output_dir / 'clips'}", Color.CYAN)
    log(f"📄 片段信息: {highlights_file}", Color.CYAN)

if __name__ == "__main__":
    main()

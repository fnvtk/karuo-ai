#!/usr/bin/env python3
"""
飞书视频一键切片 - 全自动版
===========================

全自动流程：
1. 获取妙记信息（API）
2. 打开飞书客户端下载视频（自动登录）
3. 监控下载目录，自动检测新视频
4. AI识别高光片段
5. 批量切片
6. 发送到飞书群

用法：
    python3 feishu_one_click.py "飞书妙记链接" [webhook]
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
import glob

# ============ 配置 ============

SCRIPT_DIR = Path(__file__).parent

# 飞书应用凭证
APP_ID = "cli_a48818290ef8100d"
APP_SECRET = "dhjU0qWd5AzicGWTf4cTqhCWJOrnuCk4"

# Gemini API
GEMINI_API_KEY = "AIzaSyCPARryq8o6MKptLoT4STAvCsRB7uZuOK8"

# 目录
OUTPUT_DIR = Path.home() / "Downloads" / "feishu_clips"
DOWNLOADS_DIR = Path.home() / "Downloads"

# 颜色
class C:
    G = '\033[92m'; Y = '\033[93m'; R = '\033[91m'
    B = '\033[94m'; C = '\033[96m'; E = '\033[0m'

def log(msg, c=None):
    print(f"{c}{msg}{C.E}" if c else msg)

# ============ API ============

def get_tenant_token():
    url = "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal"
    resp = requests.post(url, json={"app_id": APP_ID, "app_secret": APP_SECRET}, timeout=10)
    data = resp.json()
    return data.get('tenant_access_token') if data.get('code') == 0 else None

def get_minute_info(minute_token):
    token = get_tenant_token()
    if not token:
        return None
    url = f"https://open.feishu.cn/open-apis/minutes/v1/minutes/{minute_token}"
    resp = requests.get(url, headers={"Authorization": f"Bearer {token}"}, timeout=30)
    data = resp.json()
    return data.get('data', {}).get('minute', {}) if data.get('code') == 0 else None

def extract_minute_token(url):
    match = re.search(r'/minutes/([a-zA-Z0-9]+)', url)
    return match.group(1) if match else None

# ============ 下载 ============

def find_recent_video(after_time, title_hint=""):
    """在Downloads目录查找最近下载的视频"""
    patterns = [
        DOWNLOADS_DIR / "*.mp4",
        DOWNLOADS_DIR / "*.mov", 
        DOWNLOADS_DIR / "*.webm",
        DOWNLOADS_DIR / "*妙记*.mp4",
        DOWNLOADS_DIR / "*minute*.mp4",
    ]
    
    candidates = []
    for pattern in patterns:
        for f in glob.glob(str(pattern)):
            fp = Path(f)
            if fp.stat().st_mtime > after_time:
                candidates.append((fp, fp.stat().st_mtime))
    
    if candidates:
        # 返回最新的
        candidates.sort(key=lambda x: x[1], reverse=True)
        return candidates[0][0]
    return None

def download_with_lark(feishu_url, output_path, info):
    """使用飞书客户端下载视频"""
    log("📥 下载视频...", C.B)
    
    title = info.get('title', '视频')
    
    # 先检查Downloads目录是否有匹配的视频
    existing = list(DOWNLOADS_DIR.glob("*.mp4")) + list(DOWNLOADS_DIR.glob("*.mov"))
    for f in existing:
        # 检查文件名是否包含关键词
        fname = f.name.lower()
        if any(kw in fname for kw in ['妙记', 'minute', '产研', '许永平', title[:5].lower()]):
            log(f"   发现可能匹配的视频: {f.name}", C.C)
            choice = input(f"   是否使用此视频？[Y/n]: ").strip().lower()
            if choice != 'n':
                import shutil
                output_path.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy(str(f), str(output_path))
                log(f"   ✅ 使用已有视频", C.G)
                return True
    
    # 记录当前时间，用于检测新下载
    start_time = time.time()
    
    # 打开飞书客户端
    log("   打开飞书客户端...", C.C)
    subprocess.run(["open", "-a", "Lark", feishu_url], check=True)
    
    print()
    log("   ╔════════════════════════════════════════╗", C.Y)
    log("   ║  📌 请在飞书中点击【下载】按钮         ║", C.Y)
    log("   ║  （飞书已自动登录，无需扫码）          ║", C.Y)
    log("   ╚════════════════════════════════════════╝", C.Y)
    log(f"   视频: {title}", C.C)
    log(f"   ⏳ 脚本会自动检测下载完成...", C.C)
    print()
    
    # 监控下载目录
    max_wait = 600  # 最多等待10分钟
    check_interval = 3
    waited = 0
    
    while waited < max_wait:
        time.sleep(check_interval)
        waited += check_interval
        
        # 检查是否有新视频
        video = find_recent_video(start_time, title)
        if video:
            log(f"   ✅ 检测到下载: {video.name}", C.G)
            
            # 等待下载完成（文件大小稳定）
            log(f"   等待下载完成...", C.C)
            prev_size = 0
            stable_count = 0
            while stable_count < 3:
                time.sleep(2)
                try:
                    curr_size = video.stat().st_size
                    if curr_size == prev_size and curr_size > 1000000:  # >1MB且稳定
                        stable_count += 1
                    else:
                        stable_count = 0
                    prev_size = curr_size
                except:
                    pass
            
            # 移动到目标位置
            import shutil
            output_path.parent.mkdir(parents=True, exist_ok=True)
            shutil.move(str(video), str(output_path))
            log(f"   ✅ 视频已保存", C.G)
            return True
        
        # 显示等待进度
        if waited % 30 == 0:
            log(f"   ⏳ 等待中... {waited}秒", C.C)
    
    log("   ❌ 下载超时（10分钟）", C.R)
    return False

# ============ AI ============

def identify_highlights(info, clip_count=5):
    """AI识别高光片段"""
    log(f"🤖 AI生成切片方案（{clip_count}个）...", C.B)
    
    title = info.get('title', '未知')
    duration_ms = int(info.get('duration', 0))
    duration_sec = duration_ms // 1000
    
    prompt = f"""为这个视频设计{clip_count}个短视频切片：

视频：{title}
时长：{duration_sec}秒

要求：
1. 每个切片30-90秒
2. 均匀分布在时间轴上
3. 设计吸引人的标题
4. 设计前3秒Hook
5. 设计结尾CTA

输出JSON数组：
[{{"title":"标题","start_time":"HH:MM:SS","end_time":"HH:MM:SS","hook_3sec":"Hook","cta_ending":"CTA"}}]"""

    try:
        import google.generativeai as genai
        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel('gemini-2.0-flash')
        response = model.generate_content(prompt)
        
        match = re.search(r'\[.*\]', response.text, re.DOTALL)
        if match:
            highlights = json.loads(match.group())
            log(f"   ✅ 生成{len(highlights)}个切片方案", C.G)
            for i, h in enumerate(highlights, 1):
                log(f"   [{i}] {h.get('title','')} ({h.get('start_time','')}→{h.get('end_time','')})", C.C)
            return highlights
    except Exception as e:
        log(f"   AI失败: {e}", C.Y)
    
    # 备用方案
    return uniform_highlights(duration_sec, clip_count)

def uniform_highlights(duration_sec, count):
    """均匀切片"""
    highlights = []
    clip_len = 60
    gap = max(10, (duration_sec - count * clip_len) // (count + 1))
    
    for i in range(count):
        start = gap + i * (clip_len + gap)
        if start + clip_len > duration_sec:
            break
        end = start + clip_len
        highlights.append({
            "title": f"精彩片段{i+1}",
            "start_time": f"{start//3600:02d}:{(start%3600)//60:02d}:{start%60:02d}",
            "end_time": f"{end//3600:02d}:{(end%3600)//60:02d}:{end%60:02d}",
            "hook_3sec": "这段值得看",
            "cta_ending": "关注获取更多"
        })
    return highlights

# ============ 切片 ============

def batch_clip(video_path, highlights, output_dir):
    """批量切片"""
    log(f"✂️  批量切片（{len(highlights)}个）...", C.B)
    
    clips_dir = output_dir / "clips"
    clips_dir.mkdir(parents=True, exist_ok=True)
    
    clips = []
    for i, h in enumerate(highlights, 1):
        title = h.get('title', f'片段{i}')
        start, end = h.get('start_time', '00:00:00'), h.get('end_time', '00:01:00')
        
        safe_title = re.sub(r'[^\w\s-]', '', title)[:25]
        out_file = clips_dir / f"{i:02d}_{safe_title}.mp4"
        
        log(f"   [{i}] {title}", C.C)
        
        cmd = ["ffmpeg", "-y", "-i", str(video_path), "-ss", start, "-to", end,
               "-c:v", "libx264", "-preset", "fast", "-crf", "23",
               "-c:a", "aac", "-b:a", "128k", str(out_file)]
        
        result = subprocess.run(cmd, capture_output=True)
        if result.returncode == 0:
            log(f"       ✅ {out_file.name}", C.G)
            clips.append({'file': str(out_file), 'title': title, 
                         'hook': h.get('hook_3sec',''), 'cta': h.get('cta_ending',''),
                         'start': start, 'end': end})
        else:
            log(f"       ❌ 失败", C.R)
    
    return clips

# ============ 发送 ============

def send_to_feishu(webhook, clips, source_url):
    """发送到飞书群"""
    log(f"📤 发送到飞书群（{len(clips)}个切片）...", C.B)
    
    # 汇总
    summary = {
        "msg_type": "interactive",
        "card": {
            "header": {"title": {"tag": "plain_text", "content": f"🎬 视频切片完成 - {len(clips)}个"}, "template": "blue"},
            "elements": [{"tag": "div", "text": {"tag": "lark_md", "content": f"[原视频]({source_url})"}}]
        }
    }
    try:
        requests.post(webhook, json=summary, timeout=10)
        log("   ✅ 汇总消息", C.G)
    except: pass
    
    # 每个切片
    for i, clip in enumerate(clips, 1):
        msg = {
            "msg_type": "interactive", 
            "card": {
                "header": {"title": {"tag": "plain_text", "content": f"📹 {i}. {clip['title']}"}, "template": "green"},
                "elements": [{"tag": "div", "text": {"tag": "lark_md", 
                    "content": f"⏱ {clip['start']} → {clip['end']}\n\n**Hook**: {clip['hook']}\n\n**CTA**: {clip['cta']}\n\n📁 `{Path(clip['file']).name}`"}}]
            }
        }
        try:
            requests.post(webhook, json=msg, timeout=10)
            log(f"   ✅ [{i}] {clip['title'][:15]}", C.G)
            time.sleep(0.3)
        except: pass

# ============ 主函数 ============

def main():
    parser = argparse.ArgumentParser(description="飞书视频一键切片")
    parser.add_argument("url", help="飞书妙记链接")
    parser.add_argument("webhook", nargs='?', 
        default="https://open.feishu.cn/open-apis/bot/v2/hook/14a7e0d3-864d-4709-ad40-0def6edba566",
        help="飞书群webhook（默认：产宁团队群）")
    parser.add_argument("--clips", "-c", type=int, default=5, help="切片数量")
    parser.add_argument("--output", "-o", help="输出目录")
    
    args = parser.parse_args()
    
    print()
    log("═" * 50, C.B)
    log("🎬 飞书视频一键切片", C.B)
    log("═" * 50, C.B)
    print()
    
    # 提取token
    minute_token = extract_minute_token(args.url)
    if not minute_token:
        log("❌ 无效链接", C.R)
        return
    
    # 获取信息
    log("📋 获取妙记信息...", C.B)
    info = get_minute_info(minute_token)
    if not info:
        log("❌ 获取失败", C.R)
        return
    
    title = info.get('title', '未知')
    duration = int(info.get('duration', 0)) // 60000
    log(f"   标题: {title}", C.C)
    log(f"   时长: {duration}分钟", C.C)
    print()
    
    # 设置目录
    output_dir = Path(args.output) if args.output else OUTPUT_DIR / minute_token
    output_dir.mkdir(parents=True, exist_ok=True)
    video_path = output_dir / "video.mp4"
    
    # 下载
    if not video_path.exists():
        if not download_with_lark(args.url, video_path, info):
            log("❌ 下载失败", C.R)
            return
    else:
        log(f"📥 视频已存在", C.B)
    print()
    
    # AI识别
    highlights = identify_highlights(info, args.clips)
    if not highlights:
        log("❌ 生成切片方案失败", C.R)
        return
    
    # 保存
    with open(output_dir / "highlights.json", 'w') as f:
        json.dump(highlights, f, ensure_ascii=False, indent=2)
    print()
    
    # 切片
    clips = batch_clip(video_path, highlights, output_dir)
    if not clips:
        log("❌ 切片失败", C.R)
        return
    print()
    
    # 发送
    send_to_feishu(args.webhook, clips, args.url)
    print()
    
    log("═" * 50, C.B)
    log("✅ 完成！", C.G)
    log("═" * 50, C.B)
    log(f"📂 切片目录: {output_dir / 'clips'}", C.C)

if __name__ == "__main__":
    main()

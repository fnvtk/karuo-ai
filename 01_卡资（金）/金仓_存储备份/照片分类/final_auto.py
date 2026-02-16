#!/usr/bin/env python3
"""
最终自动化照片归档 - 即时输出+自动点击
卡若AI·卡资（金）
"""
import json
import os
import subprocess
import sys
import time
import threading

OUTPUT_DIR = os.path.expanduser("~/Documents/个人/卡若AI/01_卡资（金）/照片分类")

def print_flush(msg):
    """立即输出"""
    print(msg, flush=True)

def click_confirm():
    """点击确认按钮"""
    script = '''
    tell application "System Events"
        tell process "Photos"
            try
                if exists (button "应用" of sheet 1 of window 1) then
                    click button "应用" of sheet 1 of window 1
                    return "clicked"
                end if
            end try
        end tell
    end tell
    '''
    try:
        result = subprocess.run(['osascript', '-e', script], 
                              capture_output=True, text=True, timeout=5)
        return "clicked" in result.stdout
    except:
        return False

def auto_clicker_loop():
    """持续点击确认按钮"""
    while True:
        click_confirm()
        time.sleep(0.3)

def load_classification():
    with open(os.path.join(OUTPUT_DIR, "classification.json"), "r") as f:
        return json.load(f)

def add_photos(album_name, uuids, batch_size=500):
    """添加照片到相册"""
    total = len(uuids)
    added = 0
    
    for i in range(0, total, batch_size):
        batch = uuids[i:i+batch_size]
        uuid_list = '", "'.join(batch)
        
        script = f'''
tell application "Photos"
    set targetAlbum to missing value
    repeat with a in albums
        if name of a is "{album_name}" then
            set targetAlbum to a
            exit repeat
        end if
    end repeat
    
    if targetAlbum is not missing value then
        set uuidList to {{"{uuid_list}"}}
        set photosToAdd to {{}}
        repeat with uuid in uuidList
            try
                set thePhoto to media item id uuid
                set end of photosToAdd to thePhoto
            end try
        end repeat
        
        if (count of photosToAdd) > 0 then
            add photosToAdd to targetAlbum
        end if
    end if
end tell
'''
        try:
            subprocess.run(['osascript', '-e', script], 
                         capture_output=True, timeout=300)
            added += len(batch)
            # 等待并点击确认
            for _ in range(10):
                if click_confirm():
                    time.sleep(1)
                    break
                time.sleep(0.3)
        except Exception as e:
            print_flush(f"  ⚠️ 批次错误: {e}")
        
        print_flush(f"  {min(i+batch_size, total)}/{total}")
    
    return added

def main():
    print_flush("🚀 照片自动归档")
    print_flush("=" * 50)
    
    # 启动后台点击器
    clicker = threading.Thread(target=auto_clicker_loop, daemon=True)
    clicker.start()
    print_flush("⚡ 自动点击器已启动")
    
    # 激活照片App
    subprocess.run(['osascript', '-e', 'tell application "Photos" to activate'], 
                  capture_output=True)
    time.sleep(2)
    
    data = load_classification()
    
    # 任务
    tasks = [
        (("个人照片", "手机拍摄"), "📱 手机拍摄"),
        (("个人照片", "自拍美颜"), "🤳 自拍美颜"),
        (("截图收藏", "屏幕截图"), "📸 屏幕截图"),
        (("视频素材", "手机拍摄视频"), "🎬 手机视频"),
        (("视频素材", "剪辑导出"), "🎬 剪辑导出"),
        (("视频素材", "屏幕录制"), "🎬 屏幕录制"),
        (("视频素材", "抖音视频"), "🎬 抖音视频"),
        (("内容素材", "网络图片"), "🌐 网络图片"),
    ]
    
    years = [
        ("2018年及以前", "📅 2018年及以前"),
        ("2019年回顾", "📅 2019年回顾"),
        ("2020年回顾", "📅 2020年回顾"),
        ("2021年回顾", "📅 2021年回顾"),
        ("2022年回顾", "📅 2022年回顾"),
        ("2023年回顾", "📅 2023年回顾"),
        ("2024年照片", "📅 2024年照片"),
        ("2025年照片", "📅 2025年照片"),
    ]
    
    print_flush("\n📁 内容分类...")
    for (cat, sub), album in tasks:
        if cat in data["categories"] and sub in data["categories"][cat]:
            uuids = data["categories"][cat][sub]
            print_flush(f"\n→ {album} ({len(uuids)}张)")
            add_photos(album, uuids)
            print_flush(f"  ✓ 完成")
    
    print_flush("\n📅 年份分类...")
    for src, album in years:
        if src in data["year_albums"]:
            uuids = data["year_albums"][src]
            print_flush(f"\n→ {album} ({len(uuids)}张)")
            add_photos(album, uuids)
            print_flush(f"  ✓ 完成")
    
    print_flush("\n" + "=" * 50)
    print_flush("✅ 全部完成！")

if __name__ == "__main__":
    main()

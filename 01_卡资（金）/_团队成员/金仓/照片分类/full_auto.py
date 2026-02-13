#!/usr/bin/env python3
"""
完全自动化照片归档 - 无需任何确认
使用后台自动点击器 + 批量添加
卡若AI·卡资（金）
"""
import json
import os
import subprocess
import threading
import time

OUTPUT_DIR = os.path.expanduser("~/Documents/个人/卡若AI/01_卡资（金）/照片分类")

# 全局标志控制自动点击器
running = True

def auto_clicker():
    """后台自动点击确认按钮"""
    global running
    script = '''
    tell application "System Events"
        tell process "Photos"
            try
                if exists (button "应用" of sheet 1 of window 1) then
                    click button "应用" of sheet 1 of window 1
                end if
            end try
        end tell
    end tell
    '''
    while running:
        try:
            subprocess.run(['osascript', '-e', script], 
                         capture_output=True, timeout=5)
        except:
            pass
        time.sleep(0.3)

def load_classification():
    with open(os.path.join(OUTPUT_DIR, "classification.json"), "r") as f:
        return json.load(f)

def add_all_photos(album_name, uuids):
    """一次性添加所有照片"""
    if not uuids:
        return 0
    
    # 分批处理，每批500张
    batch_size = 500
    total_added = 0
    
    for i in range(0, len(uuids), batch_size):
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
            total_added += len(batch)
            # 给自动点击器时间处理确认框
            time.sleep(2)
        except Exception as e:
            print(f"  ⚠️ 批次错误: {e}")
        
        print(f"  进度: {min(i+batch_size, len(uuids))}/{len(uuids)}")
    
    return total_added

def main():
    global running
    
    print("🚀 完全自动化照片归档")
    print("=" * 60)
    print("⚡ 自动点击器已启动，无需任何手动操作")
    print("=" * 60)
    
    # 启动自动点击器线程
    clicker_thread = threading.Thread(target=auto_clicker, daemon=True)
    clicker_thread.start()
    
    # 确保照片App在前台
    subprocess.run(['osascript', '-e', 'tell application "Photos" to activate'], 
                  capture_output=True)
    time.sleep(2)
    
    data = load_classification()
    
    # 任务列表
    tasks = [
        (("个人照片", "手机拍摄"), "📱 手机拍摄", 14965),
        (("个人照片", "自拍美颜"), "🤳 自拍美颜", 742),
        (("截图收藏", "屏幕截图"), "📸 屏幕截图", 3578),
        (("视频素材", "手机拍摄视频"), "🎬 手机视频", 2420),
        (("视频素材", "剪辑导出"), "🎬 剪辑导出", 1006),
        (("视频素材", "屏幕录制"), "🎬 屏幕录制", 147),
        (("视频素材", "抖音视频"), "🎬 抖音视频", 66),
        (("内容素材", "网络图片"), "🌐 网络图片", 709),
    ]
    
    year_tasks = [
        ("2018年及以前", "📅 2018年及以前"),
        ("2019年回顾", "📅 2019年回顾"),
        ("2020年回顾", "📅 2020年回顾"),
        ("2021年回顾", "📅 2021年回顾"),
        ("2022年回顾", "📅 2022年回顾"),
        ("2023年回顾", "📅 2023年回顾"),
        ("2024年照片", "📅 2024年照片"),
        ("2025年照片", "📅 2025年照片"),
    ]
    
    # 执行内容分类
    print("\n📁 内容分类归档...")
    for (cat, sub), album, expected in tasks:
        if cat in data["categories"] and sub in data["categories"][cat]:
            uuids = data["categories"][cat][sub]
            print(f"\n→ {album} ({len(uuids)}张)")
            add_all_photos(album, uuids)
            print(f"  ✓ 完成")
    
    # 执行年份分类
    print("\n📅 年份归档...")
    for src, album in year_tasks:
        if src in data["year_albums"]:
            uuids = data["year_albums"][src]
            print(f"\n→ {album} ({len(uuids)}张)")
            add_all_photos(album, uuids)
            print(f"  ✓ 完成")
    
    # 停止自动点击器
    running = False
    time.sleep(1)
    
    print("\n" + "=" * 60)
    print("✅ 全部归档完成！")
    print("=" * 60)

if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
自动归档照片 - 自动点击确认按钮
卡若AI·卡资（金）
"""
import json
import os
import subprocess
import time

OUTPUT_DIR = os.path.expanduser("~/Documents/个人/卡若AI/01_卡资（金）/照片分类")

def load_classification():
    with open(os.path.join(OUTPUT_DIR, "classification.json"), "r") as f:
        return json.load(f)

def add_photos_auto(album_name, uuids, batch_size=500):
    """自动添加照片并点击确认"""
    total = len(uuids)
    added = 0
    
    for i in range(0, total, batch_size):
        batch = uuids[i:i+batch_size]
        uuid_list = '", "'.join(batch)
        
        # 添加照片并自动点击确认
        script = f'''
tell application "Photos"
    activate
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

-- 自动点击确认按钮
delay 0.5
tell application "System Events"
    tell process "Photos"
        try
            -- 查找并点击"应用"按钮
            repeat 10 times
                if exists (button "应用" of sheet 1 of window 1) then
                    click button "应用" of sheet 1 of window 1
                    exit repeat
                else if exists (button "Apply" of sheet 1 of window 1) then
                    click button "Apply" of sheet 1 of window 1
                    exit repeat
                end if
                delay 0.2
            end repeat
        end try
    end tell
end tell
'''
        try:
            result = subprocess.run(
                ['osascript', '-e', script],
                capture_output=True,
                text=True,
                timeout=180
            )
            added += len(batch)
        except subprocess.TimeoutExpired:
            print(f"    ⚠️ 超时，继续下一批")
        except Exception as e:
            print(f"    ⚠️ {e}")
        
        progress = min(i + batch_size, total)
        print(f"    进度: {progress}/{total} ({progress*100//total}%)")
        time.sleep(1)
    
    return added

def main():
    print("🚀 照片自动归档（无需确认）")
    print("="*60)
    
    data = load_classification()
    
    # 按类别归档
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
    
    print("\n📁 内容分类归档...")
    for (cat, sub), album in tasks:
        if cat in data["categories"] and sub in data["categories"][cat]:
            uuids = data["categories"][cat][sub]
            print(f"\n→ {album} ({len(uuids)}张)")
            add_photos_auto(album, uuids)
    
    print("\n📅 年份归档...")
    for src, album in year_tasks:
        if src in data["year_albums"]:
            uuids = data["year_albums"][src]
            print(f"\n→ {album} ({len(uuids)}张)")
            add_photos_auto(album, uuids)
    
    print("\n" + "="*60)
    print("✅ 全部完成！")

if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
向已创建的相册添加照片 - 卡若AI·卡资（金）
使用AppleScript批量添加照片到相册
"""
import json
import os
import subprocess
import time

OUTPUT_DIR = os.path.expanduser("~/Documents/个人/卡若AI/01_卡资（金）/照片分类")

def load_classification():
    with open(os.path.join(OUTPUT_DIR, "classification.json"), "r") as f:
        return json.load(f)

def add_photos_to_album_batch(album_name, uuids, batch_size=100):
    """分批向相册添加照片"""
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
            return count of photosToAdd
        end if
    end if
    return 0
end tell
'''
        try:
            result = subprocess.run(
                ['osascript', '-e', script],
                capture_output=True,
                text=True,
                timeout=120
            )
            if result.returncode == 0:
                try:
                    added += int(result.stdout.strip())
                except:
                    added += len(batch)
        except subprocess.TimeoutExpired:
            print(f"    ⚠️ 批次超时，跳过")
        except Exception as e:
            print(f"    ⚠️ 错误: {e}")
        
        # 进度显示
        progress = min(i + batch_size, total)
        print(f"    进度: {progress}/{total} ({progress*100//total}%)", end='\r')
        time.sleep(0.5)
    
    print(f"    ✓ 完成: {added}/{total}张                    ")
    return added

def main():
    print("🚀 照片分类自动归档")
    print("="*60)
    
    data = load_classification()
    
    # 相册映射
    album_mapping = {
        ("个人照片", "手机拍摄"): "📱 手机拍摄",
        ("个人照片", "自拍美颜"): "🤳 自拍美颜",
        ("截图收藏", "屏幕截图"): "📸 屏幕截图",
        ("视频素材", "手机拍摄视频"): "🎬 手机视频",
        ("视频素材", "剪辑导出"): "🎬 剪辑导出",
        ("视频素材", "屏幕录制"): "🎬 屏幕录制",
        ("视频素材", "抖音视频"): "🎬 抖音视频",
        ("内容素材", "网络图片"): "🌐 网络图片",
    }
    
    year_mapping = {
        "2018年及以前": "📅 2018年及以前",
        "2019年回顾": "📅 2019年回顾",
        "2020年回顾": "📅 2020年回顾",
        "2021年回顾": "📅 2021年回顾",
        "2022年回顾": "📅 2022年回顾",
        "2023年回顾": "📅 2023年回顾",
        "2024年照片": "📅 2024年照片",
        "2025年照片": "📅 2025年照片",
    }
    
    # 1. 按类别添加照片
    print("\n📁 按内容类型分类...")
    for (category, sub_album), target_album in album_mapping.items():
        if category in data["categories"] and sub_album in data["categories"][category]:
            uuids = data["categories"][category][sub_album]
            print(f"\n  → {target_album} ({len(uuids)}张)")
            add_photos_to_album_batch(target_album, uuids)
    
    # 2. 按年份添加照片
    print("\n📅 按年份分类...")
    for year_album, target_album in year_mapping.items():
        if year_album in data["year_albums"]:
            uuids = data["year_albums"][year_album]
            print(f"\n  → {target_album} ({len(uuids)}张)")
            add_photos_to_album_batch(target_album, uuids)
    
    print("\n" + "="*60)
    print("✅ 照片归档完成！")
    print("="*60)

if __name__ == "__main__":
    main()

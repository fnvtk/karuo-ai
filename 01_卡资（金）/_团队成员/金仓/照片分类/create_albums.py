#!/usr/bin/env python3
"""
生成AppleScript来创建照片相册 - 卡若AI·卡资（金）
"""
import json
import os
import subprocess

OUTPUT_DIR = os.path.expanduser("~/Documents/个人/卡若AI/01_卡资（金）/照片分类")

def load_classification():
    with open(os.path.join(OUTPUT_DIR, "classification.json"), "r") as f:
        return json.load(f)

def create_album_applescript(album_name, uuids, folder_name=None):
    """生成创建单个相册的AppleScript"""
    if not uuids:
        return ""
    
    # 限制每个相册最多处理的UUID数量（避免AppleScript太长）
    max_uuids = 500
    uuids_to_add = uuids[:max_uuids]
    
    uuid_list = '", "'.join(uuids_to_add)
    
    script = f'''
-- 创建相册: {album_name}
tell application "Photos"
    -- 检查相册是否存在
    set albumExists to false
    repeat with a in albums
        if name of a is "{album_name}" then
            set albumExists to true
            set targetAlbum to a
            exit repeat
        end if
    end repeat
    
    -- 如果不存在则创建
    if not albumExists then
        set targetAlbum to make new album named "{album_name}"
    end if
    
    -- 添加照片（通过UUID）
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
end tell
'''
    return script

def create_folder_structure_script():
    """创建文件夹结构的AppleScript"""
    folders = ["📱 个人照片", "📷 内容素材", "🎬 视频素材", "📸 截图收藏", "💬 社交记录", "📅 年份回顾"]
    
    script = '''
-- 创建相册文件夹结构
tell application "Photos"
'''
    for folder in folders:
        script += f'''
    -- 创建文件夹: {folder}
    try
        set folderExists to false
        repeat with f in folders
            if name of f is "{folder}" then
                set folderExists to true
                exit repeat
            end if
        end repeat
        if not folderExists then
            make new folder named "{folder}"
        end if
    on error
        -- 忽略错误继续
    end try
'''
    script += '''
end tell
'''
    return script

def generate_batch_scripts(data):
    """生成批量创建相册的脚本"""
    scripts_dir = os.path.join(OUTPUT_DIR, "applescripts")
    os.makedirs(scripts_dir, exist_ok=True)
    
    # 相册映射到文件夹
    folder_mapping = {
        "个人照片": "📱 个人照片",
        "内容素材": "📷 内容素材", 
        "视频素材": "🎬 视频素材",
        "截图收藏": "📸 截图收藏",
        "社交记录": "💬 社交记录",
        "其他": "📷 内容素材"
    }
    
    # 1. 创建文件夹结构脚本
    folder_script = create_folder_structure_script()
    with open(os.path.join(scripts_dir, "01_create_folders.scpt"), "w") as f:
        f.write(folder_script)
    
    script_index = 2
    
    # 2. 按类别创建相册脚本
    for category, albums in data["categories"].items():
        folder_name = folder_mapping.get(category, "📷 内容素材")
        
        for album_name, uuids in albums.items():
            if len(uuids) < 10:  # 少于10张的跳过
                continue
                
            # 生成相册全名
            full_album_name = f"{album_name}"
            
            script = create_album_applescript(full_album_name, uuids, folder_name)
            
            filename = f"{script_index:02d}_{category}_{album_name}.scpt"
            filename = filename.replace("/", "_").replace(" ", "_")
            
            with open(os.path.join(scripts_dir, filename), "w") as f:
                f.write(script)
            
            script_index += 1
    
    # 3. 年份相册
    for year_album, uuids in data["year_albums"].items():
        script = create_album_applescript(year_album, uuids, "📅 年份回顾")
        
        filename = f"{script_index:02d}_年份_{year_album}.scpt"
        with open(os.path.join(scripts_dir, filename), "w") as f:
            f.write(script)
        
        script_index += 1
    
    print(f"✅ 已生成 {script_index - 1} 个AppleScript脚本")
    print(f"   保存位置: {scripts_dir}")
    
    return scripts_dir

def create_master_runner():
    """创建主执行脚本"""
    scripts_dir = os.path.join(OUTPUT_DIR, "applescripts")
    
    runner_script = '''#!/bin/bash
# 照片相册批量创建脚本 - 卡若AI
# 使用方法: ./run_all.sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
echo "🚀 开始创建照片相册..."

# 先打开照片应用
open -a "Photos"
sleep 3

# 依次执行所有AppleScript
for script in "$SCRIPT_DIR"/*.scpt; do
    if [ -f "$script" ]; then
        name=$(basename "$script")
        echo "📁 执行: $name"
        osascript "$script" 2>/dev/null
        sleep 1
    fi
done

echo "✅ 相册创建完成！"
'''
    
    runner_path = os.path.join(scripts_dir, "run_all.sh")
    with open(runner_path, "w") as f:
        f.write(runner_script)
    os.chmod(runner_path, 0o755)
    
    print(f"✅ 主执行脚本: {runner_path}")
    return runner_path

def main():
    print("📊 加载分类数据...")
    data = load_classification()
    
    print("📝 生成AppleScript脚本...")
    scripts_dir = generate_batch_scripts(data)
    
    print("📝 创建主执行脚本...")
    runner_path = create_master_runner()
    
    print(f"\n{'='*60}")
    print("🎉 脚本生成完成！")
    print(f"{'='*60}")
    print(f"\n执行以下命令开始创建相册:")
    print(f"  cd {scripts_dir} && ./run_all.sh")
    print(f"\n或者手动在「脚本编辑器」中打开执行单个脚本")

if __name__ == "__main__":
    main()

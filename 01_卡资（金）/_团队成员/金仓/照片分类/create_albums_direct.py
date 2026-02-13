#!/usr/bin/env python3
"""
直接创建相册 - 使用Shortcuts/osascript
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

def create_album_with_osascript(album_name):
    """用osascript创建空相册"""
    script = f'''
    tell application "Photos"
        activate
        delay 1
        try
            set albumExists to false
            repeat with a in albums
                if name of a is "{album_name}" then
                    set albumExists to true
                    exit repeat
                end if
            end repeat
            
            if not albumExists then
                make new album named "{album_name}"
                return "created"
            else
                return "exists"
            end if
        on error errMsg
            return "error: " & errMsg
        end try
    end tell
    '''
    try:
        result = subprocess.run(
            ['osascript', '-e', script],
            capture_output=True,
            text=True,
            timeout=30
        )
        return result.stdout.strip()
    except subprocess.TimeoutExpired:
        return "timeout"
    except Exception as e:
        return f"error: {e}"

def create_smart_albums_sql():
    """生成智能相册的SQL（仅供参考，不直接修改数据库）"""
    smart_albums = [
        ("📸 所有截图", "ZKINDSUBTYPE == 2"),
        ("🎬 所有视频", "ZKIND == 1"),
        ("⭐ 收藏照片", "ZFAVORITE == 1"),
        ("🤳 自拍照片", "ZORIGINALFILENAME LIKE '%faceu%' OR ZORIGINALFILENAME LIKE '%beauty%'"),
        ("📱 抖音素材", "ZORIGINALFILENAME LIKE '%v0%fg%' OR ZORIGINALFILENAME LIKE '%douyin%'"),
    ]
    
    print("\n📋 建议创建的智能相册（在照片App中手动创建）:")
    print("="*60)
    for name, condition in smart_albums:
        print(f"  {name}")
        print(f"    条件: {condition}")
    print("="*60)

def main():
    print("📊 卡若照片相册分类器")
    print("="*60)
    
    # 加载分类数据
    data = load_classification()
    
    # 输出分类统计
    print("\n📁 分类统计:")
    
    albums_to_create = []
    
    for category, albums in data["categories"].items():
        cat_total = sum(len(uuids) for uuids in albums.values())
        print(f"\n【{category}】共 {cat_total} 张")
        
        for album_name, uuids in sorted(albums.items(), key=lambda x: -len(x[1])):
            count = len(uuids)
            if count >= 50:  # 只创建50张以上的相册
                albums_to_create.append((f"{category}-{album_name}", count))
                print(f"  ✓ {album_name}: {count}张 → 将创建相册")
            else:
                print(f"    {album_name}: {count}张")
    
    # 年份相册
    print(f"\n【年份回顾】")
    for year_album, uuids in sorted(data["year_albums"].items()):
        count = len(uuids)
        albums_to_create.append((year_album, count))
        print(f"  ✓ {year_album}: {count}张 → 将创建相册")
    
    print(f"\n{'='*60}")
    print(f"📋 计划创建 {len(albums_to_create)} 个相册")
    print(f"{'='*60}")
    
    # 生成相册创建报告
    report = {
        "albums_to_create": [(name, count) for name, count in albums_to_create],
        "total_albums": len(albums_to_create),
        "instructions": [
            "1. 打开「照片」应用",
            "2. 点击 文件 → 新建相册",
            "3. 按照下方列表创建相册",
            "4. 使用智能相册功能自动分类"
        ]
    }
    
    # 保存创建计划
    with open(os.path.join(OUTPUT_DIR, "albums_plan.json"), "w") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    
    # 输出智能相册建议
    create_smart_albums_sql()
    
    print("\n🎯 推荐操作:")
    print("1. 在照片App中创建以下智能相册（自动分类）:")
    print("   - 文件 → 新建智能相册")
    print("   - 设置条件如：文件名包含 'faceu' = 自拍")
    print("   - 设置条件如：媒体类型 = 屏幕截图")
    print("\n2. 或运行以下命令打开照片App并创建相册:")
    print(f"   open -a Photos")
    
    # 保存详细的UUID映射，方便后续使用
    print(f"\n✅ 分类数据已保存至: {OUTPUT_DIR}")
    print("   - classification.json: 完整分类数据（含UUID）")
    print("   - albums_plan.json: 相册创建计划")
    print("   - report.json: 分类统计报告")

if __name__ == "__main__":
    main()

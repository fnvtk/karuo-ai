#!/usr/bin/env python3
"""
照片分类脚本 - 卡若AI·卡资（金）
按苹果最佳实践 + 卡若习惯分类照片
"""
import sqlite3
import os
import json
from collections import defaultdict
from datetime import datetime

# 照片库路径
PHOTOS_DB = os.path.expanduser("~/Pictures/照片图库.photoslibrary/database/Photos.sqlite")
OUTPUT_DIR = os.path.expanduser("~/Documents/个人/卡若AI/01_卡资（金）/照片分类")

def classify_by_filename(filename, kind, subtype):
    """根据文件名和类型分类照片"""
    if not filename:
        return "其他", "未分类"
    
    filename_lower = filename.lower()
    
    # 1. 视频分类
    if kind == 1 or filename_lower.endswith(('.mp4', '.mov', '.m4v')):
        if 'v0' in filename_lower and 'fg' in filename_lower:
            return "视频素材", "抖音视频"
        elif 'fragmentvideo' in filename_lower or 'finalvideo' in filename_lower:
            return "视频素材", "剪辑导出"
        elif 'wtexported' in filename_lower:
            return "视频素材", "剪辑导出"
        elif 'rpreplay' in filename_lower:
            return "视频素材", "屏幕录制"
        elif 'copy_' in filename_lower:
            return "视频素材", "复制视频"
        elif filename.startswith('IMG_') or filename.startswith('20'):
            return "视频素材", "手机拍摄视频"
        else:
            return "视频素材", "其他视频"
    
    # 2. 截图分类 (subtype=2)
    if subtype == 2 or 'screenshot' in filename_lower or '截屏' in filename or '截图' in filename or '屏幕快照' in filename:
        return "截图收藏", "屏幕截图"
    
    # 3. 美颜/自拍类
    if 'faceu' in filename_lower or 'beauty' in filename_lower:
        return "个人照片", "自拍美颜"
    
    # 4. 抖音相关
    if 'douyin' in filename_lower or '抖音' in filename or ('v0' in filename_lower and 'fg' in filename_lower):
        return "内容素材", "抖音素材"
    
    # 5. 微信相关
    if 'mmexport' in filename_lower or 'wx_' in filename_lower or 'wechat' in filename_lower:
        return "社交记录", "微信图片"
    
    # 6. QQ相关
    if filename_lower.startswith('qq') or 'qq_pic' in filename_lower:
        return "社交记录", "QQ图片"
    
    # 7. Live Photo
    if 'livephoto' in filename_lower:
        return "个人照片", "实况照片"
    
    # 8. 原始iPhone照片
    if filename.startswith('IMG_') and filename.endswith(('.JPG', '.jpg', '.HEIC', '.heic', '.PNG', '.png')):
        return "个人照片", "手机拍摄"
    
    # 9. 带日期前缀的照片 (如 20180913_IMG_8195.JPG)
    if filename[:8].isdigit() and '_IMG_' in filename:
        return "个人照片", "手机拍摄"
    
    # 10. GIF动图
    if filename_lower.endswith('.gif'):
        return "内容素材", "GIF动图"
    
    # 11. 网络下载图片 (哈希命名)
    if len(filename) > 30 and filename[:30].replace('-', '').replace('_', '').isalnum():
        return "内容素材", "网络图片"
    
    # 12. 带有明显业务关键词
    if '存客宝' in filename or '卡猫' in filename or '银掌柜' in filename:
        return "品牌素材", "品牌资料"
    
    if 'logo' in filename_lower:
        return "品牌素材", "LOGO设计"
    
    if 'vi' in filename_lower and ('设计' in filename or 'design' in filename_lower):
        return "品牌素材", "VI设计"
    
    # 13. 文档扫描 (subtype=100)
    if subtype == 100:
        return "工作文档", "文档扫描"
    
    # 14. 人像模式 (subtype=103)
    if subtype == 103:
        return "个人照片", "人像模式"
    
    # 15. 全景照片 (subtype=1)
    if subtype == 1:
        return "个人照片", "全景照片"
    
    return "其他", "未分类"

def get_year_album(year):
    """根据年份返回相册名"""
    if year and year.isdigit():
        y = int(year)
        if y <= 2018:
            return "2018年及以前"
        elif y <= 2020:
            return f"{y}年回顾"
        elif y <= 2023:
            return f"{y}年回顾"
        else:
            return f"{y}年照片"
    return None

def main():
    conn = sqlite3.connect(PHOTOS_DB)
    cursor = conn.cursor()
    
    # 获取所有照片
    cursor.execute("""
        SELECT 
            ZASSET.Z_PK,
            ZASSET.ZUUID,
            ZASSET.ZKIND,
            ZASSET.ZKINDSUBTYPE,
            ZASSET.ZFAVORITE,
            strftime('%Y', datetime(ZASSET.ZDATECREATED + 978307200, 'unixepoch', 'localtime')) as year,
            strftime('%Y-%m-%d', datetime(ZASSET.ZDATECREATED + 978307200, 'unixepoch', 'localtime')) as date,
            ZADDITIONALASSETATTRIBUTES.ZORIGINALFILENAME
        FROM ZASSET 
        LEFT JOIN ZADDITIONALASSETATTRIBUTES ON ZASSET.Z_PK = ZADDITIONALASSETATTRIBUTES.ZASSET
        WHERE ZASSET.ZTRASHEDSTATE = 0
    """)
    
    # 分类统计
    category_albums = defaultdict(lambda: defaultdict(list))  # {category: {album: [uuids]}}
    year_albums = defaultdict(list)  # {year_album: [uuids]}
    favorites = []
    
    total = 0
    for row in cursor.fetchall():
        pk, uuid, kind, subtype, favorite, year, date, filename = row
        total += 1
        
        # 分类
        category, album = classify_by_filename(filename, kind, subtype)
        category_albums[category][album].append(uuid)
        
        # 年份相册
        year_album = get_year_album(year)
        if year_album:
            year_albums[year_album].append(uuid)
        
        # 收藏
        if favorite:
            favorites.append(uuid)
    
    conn.close()
    
    # 生成分类报告
    report = {
        "total_photos": total,
        "generated_at": datetime.now().isoformat(),
        "categories": {},
        "year_albums": {},
        "favorites_count": len(favorites)
    }
    
    print(f"\n{'='*60}")
    print(f"📊 照片分类分析报告 - 共 {total} 张")
    print(f"{'='*60}\n")
    
    # 按类别输出
    for category in sorted(category_albums.keys()):
        albums = category_albums[category]
        cat_total = sum(len(uuids) for uuids in albums.values())
        print(f"📁 {category} ({cat_total}张)")
        report["categories"][category] = {}
        
        for album in sorted(albums.keys(), key=lambda x: -len(albums[x])):
            count = len(albums[album])
            print(f"    └── {album}: {count}张")
            report["categories"][category][album] = count
        print()
    
    print(f"\n📅 年份相册:")
    for year_album in sorted(year_albums.keys()):
        count = len(year_albums[year_album])
        print(f"    └── {year_album}: {count}张")
        report["year_albums"][year_album] = count
    
    print(f"\n⭐ 收藏照片: {len(favorites)}张")
    
    # 保存分类数据
    classification_data = {
        "categories": {cat: {alb: uuids for alb, uuids in albums.items()} 
                       for cat, albums in category_albums.items()},
        "year_albums": dict(year_albums),
        "favorites": favorites
    }
    
    with open(os.path.join(OUTPUT_DIR, "classification.json"), "w") as f:
        json.dump(classification_data, f, ensure_ascii=False, indent=2)
    
    with open(os.path.join(OUTPUT_DIR, "report.json"), "w") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ 分类数据已保存到: {OUTPUT_DIR}/classification.json")
    print(f"✅ 分类报告已保存到: {OUTPUT_DIR}/report.json")
    
    return classification_data, report

if __name__ == "__main__":
    main()

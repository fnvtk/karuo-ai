#!/usr/bin/env python3
"""
切片一键处理脚本
完整流程：字幕清洗 → 文件重命名 → 生成剪映草稿 → 导入剪映
"""

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path
from datetime import datetime

# 获取脚本目录
SCRIPTS_DIR = Path(__file__).parent
SKILL_DIR = SCRIPTS_DIR.parent


def clean_subtitles(srt_path: str) -> str:
    """清洗字幕"""
    print(f"\n📝 清洗字幕: {Path(srt_path).name}")
    
    clean_script = SCRIPTS_DIR / "clean_subtitle.py"
    output_path = str(Path(srt_path).with_suffix('.clean.srt'))
    
    cmd = [
        sys.executable, str(clean_script),
        "--input", srt_path,
        "--output", output_path,
        "--merge"
    ]
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode == 0:
        print(f"   ✅ 已清洗: {output_path}")
        return output_path
    else:
        print(f"   ⚠️ 清洗失败，使用原字幕")
        return srt_path


def generate_viral_filename(title: str, tags: list = None) -> str:
    """生成带标签的病毒式文件名"""
    # 清理标题
    safe_title = re.sub(r'[^\w\u4e00-\u9fff\-]', '', title)[:30]
    
    # 生成标签字符串
    if tags:
        tag_str = "_".join([f"#{t}" for t in tags[:3]])
    else:
        tag_str = ""
    
    # 时间戳
    timestamp = datetime.now().strftime("%m%d")
    
    # 组合文件名
    if tag_str:
        return f"{safe_title}_{tag_str}_{timestamp}"
    else:
        return f"{safe_title}_{timestamp}"


def generate_tags_from_content(text: str) -> list:
    """从内容自动生成标签"""
    # 关键词映射
    keyword_tags = {
        "电竞": ["电竞", "游戏", "电子竞技"],
        "创业": ["创业", "副业", "赚钱"],
        "私域": ["私域", "流量", "运营"],
        "变现": ["变现", "赚钱", "商业模式"],
        "粉丝": ["粉丝经济", "流量", "用户"],
        "直播": ["直播", "带货", "主播"],
        "APP": ["APP", "产品", "互联网"],
        "商城": ["电商", "变现", "商业"],
        "培训": ["培训", "教育", "课程"],
        "酒店": ["酒店", "线下", "服务"],
    }
    
    tags = set()
    for keyword, related_tags in keyword_tags.items():
        if keyword in text:
            tags.update(related_tags)
    
    # 限制标签数量
    return list(tags)[:5]


def rename_clip_with_tags(clip_path: str, highlight: dict) -> str:
    """重命名切片文件，添加标签"""
    clip_path = Path(clip_path)
    
    title = highlight.get("suggested_title", highlight.get("title", clip_path.stem))
    tags = highlight.get("tags", [])
    
    # 如果没有标签，从内容生成
    if not tags:
        content = highlight.get("reason", "") + title
        tags = generate_tags_from_content(content)
    
    # 生成新文件名
    new_name = generate_viral_filename(title, tags)
    new_path = clip_path.parent / f"{new_name}{clip_path.suffix}"
    
    # 避免重名
    counter = 1
    while new_path.exists() and new_path != clip_path:
        new_path = clip_path.parent / f"{new_name}_{counter}{clip_path.suffix}"
        counter += 1
    
    # 重命名
    if new_path != clip_path:
        shutil.move(str(clip_path), str(new_path))
        print(f"   📁 {clip_path.name} → {new_path.name}")
    
    return str(new_path)


def extract_clip_subtitle(full_srt: str, start_time: str, end_time: str, output_path: str):
    """从完整字幕中提取切片对应的部分"""
    from clean_subtitle import parse_srt, time_to_seconds, generate_srt
    
    segments = parse_srt(full_srt)
    start_sec = time_str_to_seconds(start_time)
    end_sec = time_str_to_seconds(end_time)
    
    # 筛选时间范围内的字幕
    clip_segments = []
    for seg in segments:
        seg_start = time_to_seconds(seg['start'])
        seg_end = time_to_seconds(seg['end'])
        
        if seg_start >= start_sec and seg_end <= end_sec:
            # 调整时间偏移
            new_start = seg_start - start_sec
            new_end = seg_end - start_sec
            clip_segments.append({
                'id': len(clip_segments) + 1,
                'start': seconds_to_time_str(new_start),
                'end': seconds_to_time_str(new_end),
                'text': seg['text']
            })
    
    if clip_segments:
        generate_srt(clip_segments, output_path)
        return True
    return False


def time_str_to_seconds(time_str: str) -> float:
    """时间字符串转秒数"""
    time_str = time_str.replace(',', '.')
    parts = time_str.split(':')
    if len(parts) == 3:
        h, m, s = parts
        return int(h) * 3600 + int(m) * 60 + float(s)
    elif len(parts) == 2:
        m, s = parts
        return int(m) * 60 + float(s)
    return float(time_str)


def seconds_to_time_str(seconds: float) -> str:
    """秒数转时间字符串"""
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = seconds % 60
    ms = int((s % 1) * 1000)
    s = int(s)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def generate_jianying_draft(
    clip_path: str,
    draft_output_dir: str,
    draft_name: str,
    srt_path: str = None,
    hook: str = None,
    cta: str = None,
    style: str = "default",
    to_jianying: bool = False
) -> str:
    """生成剪映草稿"""
    print(f"\n🎬 生成剪映草稿: {draft_name}")
    
    generate_script = SCRIPTS_DIR / "generate_jianying_draft.py"
    
    cmd = [
        sys.executable, str(generate_script),
        "--video", clip_path,
        "--output", draft_output_dir,
        "--name", draft_name,
        "--style", style,
    ]
    
    if srt_path and os.path.exists(srt_path):
        cmd.extend(["--srt", srt_path])
    
    if hook:
        cmd.extend(["--hook", hook])
    
    if cta:
        cmd.extend(["--cta", cta])
    
    if to_jianying:
        cmd.append("--to_jianying")
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode == 0:
        print(result.stdout)
        return draft_output_dir
    else:
        print(f"   ⚠️ 生成失败: {result.stderr}")
        return None


def process_all_clips(
    clips_dir: str,
    highlights_json: str,
    full_srt: str = None,
    output_dir: str = None,
    subtitle_style: str = "default",
    to_jianying: bool = False
):
    """处理所有切片"""
    clips_dir = Path(clips_dir)
    
    # 加载高光片段信息
    with open(highlights_json, 'r', encoding='utf-8') as f:
        highlights = json.load(f)
    
    # 获取所有切片文件
    clip_files = sorted(clips_dir.glob("*.mp4"))
    
    if not clip_files:
        print(f"❌ 没有找到切片文件: {clips_dir}")
        return
    
    # 设置输出目录
    if output_dir:
        output_dir = Path(output_dir)
    else:
        output_dir = clips_dir.parent / "processed"
    output_dir.mkdir(parents=True, exist_ok=True)
    
    drafts_dir = output_dir / "jianying_drafts"
    drafts_dir.mkdir(exist_ok=True)
    
    print("="*60)
    print("🚀 切片一键处理")
    print("="*60)
    print(f"切片目录: {clips_dir}")
    print(f"切片数量: {len(clip_files)}")
    print(f"输出目录: {output_dir}")
    print(f"字幕样式: {subtitle_style}")
    print(f"导入剪映: {'是' if to_jianying else '否'}")
    print("="*60)
    
    # 清洗原始字幕
    clean_srt = None
    if full_srt and os.path.exists(full_srt):
        clean_srt = clean_subtitles(full_srt)
    
    # 处理每个切片
    processed = []
    for i, clip_path in enumerate(clip_files):
        highlight = highlights[i] if i < len(highlights) else {}
        
        print(f"\n[{i+1}/{len(clip_files)}] 处理: {clip_path.name}")
        
        # 1. 重命名文件
        new_clip_path = rename_clip_with_tags(str(clip_path), highlight)
        
        # 2. 提取切片字幕
        clip_srt = None
        if clean_srt:
            start_time = highlight.get("start_time", "00:00:00")
            end_time = highlight.get("end_time", "00:01:00")
            clip_srt = str(Path(new_clip_path).with_suffix('.srt'))
            # 简化：直接复制清洗后的字幕
            # 完整实现需要按时间范围提取
            shutil.copy(clean_srt, clip_srt)
        
        # 3. 获取Hook和CTA
        hook = highlight.get("hook_3sec", "")
        cta = highlight.get("cta_ending", "关注我，获取更多干货")
        
        # 4. 生成剪映草稿
        draft_name = Path(new_clip_path).stem
        generate_jianying_draft(
            clip_path=new_clip_path,
            draft_output_dir=str(drafts_dir),
            draft_name=draft_name,
            srt_path=clip_srt,
            hook=hook,
            cta=cta,
            style=subtitle_style,
            to_jianying=to_jianying
        )
        
        processed.append({
            "original": str(clip_path),
            "processed": new_clip_path,
            "subtitle": clip_srt,
            "hook": hook,
            "cta": cta,
            "tags": highlight.get("tags", []),
        })
    
    # 保存处理结果
    result_path = output_dir / "processed_clips.json"
    with open(result_path, 'w', encoding='utf-8') as f:
        json.dump(processed, f, ensure_ascii=False, indent=2)
    
    print("\n" + "="*60)
    print("✅ 处理完成！")
    print("="*60)
    print(f"处理数量: {len(processed)}")
    print(f"输出目录: {output_dir}")
    print(f"剪映草稿: {drafts_dir}")
    
    if to_jianying:
        print("\n📱 打开剪映即可看到导入的草稿")
    else:
        print(f"\n下一步：")
        print(f"1. 运行以下命令导入剪映：")
        print(f"   python {SCRIPTS_DIR}/generate_jianying_draft.py --to_jianying ...")
        print(f"2. 或手动将 {drafts_dir} 中的文件夹复制到剪映项目目录")


def main():
    parser = argparse.ArgumentParser(description="切片一键处理")
    parser.add_argument("--clips_dir", "-c", required=True, help="切片视频目录")
    parser.add_argument("--highlights", "-h", required=True, help="高光片段JSON文件")
    parser.add_argument("--srt", "-s", help="完整字幕SRT文件")
    parser.add_argument("--output", "-o", help="输出目录")
    parser.add_argument("--style", default="default", 
                        choices=["default", "impact", "elegant", "modern"],
                        help="字幕样式")
    parser.add_argument("--to_jianying", action="store_true", help="自动导入剪映")
    
    args = parser.parse_args()
    
    process_all_clips(
        clips_dir=args.clips_dir,
        highlights_json=args.highlights,
        full_srt=args.srt,
        output_dir=args.output,
        subtitle_style=args.style,
        to_jianying=args.to_jianying
    )


if __name__ == "__main__":
    main()

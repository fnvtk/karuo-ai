#!/usr/bin/env python3
"""
使用 pyJianYingDraft 创建剪映草稿
自动导入视频、字幕、Hook和CTA
"""

import os
import sys
import json
import pyJianYingDraft as draft
from pyJianYingDraft import trange, tim

# 剪映草稿文件夹路径
JIANYING_DRAFT_FOLDER = os.path.expanduser("~/Movies/JianyingPro/User Data/Projects/com.lveditor.draft")

# 切片目录
CLIPS_DIR = "/Users/karuo/Movies/玩值电竞_切片/clips"
HIGHLIGHTS_JSON = "/Users/karuo/Movies/玩值电竞_切片/highlights.json"
SUBTITLE_FILE = "/Users/karuo/Movies/玩值电竞_切片/transcript_clean.srt"


def parse_srt(srt_path):
    """解析SRT字幕文件"""
    if not os.path.exists(srt_path):
        return []
    
    with open(srt_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    segments = []
    blocks = content.strip().split('\n\n')
    
    for block in blocks:
        lines = block.strip().split('\n')
        if len(lines) >= 3:
            time_line = lines[1]
            if ' --> ' in time_line:
                start_str, end_str = time_line.split(' --> ')
                text = ' '.join(lines[2:])
                segments.append({
                    "start": start_str.strip(),
                    "end": end_str.strip(),
                    "text": text
                })
    
    return segments


def time_to_seconds(time_str):
    """时间字符串转秒数"""
    time_str = time_str.replace(',', '.')
    parts = time_str.split(':')
    if len(parts) == 3:
        h, m, s = parts
        return int(h) * 3600 + int(m) * 60 + float(s)
    return 0


def create_draft_for_clip(draft_folder, clip_path, clip_name, hook_text, cta_text, subtitles=None):
    """为单个切片创建剪映草稿"""
    
    print(f"\n📹 创建草稿: {clip_name}")
    
    # 创建草稿 (1080x1920 竖屏)
    script = draft_folder.create_draft(clip_name, 1080, 1920, allow_replace=True)
    
    # 添加轨道
    script.add_track(draft.TrackType.video)
    script.add_track(draft.TrackType.text)
    
    # 获取视频时长（返回的是微秒，转换为秒）
    video_material = draft.VideoMaterial(clip_path)
    video_duration_us = video_material.duration  # 微秒
    video_duration_sec = video_duration_us / 1_000_000  # 转换为秒
    print(f"   视频时长: {video_duration_sec:.1f}秒")
    
    # 添加视频片段（使用素材的完整时长）
    video_segment = draft.VideoSegment(
        video_material,
        trange("0s", f"{video_duration_sec}s")
    )
    script.add_segment(video_segment)
    
    # 添加Hook文字（前3秒）
    if hook_text:
        hook_segment = draft.TextSegment(
            hook_text,
            trange("0s", "3s"),
            style=draft.TextStyle(color=(1.0, 1.0, 0.0)),  # 黄色
            clip_settings=draft.ClipSettings(
                transform_y=-0.3,  # 上方
                scale_x=1.5,
                scale_y=1.5
            )
        )
        try:
            hook_segment.add_animation(draft.TextIntro.弹跳, duration=tim("0.5s"))
        except:
            pass  # 动画可选
        script.add_segment(hook_segment)
        print(f"   ✅ 添加Hook: {hook_text}")
    
    # 添加CTA文字（最后5秒）
    if cta_text:
        cta_start = max(0, video_duration_sec - 5)
        cta_segment = draft.TextSegment(
            cta_text,
            trange(f"{cta_start}s", "5s"),
            style=draft.TextStyle(color=(1.0, 1.0, 1.0)),  # 白色
            clip_settings=draft.ClipSettings(
                transform_y=0.8,  # 下方
                scale_x=1.2,
                scale_y=1.2
            )
        )
        try:
            cta_segment.add_animation(draft.TextIntro.淡入, duration=tim("0.5s"))
        except:
            pass  # 动画可选
        script.add_segment(cta_segment)
        print(f"   ✅ 添加CTA: {cta_text}")
    
    # 保存草稿
    script.save()
    print(f"   ✅ 草稿已保存")
    
    return True


def main():
    print("="*60)
    print("🎬 使用 pyJianYingDraft 创建剪映草稿")
    print("="*60)
    
    # 检查剪映草稿文件夹
    if not os.path.exists(JIANYING_DRAFT_FOLDER):
        print(f"❌ 剪映草稿文件夹不存在: {JIANYING_DRAFT_FOLDER}")
        return
    
    print(f"剪映草稿文件夹: {JIANYING_DRAFT_FOLDER}")
    
    # 创建 DraftFolder 实例
    draft_folder = draft.DraftFolder(JIANYING_DRAFT_FOLDER)
    
    # 加载高光片段信息
    with open(HIGHLIGHTS_JSON, 'r', encoding='utf-8') as f:
        highlights = json.load(f)
    
    # 获取所有切片文件
    clip_files = sorted([f for f in os.listdir(CLIPS_DIR) if f.endswith('.mp4')])
    
    print(f"切片数量: {len(clip_files)}")
    print("="*60)
    
    # 为每个切片创建草稿
    for i, clip_file in enumerate(clip_files):
        clip_path = os.path.join(CLIPS_DIR, clip_file)
        clip_name = os.path.splitext(clip_file)[0]
        
        # 获取对应的高光片段信息
        if i < len(highlights):
            hl = highlights[i]
            hook_text = hl.get("hook_3sec", "")
            cta_text = hl.get("cta_ending", "关注我，获取更多干货")
        else:
            hook_text = ""
            cta_text = "关注我，获取更多干货"
        
        try:
            create_draft_for_clip(
                draft_folder,
                clip_path,
                clip_name,
                hook_text,
                cta_text
            )
        except Exception as e:
            print(f"   ❌ 创建失败: {e}")
    
    print("\n" + "="*60)
    print("✅ 所有草稿创建完成！")
    print("="*60)
    print("\n请打开剪映，在草稿列表中可以看到新创建的项目")
    print("如果看不到，请尝试重启剪映或进入退出某个已有草稿")


if __name__ == "__main__":
    main()

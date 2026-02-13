#!/usr/bin/env python3
"""
剪映草稿生成器
生成可直接导入剪映的草稿文件

剪映草稿结构：
- draft_content.json  # 主文件
- draft_meta_info.json  # 元信息
- draft_materials/  # 素材目录
"""

import argparse
import json
import os
import shutil
import uuid
import hashlib
from pathlib import Path
from datetime import datetime
import subprocess


# 剪映草稿目录（新版剪映在 ~/Movies/JianyingPro）
JIANYING_PROJECTS_DIR = Path.home() / "Movies/JianyingPro/User Data/Projects/com.lveditor.draft"

# 剪映应用路径
JIANYING_APP_PATH = "/Applications/VideoFusion-macOS.app"

# 字幕样式预设
SUBTITLE_STYLES = {
    "default": {
        "font": "HYQiHei",  # 汉仪旗黑
        "font_size": 8.0,  # 剪映单位
        "font_color": "#FFFFFF",
        "background_color": "#000000",
        "background_alpha": 0.6,
        "bold": True,
        "italic": False,
        "underline": False,
        "alignment": 1,  # 居中
    },
    "impact": {  # 冲击力样式
        "font": "HYQiHei",
        "font_size": 10.0,
        "font_color": "#FFFF00",  # 黄色
        "background_color": "#000000",
        "background_alpha": 0.8,
        "bold": True,
        "stroke_color": "#000000",
        "stroke_width": 2.0,
    },
    "elegant": {  # 优雅样式
        "font": "SourceHanSerifCN",  # 思源宋体
        "font_size": 7.0,
        "font_color": "#FFFFFF",
        "background_color": "#1a1a1a",
        "background_alpha": 0.5,
        "bold": False,
    },
    "modern": {  # 现代简约
        "font": "PingFangSC",
        "font_size": 8.0,
        "font_color": "#FFFFFF",
        "background_color": "none",
        "bold": True,
        "shadow": True,
    }
}


def get_video_info(video_path: str) -> dict:
    """获取视频信息"""
    try:
        cmd = [
            "ffprobe", "-v", "quiet",
            "-print_format", "json",
            "-show_format", "-show_streams",
            video_path
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        info = json.loads(result.stdout)
        
        video_stream = next((s for s in info.get('streams', []) if s['codec_type'] == 'video'), {})
        audio_stream = next((s for s in info.get('streams', []) if s['codec_type'] == 'audio'), {})
        
        return {
            "duration": float(info.get('format', {}).get('duration', 0)),
            "width": int(video_stream.get('width', 1080)),
            "height": int(video_stream.get('height', 1920)),
            "fps": eval(video_stream.get('r_frame_rate', '30/1')),
            "has_audio": bool(audio_stream),
        }
    except Exception as e:
        print(f"  ⚠️ 获取视频信息失败: {e}")
        return {"duration": 60, "width": 1080, "height": 1920, "fps": 30, "has_audio": True}


def parse_srt(srt_path: str) -> list:
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
                start = time_str_to_microseconds(start_str.strip())
                end = time_str_to_microseconds(end_str.strip())
                text = ' '.join(lines[2:])
                segments.append({
                    "start": start,
                    "end": end,
                    "text": text
                })
    
    return segments


def time_str_to_microseconds(time_str: str) -> int:
    """时间字符串转微秒"""
    time_str = time_str.replace(',', '.')
    parts = time_str.split(':')
    if len(parts) == 3:
        h, m, s = parts
        seconds = int(h) * 3600 + int(m) * 60 + float(s)
        return int(seconds * 1_000_000)
    return 0


def generate_uuid() -> str:
    """生成UUID"""
    return str(uuid.uuid4()).upper()


def generate_material_id() -> str:
    """生成素材ID"""
    return hashlib.md5(str(uuid.uuid4()).encode()).hexdigest()[:16].upper()


def create_draft_content(
    video_path: str,
    video_info: dict,
    subtitles: list,
    hook_text: str = None,
    cta_text: str = None,
    subtitle_style: str = "default"
) -> dict:
    """创建剪映草稿内容"""
    
    duration_us = int(video_info['duration'] * 1_000_000)
    width = video_info['width']
    height = video_info['height']
    
    # 获取样式
    style = SUBTITLE_STYLES.get(subtitle_style, SUBTITLE_STYLES["default"])
    
    # 基础结构
    draft = {
        "canvas_config": {
            "height": height,
            "width": width,
            "ratio": f"{width}:{height}"
        },
        "color_space": 0,
        "config": {
            "adjust_max_index": 1,
            "combination_max_index": 1,
            "export_range": None,
            "sticker_max_index": 1,
            "subtitle_max_index": len(subtitles) + 2,  # 字幕 + hook + cta
            "text_max_index": 2,
            "video_max_index": 1,
        },
        "duration": duration_us,
        "fps": 30.0,
        "id": generate_uuid(),
        "keyframes": {"adjusts": [], "audios": [], "effects": [], "filters": [], "stickers": [], "texts": [], "videos": []},
        "materials": {
            "audios": [],
            "effects": [],
            "flowers": [],
            "material_animations": [],
            "speeds": [],
            "stickers": [],
            "texts": [],
            "video_effects": [],
            "videos": []
        },
        "mutable_config": None,
        "name": "",
        "new_version": "106.0.0",
        "platform": {
            "app_id": 3704,
            "app_source": "lv",
            "app_version": "6.5.0",
            "device_id": "",
            "hard_disk_id": "",
            "mac_address": "",
            "os": "mac",
            "os_version": "14.0"
        },
        "relationships": [],
        "render_index_track_mode_on": False,
        "tracks": [],
        "update_time": int(datetime.now().timestamp() * 1_000_000),
        "version": 360000
    }
    
    # 添加视频素材
    video_material_id = generate_material_id()
    draft["materials"]["videos"].append({
        "aigc_type": "none",
        "audio_fade": None,
        "cartoon": False,
        "category_id": "",
        "category_name": "local",
        "check_flag": 63487,
        "crop": {"lower_left_x": 0.0, "lower_left_y": 1.0, "lower_right_x": 1.0, "lower_right_y": 1.0, "upper_left_x": 0.0, "upper_left_y": 0.0, "upper_right_x": 1.0, "upper_right_y": 0.0},
        "crop_ratio": "free",
        "crop_scale": 1.0,
        "duration": duration_us,
        "extra_type_option": 0,
        "formula_id": "",
        "freeze": None,
        "has_audio": video_info['has_audio'],
        "height": height,
        "id": video_material_id,
        "intensifies_audio": False,
        "intensifies_path": "",
        "is_ai_generate_content": False,
        "is_unified_beauty_mode": False,
        "local_id": "",
        "local_material_id": "",
        "material_id": video_material_id,
        "material_name": Path(video_path).stem,
        "material_url": "",
        "matting": {"flag": 0, "has_use_quick_brush": False, "has_use_quick_eraser": False, "interactiveTime": [], "path": "", "strokes": []},
        "media_path": "",
        "path": video_path,
        "picture_from": "none",
        "picture_set_category_id": "",
        "picture_set_category_name": "",
        "request_id": "",
        "reverse_intensifies_path": "",
        "reverse_path": "",
        "smart_motion": None,
        "source": 0,
        "source_platform": 0,
        "stable": {"matrix_path": "", "stable_level": 0, "time_range": {"duration": 0, "start": 0}},
        "team_id": "",
        "type": "video",
        "video_algorithm": {"algorithms": [], "deflicker": None, "motion_blur_config": None, "noise_reduction": None, "path": "", "quality_enhance": None, "time_range": None},
        "width": width
    })
    
    # 添加视频轨道
    video_segment_id = generate_uuid()
    draft["tracks"].append({
        "attribute": 0,
        "flag": 0,
        "id": generate_uuid(),
        "is_default_name": True,
        "name": "",
        "segments": [{
            "cartoon": False,
            "clip": {"alpha": 1.0, "flip": {"horizontal": False, "vertical": False}, "rotation": 0.0, "scale": {"x": 1.0, "y": 1.0}, "transform": {"x": 0.0, "y": 0.0}},
            "common_keyframes": [],
            "enable_adjust": True,
            "enable_color_curves": True,
            "enable_color_match_adjust": False,
            "enable_color_wheels": True,
            "enable_lut": True,
            "enable_smart_color_adjust": False,
            "extra_material_refs": [],
            "group_id": "",
            "hdr_settings": {"intensity": 1.0, "mode": 1, "nits": 1000},
            "id": video_segment_id,
            "intensifies_audio": False,
            "is_placeholder": False,
            "is_tone_modify": False,
            "keyframe_refs": [],
            "last_nonzero_volume": 1.0,
            "material_id": video_material_id,
            "render_index": 0,
            "responsive_layout": {"enable": False, "horizontal_pos_layout": 0, "size_layout": 0, "target_follow": "", "vertical_pos_layout": 0},
            "reverse": False,
            "source_timerange": {"duration": duration_us, "start": 0},
            "speed": 1.0,
            "target_timerange": {"duration": duration_us, "start": 0},
            "template_id": "",
            "template_scene": "default",
            "track_attribute": 0,
            "track_render_index": 0,
            "uniform_scale": {"on": True, "value": 1.0},
            "visible": True,
            "volume": 1.0
        }],
        "type": "video"
    })
    
    # 添加字幕轨道
    if subtitles:
        subtitle_segments = []
        for i, sub in enumerate(subtitles):
            text_material_id = generate_material_id()
            
            # 添加文字素材
            draft["materials"]["texts"].append({
                "add_type": 0,
                "alignment": style.get("alignment", 1),
                "background_alpha": style.get("background_alpha", 0.6),
                "background_color": style.get("background_color", "#000000"),
                "background_height": 0.14,
                "background_horizontal_offset": 0.0,
                "background_round_radius": 0.0,
                "background_style": 0,
                "background_vertical_offset": 0.0,
                "background_width": 0.14,
                "bold_width": 0.0,
                "border_alpha": 1.0,
                "border_color": "",
                "border_width": 0.08,
                "caption_template_info": {"category_id": "", "category_name": "", "effect_id": "", "is_new": False, "path": "", "request_id": "", "resource_id": "", "resource_name": "", "source_platform": 0},
                "check_flag": 7,
                "combo_info": {"text_templates": []},
                "content": sub["text"],
                "fixed_height": -1.0,
                "fixed_width": -1.0,
                "font_category_id": "",
                "font_category_name": "",
                "font_id": "",
                "font_name": "",
                "font_path": style.get("font", "HYQiHei"),
                "font_resource_id": "",
                "font_size": style.get("font_size", 8.0),
                "font_source_platform": 0,
                "font_team_id": "",
                "font_title": style.get("font", "HYQiHei"),
                "font_url": "",
                "fonts": [],
                "force_apply_line_max_width": False,
                "global_alpha": 1.0,
                "group_id": "",
                "has_shadow": style.get("shadow", False),
                "id": text_material_id,
                "initial_scale": 1.0,
                "inner_padding": -1.0,
                "is_rich_text": False,
                "italic_degree": 0,
                "ktv_color": "",
                "language": "",
                "layer_weight": 1,
                "letter_spacing": 0.0,
                "line_feed": 1,
                "line_max_width": 0.82,
                "line_spacing": 0.02,
                "multi_language_current": "none",
                "name": "",
                "original_size": [],
                "preset_category": "",
                "preset_category_id": "",
                "preset_has_set_alignment": False,
                "preset_id": "",
                "preset_index": 0,
                "preset_name": "",
                "recognize_task_id": "",
                "recognize_type": 0,
                "relevance_segment": [],
                "shadow_alpha": 0.9,
                "shadow_angle": -45.0,
                "shadow_color": "#000000",
                "shadow_distance": 5.0,
                "shadow_point": {"x": 0.6363961030678928, "y": -0.6363961030678928},
                "shadow_smoothing": 0.45,
                "shape_clip_x": False,
                "shape_clip_y": False,
                "source_from": "",
                "style_name": "",
                "sub_type": 0,
                "subtitle_keywords": None,
                "text_alpha": 1.0,
                "text_color": style.get("font_color", "#FFFFFF"),
                "text_curve": None,
                "text_preset_resource_id": "",
                "text_size": 30,
                "text_to_audio_ids": [],
                "tts_auto_update": False,
                "type": "subtitle",
                "typesetting": 0,
                "underline": style.get("underline", False),
                "underline_offset": 0.22,
                "underline_width": 0.05,
                "use_effect_default_color": True,
                "words": {"end_time": [], "start_time": [], "text": []}
            })
            
            # 添加字幕片段
            subtitle_segments.append({
                "caption_info": None,
                "clip": {"alpha": 1.0, "flip": {"horizontal": False, "vertical": False}, "rotation": 0.0, "scale": {"x": 1.0, "y": 1.0}, "transform": {"x": 0.0, "y": 0.7}},
                "common_keyframes": [],
                "enable_adjust": False,
                "enable_color_curves": True,
                "enable_color_match_adjust": False,
                "enable_color_wheels": True,
                "enable_lut": False,
                "enable_smart_color_adjust": False,
                "extra_material_refs": [],
                "group_id": "",
                "hdr_settings": None,
                "id": generate_uuid(),
                "intensifies_audio": False,
                "is_placeholder": False,
                "is_tone_modify": False,
                "keyframe_refs": [],
                "last_nonzero_volume": 1.0,
                "material_id": text_material_id,
                "render_index": 11000 + i,
                "responsive_layout": {"enable": False, "horizontal_pos_layout": 0, "size_layout": 0, "target_follow": "", "vertical_pos_layout": 0},
                "reverse": False,
                "source_timerange": {"duration": sub["end"] - sub["start"], "start": 0},
                "speed": 1.0,
                "target_timerange": {"duration": sub["end"] - sub["start"], "start": sub["start"]},
                "template_id": "",
                "template_scene": "default",
                "track_attribute": 0,
                "track_render_index": 1,
                "uniform_scale": {"on": True, "value": 1.0},
                "visible": True,
                "volume": 1.0
            })
        
        # 添加字幕轨道
        draft["tracks"].append({
            "attribute": 0,
            "flag": 0,
            "id": generate_uuid(),
            "is_default_name": True,
            "name": "",
            "segments": subtitle_segments,
            "type": "text"
        })
    
    # 添加Hook文字（前3秒）
    if hook_text:
        hook_material_id = generate_material_id()
        draft["materials"]["texts"].append({
            "content": hook_text,
            "font_path": "HYQiHei",
            "font_size": 12.0,
            "font_color": "#FFFF00",
            "text_color": "#FFFF00",
            "background_alpha": 0.8,
            "background_color": "#000000",
            "bold_width": 0.1,
            "has_shadow": True,
            "shadow_color": "#000000",
            "id": hook_material_id,
            "type": "text",
            "alignment": 1,
        })
        
        # Hook轨道
        draft["tracks"].append({
            "attribute": 0,
            "flag": 0,
            "id": generate_uuid(),
            "is_default_name": True,
            "name": "Hook",
            "segments": [{
                "clip": {"alpha": 1.0, "flip": {"horizontal": False, "vertical": False}, "rotation": 0.0, "scale": {"x": 1.0, "y": 1.0}, "transform": {"x": 0.0, "y": -0.3}},
                "id": generate_uuid(),
                "material_id": hook_material_id,
                "render_index": 20000,
                "source_timerange": {"duration": 3_000_000, "start": 0},
                "target_timerange": {"duration": 3_000_000, "start": 0},
                "visible": True,
            }],
            "type": "text"
        })
    
    # 添加CTA文字（最后5秒）
    if cta_text:
        cta_material_id = generate_material_id()
        cta_start = max(0, duration_us - 5_000_000)
        
        draft["materials"]["texts"].append({
            "content": cta_text,
            "font_path": "HYQiHei",
            "font_size": 9.0,
            "font_color": "#FFFFFF",
            "text_color": "#FFFFFF",
            "background_alpha": 0.7,
            "background_color": "#FF0000",
            "id": cta_material_id,
            "type": "text",
            "alignment": 1,
        })
        
        # CTA轨道
        draft["tracks"].append({
            "attribute": 0,
            "flag": 0,
            "id": generate_uuid(),
            "is_default_name": True,
            "name": "CTA",
            "segments": [{
                "clip": {"alpha": 1.0, "flip": {"horizontal": False, "vertical": False}, "rotation": 0.0, "scale": {"x": 1.0, "y": 1.0}, "transform": {"x": 0.0, "y": 0.85}},
                "id": generate_uuid(),
                "material_id": cta_material_id,
                "render_index": 20001,
                "source_timerange": {"duration": 5_000_000, "start": 0},
                "target_timerange": {"duration": 5_000_000, "start": cta_start},
                "visible": True,
            }],
            "type": "text"
        })
    
    return draft


def create_draft_meta(draft_name: str, draft_id: str) -> dict:
    """创建草稿元信息"""
    now = int(datetime.now().timestamp() * 1_000_000)
    return {
        "draft_cloud_capcut_purchase_info": None,
        "draft_cloud_last_action_download": False,
        "draft_cloud_materials": [],
        "draft_cloud_purchase_info": None,
        "draft_cloud_template_id": "",
        "draft_cloud_tutorial_info": None,
        "draft_cloud_videocut_purchase_info": None,
        "draft_cover": "",
        "draft_deeplink_url": "",
        "draft_enterprise_info": None,
        "draft_fold_path": "",
        "draft_id": draft_id,
        "draft_is_ai_shorts": False,
        "draft_is_ai_translate": False,
        "draft_is_article_video_draft": False,
        "draft_is_from_deeplink": False,
        "draft_is_invisible": False,
        "draft_materials_copied": False,
        "draft_name": draft_name,
        "draft_new_version": "",
        "draft_removable_storage_device": "",
        "draft_root_path": "",
        "draft_segment_extra_info": None,
        "draft_timeline_materials_size": 0,
        "draft_type": "",
        "tm_draft_cloud_completed": 0,
        "tm_draft_cloud_modified": 0,
        "tm_draft_create": now,
        "tm_draft_modified": now,
        "tm_draft_removed": 0,
        "tm_duration": 0
    }


def generate_draft(
    video_path: str,
    output_dir: str,
    draft_name: str,
    srt_path: str = None,
    hook_text: str = None,
    cta_text: str = None,
    subtitle_style: str = "default"
) -> str:
    """生成完整的剪映草稿"""
    
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    # 生成草稿ID
    draft_id = generate_uuid()
    draft_folder = output_path / f"dfd_{draft_id}"
    draft_folder.mkdir(exist_ok=True)
    
    print(f"📁 创建草稿: {draft_name}")
    print(f"   目录: {draft_folder}")
    
    # 获取视频信息
    video_info = get_video_info(video_path)
    print(f"   视频: {video_info['width']}x{video_info['height']}, {video_info['duration']:.1f}秒")
    
    # 解析字幕
    subtitles = []
    if srt_path and os.path.exists(srt_path):
        subtitles = parse_srt(srt_path)
        print(f"   字幕: {len(subtitles)} 条")
    
    # 生成草稿内容
    draft_content = create_draft_content(
        video_path=video_path,
        video_info=video_info,
        subtitles=subtitles,
        hook_text=hook_text,
        cta_text=cta_text,
        subtitle_style=subtitle_style
    )
    
    # 保存草稿内容
    content_path = draft_folder / "draft_content.json"
    with open(content_path, 'w', encoding='utf-8') as f:
        json.dump(draft_content, f, ensure_ascii=False, indent=2)
    
    # 生成元信息
    meta_info = create_draft_meta(draft_name, draft_id)
    meta_path = draft_folder / "draft_meta_info.json"
    with open(meta_path, 'w', encoding='utf-8') as f:
        json.dump(meta_info, f, ensure_ascii=False, indent=2)
    
    # 创建素材目录
    (draft_folder / "draft_materials").mkdir(exist_ok=True)
    
    print(f"✅ 草稿生成完成")
    
    return str(draft_folder)


def copy_to_jianying(draft_folder: str) -> bool:
    """复制草稿到剪映目录"""
    if not JIANYING_PROJECTS_DIR.exists():
        print(f"⚠️ 剪映项目目录不存在: {JIANYING_PROJECTS_DIR}")
        print("   请确保已安装剪映专业版")
        return False
    
    draft_path = Path(draft_folder)
    target_path = JIANYING_PROJECTS_DIR / draft_path.name
    
    if target_path.exists():
        shutil.rmtree(target_path)
    
    shutil.copytree(draft_folder, target_path)
    print(f"✅ 已复制到剪映: {target_path}")
    print("   打开剪映即可看到新草稿")
    
    return True


def main():
    parser = argparse.ArgumentParser(description="剪映草稿生成器")
    parser.add_argument("--video", "-v", required=True, help="视频文件路径")
    parser.add_argument("--output", "-o", required=True, help="输出目录")
    parser.add_argument("--name", "-n", required=True, help="草稿名称")
    parser.add_argument("--srt", "-s", help="SRT字幕文件")
    parser.add_argument("--hook", help="前3秒Hook文字")
    parser.add_argument("--cta", help="结尾CTA文字")
    parser.add_argument("--style", default="default", choices=list(SUBTITLE_STYLES.keys()), help="字幕样式")
    parser.add_argument("--to_jianying", action="store_true", help="自动复制到剪映目录")
    
    args = parser.parse_args()
    
    if not os.path.exists(args.video):
        print(f"❌ 视频文件不存在: {args.video}")
        return
    
    # 生成草稿
    draft_folder = generate_draft(
        video_path=args.video,
        output_dir=args.output,
        draft_name=args.name,
        srt_path=args.srt,
        hook_text=args.hook,
        cta_text=args.cta,
        subtitle_style=args.style
    )
    
    # 复制到剪映
    if args.to_jianying:
        copy_to_jianying(draft_folder)


if __name__ == "__main__":
    main()

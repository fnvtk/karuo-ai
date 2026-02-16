#!/usr/bin/env python3
"""
剪映处理脚本
将切片视频导入剪映草稿，自动添加Hook文字和CTA结尾
"""

import argparse
import json
import os
import shutil
import subprocess
import sys
import uuid
from pathlib import Path
from datetime import datetime
import requests

# 配置
SKILL_DIR = Path(__file__).parent.parent
OUTPUT_DIR = SKILL_DIR / "output"

# 剪映草稿目录（Mac）
JIANYING_DRAFT_DIR = Path.home() / "Library/Containers/com.lemon.lvpro/Data/Movies/JianyingPro/User Data/Projects"

# CapCutAPI 服务地址
CAPCUT_API_URL = "http://localhost:9001"


def check_capcut_api():
    """检查 CapCutAPI 服务是否运行"""
    try:
        response = requests.get(f"{CAPCUT_API_URL}/health", timeout=5)
        return response.status_code == 200
    except:
        return False


def start_capcut_server():
    """提示启动 CapCutAPI 服务"""
    print("⚠️  CapCutAPI 服务未运行")
    print("\n请先启动服务：")
    print("  1. 安装 CapCutAPI：pip install capcut-api")
    print("  2. 启动服务：capcut-server 或 python -m capcut_api.server")
    print(f"  3. 服务地址：{CAPCUT_API_URL}")
    print("\n或者使用手动模式导入剪映（见下方说明）")
    return False


def create_draft(name: str) -> str:
    """创建剪映草稿"""
    try:
        response = requests.post(f"{CAPCUT_API_URL}/create_draft", json={
            "name": name
        }, timeout=30)
        if response.status_code == 200:
            return response.json().get("draft_id")
    except Exception as e:
        print(f"  ❌ 创建草稿失败: {e}")
    return None


def add_video_to_draft(draft_id: str, video_path: str, start: float = 0, end: float = None) -> bool:
    """添加视频到草稿"""
    try:
        # 获取视频时长
        if end is None:
            duration = get_video_duration(video_path)
            end = duration
        
        response = requests.post(f"{CAPCUT_API_URL}/add_video", json={
            "draft_id": draft_id,
            "video_url": str(video_path),
            "start": start,
            "end": end,
            "width": 1080,
            "height": 1920
        }, timeout=60)
        return response.status_code == 200
    except Exception as e:
        print(f"  ❌ 添加视频失败: {e}")
    return False


def add_text_to_draft(draft_id: str, text: str, start: float, duration: float, 
                      position: dict = None, font_size: int = 48, color: str = "#FFFFFF") -> bool:
    """添加文字到草稿"""
    try:
        if position is None:
            position = {"x": 0.5, "y": 0.15}  # 默认在上方中间
        
        response = requests.post(f"{CAPCUT_API_URL}/add_text", json={
            "draft_id": draft_id,
            "text": text,
            "start": start,
            "duration": duration,
            "font_size": font_size,
            "color": color,
            "position": position
        }, timeout=30)
        return response.status_code == 200
    except Exception as e:
        print(f"  ❌ 添加文字失败: {e}")
    return False


def add_captions_to_draft(draft_id: str, srt_path: str) -> bool:
    """添加字幕到草稿"""
    try:
        response = requests.post(f"{CAPCUT_API_URL}/add_captions", json={
            "draft_id": draft_id,
            "srt_file": str(srt_path)
        }, timeout=60)
        return response.status_code == 200
    except Exception as e:
        print(f"  ❌ 添加字幕失败: {e}")
    return False


def save_draft(draft_id: str, output_dir: Path) -> str:
    """保存草稿到指定目录"""
    try:
        response = requests.post(f"{CAPCUT_API_URL}/save_draft", json={
            "draft_id": draft_id,
            "output_dir": str(output_dir)
        }, timeout=60)
        if response.status_code == 200:
            return response.json().get("draft_path")
    except Exception as e:
        print(f"  ❌ 保存草稿失败: {e}")
    return None


def get_video_duration(video_path: str) -> float:
    """获取视频时长"""
    try:
        cmd = [
            "ffprobe", "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            video_path
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        return float(result.stdout.strip())
    except:
        return 60.0  # 默认60秒


def process_clip_with_api(clip_path: Path, highlight: dict, output_dir: Path) -> str:
    """使用 CapCutAPI 处理单个切片"""
    title = highlight.get("title", clip_path.stem)
    hook = highlight.get("hook_3sec", "")
    cta = highlight.get("cta_ending", "")
    
    print(f"\n  📹 处理: {title}")
    
    # 创建草稿
    draft_id = create_draft(title)
    if not draft_id:
        return None
    
    # 添加视频
    if not add_video_to_draft(draft_id, str(clip_path)):
        return None
    
    # 添加Hook文字（前3秒）
    if hook:
        add_text_to_draft(
            draft_id, hook, 
            start=0, duration=3.0,
            position={"x": 0.5, "y": 0.15},
            font_size=56,
            color="#FFFF00"  # 黄色醒目
        )
        print(f"     ✅ 添加Hook: {hook}")
    
    # 添加CTA文字（最后5秒）
    if cta:
        duration = get_video_duration(str(clip_path))
        add_text_to_draft(
            draft_id, cta,
            start=max(0, duration - 5), duration=5.0,
            position={"x": 0.5, "y": 0.85},
            font_size=48,
            color="#FFFFFF"
        )
        print(f"     ✅ 添加CTA: {cta}")
    
    # 保存草稿
    draft_path = save_draft(draft_id, output_dir)
    if draft_path:
        print(f"     ✅ 草稿保存: {draft_path}")
    
    return draft_path


def generate_manual_instructions(clips_dir: Path, highlights: list, output_dir: Path):
    """生成手动导入剪映的说明"""
    instructions_path = output_dir / "剪映导入说明.md"
    
    content = """# 剪映手动导入说明

由于 CapCutAPI 服务未运行，请手动导入切片到剪映。

## 切片列表

"""
    
    for i, highlight in enumerate(highlights, 1):
        title = highlight.get("title", f"切片{i}")
        hook = highlight.get("hook_3sec", "")
        cta = highlight.get("cta_ending", "")
        
        content += f"""### {i}. {title}

- **视频文件**: `clips/{i:02d}_{title}.mp4`
- **前3秒Hook**: {hook}
- **结尾CTA**: {cta}

"""

    content += """## 操作步骤

1. **打开剪映**，创建新项目（9:16 竖屏）

2. **导入切片视频**
   - 将 `clips/` 文件夹中的视频拖入剪映

3. **添加Hook文字**（每个视频开头）
   - 点击「文字」→「新建文本」
   - 输入上面的 Hook 文案
   - 设置时长 3 秒
   - 字体大小 56，颜色黄色，位置居中偏上
   - 添加动画效果（如"弹入"）

4. **添加CTA文字**（每个视频结尾）
   - 点击「文字」→「新建文本」
   - 输入上面的 CTA 文案
   - 放在视频最后 5 秒
   - 字体大小 48，颜色白色，位置居中偏下

5. **添加字幕**（可选）
   - 点击「文字」→「智能字幕」→「识别字幕」

6. **导出发布**
   - 点击右上角「导出」
   - 选择「发布」→「抖音」
   - 填写标题、话题，发布

## 批量处理技巧

1. 先做好第一个视频的模板
2. 使用剪映「模板」功能保存
3. 其他视频一键套用模板

## 切片文件位置

"""
    content += f"```\n{clips_dir}\n```\n"
    
    with open(instructions_path, "w", encoding="utf-8") as f:
        f.write(content)
    
    print(f"\n📄 已生成手动导入说明: {instructions_path}")
    return instructions_path


def copy_drafts_to_jianying(drafts_dir: Path):
    """将草稿复制到剪映目录"""
    if not JIANYING_DRAFT_DIR.exists():
        print(f"⚠️  剪映草稿目录不存在: {JIANYING_DRAFT_DIR}")
        print("   请检查剪映是否已安装")
        return False
    
    # 复制所有 dfd_ 开头的文件夹
    for draft_folder in drafts_dir.glob("dfd_*"):
        target = JIANYING_DRAFT_DIR / draft_folder.name
        if target.exists():
            shutil.rmtree(target)
        shutil.copytree(draft_folder, target)
        print(f"  ✅ 已复制: {draft_folder.name}")
    
    print(f"\n📂 草稿已复制到剪映目录，打开剪映即可看到")
    return True


def main():
    parser = argparse.ArgumentParser(description="剪映处理 - 导入切片并添加Hook/CTA")
    parser.add_argument("--clips_dir", "-c", required=True, help="切片视频目录")
    parser.add_argument("--highlights", "-h", help="高光片段JSON文件（含Hook/CTA）")
    parser.add_argument("--add_hook", action="store_true", help="添加前3秒Hook文字")
    parser.add_argument("--add_cta", action="store_true", help="添加结尾CTA文字")
    parser.add_argument("--default_cta", default="关注我，获取更多干货", help="默认CTA文案")
    parser.add_argument("--output_dir", "-o", help="输出目录")
    parser.add_argument("--to_jianying", action="store_true", help="自动复制草稿到剪映目录")
    
    args = parser.parse_args()
    
    clips_dir = Path(args.clips_dir)
    if not clips_dir.exists():
        print(f"❌ 切片目录不存在: {clips_dir}")
        sys.exit(1)
    
    # 加载高光片段信息
    highlights = []
    if args.highlights:
        highlights_path = Path(args.highlights)
        if highlights_path.exists():
            with open(highlights_path, "r", encoding="utf-8") as f:
                highlights = json.load(f)
    
    # 获取所有切片文件
    clip_files = sorted(clips_dir.glob("*.mp4"))
    if not clip_files:
        print(f"❌ 没有找到切片文件: {clips_dir}")
        sys.exit(1)
    
    print("="*60)
    print("🎬 剪映处理工具")
    print("="*60)
    print(f"切片目录: {clips_dir}")
    print(f"切片数量: {len(clip_files)}")
    print(f"添加Hook: {args.add_hook}")
    print(f"添加CTA: {args.add_cta}")
    print("="*60)
    
    # 创建输出目录
    if args.output_dir:
        output_dir = Path(args.output_dir)
    else:
        output_dir = clips_dir.parent / "jianying_drafts"
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # 检查 CapCutAPI 服务
    use_api = check_capcut_api()
    
    if use_api:
        print("\n✅ CapCutAPI 服务已连接")
        
        # 使用API处理每个切片
        for i, clip_path in enumerate(clip_files):
            highlight = highlights[i] if i < len(highlights) else {
                "title": clip_path.stem,
                "hook_3sec": "" if not args.add_hook else "精彩内容马上开始",
                "cta_ending": args.default_cta if args.add_cta else ""
            }
            
            process_clip_with_api(clip_path, highlight, output_dir)
        
        # 复制到剪映目录
        if args.to_jianying:
            copy_drafts_to_jianying(output_dir)
    else:
        print("\n⚠️  CapCutAPI 服务未运行，生成手动导入说明")
        
        # 如果没有highlights信息，生成基础信息
        if not highlights:
            for i, clip_path in enumerate(clip_files):
                highlights.append({
                    "title": clip_path.stem.split("_", 1)[-1] if "_" in clip_path.stem else clip_path.stem,
                    "hook_3sec": "精彩内容马上开始" if args.add_hook else "",
                    "cta_ending": args.default_cta if args.add_cta else ""
                })
        
        # 生成手动说明
        generate_manual_instructions(clips_dir, highlights, output_dir)
    
    print("\n" + "="*60)
    print("✅ 处理完成！")
    print("="*60)
    print(f"\n输出目录: {output_dir}")
    
    if not use_api:
        print("\n下一步：")
        print(f"1. 查看说明文件: {output_dir / '剪映导入说明.md'}")
        print("2. 按说明在剪映中手动添加Hook和CTA")
        print("3. 发布到抖音")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
抖音发布脚本
通过多种方式将视频发布到抖音

支持的发布方式：
1. 剪映App内手动发布（推荐，最稳定）
2. 抖音开放平台API（需企业资质）
3. Web自动化（Playwright，有风险）
"""

import argparse
import json
import os
import subprocess
import sys
import time
import webbrowser
from pathlib import Path
from datetime import datetime

# 配置
SKILL_DIR = Path(__file__).parent.parent
OUTPUT_DIR = SKILL_DIR / "output"

# 抖音创作者后台
DOUYIN_CREATOR_URL = "https://creator.douyin.com/creator-micro/content/upload"


def publish_via_jianying(draft_path: str = None):
    """
    方式一：通过剪映发布（推荐）
    打开剪映，手动点击发布到抖音
    """
    print("\n" + "="*60)
    print("📱 剪映发布方式（推荐）")
    print("="*60)
    
    print("""
操作步骤：
1. 打开剪映 App
2. 找到对应的草稿项目
3. 点击右上角「导出」
4. 选择「发布」→「抖音」
5. 填写以下信息：
   - 视频标题
   - 话题标签（如 #创业 #私域 #干货）
   - @相关人（可选）
   - 定时发布（可选）
6. 点击「发布」

优点：
- 最稳定，不会被风控
- 可以预览效果
- 支持草稿保存

提示：
- 建议在流量高峰期发布（12:00-14:00, 18:00-22:00）
- 标题包含关键词有助于搜索推荐
""")
    
    # 打开剪映（Mac）
    try:
        subprocess.run(["open", "-a", "JianyingPro"], check=False)
        print("✅ 已打开剪映")
    except:
        print("⚠️  无法自动打开剪映，请手动打开")


def publish_via_open_platform(video_path: str, title: str, tags: list = None):
    """
    方式二：抖音开放平台API（企业）
    需要申请开发者资质
    """
    print("\n" + "="*60)
    print("🔗 抖音开放平台API")
    print("="*60)
    
    print("""
使用条件：
1. 需要企业资质（营业执照）
2. 申请抖音开放平台开发者账号
3. 创建应用并获取 Client Key 和 Client Secret
4. 用户授权获取 Access Token

申请步骤：
1. 访问 https://open.douyin.com/
2. 注册/登录开发者账号
3. 创建应用 → 选择「内容发布」能力
4. 提交企业资质审核
5. 审核通过后获取密钥

API接口：
- 上传视频：POST /video/upload/
- 创建视频：POST /video/create/
- 查询状态：GET /video/list/

示例代码：
```python
import requests

# 上传视频
upload_url = "https://open.douyin.com/video/upload/"
headers = {"access-token": "YOUR_ACCESS_TOKEN"}
files = {"video": open(video_path, "rb")}
response = requests.post(upload_url, headers=headers, files=files)
video_id = response.json()["data"]["video"]["video_id"]

# 创建视频（发布）
create_url = "https://open.douyin.com/video/create/"
data = {
    "video_id": video_id,
    "text": title,
    "micro_app_title": "",
    "cover_tsp": 0.5
}
response = requests.post(create_url, headers=headers, json=data)
```

注意：
- 有发布频率限制
- 需要处理 Token 刷新
- 建议使用官方 SDK
""")
    
    # 打开开放平台
    webbrowser.open("https://open.douyin.com/")


def publish_via_web_automation(video_path: str, title: str, tags: list = None):
    """
    方式三：Web自动化（Playwright）
    模拟浏览器操作，有被检测风险
    """
    print("\n" + "="*60)
    print("🤖 Web自动化发布（Playwright）")
    print("="*60)
    
    print("""
⚠️  警告：此方式有账号风险
- 可能触发风控导致限流
- 严重情况可能导致账号封禁
- 仅建议测试使用，不建议生产使用

使用方法：

1. 安装 Playwright：
   pip install playwright
   playwright install chromium

2. 运行自动化脚本：
""")
    
    # 生成自动化脚本示例
    script_content = f'''#!/usr/bin/env python3
"""
抖音Web自动化发布脚本
⚠️ 仅供测试使用，有账号风险
"""
from playwright.sync_api import sync_playwright
import time

def publish_to_douyin(video_path: str, title: str, tags: list = None):
    with sync_playwright() as p:
        # 使用持久化上下文保持登录状态
        browser = p.chromium.launch_persistent_context(
            user_data_dir="./douyin_browser_data",
            headless=False,  # 显示浏览器窗口
            viewport={{"width": 1280, "height": 800}}
        )
        
        page = browser.pages[0] if browser.pages else browser.new_page()
        
        # 打开抖音创作者后台
        page.goto("{DOUYIN_CREATOR_URL}")
        
        # 等待登录（首次需要手动扫码）
        print("如果需要登录，请扫码...")
        page.wait_for_selector("input[type=file]", timeout=120000)
        
        # 上传视频
        page.set_input_files("input[type=file]", video_path)
        print(f"已上传视频: {{video_path}}")
        
        # 等待上传完成
        time.sleep(10)  # 根据视频大小调整
        
        # 填写标题
        title_input = page.locator("textarea[placeholder*='标题']")
        if title_input.count() > 0:
            title_input.fill(title)
        
        # 添加话题标签
        if tags:
            for tag in tags:
                page.keyboard.type(f"#{tag} ")
        
        # 点击发布（取消注释以实际发布）
        # page.click("button:has-text('发布')")
        
        print("\\n准备就绪，请检查后手动点击发布")
        input("按 Enter 关闭浏览器...")
        
        browser.close()

if __name__ == "__main__":
    publish_to_douyin(
        video_path="{video_path}",
        title="{title}",
        tags={tags or []}
    )
'''
    
    print(f"3. 示例脚本已打印，复制后保存为 publish_web.py 运行")
    print("\n" + "-"*40)
    print(script_content)
    print("-"*40)
    
    # 打开创作者后台
    webbrowser.open(DOUYIN_CREATOR_URL)


def batch_publish_guide(clips_dir: Path, highlights: list = None):
    """
    批量发布指南
    """
    print("\n" + "="*60)
    print("📦 批量发布指南")
    print("="*60)
    
    clips = sorted(clips_dir.glob("*.mp4")) if clips_dir.exists() else []
    
    print(f"\n待发布视频: {len(clips)} 个")
    
    if highlights:
        print("\n视频列表：")
        for i, (clip, hl) in enumerate(zip(clips, highlights), 1):
            title = hl.get("suggested_title", hl.get("title", clip.stem))
            tags = hl.get("tags", [])
            print(f"\n{i}. {title}")
            print(f"   文件: {clip.name}")
            print(f"   标签: {', '.join(tags)}")
    else:
        print("\n视频列表：")
        for i, clip in enumerate(clips, 1):
            print(f"{i}. {clip.name}")
    
    print("""
批量发布建议：

1. 【定时发布】
   - 不要一次性发布所有视频
   - 建议间隔 2-4 小时发布一个
   - 使用剪映/抖音的定时发布功能

2. 【发布时间】
   - 工作日：12:00-14:00, 18:00-22:00
   - 周末：10:00-12:00, 14:00-16:00, 19:00-22:00

3. 【标题优化】
   - 包含关键词（如：创业、私域、赚钱）
   - 使用数字（如：3个方法、5个技巧）
   - 制造悬念（如：...竟然...、原来...）

4. 【话题标签】
   - 每个视频 3-5 个话题
   - 混合使用大话题和垂直话题
   - 示例：#创业 #私域运营 #副业赚钱 #干货分享

5. 【互动提升】
   - 发布后在评论区置顶一条引导语
   - 及时回复前几条评论
   - 鼓励用户点赞、收藏、转发
""")


def main():
    parser = argparse.ArgumentParser(description="抖音发布工具")
    parser.add_argument("--video", "-v", help="视频文件路径")
    parser.add_argument("--title", "-t", help="视频标题")
    parser.add_argument("--tags", nargs="+", help="话题标签")
    parser.add_argument("--method", "-m", choices=["jianying", "api", "web", "guide"],
                        default="jianying", help="发布方式")
    parser.add_argument("--clips_dir", "-c", help="切片目录（批量发布时使用）")
    parser.add_argument("--highlights", help="高光片段JSON文件")
    
    args = parser.parse_args()
    
    print("="*60)
    print("📤 抖音发布工具")
    print("="*60)
    
    # 加载高光片段信息
    highlights = None
    if args.highlights:
        highlights_path = Path(args.highlights)
        if highlights_path.exists():
            with open(highlights_path, "r", encoding="utf-8") as f:
                highlights = json.load(f)
    
    if args.method == "jianying":
        publish_via_jianying()
    
    elif args.method == "api":
        if not args.video:
            print("❌ 请指定视频文件: --video /path/to/video.mp4")
            sys.exit(1)
        publish_via_open_platform(args.video, args.title or "视频标题", args.tags)
    
    elif args.method == "web":
        if not args.video:
            print("❌ 请指定视频文件: --video /path/to/video.mp4")
            sys.exit(1)
        publish_via_web_automation(args.video, args.title or "视频标题", args.tags)
    
    elif args.method == "guide":
        clips_dir = Path(args.clips_dir) if args.clips_dir else OUTPUT_DIR / "clips"
        batch_publish_guide(clips_dir, highlights)
    
    print("\n" + "="*60)
    print("💡 推荐使用「剪映发布」方式，最稳定安全")
    print("="*60)


if __name__ == "__main__":
    main()

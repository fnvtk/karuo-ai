#!/usr/bin/env python3
"""
派对纪要完整流程
一键完成：聊天记录 → JSON → HTML → 截图 → 发送飞书

使用方法：
  python full_pipeline.py "/path/to/聊天记录.txt"
  python full_pipeline.py "/path/to/聊天记录.txt" --no-feishu  # 不发送飞书
  python full_pipeline.py "/path/to/聊天记录.txt" --no-screenshot  # 不截图
"""

import argparse
import asyncio
import json
import os
import subprocess
import sys
from pathlib import Path
from datetime import datetime

# 导入同目录下的其他模块
SCRIPT_DIR = Path(__file__).parent
sys.path.insert(0, str(SCRIPT_DIR))

# 默认飞书Webhook
DEFAULT_WEBHOOK = "https://open.feishu.cn/open-apis/bot/v2/hook/34b762fc-5b9b-4abb-a05a-96c8fb9599f1"


def step_parse_chatlog(chatlog_path: str) -> str:
    """步骤1: 解析聊天记录生成JSON"""
    print("\n" + "="*50)
    print("📝 步骤1: 解析聊天记录")
    print("="*50)
    
    result = subprocess.run(
        ["python3", str(SCRIPT_DIR / "parse_chatlog.py"), chatlog_path],
        capture_output=True,
        text=True
    )
    
    if result.returncode != 0:
        print(f"❌ 解析失败: {result.stderr}")
        return None
    
    print(result.stdout)
    
    # 获取生成的JSON路径
    chatlog_file = Path(chatlog_path)
    json_path = chatlog_file.with_name(chatlog_file.stem + "_meeting.json")
    
    if json_path.exists():
        print(f"✅ JSON已生成: {json_path}")
        return str(json_path)
    
    return None


def step_generate_html(json_path: str) -> str:
    """步骤2: 从JSON生成HTML"""
    print("\n" + "="*50)
    print("🎨 步骤2: 生成HTML")
    print("="*50)
    
    result = subprocess.run(
        ["python3", str(SCRIPT_DIR / "generate_meeting.py"), "--input", json_path],
        capture_output=True,
        text=True,
        input="n\n"  # 不自动打开浏览器
    )
    
    print(result.stdout)
    
    # 获取生成的HTML路径
    json_file = Path(json_path)
    output_dir = SCRIPT_DIR.parent / "output"
    html_path = output_dir / f"{json_file.stem}.html"
    
    if html_path.exists():
        print(f"✅ HTML已生成: {html_path}")
        return str(html_path)
    
    # 尝试其他可能的命名
    for html_file in output_dir.glob("*.html"):
        if json_file.stem.replace("_meeting", "") in html_file.stem:
            print(f"✅ HTML已生成: {html_file}")
            return str(html_file)
    
    return None


def step_screenshot(html_path: str) -> str:
    """步骤3: HTML截图"""
    print("\n" + "="*50)
    print("📷 步骤3: 截图生成PNG")
    print("="*50)
    
    result = subprocess.run(
        ["python3", str(SCRIPT_DIR / "screenshot.py"), html_path],
        capture_output=True,
        text=True
    )
    
    if result.returncode != 0:
        print(f"⚠️ 截图失败: {result.stderr}")
        print("   请确保已安装 playwright: pip install playwright && playwright install chromium")
        return None
    
    print(result.stdout)
    
    # 获取生成的PNG路径
    png_path = Path(html_path).with_suffix(".png")
    
    if png_path.exists():
        print(f"✅ 截图已生成: {png_path}")
        return str(png_path)
    
    return None


def step_send_feishu(json_path: str, image_path: str = None, webhook: str = DEFAULT_WEBHOOK) -> bool:
    """步骤4: 发送到飞书群"""
    print("\n" + "="*50)
    print("📤 步骤4: 发送到飞书群")
    print("="*50)
    
    # 读取JSON数据
    with open(json_path, "r", encoding="utf-8") as f:
        meeting_data = json.load(f)
    
    # 导入发送模块
    try:
        from send_to_feishu import send_meeting_summary
        
        if send_meeting_summary(webhook, meeting_data, image_path):
            print(f"✅ 派对纪要已发送到飞书群")
            return True
        else:
            print(f"❌ 发送失败")
            return False
    except ImportError as e:
        print(f"⚠️ 导入失败: {e}")
        print("   尝试使用命令行方式发送...")
        
        result = subprocess.run(
            ["python3", str(SCRIPT_DIR / "send_to_feishu.py"), 
             "--json", json_path, "--webhook", webhook],
            capture_output=True,
            text=True
        )
        
        print(result.stdout)
        return result.returncode == 0


def run_full_pipeline(chatlog_path: str, 
                      do_screenshot: bool = True,
                      do_feishu: bool = True,
                      webhook: str = DEFAULT_WEBHOOK,
                      open_browser: bool = False):
    """运行完整流程"""
    
    print("\n" + "🚀" * 25)
    print("   派对纪要生成器 - 完整流程")
    print("🚀" * 25)
    print(f"\n📄 输入文件: {chatlog_path}")
    print(f"⏰ 开始时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # 检查文件
    if not Path(chatlog_path).exists():
        print(f"❌ 文件不存在: {chatlog_path}")
        return False
    
    # 步骤1: 解析
    json_path = step_parse_chatlog(chatlog_path)
    if not json_path:
        print("❌ 流程中断: 解析失败")
        return False
    
    # 步骤2: 生成HTML
    html_path = step_generate_html(json_path)
    if not html_path:
        print("❌ 流程中断: HTML生成失败")
        return False
    
    # 步骤3: 截图（可选）
    image_path = None
    if do_screenshot:
        image_path = step_screenshot(html_path)
    
    # 步骤4: 发送飞书（可选）
    if do_feishu:
        step_send_feishu(json_path, image_path, webhook)
    
    # 完成
    print("\n" + "="*50)
    print("✅ 流程完成!")
    print("="*50)
    print(f"\n📊 输出文件:")
    print(f"   JSON: {json_path}")
    print(f"   HTML: {html_path}")
    if image_path:
        print(f"   PNG:  {image_path}")
    print(f"\n⏰ 完成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # 打开浏览器
    if open_browser and html_path:
        import webbrowser
        webbrowser.open(f"file://{html_path}")
    
    return True


def main():
    parser = argparse.ArgumentParser(description="派对纪要完整流程")
    parser.add_argument("chatlog", type=str, help="聊天记录文件路径")
    parser.add_argument("--webhook", "-w", type=str, default=DEFAULT_WEBHOOK,
                        help="飞书Webhook地址")
    parser.add_argument("--no-screenshot", action="store_true",
                        help="跳过截图步骤")
    parser.add_argument("--no-feishu", action="store_true",
                        help="跳过发送飞书步骤")
    parser.add_argument("--open", "-o", action="store_true",
                        help="完成后打开浏览器查看")
    
    args = parser.parse_args()
    
    success = run_full_pipeline(
        chatlog_path=args.chatlog,
        do_screenshot=not args.no_screenshot,
        do_feishu=not args.no_feishu,
        webhook=args.webhook,
        open_browser=args.open
    )
    
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()

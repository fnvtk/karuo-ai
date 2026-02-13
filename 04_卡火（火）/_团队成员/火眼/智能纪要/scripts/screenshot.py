#!/usr/bin/env python3
"""
HTML截图工具
将HTML文件截图为PNG图片

依赖：playwright (pip install playwright && playwright install chromium)

使用方法：
  python screenshot.py output/demo_meeting.html              # 截图单个文件
  python screenshot.py output/demo_meeting.html --width 1200 # 指定宽度
  python screenshot.py output/ --batch                       # 批量截图目录下所有HTML
"""

import argparse
import asyncio
import sys
from pathlib import Path

try:
    from playwright.async_api import async_playwright
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False


async def screenshot_html(html_path: Path, output_path: Path = None, width: int = 1200):
    """截图HTML文件"""
    if not PLAYWRIGHT_AVAILABLE:
        print("❌ 需要安装 playwright: pip install playwright && playwright install chromium")
        return None
    
    if output_path is None:
        output_path = html_path.with_suffix(".png")
    
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={"width": width, "height": 800})
        
        # 打开HTML文件
        await page.goto(f"file://{html_path.absolute()}")
        
        # 等待内容加载
        await page.wait_for_timeout(500)
        
        # 获取页面实际高度
        height = await page.evaluate("document.body.scrollHeight")
        
        # 设置视口高度为页面实际高度
        await page.set_viewport_size({"width": width, "height": height})
        
        # 截图
        await page.screenshot(path=str(output_path), full_page=True)
        
        await browser.close()
    
    return output_path


async def batch_screenshot(directory: Path, width: int = 1200):
    """批量截图目录下所有HTML文件"""
    html_files = list(directory.glob("*.html"))
    
    if not html_files:
        print(f"⚠️ 目录 {directory} 下没有HTML文件")
        return
    
    print(f"📷 找到 {len(html_files)} 个HTML文件，开始截图...")
    
    for html_file in html_files:
        output_path = await screenshot_html(html_file, width=width)
        if output_path:
            print(f"  ✅ {html_file.name} → {output_path.name}")


def main():
    parser = argparse.ArgumentParser(description="HTML截图工具")
    parser.add_argument("path", type=str, help="HTML文件或目录路径")
    parser.add_argument("--width", "-w", type=int, default=1200, help="截图宽度（默认1200）")
    parser.add_argument("--output", "-o", type=str, help="输出PNG文件路径")
    parser.add_argument("--batch", action="store_true", help="批量模式（截图目录下所有HTML）")
    
    args = parser.parse_args()
    
    if not PLAYWRIGHT_AVAILABLE:
        print("❌ 需要安装 playwright:")
        print("   pip install playwright")
        print("   playwright install chromium")
        sys.exit(1)
    
    path = Path(args.path)
    
    if args.batch or path.is_dir():
        asyncio.run(batch_screenshot(path, args.width))
    else:
        if not path.exists():
            print(f"❌ 文件不存在: {path}")
            sys.exit(1)
        
        output_path = Path(args.output) if args.output else None
        result = asyncio.run(screenshot_html(path, output_path, args.width))
        
        if result:
            print(f"✅ 截图成功: {result}")


if __name__ == "__main__":
    main()

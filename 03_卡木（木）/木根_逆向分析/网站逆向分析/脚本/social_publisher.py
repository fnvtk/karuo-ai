#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
社交媒体视频发布器
支持Cookie直发到多平台（抖音/快手/B站/小红书/视频号）

使用方法：
1. 获取Cookie：python social_publisher.py --get-cookie douyin
2. 发布视频：python social_publisher.py --publish douyin --video /path/to/video.mp4 --title "标题"

依赖：
- playwright
- playwright-stealth
- loguru

参考项目：
- https://github.com/dreammis/social-auto-upload
"""

import os
import json
import asyncio
import hashlib
import argparse
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any
from dataclasses import dataclass

# 第三方库
try:
    from playwright.async_api import async_playwright, Page, BrowserContext
    from playwright_stealth import stealth_async
    from loguru import logger
except ImportError as e:
    print(f"缺少依赖: {e}")
    print("请运行: pip install playwright playwright-stealth loguru")
    print("然后运行: playwright install chromium")
    exit(1)

# ============== 配置 ==============

# Cookie存储目录
COOKIE_DIR = Path(__file__).parent.parent / "output" / "cookies"
COOKIE_DIR.mkdir(parents=True, exist_ok=True)

# 浏览器配置
CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"  # macOS
# CHROME_PATH = "C:/Program Files/Google/Chrome/Application/chrome.exe"  # Windows
HEADLESS = os.environ.get("HEADLESS", "false").lower() == "true"

# 平台配置
PLATFORM_CONFIG = {
    "douyin": {
        "name": "抖音",
        "login_url": "https://creator.douyin.com/",
        "upload_url": "https://creator.douyin.com/creator-micro/content/upload",
        "domain": ".douyin.com",
    },
    "kuaishou": {
        "name": "快手",
        "login_url": "https://cp.kuaishou.com/",
        "upload_url": "https://cp.kuaishou.com/article/publish/video",
        "domain": ".kuaishou.com",
    },
    "bilibili": {
        "name": "B站",
        "login_url": "https://member.bilibili.com/",
        "upload_url": "https://member.bilibili.com/platform/upload/video/frame",
        "domain": ".bilibili.com",
    },
    "xiaohongshu": {
        "name": "小红书",
        "login_url": "https://creator.xiaohongshu.com/",
        "upload_url": "https://creator.xiaohongshu.com/publish/publish",
        "domain": ".xiaohongshu.com",
    },
    "shipinhao": {
        "name": "视频号",
        "login_url": "https://channels.weixin.qq.com/",
        "upload_url": "https://channels.weixin.qq.com/platform/post/create",
        "domain": ".qq.com",
    },
}


# ============== 工具函数 ==============

def get_cookie_file(platform: str, account_id: str = "default") -> Path:
    """获取Cookie文件路径"""
    return COOKIE_DIR / platform / f"{account_id}.json"


def parse_cookies(cookies: str, domain: str) -> List[Dict]:
    """解析各种格式的Cookie为统一格式"""
    
    # JSON数组格式
    if cookies.strip().startswith('['):
        return json.loads(cookies)
    
    # JSON对象格式
    if cookies.strip().startswith('{'):
        obj = json.loads(cookies)
        # 可能是Playwright格式
        if "cookies" in obj:
            return obj["cookies"]
        # 简单key-value格式
        return [{"name": k, "value": v, "domain": domain, "path": "/"} 
                for k, v in obj.items()]
    
    # key=value; 字符串格式
    result = []
    for item in cookies.split(';'):
        item = item.strip()
        if '=' in item:
            key, value = item.split('=', 1)
            result.append({
                "name": key.strip(),
                "value": value.strip(),
                "domain": domain,
                "path": "/"
            })
    return result


def to_playwright_storage(cookies: List[Dict]) -> Dict:
    """转换为Playwright storage_state格式"""
    import time
    
    playwright_cookies = []
    for c in cookies:
        playwright_cookies.append({
            "name": c.get("name", ""),
            "value": c.get("value", ""),
            "domain": c.get("domain", ""),
            "path": c.get("path", "/"),
            "secure": c.get("secure", True),
            "httpOnly": c.get("httpOnly", False),
            "sameSite": c.get("sameSite", "Lax"),
            "expires": c.get("expires", time.time() + 365 * 24 * 3600)
        })
    
    return {
        "cookies": playwright_cookies,
        "origins": []
    }


async def create_stealth_browser(headless: bool = HEADLESS):
    """创建反检测浏览器"""
    p = await async_playwright().start()
    
    # 浏览器启动参数
    launch_args = [
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-infobars',
        '--window-size=1920,1080',
    ]
    
    # 使用本地Chrome（如果存在）
    executable_path = CHROME_PATH if os.path.exists(CHROME_PATH) else None
    
    browser = await p.chromium.launch(
        headless=headless,
        executable_path=executable_path,
        args=launch_args
    )
    
    context = await browser.new_context(
        viewport={'width': 1920, 'height': 1080},
        user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        locale='zh-CN',
        timezone_id='Asia/Shanghai',
    )
    
    page = await context.new_page()
    await stealth_async(page)
    
    return p, browser, context, page


# ============== Cookie获取 ==============

async def get_cookie(platform: str, account_id: str = "default") -> bool:
    """
    获取平台Cookie（需要手动扫码登录）
    
    Args:
        platform: 平台标识
        account_id: 账号标识
        
    Returns:
        是否成功
    """
    if platform not in PLATFORM_CONFIG:
        logger.error(f"不支持的平台: {platform}")
        return False
    
    config = PLATFORM_CONFIG[platform]
    cookie_file = get_cookie_file(platform, account_id)
    cookie_file.parent.mkdir(parents=True, exist_ok=True)
    
    logger.info(f"正在获取 {config['name']} Cookie...")
    logger.info("请在打开的浏览器中完成登录，登录成功后关闭浏览器")
    
    p, browser, context, page = await create_stealth_browser(headless=False)
    
    try:
        # 打开登录页
        await page.goto(config["login_url"])
        
        # 等待用户登录（使用Playwright的pause功能）
        await page.pause()
        
        # 保存Cookie
        await context.storage_state(path=str(cookie_file))
        logger.success(f"Cookie已保存到: {cookie_file}")
        return True
        
    except Exception as e:
        logger.error(f"获取Cookie失败: {e}")
        return False
    finally:
        await browser.close()
        await p.stop()


async def verify_cookie(platform: str, account_id: str = "default") -> bool:
    """
    验证Cookie是否有效
    
    Args:
        platform: 平台标识
        account_id: 账号标识
        
    Returns:
        Cookie是否有效
    """
    if platform not in PLATFORM_CONFIG:
        return False
    
    config = PLATFORM_CONFIG[platform]
    cookie_file = get_cookie_file(platform, account_id)
    
    if not cookie_file.exists():
        logger.warning(f"Cookie文件不存在: {cookie_file}")
        return False
    
    p, browser, context, page = await create_stealth_browser(headless=True)
    
    try:
        # 使用Cookie创建新context
        context = await browser.new_context(storage_state=str(cookie_file))
        page = await context.new_page()
        await stealth_async(page)
        
        # 访问上传页面
        await page.goto(config["upload_url"])
        await page.wait_for_load_state("networkidle", timeout=10000)
        
        # 检查是否需要登录（根据平台判断）
        if platform == "douyin":
            # 抖音：检查是否出现登录按钮
            login_btn = await page.query_selector('text=扫码登录')
            if login_btn:
                logger.warning("抖音Cookie已失效")
                return False
        
        elif platform == "kuaishou":
            # 快手：检查URL是否跳转到登录页
            if "passport" in page.url:
                logger.warning("快手Cookie已失效")
                return False
        
        # 其他平台类似...
        
        logger.success(f"{config['name']} Cookie有效")
        return True
        
    except Exception as e:
        logger.error(f"验证Cookie失败: {e}")
        return False
    finally:
        await browser.close()
        await p.stop()


# ============== 视频发布 ==============

@dataclass
class PublishResult:
    """发布结果"""
    success: bool
    message: str = ""
    error: str = ""
    video_id: str = ""
    video_url: str = ""


async def publish_video(
    platform: str,
    video_path: str,
    title: str,
    cookies: Optional[str] = None,
    account_id: str = "default",
    tags: List[str] = None,
    description: str = "",
    thumbnail_path: str = None,
    schedule_time: datetime = None
) -> PublishResult:
    """
    发布视频到指定平台
    
    Args:
        platform: 平台标识
        video_path: 视频文件路径
        title: 视频标题
        cookies: Cookie字符串（可选，不提供则使用保存的Cookie文件）
        account_id: 账号标识
        tags: 标签列表
        description: 视频描述
        thumbnail_path: 封面图片路径
        schedule_time: 定时发布时间
        
    Returns:
        发布结果
    """
    if platform not in PLATFORM_CONFIG:
        return PublishResult(
            success=False,
            error=f"not_supported: 不支持的平台 {platform}"
        )
    
    if not os.path.exists(video_path):
        return PublishResult(
            success=False,
            error=f"file_not_found: 视频文件不存在 {video_path}"
        )
    
    config = PLATFORM_CONFIG[platform]
    
    # 准备Cookie
    cookie_file = get_cookie_file(platform, account_id)
    
    if cookies:
        # 使用传入的Cookie
        cookie_list = parse_cookies(cookies, config["domain"])
        storage_state = to_playwright_storage(cookie_list)
        cookie_file.parent.mkdir(parents=True, exist_ok=True)
        with open(cookie_file, 'w') as f:
            json.dump(storage_state, f)
    
    if not cookie_file.exists():
        return PublishResult(
            success=False,
            error="no_cookie: 没有Cookie，请先获取Cookie"
        )
    
    # 根据平台调用对应的发布函数
    if platform == "douyin":
        return await _publish_to_douyin(
            cookie_file, video_path, title, tags, description, 
            thumbnail_path, schedule_time
        )
    elif platform == "kuaishou":
        return await _publish_to_kuaishou(
            cookie_file, video_path, title, tags, description,
            schedule_time
        )
    elif platform == "bilibili":
        return await _publish_to_bilibili(
            cookie_file, video_path, title, tags, description
        )
    elif platform == "xiaohongshu":
        return await _publish_to_xiaohongshu(
            cookie_file, video_path, title, tags, description
        )
    elif platform == "shipinhao":
        return await _publish_to_shipinhao(
            cookie_file, video_path, title, tags, description,
            schedule_time
        )
    else:
        return PublishResult(
            success=False,
            error=f"not_implemented: {platform} 发布功能开发中"
        )


async def _publish_to_douyin(
    cookie_file: Path,
    video_path: str,
    title: str,
    tags: List[str],
    description: str,
    thumbnail_path: str,
    schedule_time: datetime
) -> PublishResult:
    """发布到抖音"""
    p, browser, context, page = None, None, None, None
    
    try:
        p = await async_playwright().start()
        browser = await p.chromium.launch(
            headless=HEADLESS,
            executable_path=CHROME_PATH if os.path.exists(CHROME_PATH) else None,
            args=['--disable-blink-features=AutomationControlled']
        )
        context = await browser.new_context(storage_state=str(cookie_file))
        page = await context.new_page()
        await stealth_async(page)
        
        # 访问上传页面
        logger.info("正在打开抖音上传页面...")
        await page.goto("https://creator.douyin.com/creator-micro/content/upload")
        await page.wait_for_load_state("networkidle")
        
        # 检查是否需要登录
        if await page.query_selector('text=扫码登录'):
            return PublishResult(
                success=False,
                error="cookie_invalid: Cookie已失效，请重新获取"
            )
        
        # 上传视频
        logger.info(f"正在上传视频: {video_path}")
        file_input = await page.query_selector('input[type="file"]')
        if file_input:
            await file_input.set_input_files(video_path)
        else:
            return PublishResult(
                success=False,
                error="upload_failed: 找不到上传按钮"
            )
        
        # 等待上传完成
        logger.info("等待视频上传完成...")
        await page.wait_for_selector('text=重新上传', timeout=300000)
        logger.success("视频上传完成")
        
        # 填写标题
        await asyncio.sleep(1)
        title_input = await page.query_selector('input[placeholder*="标题"]')
        if title_input:
            await title_input.fill(title[:30])  # 抖音标题限制30字
        
        # 填写话题标签
        if tags:
            tag_input = await page.query_selector('.zone-container')
            if tag_input:
                for tag in tags[:5]:  # 最多5个标签
                    await tag_input.type(f"#{tag} ")
        
        # 点击发布
        logger.info("正在发布...")
        publish_btn = await page.query_selector('button:has-text("发布")')
        if publish_btn:
            await publish_btn.click()
        
        # 等待发布完成
        await page.wait_for_url("**/content/manage**", timeout=30000)
        logger.success("视频发布成功！")
        
        # 更新Cookie
        await context.storage_state(path=str(cookie_file))
        
        return PublishResult(
            success=True,
            message="视频已成功发布到抖音"
        )
        
    except Exception as e:
        logger.exception("抖音发布失败")
        return PublishResult(
            success=False,
            error=f"publish_failed: {str(e)}"
        )
    finally:
        if browser:
            await browser.close()
        if p:
            await p.stop()


async def _publish_to_kuaishou(
    cookie_file: Path,
    video_path: str,
    title: str,
    tags: List[str],
    description: str,
    schedule_time: datetime
) -> PublishResult:
    """发布到快手"""
    # 实现类似抖音的逻辑
    return PublishResult(
        success=False,
        error="not_implemented: 快手发布功能开发中"
    )


async def _publish_to_bilibili(
    cookie_file: Path,
    video_path: str,
    title: str,
    tags: List[str],
    description: str
) -> PublishResult:
    """发布到B站"""
    return PublishResult(
        success=False,
        error="not_implemented: B站发布功能开发中"
    )


async def _publish_to_xiaohongshu(
    cookie_file: Path,
    video_path: str,
    title: str,
    tags: List[str],
    description: str
) -> PublishResult:
    """发布到小红书"""
    return PublishResult(
        success=False,
        error="not_implemented: 小红书发布功能开发中"
    )


async def _publish_to_shipinhao(
    cookie_file: Path,
    video_path: str,
    title: str,
    tags: List[str],
    description: str,
    schedule_time: datetime
) -> PublishResult:
    """发布到视频号"""
    return PublishResult(
        success=False,
        error="not_implemented: 视频号发布功能开发中"
    )


# ============== 命令行接口 ==============

def main():
    parser = argparse.ArgumentParser(description="社交媒体视频发布器")
    subparsers = parser.add_subparsers(dest="command", help="子命令")
    
    # 获取Cookie命令
    cookie_parser = subparsers.add_parser("cookie", help="获取平台Cookie")
    cookie_parser.add_argument("platform", choices=PLATFORM_CONFIG.keys(), help="平台")
    cookie_parser.add_argument("--account", default="default", help="账号标识")
    
    # 验证Cookie命令
    verify_parser = subparsers.add_parser("verify", help="验证Cookie是否有效")
    verify_parser.add_argument("platform", choices=PLATFORM_CONFIG.keys(), help="平台")
    verify_parser.add_argument("--account", default="default", help="账号标识")
    
    # 发布视频命令
    publish_parser = subparsers.add_parser("publish", help="发布视频")
    publish_parser.add_argument("platform", choices=PLATFORM_CONFIG.keys(), help="平台")
    publish_parser.add_argument("--video", required=True, help="视频文件路径")
    publish_parser.add_argument("--title", required=True, help="视频标题")
    publish_parser.add_argument("--account", default="default", help="账号标识")
    publish_parser.add_argument("--tags", nargs="+", help="标签列表")
    publish_parser.add_argument("--desc", default="", help="视频描述")
    
    args = parser.parse_args()
    
    if args.command == "cookie":
        asyncio.run(get_cookie(args.platform, args.account))
    
    elif args.command == "verify":
        valid = asyncio.run(verify_cookie(args.platform, args.account))
        exit(0 if valid else 1)
    
    elif args.command == "publish":
        result = asyncio.run(publish_video(
            platform=args.platform,
            video_path=args.video,
            title=args.title,
            account_id=args.account,
            tags=args.tags,
            description=args.desc
        ))
        if result.success:
            logger.success(result.message)
            exit(0)
        else:
            logger.error(result.error)
            exit(1)
    
    else:
        parser.print_help()


if __name__ == "__main__":
    main()

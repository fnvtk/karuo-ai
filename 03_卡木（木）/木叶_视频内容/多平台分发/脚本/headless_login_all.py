#!/usr/bin/env python3
"""
三平台 headless 无窗口登录 — QR 截图 + 自动检测
全程不弹浏览器窗口，QR 码截图保存到 /tmp/，用手机扫描即可。

用法:
  python3 headless_login_all.py              # 登录所有过期平台
  python3 headless_login_all.py --platform 抖音  # 只登录指定平台
  python3 headless_login_all.py --platform 快手
  python3 headless_login_all.py --platform 视频号
"""
import argparse
import asyncio
import json
import sys
import time
from pathlib import Path

BASE = Path("/Users/karuo/Documents/个人/卡若AI/03_卡木（木）/木叶_视频内容")
sys.path.insert(0, str(BASE / "多平台分发" / "脚本"))
from browser_profile import get_browser_profile_dir

UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"
)

PLATFORMS = {
    "抖音": {
        "cookie_file": BASE / "抖音发布/脚本/douyin_storage_state.json",
        "login_url": "https://creator.douyin.com/",
        "qr_screenshot": "/tmp/qr_douyin.png",
        "success_check": "douyin_check",
    },
    "视频号": {
        "cookie_file": BASE / "视频号发布/脚本/channels_storage_state.json",
        "login_url": "https://channels.weixin.qq.com/",
        "qr_screenshot": "/tmp/qr_channels.png",
        "success_check": "channels_check",
    },
    "快手": {
        "cookie_file": BASE / "快手发布/脚本/kuaishou_storage_state.json",
        "login_url": "https://cp.kuaishou.com/article/publish/video",
        "qr_screenshot": "/tmp/qr_kuaishou.png",
        "success_check": "kuaishou_check",
    },
}


async def check_cookie_valid(platform: str) -> bool:
    """检查指定平台 Cookie 是否仍然有效"""
    import httpx
    cfg = PLATFORMS[platform]
    cookie_file = cfg["cookie_file"]
    if not cookie_file.exists():
        return False
    try:
        state = json.loads(cookie_file.read_text())
        cookies = {c["name"]: c["value"] for c in state.get("cookies", [])}
        if not cookies:
            return False
        ck_str = "; ".join(f"{k}={v}" for k, v in cookies.items())
        headers = {"Cookie": ck_str, "User-Agent": UA}

        if platform == "抖音":
            r = httpx.get("https://creator.douyin.com/web/api/media/user/info/",
                          headers={**headers, "Referer": "https://creator.douyin.com/"},
                          timeout=10, follow_redirects=True)
            return r.json().get("status_code") == 0
        elif platform == "视频号":
            r = httpx.post("https://channels.weixin.qq.com/cgi-bin/mmfinderassistant-bin/auth/auth_login_status",
                           json={"timestamp": str(int(time.time() * 1000))},
                           headers={**headers, "Referer": "https://channels.weixin.qq.com/platform",
                                    "Origin": "https://channels.weixin.qq.com"},
                           timeout=10)
            return r.json().get("errCode") == 0
        elif platform == "快手":
            r = httpx.get("https://cp.kuaishou.com/rest/cp/works/v2/list?pcursor=&count=1",
                          headers={**headers, "Referer": "https://cp.kuaishou.com/"},
                          timeout=10, follow_redirects=True)
            ct = r.headers.get("content-type", "")
            if "json" in ct:
                return r.json().get("result") == 1
            return False
    except Exception:
        return False


async def headless_login(platform: str) -> bool:
    """Headless 登录指定平台，QR 截图保存到文件"""
    from playwright.async_api import async_playwright

    cfg = PLATFORMS[platform]
    cookie_file = cfg["cookie_file"]
    qr_path = cfg["qr_screenshot"]

    print(f"\n{'='*60}")
    print(f"  [{platform}] 开始 headless 登录（无窗口）")
    print(f"{'='*60}")

    async with async_playwright() as pw:
        context = await pw.chromium.launch_persistent_context(
            str(get_browser_profile_dir(platform)),
            headless=True,
            user_agent=UA,
            viewport={"width": 1280, "height": 900},
            locale="zh-CN",
            args=["--disable-blink-features=AutomationControlled"],
        )
        await context.add_init_script(
            "Object.defineProperty(navigator,'webdriver',{get:()=>undefined})"
        )
        page = await context.new_page()

        print(f"  [1] 打开登录页: {cfg['login_url'][:50]}...", flush=True)
        await page.goto(cfg["login_url"], timeout=30000, wait_until="domcontentloaded")
        await asyncio.sleep(5)

        # 记录初始 Cookie 指纹用于检测变化
        initial_cookies = await context.cookies()
        initial_names = {c["name"] for c in initial_cookies}

        # 截取 QR 码并自动打开
        print(f"  [2] 截取 QR 码 → {qr_path}", flush=True)
        await page.screenshot(path=qr_path, full_page=False)
        import subprocess
        subprocess.Popen(["open", qr_path], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        print(f"  ★ QR 码已自动打开，请用手机 APP 扫描!", flush=True)

        # 等待登录完成（最长 5 分钟）
        print(f"  [3] 等待扫码登录... (最长300秒)", flush=True)
        logged_in = False
        start = time.time()

        for i in range(150):
            elapsed = int(time.time() - start)

            try:
                cookies = await context.cookies()
                url = page.url
                current_names = {c["name"] for c in cookies}
                new_cookies = current_names - initial_names

                if platform == "抖音":
                    has_new_session = any(
                        n in ("sessionid", "sessionid_ss") for n in new_cookies
                    )
                    if has_new_session or "creator-micro/home" in url:
                        logged_in = True
                        break

                elif platform == "视频号":
                    if ("platform" in url and "login" not in url) or len(new_cookies) > 2:
                        logged_in = True
                        break

                elif platform == "快手":
                    new_cp = [c for c in cookies
                              if "cp.kuaishou.com" in c.get("domain", "")
                              and c["name"] not in initial_names]
                    page_text = await page.evaluate("document.body.innerText")
                    if new_cp or ("发布" in page_text and "立即登录" not in page_text and "平台优势" not in page_text):
                        logged_in = True
                        break

            except Exception:
                pass

            if i > 0 and i % 15 == 0:
                await page.screenshot(path=qr_path, full_page=False)
                subprocess.Popen(["open", qr_path], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                print(f"    等待中... ({elapsed}s) QR 已刷新", flush=True)

            await asyncio.sleep(2)

        if logged_in:
            print(f"  [✓] {platform} 检测到登录!", flush=True)
            await asyncio.sleep(5)

            # 视频号额外：导航到内容管理页获取完整 localStorage
            if platform == "视频号":
                try:
                    await page.goto("https://channels.weixin.qq.com/platform/post/list",
                                    timeout=15000, wait_until="domcontentloaded")
                    await asyncio.sleep(5)
                    await page.goto("https://channels.weixin.qq.com/platform/post/create",
                                    timeout=15000, wait_until="domcontentloaded")
                    await asyncio.sleep(5)
                except Exception:
                    pass

            await context.storage_state(path=str(cookie_file))
            size = cookie_file.stat().st_size
            await context.close()

            # API 验证
            print(f"  [4] API 验证 Cookie...", flush=True)
            valid = await check_cookie_valid(platform)
            if valid:
                print(f"  [✓] {platform} Cookie 验证通过! ({size}B)", flush=True)
                return True
            else:
                print(f"  [⚠] Cookie 已保存({size}B)但 API 验证未通过，可能需要重试", flush=True)
                return False
        else:
            print(f"  [✗] {platform} 登录超时（5分钟）", flush=True)
            await page.screenshot(path=f"/tmp/login_timeout_{platform}.png")
            await context.close()
            return False


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--platform", help="只登录指定平台")
    args = parser.parse_args()

    if args.platform:
        targets = [args.platform]
    else:
        targets = []
        for p in PLATFORMS:
            valid = await check_cookie_valid(p)
            icon = "✓" if valid else "✗"
            print(f"  [{icon}] {p}: {'有效' if valid else '已过期'}")
            if not valid:
                targets.append(p)

    if not targets:
        print("\n所有平台 Cookie 有效，无需登录。")
        return 0

    print(f"\n需要登录的平台: {', '.join(targets)}")
    results = {}

    for p in targets:
        ok = await headless_login(p)
        results[p] = ok

    print(f"\n{'='*60}")
    print("  登录结果汇总")
    print(f"{'='*60}")
    for p, ok in results.items():
        print(f"  {'✓' if ok else '✗'} {p}")

    failed = [p for p, ok in results.items() if not ok]
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))

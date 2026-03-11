#!/usr/bin/env python3
"""视频号登录 v4 — 扫码后提取 token + Cookie，供纯 API 发布使用"""
import asyncio
import json
import sys
from pathlib import Path
from urllib.parse import urlparse, parse_qs

from playwright.async_api import async_playwright

SCRIPT_DIR = Path(__file__).parent
COOKIE_FILE = SCRIPT_DIR / "channels_storage_state.json"
TOKEN_FILE = SCRIPT_DIR / "channels_token.json"
LOGIN_URL = "https://channels.weixin.qq.com/login"
QR_SCREENSHOT = Path("/tmp/channels_qr.png")

UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
)


async def main():
    print("即将弹出浏览器，请用微信扫码登录视频号助手。", flush=True)

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=False)
        context = await browser.new_context(
            user_agent=UA, viewport={"width": 1280, "height": 720}
        )
        await context.add_init_script(
            "Object.defineProperty(navigator,'webdriver',{get:()=>undefined})"
        )
        page = await context.new_page()
        await page.goto(LOGIN_URL, timeout=60000)
        await asyncio.sleep(3)

        await page.screenshot(path=str(QR_SCREENSHOT))
        print(f"[QR] 二维码截图已保存: {QR_SCREENSHOT}", flush=True)
        print("请用微信扫描浏览器中的二维码...\n", flush=True)

        logged_in = False
        token = None
        for i in range(60):
            await asyncio.sleep(5)
            url = page.url
            if "platform" in url and "login" not in url:
                logged_in = True
                parsed = parse_qs(urlparse(url).query)
                token = parsed.get("token", [None])[0]
                print(f"[✓] 登录成功，URL: {url[:100]}", flush=True)
                if token:
                    print(f"[✓] 提取到 token: {token[:20]}...", flush=True)
                break
            cookies = await context.cookies()
            has_session = any(c["name"] == "sessionid" for c in cookies)
            if has_session:
                logged_in = True
                print("[✓] 检测到 sessionid Cookie！", flush=True)
                break
            if i % 6 == 0:
                print(f"  等待扫码中... ({i * 5}s)", flush=True)

        if not logged_in:
            print("[✗] 5 分钟超时。", flush=True)
            await browser.close()
            return 1

        # 确保跳转完成并提取 token
        await asyncio.sleep(5)
        if not token:
            try:
                await page.goto(
                    "https://channels.weixin.qq.com/platform/post/list",
                    timeout=15000, wait_until="domcontentloaded",
                )
                await asyncio.sleep(5)
                url = page.url
                parsed = parse_qs(urlparse(url).query)
                token = parsed.get("token", [None])[0]
                if token:
                    print(f"[✓] 从 post/list 页提取 token: {token[:20]}...", flush=True)
            except Exception:
                pass

        # 如果 URL 里没 token，尝试从页面 JS 提取
        if not token:
            try:
                token = await page.evaluate("""() => {
                    if (window.__wxConfig && window.__wxConfig.token) return window.__wxConfig.token;
                    const m = document.cookie.match(/token=([^;]+)/);
                    if (m) return m[1];
                    const u = location.href;
                    const tm = u.match(/token=([^&]+)/);
                    if (tm) return tm[1];
                    return null;
                }""")
                if token:
                    print(f"[✓] 从 JS 提取 token: {token[:20]}...", flush=True)
            except Exception:
                pass

        # 尝试拦截 API 获取 token
        if not token:
            try:
                r = await page.evaluate("""async () => {
                    const resp = await fetch('/cgi-bin/mmfinderassistant-bin/auth/auth_data', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({})
                    });
                    return await resp.json();
                }""")
                if r and r.get("errCode") == 0:
                    token = r.get("data", {}).get("token") or r.get("token")
                    print(f"[✓] 从 auth_data 获取: errCode=0", flush=True)
                else:
                    print(f"[i] auth_data 返回: {json.dumps(r, ensure_ascii=False)[:200]}", flush=True)
            except Exception as e:
                print(f"[i] auth_data 异常: {e}", flush=True)

        # 保存 storage_state
        await context.storage_state(path=str(COOKIE_FILE))

        # 保存 token 信息
        cookies = await context.cookies()
        cookie_dict = {c["name"]: c["value"] for c in cookies}

        token_data = {
            "token": token,
            "sessionid": cookie_dict.get("sessionid", ""),
            "wxuin": cookie_dict.get("wxuin", ""),
            "cookie_str": "; ".join(f'{c["name"]}={c["value"]}' for c in cookies),
            "url": page.url,
        }
        with open(TOKEN_FILE, "w") as f:
            json.dump(token_data, f, ensure_ascii=False, indent=2)

        await browser.close()

    print(f"\n[✓] Cookie 已保存: {COOKIE_FILE}", flush=True)
    print(f"[✓] Token 已保存: {TOKEN_FILE}", flush=True)
    sc = json.loads(COOKIE_FILE.read_text()).get("cookies", [])
    print(f"    Cookie 数量: {len(sc)}", flush=True)
    print(f"    token: {'✓' if token else '✗ 未提取到（可能需要在浏览器页面交互后才出现）'}", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))

#!/usr/bin/env python3
"""视频号登录 v6 — 等待完整登录流程完成后提取 Cookie + rawKeyBuff"""
import asyncio
import json
import sys
from pathlib import Path

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

REQUIRED_LS_KEYS = [
    "finder_raw", "finder_username", "finder_uin",
    "finder_login_token", "finder_external_key",
]


async def extract_ls(page, keys):
    try:
        return await page.evaluate("""(keys) => {
            const out = {};
            for (const k of keys) {
                const v = localStorage.getItem(k);
                if (v) out[k] = v;
            }
            return out;
        }""", keys)
    except Exception as e:
        print(f"  [!] localStorage 提取异常: {e}", flush=True)
        return {}


async def main():
    print("即将弹出浏览器，请用微信扫码登录视频号助手。", flush=True)
    print("登录后请等待页面跳转到「内容管理」页面，不要手动关闭浏览器。\n", flush=True)

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

        # 只等待 URL 跳转到平台页面（不提前因 cookie 退出循环）
        logged_in = False
        for i in range(120):
            await asyncio.sleep(3)
            try:
                url = page.url
            except Exception:
                break

            if "platform" in url and "login" not in url:
                logged_in = True
                print(f"[✓] 登录成功，已跳转到: {url[:100]}", flush=True)
                break

            if i % 10 == 0:
                print(f"  等待扫码并跳转中... ({i * 3}s)", flush=True)

        if not logged_in:
            print("[✗] 6 分钟超时。", flush=True)
            await browser.close()
            return 1

        # 等待页面 JS 执行完成（微前端加载、localStorage 写入）
        print("[i] 等待平台 JS 加载完成...", flush=True)
        await asyncio.sleep(10)

        # 提取 localStorage
        ls_vals = {}
        for attempt in range(60):
            ls_vals = await extract_ls(page, REQUIRED_LS_KEYS)
            if ls_vals.get("finder_raw"):
                print(f"[✓] rawKeyBuff 已就绪 (等待 {attempt}s)", flush=True)
                break
            await asyncio.sleep(1)
            if attempt % 15 == 14:
                print(f"  等待 localStorage 写入... ({attempt + 1}s)", flush=True)

        # 如果 finder_raw 还是空，尝试点击内容管理触发加载
        if not ls_vals.get("finder_raw"):
            print("[i] rawKeyBuff 未出现，尝试访问内容列表页...", flush=True)
            try:
                await page.goto(
                    "https://channels.weixin.qq.com/platform/post/list",
                    timeout=15000, wait_until="domcontentloaded",
                )
                await asyncio.sleep(8)
                for _ in range(30):
                    ls_vals = await extract_ls(page, REQUIRED_LS_KEYS)
                    if ls_vals.get("finder_raw"):
                        print("[✓] 导航后 rawKeyBuff 已就绪", flush=True)
                        break
                    await asyncio.sleep(1)
            except Exception as e:
                print(f"[!] 导航异常: {e}", flush=True)

        # 显示提取结果
        print("\n[i] localStorage 提取结果:", flush=True)
        for k in REQUIRED_LS_KEYS:
            v = ls_vals.get(k, "")
            status = "✓" if v else "✗"
            display = f"{v[:60]}..." if len(v) > 60 else (v or "(空)")
            print(f"    {status} {k}: {display}", flush=True)

        # 保存 storage_state
        try:
            await context.storage_state(path=str(COOKIE_FILE))
        except Exception as e:
            print(f"[!] 保存 storage_state 异常: {e}", flush=True)

        # 保存 token 信息
        cookies = await context.cookies()
        cookie_dict = {c["name"]: c["value"] for c in cookies}

        token_data = {
            "sessionid": cookie_dict.get("sessionid", ""),
            "wxuin": cookie_dict.get("wxuin", ""),
            "cookie_str": "; ".join(f'{c["name"]}={c["value"]}' for c in cookies),
            "finder_raw": ls_vals.get("finder_raw", ""),
            "finder_username": ls_vals.get("finder_username", ""),
            "finder_uin": ls_vals.get("finder_uin", ""),
            "finder_login_token": ls_vals.get("finder_login_token", ""),
            "url": page.url,
        }
        TOKEN_FILE.write_text(json.dumps(token_data, ensure_ascii=False, indent=2))

        await browser.close()

    print(f"\n[✓] Cookie 已保存: {COOKIE_FILE}", flush=True)
    print(f"[✓] Token 已保存: {TOKEN_FILE}", flush=True)
    try:
        sc = json.loads(COOKIE_FILE.read_text()).get("cookies", [])
        print(f"    Cookie 数量: {len(sc)}", flush=True)
    except Exception:
        pass
    raw = ls_vals.get("finder_raw", "")
    print(f"    rawKeyBuff: {'✓ ' + raw[:30] + '...' if raw else '✗ 未提取到'}", flush=True)
    return 0 if ls_vals.get("finder_raw") else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))

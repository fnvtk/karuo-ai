#!/usr/bin/env python3
"""
视频号纯 API 登录 — 无浏览器
1. 调 auth_login_code 取 token
2. 用 token 拼 QR URL → 生成二维码图片
3. 轮询 auth_login_status 直到扫码完成
4. 保存 Cookie
"""
import asyncio
import json
import sys
import time
from pathlib import Path

import httpx
import qrcode

SCRIPT_DIR = Path(__file__).parent
COOKIE_FILE = SCRIPT_DIR / "channels_storage_state.json"
QR_IMAGE = Path("/tmp/channels_api_qr.png")

BASE = "https://channels.weixin.qq.com"
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"
    ),
    "Origin": BASE,
    "Referer": f"{BASE}/login.html",
    "Content-Type": "application/json",
}


def api_login():
    client = httpx.Client(headers=HEADERS, follow_redirects=True, timeout=15)

    # Step 1: 获取登录 token
    print("[1] 获取登录 token...", flush=True)
    r = client.post(f"{BASE}/cgi-bin/mmfinderassistant-bin/auth/auth_login_code", json={})
    d = r.json()
    if d.get("errCode") != 0:
        print(f"[✗] auth_login_code 失败: {d}", flush=True)
        return False
    token = d["data"]["token"]
    print(f"    token = {token}", flush=True)

    # Step 2: 生成二维码
    # 视频号助手的扫码 URL 格式
    qr_url = f"{BASE}/cgi-bin/mmfinderassistant-bin/auth/auth_login_qrcode?token={token}"
    print(f"[2] 生成二维码...", flush=True)
    print(f"    QR URL: {qr_url}", flush=True)

    img = qrcode.make(qr_url)
    img.save(str(QR_IMAGE))
    print(f"    二维码已保存: {QR_IMAGE}", flush=True)
    print(f"\n    ★ 请用微信扫描 {QR_IMAGE} 中的二维码 ★\n", flush=True)

    # Step 3: 轮询登录状态
    print("[3] 等待扫码...", flush=True)
    for i in range(60):
        time.sleep(3)

        # 尝试多种参数格式
        for params in [
            {"token": token},
            {"loginCode": token},
            {"rawUrl": qr_url},
        ]:
            try:
                r2 = client.post(
                    f"{BASE}/cgi-bin/mmfinderassistant-bin/auth/auth_login_status",
                    json=params,
                )
                d2 = r2.json()
                code = d2.get("errCode", -1)

                if code == 0:
                    print(f"\n[✓] 登录成功！", flush=True)
                    # 提取 cookies
                    cookies = dict(client.cookies)
                    # 也检查 response headers 的 set-cookie
                    for resp_cookie in r2.cookies:
                        cookies[resp_cookie.name] = resp_cookie.value
                    print(f"    Cookies: {list(cookies.keys())}", flush=True)
                    _save_cookies(cookies)
                    return True

                if code != 10008:  # 10008 = param error, try next format
                    break
            except Exception:
                pass

        # 也尝试 GET
        try:
            r3 = client.get(
                f"{BASE}/cgi-bin/mmfinderassistant-bin/auth/auth_login_status?token={token}"
            )
            d3 = r3.json()
            if d3.get("errCode") == 0:
                print(f"\n[✓] 登录成功！(GET)", flush=True)
                cookies = dict(client.cookies)
                for resp_cookie in r3.cookies:
                    cookies[resp_cookie.name] = resp_cookie.value
                print(f"    Cookies: {list(cookies.keys())}", flush=True)
                _save_cookies(cookies)
                return True
        except Exception:
            pass

        # 尝试直接访问需要登录的页面看看 cookie 是否已设置
        try:
            r4 = client.get(f"{BASE}/platform/post/list")
            if "platform" in str(r4.url) and "login" not in str(r4.url):
                print(f"\n[✓] 检测到已登录！(redirect check)", flush=True)
                cookies = dict(client.cookies)
                print(f"    Cookies: {list(cookies.keys())}", flush=True)
                if "sessionid" in cookies:
                    _save_cookies(cookies)
                    return True
        except Exception:
            pass

        if i % 5 == 0:
            print(f"    等待中... ({i * 3}s)", flush=True)

    print("[✗] 3 分钟超时", flush=True)
    return False


def _save_cookies(cookies_dict: dict):
    """保存为 Playwright storage_state 格式（兼容 publish 脚本）"""
    pw_cookies = []
    for name, value in cookies_dict.items():
        pw_cookies.append({
            "name": name,
            "value": value,
            "domain": "channels.weixin.qq.com",
            "path": "/",
            "expires": -1,
            "httpOnly": False,
            "secure": True,
            "sameSite": "None",
        })
    state = {"cookies": pw_cookies, "origins": []}
    COOKIE_FILE.write_text(json.dumps(state, ensure_ascii=False, indent=2))
    print(f"    Cookie 已保存: {COOKIE_FILE} ({len(pw_cookies)} 个)", flush=True)


if __name__ == "__main__":
    ok = api_login()
    sys.exit(0 if ok else 1)

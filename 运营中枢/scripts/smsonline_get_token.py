#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SMSOnline Premium 取号收码脚本

- 第一次：只用它打开 premium.smsonline.cloud，手动完成登录，脚本自动帮你截获 Firebase idToken。
- 之后：命令行传入 service/country，一键完成「取号 → 轮询收码 → 超时退号」。
"""
import argparse
import json
import sys
import time
import urllib.request
from playwright.sync_api import sync_playwright

PREMIUM_URL = "https://premium.smsonline.cloud/popular"
API_BASE = "https://api-x.smsonline.cloud/v3"
USER_ID = "PmFBSlkilbMeOsPJb2AdqRD13g93"
TIMEOUT_SEC = 120
POLL_INTERVAL = 5


def api_put(url, token, body):
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(url, data=data, method="PUT")
    req.add_header("Authorization", f"Bearer {token}")
    req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.loads(r.read().decode("utf-8"))


def api_get(url, token):
    req = urllib.request.Request(url)
    req.add_header("Authorization", f"Bearer {token}")
    req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.loads(r.read().decode("utf-8"))


def api_patch(url, token):
    req = urllib.request.Request(url, method="PATCH")
    req.add_header("Authorization", f"Bearer {token}")
    req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.loads(r.read().decode("utf-8"))


PROFILE_DIR = "/Users/karuo/.smsonline_browser_profile"


def get_token_from_browser():
    """用 Playwright persistent context 打开 premium 站，拦截请求拿到最新 Bearer token。
    首次需手动 Google 登录，之后 cookie 保存在 profile 里自动登录。"""
    captured_token = {"value": None}

    def on_request(request):
        auth = request.headers.get("authorization", "")
        if auth.startswith("Bearer eyJ") and len(auth) > 200:
            captured_token["value"] = auth.replace("Bearer ", "")

    with sync_playwright() as p:
        ctx = p.chromium.launch_persistent_context(
            PROFILE_DIR,
            headless=False,
            accept_downloads=False,
            ignore_https_errors=True,
        )
        page = ctx.pages[0] if ctx.pages else ctx.new_page()
        page.on("request", on_request)
        print("正在打开 premium.smsonline.cloud …")
        print("首次请手动完成 Google 登录（之后会自动登录）。")
        try:
            page.goto(PREMIUM_URL, wait_until="networkidle", timeout=60000)
        except Exception:
            pass
        for _ in range(15):
            if captured_token["value"]:
                break
            time.sleep(2)
        if not captured_token["value"]:
            try:
                page.reload(wait_until="networkidle", timeout=30000)
            except Exception:
                pass
            for _ in range(15):
                if captured_token["value"]:
                    break
                time.sleep(2)
        if not captured_token["value"]:
            print("未自动拿到 token，请在浏览器中手动登录…最多等 120 秒")
            for _ in range(60):
                if captured_token["value"]:
                    break
                time.sleep(2)
        ctx.close()
    return captured_token["value"]


def normalize_country(country_arg: str) -> str:
    """把命令行里的缩写（cn/us/gb）转换成 premium 接口里的 country 名称。"""
    if not country_arg:
        return "China"
    m = country_arg.strip().lower()
    mapping = {
        "cn": "China",
        "china": "China",
        "us": "United States",
        "usa": "United States",
        "gb": "United Kingdom",
        "uk": "United Kingdom",
    }
    return mapping.get(m, country_arg)


def buy_and_receive(token, service="mx", country="China", network="network02"):
    """下单→轮询→收码→超时退号。"""
    url = f"{API_BASE}/numbers/{USER_ID}/order"
    body = {
        "maximumPrice": 2000,
        "country": country,
        "service": service,
        "carrier": "any",
        "network": network,
        "m": "",
        "n": "",
    }
    print(f"正在下单 {service} ({country}) …")
    result = api_put(url, token, body)
    print(f"下单结果：{json.dumps(result, ensure_ascii=False)}")
    if not result.get("ok"):
        print(f"下单失败：{result.get('errorMessage', '未知错误')}")
        return None, None
    order = result.get("body", {})
    order_id = order.get("orderId") or order.get("id")
    number = order.get("number") or order.get("phone")
    print(f"号码：{number}  订单：{order_id}")
    print(f"轮询中（最多 {TIMEOUT_SEC} 秒）…")
    start = time.time()
    sms = None
    while time.time() - start < TIMEOUT_SEC:
        time.sleep(POLL_INTERVAL)
        elapsed = int(time.time() - start)
        inv_url = f"{API_BASE}/numbers/{USER_ID}/inventory/{order_id}"
        try:
            inv = api_get(inv_url, token)
            sms = inv.get("body", {}).get("sms") or inv.get("body", {}).get("code")
            status = inv.get("body", {}).get("status")
            if sms:
                print(f"\n收到验证码！({elapsed}s)")
                print(f"  号码：{number}")
                print(f"  验证码：{sms}")
                break
            print(f"  等待中 {elapsed}s… status={status}", flush=True)
        except Exception as e:
            print(f"  轮询出错 {elapsed}s: {e}", flush=True)
    if not sms:
        # 超时退号
        print(f"\n超时 {TIMEOUT_SEC}s 未收到验证码，正在取消退费…")
        try:
            refund_url = f"{API_BASE}/numbers/{USER_ID}/order/{network}/{order_id}/refund"
            api_patch(refund_url, token)
            print("  已取消退费。")
        except Exception as e:
            print(f"  退费失败：{e}")
        return number, None
    return number, sms


def main():
    parser = argparse.ArgumentParser(description="SMSOnline Premium 自动取号收码")
    parser.add_argument(
        "--init-login",
        action="store_true",
        help="仅用于第一次：打开浏览器并完成登录，不下单号码",
    )
    parser.add_argument(
        "--service",
        default="mx",
        help="目标服务编码，例如 soul 对应的服务码（默认 mx）",
    )
    parser.add_argument(
        "--country",
        default="cn",
        help="国家代码或名称，例如 cn/us/gb（默认 cn=China）",
    )
    parser.add_argument(
        "--network",
        default="network02",
        help="网络编码，默认 network02（通常保持默认即可）",
    )
    args = parser.parse_args()

    print("=" * 50)
    print("SMSOnline Premium 自动取号收码")
    print("=" * 50)

    # 1. 拿 token（必须先有浏览器里已登录的 session）
    token = get_token_from_browser()
    if not token:
        print("ERROR: 未能获取 token，退出。")
        sys.exit(1)
    print(f"Token 获取成功（长度 {len(token)}）")

    # 仅用于初始化登录：拿到 token 就结束
    if args.init_login:
        print("初始化登录完成，后续可直接使用 --service/--country 下单收码。")
        return

    # 2. 下单 + 收码
    country_name = normalize_country(args.country)
    number, code = buy_and_receive(
        token, service=args.service, country=country_name, network=args.network
    )

    print("\n" + "=" * 50)
    if number:
        # 标准化输出，方便 Skill 与其他脚本复用
        if code:
            print(f"号码：{number}")
            print(f"验证码：{code}")
            print(f"NUMBER: {number}")
            print(f"SMS: {code}")
            print(f"{number} | {code}")
        else:
            print(f"未收到验证码，号码 {number} 已退费或取消。")
            print(f"NUMBER: {number}")
            print("SMS: (无)")
            print(f"{number} | (无)")
    else:
        print("未能成功下单号码。")
    print("=" * 50)


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
测试 create_v2 端点 — 逐步测试不同参数组合。
先用已有的 video_id（已上传成功的视频）测试发布。
"""
import asyncio
import json
import random
import string
import time
from pathlib import Path
from urllib.parse import urlencode

import httpx

SCRIPT_DIR = Path(__file__).parent
COOKIE_FILE = SCRIPT_DIR / "douyin_storage_state.json"

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"
BASE_URL = "https://creator.douyin.com"


def extract_cookies_string(storage_state_path: str) -> str:
    with open(storage_state_path) as f:
        data = json.load(f)
    cookies = data.get("cookies", [])
    parts = []
    seen = set()
    for c in cookies:
        key = c["name"]
        if key not in seen:
            parts.append(f"{key}={c['value']}")
            seen.add(key)
    return "; ".join(parts)


def extract_csrf(cookies_str: str) -> str:
    for part in cookies_str.split(";"):
        part = part.strip()
        if part.startswith("passport_csrf_token="):
            return part.split("=", 1)[1]
    return ""


def random_creation_id() -> str:
    chars = string.ascii_lowercase + string.digits
    prefix = "".join(random.choices(chars, k=8))
    ts = str(int(time.time() * 1000))
    return prefix + ts


def build_query_params(ms_token: str = "") -> dict:
    return {
        "read_aid": "2906",
        "cookie_enabled": "true",
        "screen_width": "1280",
        "screen_height": "720",
        "browser_language": "zh-CN",
        "browser_platform": "MacIntel",
        "browser_name": "Mozilla",
        "browser_version": UA,
        "browser_online": "true",
        "timezone_name": "Asia/Shanghai",
        "aid": "1128",
        "support_h265": "1",
    }


def build_body(video_id: str, title: str, poster_uri: str = "", timing: int = 0) -> dict:
    return {
        "item": {
            "common": {
                "text": title,
                "caption": title,
                "item_title": "",
                "activity": "[]",
                "text_extra": "[]",
                "challenges": "[]",
                "mentions": "[]",
                "hashtag_source": "",
                "hot_sentence": "",
                "interaction_stickers": "[]",
                "visibility_type": 0,
                "download": 1,
                "timing": timing,
                "creation_id": random_creation_id(),
                "media_type": 4,
                "video_id": video_id,
                "music_source": 0,
                "music_id": None,
            },
            "cover": {
                "custom_cover_image_height": 0,
                "custom_cover_image_width": 0,
                "poster": poster_uri,
                "poster_delay": 0,
            },
        }
    }


async def test_create(video_id: str, title: str):
    cookie_str = extract_cookies_string(str(COOKIE_FILE))
    csrf = extract_csrf(cookie_str)

    print(f"Cookie 长度: {len(cookie_str)}")
    print(f"CSRF token: {csrf[:20]}...")

    headers = {
        "Cookie": cookie_str,
        "User-Agent": UA,
        "Content-Type": "application/json",
        "Accept": "application/json, text/plain, */*",
        "Referer": "https://creator.douyin.com/creator-micro/content/post/video?enter_from=publish_page",
        "Origin": "https://creator.douyin.com",
    }
    if csrf:
        headers["x-secsdk-csrf-token"] = csrf

    body = build_body(video_id, title)
    body_json = json.dumps(body, ensure_ascii=False)

    # Test 1: 无 msToken 无 a_bogus
    print("\n" + "="*60)
    print("  测试1: 无 msToken, 无 a_bogus")
    print("="*60)
    params = build_query_params()
    url = f"{BASE_URL}/web/api/media/aweme/create_v2/?{urlencode(params)}"
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(url, headers=headers, content=body_json)
        print(f"  HTTP {resp.status_code}")
        print(f"  Headers: {dict(resp.headers)}")
        text = resp.text
        print(f"  Body ({len(text)} chars): {text[:500]}")

    # Test 2: 带随机 msToken
    print("\n" + "="*60)
    print("  测试2: 随机 msToken, 无 a_bogus")
    print("="*60)
    fake_ms = "".join(random.choices(string.ascii_letters + string.digits + "_-", k=128)) + "=="
    params2 = build_query_params()
    params2["msToken"] = fake_ms
    url2 = f"{BASE_URL}/web/api/media/aweme/create_v2/?{urlencode(params2)}"
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp2 = await client.post(url2, headers=headers, content=body_json)
        print(f"  HTTP {resp2.status_code}")
        text2 = resp2.text
        print(f"  Body ({len(text2)} chars): {text2[:500]}")

    # Test 3: 带 x-secsdk-csrf-token 值用 csrf_session_id
    print("\n" + "="*60)
    print("  测试3: csrf_session_id 作为 CSRF, 无 a_bogus")
    print("="*60)
    headers3 = headers.copy()
    for part in cookie_str.split(";"):
        part = part.strip()
        if part.startswith("csrf_session_id="):
            headers3["x-secsdk-csrf-token"] = part.split("=", 1)[1]
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp3 = await client.post(url2, headers=headers3, content=body_json)
        print(f"  HTTP {resp3.status_code}")
        text3 = resp3.text
        print(f"  Body ({len(text3)} chars): {text3[:500]}")


async def main():
    # 使用之前拦截到的已上传 video_id
    video_id = "v0200fg10000d6nbfknog65sq49b99gg"
    title = "广点通能投Soul了 纯API测试"

    print(f"video_id: {video_id}")
    print(f"title: {title}")

    await test_create(video_id, title)


if __name__ == "__main__":
    asyncio.run(main())

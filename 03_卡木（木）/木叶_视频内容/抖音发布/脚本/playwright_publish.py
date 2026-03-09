#!/usr/bin/env python3
"""
使用 Playwright 全自动上传视频到抖音创作者中心。
通过注入 cookies 实现免登录，使用 set_input_files 上传视频文件，
填写标题后自动点击发布。
"""
import sys
import time
from pathlib import Path
from urllib.parse import unquote

from playwright.sync_api import sync_playwright

COOKIE_STRING = (
    "bd_ticket_guard_client_web_domain=2; "
    "passport_csrf_token=7c77660e1f88141e7e90b71d7e32ad0b; "
    "passport_csrf_token_default=7c77660e1f88141e7e90b71d7e32ad0b; "
    "enter_pc_once=1; "
    "UIFID_TEMP=08f4fe5163774c2300555b455fb414e93ca9fbb91678792eb055c0a8974f001d75b51090fcb52c4aaaf9073dc832c6dd4dc3de49b908072111108b86524fe9c74b5a387ca37e4f4839735270d224cafe; "
    "gfkadpd=2906,33638; "
    "csrf_session_id=6b09d5b10c4ab498c588892c745a109c; "
    "biz_trace_id=45d6e984; "
    "_bd_ticket_crypt_doamin=2; "
    "_bd_ticket_crypt_cookie=7356de5b4441a9b6a8bdebc21d2974e9; "
    "__security_mc_1_s_sdk_sign_data_key_web_protect=dfc9fff6-410f-8e60; "
    "__security_mc_1_s_sdk_cert_key=e39ec87f-4583-ad3e; "
    "__security_mc_1_s_sdk_crypt_sdk=3aeacc1d-4bd6-aa35; "
    "__security_server_data_status=1; "
    "x-web-secsdk-uid=13353cdf-41f2-4dd2-bbc5-ddf08884fd66; "
    "passport_fe_beating_status=true; "
    "passport_assist_user=CjzV-fLLRY-_ejIbeLJs90LfRNLuZvbI0xfqJF0GcZOZpX0hTcWo0kM00noByoHqEe1tfarXTWR6xuZvnIAaSgo8AAAAAAAAAAAAAFApNKm_uePs4rUqvWqP9f6CCWCAV30CZ9yI7jKc732ca5xgSRkDKFG6MrndTOgNN-kcEITRiw4Yia_WVCABIgEDRk9Xvg%3D%3D; "
    "bd_ticket_guard_client_data_v2=eyJyZWVfcHVibGljX2tleSI6IkJJdjZnajZiZjBpM29qRW5teWZwOGhqS1ZzRUU4a0lBK1JhR00ycTg4alRQdCtkdkNwcllYNytWb3VJa0k1R2ZWNzJhNDFqNERHZmZ1ZjVmdzhWSnhmQT0iLCJyZXFfY29udGVudCI6InNlY190cyIsInJlcV9zaWduIjoieG1HQ0taTmU5U2dlNkdqaDBlTDE0UFVOUDlYbktOeDhlTzZXUkh5dnZYQT0iLCJzZWNfdHMiOiIjUFlpN0lMZTdjRERuK09KSk02V05HNDErdFJqT1RaSEVnUkxqWkZWY0ZibGdFNWVFem51bm43bkZZQUJ6In0%3D; "
    "bd_ticket_guard_client_data=eyJiZC10aWNrZXQtZ3VhcmQtdmVyc2lvbiI6MiwiYmQtdGlja2V0LWd1YXJkLWl0ZXJhdGlvbi12ZXJzaW9uIjoxLCJiZC10aWNrZXQtZ3VhcmQtcmVlLXB1YmxpYy1rZXkiOiJCSXY2Z2o2YmYwaTNvakVubXlmcDhoaktWc0VFOGtJQStSYUdNMnE4OGpUUHQrZHZDcHJZWDcrVm91SWtJNUdmVjcyYTQxajRER2ZmdWY1Znc4Vkp4ZkE9IiwiYmQtdGlja2V0LWd1YXJkLXdlYi12ZXJzaW9uIjoyfQ%3D%3D"
)

VIDEOS = [
    {
        "path": "/Users/karuo/Movies/soul视频/soul 派对 119场 20260309_output/成片/早起不是为了开派对，是不吵老婆睡觉.mp4",
        "title": "早起不是为了开派对，是不吵老婆睡觉。初衷就这一个。#Soul派对 #创业日记 #晨间直播 #私域干货",
    },
    {
        "path": "/Users/karuo/Movies/soul视频/soul 派对 119场 20260309_output/成片/懒人的活法 动作简单有利可图正反馈.mp4",
        "title": "懒有懒的活法：动作简单、有利可图、正反馈，就能坐得住。#Soul派对 #副业 #私域 #切片变现",
    },
]


def parse_cookies(cookie_str: str, domain: str = ".douyin.com"):
    cookies = []
    for pair in cookie_str.split("; "):
        if "=" not in pair:
            continue
        name, value = pair.split("=", 1)
        cookies.append({
            "name": name.strip(),
            "value": unquote(value.strip()),
            "domain": domain,
            "path": "/",
        })
    return cookies


def publish_one(context, video_info: dict, idx: int):
    path = video_info["path"]
    title = video_info["title"]
    if not Path(path).exists():
        print(f"  [{idx}] 文件不存在: {path}")
        return False

    page = context.new_page()
    page.goto("https://creator.douyin.com/creator-micro/content/upload", wait_until="networkidle", timeout=30000)
    time.sleep(3)

    file_input = page.query_selector('input[type="file"]')
    if not file_input:
        file_inputs = page.query_selector_all("input")
        for inp in file_inputs:
            if inp.get_attribute("accept") and "video" in (inp.get_attribute("accept") or ""):
                file_input = inp
                break
    if not file_input:
        print(f"  [{idx}] 未找到 file input，尝试通过 CSS 选择器")
        file_input = page.query_selector('input[accept*="video"]')

    if file_input:
        file_input.set_input_files(path)
        print(f"  [{idx}] 已选择文件: {Path(path).name}")
    else:
        print(f"  [{idx}] 无法找到上传 input")
        page.close()
        return False

    print(f"  [{idx}] 等待上传完成...")
    for _ in range(120):
        time.sleep(2)
        progress_text = page.text_content("body") or ""
        if "上传完成" in progress_text or "重新上传" in progress_text:
            print(f"  [{idx}] 上传完成")
            break
        if "发布" in progress_text and "上传" not in progress_text:
            break
    else:
        print(f"  [{idx}] 上传超时，继续尝试填写标题")

    time.sleep(2)

    title_editor = page.query_selector('[class*="title"] [contenteditable="true"]')
    if not title_editor:
        title_editor = page.query_selector('[data-placeholder*="标题"]')
    if not title_editor:
        title_editor = page.query_selector('.ql-editor')
    if not title_editor:
        title_editor = page.query_selector('[contenteditable="true"]')

    if title_editor:
        title_editor.click()
        title_editor.fill("")
        page.keyboard.type(title, delay=20)
        print(f"  [{idx}] 已填写标题")
    else:
        print(f"  [{idx}] 未找到标题输入框，跳过标题")

    time.sleep(2)

    publish_btn = page.query_selector('button:has-text("发布")')
    if not publish_btn:
        for btn in page.query_selector_all("button"):
            txt = btn.text_content() or ""
            if "发布" in txt and "定时" not in txt:
                publish_btn = btn
                break

    if publish_btn:
        publish_btn.click()
        print(f"  [{idx}] 已点击发布")
        time.sleep(5)
        current_url = page.url
        body_text = page.text_content("body") or ""
        if "发布成功" in body_text or "content/manage" in current_url or "manage" in current_url:
            print(f"  [{idx}] 发布成功!")
            page.close()
            return True
        else:
            print(f"  [{idx}] 发布状态未确认，当前URL: {current_url}")
            page.close()
            return True
    else:
        print(f"  [{idx}] 未找到发布按钮")
        page.close()
        return False


def main():
    print("启动 Playwright 全自动上传到抖音创作者中心...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1280, "height": 800},
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        )

        cookies = parse_cookies(COOKIE_STRING)
        context.add_cookies(cookies)
        print("已注入 cookies")

        ok, fail = 0, 0
        for i, v in enumerate(VIDEOS, 1):
            print(f"\n--- 视频 {i}/{len(VIDEOS)}: {Path(v['path']).name} ---")
            if publish_one(context, v, i):
                ok += 1
            else:
                fail += 1

        browser.close()
        print(f"\n完成: 成功 {ok}，失败 {fail}")
        return 0 if fail == 0 else 1


if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
receivesms.co 命令行：随机取一个英国临时号码，抓取该号码最新一条短信并输出。
用法:
  python3 receivesms_get_sms.py           # 立即取最新一条（可能是历史/限流旧数据）
  python3 receivesms_get_sms.py --wait   # 取号 → 等 45 秒 → 再刷新收件页取最新（拿到你刚发的）
"""
import re
import random
import sys
import time
import urllib.request

BASE = "https://www.receivesms.co"
LIST_URL = BASE + "/british-phone-numbers/gb/"


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"})
    with urllib.request.urlopen(req, timeout=15) as r:
        return r.read().decode("utf-8", errors="replace")


def parse_number_list(html):
    # 每个 card 块内: href="/gb-phone-number/ID/" 与 <strong>+44 xxx</strong>
    blocks = re.findall(
        r'href="/gb-phone-number/(\d+)/"[^>]*>.*?<strong>(\+44[\d\s]+)</strong>',
        html,
        re.DOTALL
    )
    pairs = [(mid, num.replace(" ", "").strip()) for mid, num in blocks]
    return pairs


def parse_latest_sms(html):
    # 第一条 <div class="sms">...</div> 即最新短信
    m = re.search(r'<div class="sms">(.*?)</div>', html, re.DOTALL)
    if not m:
        return None
    text = m.group(1).strip()
    # 去 HTML 实体与多余空白
    text = re.sub(r"<[^>]+>", "", text)
    text = text.replace("&nbsp;", " ").replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">").replace("&quot;", '"')
    return " ".join(text.split())


def main():
    do_wait = "--wait" in sys.argv
    try:
        html_list = fetch(LIST_URL)
    except Exception as e:
        print("ERROR: 获取号码列表失败:", e, file=sys.stderr)
        sys.exit(1)
    pairs = parse_number_list(html_list)
    if not pairs:
        print("ERROR: 未解析到任何号码", file=sys.stderr)
        sys.exit(1)
    mid, number = random.choice(pairs)
    inbox_url = f"{BASE}/gb-phone-number/{mid}/"
    print("NUMBER:", number)
    if do_wait:
        wait_sec = 45  # 30～60 秒取中值，等刷新后的新短信
        print(f"请向该号码发短信，{wait_sec} 秒后自动刷新收件页…", flush=True)
        time.sleep(wait_sec)
    try:
        html_inbox = fetch(inbox_url)
    except Exception as e:
        print("ERROR: 获取收件页失败:", e, file=sys.stderr)
        sys.exit(1)
    sms = parse_latest_sms(html_inbox)
    print("SMS:", sms if sms else "(无)")
    if sms:
        print("---")
        print(number, "|", sms)


if __name__ == "__main__":
    main()

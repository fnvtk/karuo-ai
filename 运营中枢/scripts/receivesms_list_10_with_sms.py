#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
receivesms.co：获取 10 个可用于注册的临时号码，并输出每个号码最近收到的 1 条短信。
"""
import re
import time
import urllib.request

BASE = "https://www.receivesms.co"

CONFIGS = [
    ("US", BASE + "/us-phone-numbers/us/", "us-phone-number",
     re.compile(r'href="/us-phone-number/(\d+)/"[^>]*>.*?<strong>(\+1[\d\s\-]+)</strong>', re.DOTALL)),
    ("CA", BASE + "/canadian-phone-numbers/ca/", "ca-phone-number",
     re.compile(r'href="/ca-phone-number/(\d+)/"[^>]*>.*?<strong>(\+1[\d\s\-]+)</strong>', re.DOTALL)),
    ("GB", BASE + "/british-phone-numbers/gb/", "gb-phone-number",
     re.compile(r'href="/gb-phone-number/(\d+)/"[^>]*>.*?<strong>(\+44[\d\s]+)</strong>', re.DOTALL)),
]


def fetch(url):
    req = urllib.request.Request(
        url, headers={"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"}
    )
    with urllib.request.urlopen(req, timeout=20) as r:
        return r.read().decode("utf-8", errors="replace")


def parse_list(html, regex):
    pairs = []
    for m in regex.finditer(html):
        mid, num = m.group(1), m.group(2).replace(" ", "").replace("-", "").strip()
        if num.startswith("+"):
            pairs.append((mid, num))
    return pairs


def parse_latest_sms(html):
    m = re.search(r'<div class="sms">(.*?)</div>', html, re.DOTALL)
    if not m:
        return None
    text = m.group(1).strip()
    text = re.sub(r"<[^>]+>", "", text)
    text = text.replace("&nbsp;", " ").replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">").replace("&quot;", '"')
    return " ".join(text.split()).strip() or None


def main():
    want = 10
    seen = set()
    results = []
    print(f"正在从 receivesms.co 拉取 {want} 个号码及其最新短信…", flush=True)
    for country, list_url, path_prefix, regex in CONFIGS:
        if len(results) >= want:
            break
        try:
            html = fetch(list_url)
            pairs = parse_list(html, regex)
        except Exception as e:
            print(f"  {country} 列表失败: {e}", flush=True)
            continue
        for mid, num in pairs[:25]:
            if len(results) >= want:
                break
            if num in seen:
                continue
            url = f"{BASE}/{path_prefix}/{mid}/"
            try:
                page = fetch(url)
            except Exception:
                time.sleep(0.4)
                continue
            if 'class="sms"' not in page and 'class="entry-body"' not in page:
                time.sleep(0.2)
                continue
            sms = parse_latest_sms(page)
            seen.add(num)
            results.append((country, num, sms or "(无)", url))
            print(f"  [{len(results)}/{want}] {country} {num}", flush=True)
            time.sleep(0.35)
    print("\n" + "=" * 70)
    print(f"共 {len(results)} 个可用号码 · 每个最新 1 条短信")
    print("=" * 70)
    for i, (country, num, sms, url) in enumerate(results, 1):
        sms_short = (sms[:80] + "…") if len(sms) > 80 else sms
        print(f"\n{i}. {country} {num}")
        print(f"   收件页: {url}")
        print(f"   最新短信: {sms_short}")
    print("\n" + "=" * 70)
    print("使用说明：打开对应收件页即可查看/刷新短信，可用于注册时填入号码并在此查看验证码。")
    print("=" * 70)


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
从 receivesms.co 多国家（美/加/英）拉取号码，筛出「最近有短信活动且收件页可正常打开」的 5 个，
并做可用性校验（能打开收件页、页面含短信结构）。
"""
import re
import time
import urllib.request

BASE = "https://www.receivesms.co"

# (国家名, 列表页URL, 收件页路径前缀, 列表正则：含 group(1)=id, group(2)=号码)
CONFIGS = [
    ("US", BASE + "/us-phone-numbers/us/", "us-phone-number",
     re.compile(r'href="/us-phone-number/(\d+)/"[^>]*>.*?<strong>(\+1[\d\s\-]+)</strong>', re.DOTALL)),
    ("CA", BASE + "/canadian-phone-numbers/ca/", "ca-phone-number",
     re.compile(r'href="/ca-phone-number/(\d+)/"[^>]*>.*?<strong>(\+1[\d\s\-]+)</strong>', re.DOTALL)),
    ("GB", BASE + "/british-phone-numbers/gb/", "gb-phone-number",
     re.compile(r'href="/gb-phone-number/(\d+)/"[^>]*>.*?<strong>(\+44[\d\s]+)</strong>', re.DOTALL)),
]


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"})
    with urllib.request.urlopen(req, timeout=25) as r:
        return r.read().decode("utf-8", errors="replace")


def parse_list(html, regex):
    pairs = []
    for m in regex.finditer(html):
        mid, num = m.group(1), m.group(2).replace(" ", "").replace("-", "").strip()
        if num.startswith("+"):
            pairs.append((mid, num))
    return pairs


def is_recent(activity_text):
    """是否算近期（24 小时内）：seconds/minutes/hours ago 且 ≤24。"""
    if not activity_text:
        return False
    t = activity_text.strip().lower()
    if "second" in t and "ago" in t:
        return True
    if "minute" in t and "ago" in t:
        return True
    if "hour" in t and "ago" in t:
        m = re.search(r"(\d+)\s*hour", t)
        if m:
            return int(m.group(1)) <= 24
        return True  # "1 hour ago"
    if "day" in t and "ago" in t:
        m = re.search(r"(\d+)\s*day", t)
        if m and int(m.group(1)) <= 1:
            return True
    return False


def inbox_usable(html):
    """收件页是否包含短信结构（可正常收码）。"""
    return 'class="entry-body"' in html and 'class="sms"' in html


def main():
    print("正在从 receivesms.co 多国家拉取号码并校验…", flush=True)
    seen = set()
    results = []
    # 先尽量找 24h 内有活动的
    for country, list_url, path_prefix, regex in CONFIGS:
        if len(results) >= 5:
            break
        try:
            html = fetch(list_url)
            pairs = parse_list(html, regex)
        except Exception as e:
            print(f"  {country} 列表失败: {e}", flush=True)
            continue
        for mid, num in list(pairs)[:12]:
            if len(results) >= 5:
                break
            if num in seen:
                continue
            url = f"{BASE}/{path_prefix}/{mid}/"
            try:
                page = fetch(url)
            except Exception:
                time.sleep(0.3)
                continue
            if not inbox_usable(page):
                time.sleep(0.25)
                continue
            m = re.search(r"Last activity:\s*([^<]+)<", page)
            last = m.group(1).strip() if m else ""
            if is_recent(last):
                seen.add(num)
                results.append((country, num, last, url))
                print(f"  [{len(results)}/5] {country} {num}  Last: {last}", flush=True)
            time.sleep(0.35)
    # 不足 5 个则补足：任意收件页可用的号
    for country, list_url, path_prefix, regex in CONFIGS:
        if len(results) >= 5:
            break
        try:
            html = fetch(list_url)
            pairs = parse_list(html, regex)
        except Exception:
            continue
        for mid, num in list(pairs)[:20]:
            if len(results) >= 5:
                break
            if num in seen:
                continue
            url = f"{BASE}/{path_prefix}/{mid}/"
            try:
                page = fetch(url)
            except Exception:
                continue
            if not inbox_usable(page):
                continue
            m = re.search(r"Last activity:\s*([^<]+)<", page)
            last = (m.group(1).strip() if m else "N/A")
            seen.add(num)
            results.append((country, num, last, url))
            print(f"  [{len(results)}/5] {country} {num}  Last: {last}", flush=True)
            time.sleep(0.3)
    print("\n--- 可用 5 个号码（已测收件页可打开）---")
    for country, num, last, url in results[:5]:
        print(f"{country}\t{num}\t{last}\t{url}")
    print("\n使用：打开对应 URL 即可查看/刷新该号码收到的短信。")

if __name__ == "__main__":
    main()

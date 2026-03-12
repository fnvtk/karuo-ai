#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
从 receivesms.co 英国号里筛出「收件箱里出现过 Soul 短信」的号码，作为最可能能注册 Soul 的临时号（最多返回 5 个）。
注意：该站无中国(+86)号；Soul 若仅支持中国手机则需用国内接码平台。
"""
import re
import time
import urllib.request

BASE = "https://www.receivesms.co"
LIST_URL = BASE + "/british-phone-numbers/gb/"


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"})
    with urllib.request.urlopen(req, timeout=20) as r:
        return r.read().decode("utf-8", errors="replace")


def parse_number_list(html):
    blocks = re.findall(
        r'href="/gb-phone-number/(\d+)/"[^>]*>.*?<strong>(\+44[\d\s]+)</strong>',
        html,
        re.DOTALL
    )
    return [(mid, num.replace(" ", "").strip()) for mid, num in blocks]


def inbox_has_soul(html):
    """收件页是否出现过发件人为 Soul 的短信（不区分大小写）。"""
    senders = re.findall(r'class="from-link">([^<]+)</a>', html)
    return any("soul" in s.lower() for s in senders)


def main():
    print("正在获取英国号码列表…", flush=True)
    html_list = fetch(LIST_URL)
    pairs = parse_number_list(html_list)
    if not pairs:
        print("未解析到任何号码")
        return
    print(f"共 {len(pairs)} 个英国号，筛出收件箱曾出现 Soul 的号码（最多 5 个）…", flush=True)
    found = []
    for i, (mid, number) in enumerate(pairs):
        if len(found) >= 5:
            break
        url = f"{BASE}/gb-phone-number/{mid}/"
        try:
            html = fetch(url)
            if inbox_has_soul(html):
                found.append((number, url))
                print(f"  [{len(found)}/5] {number} 收件箱有 Soul 短信", flush=True)
        except Exception as e:
            pass
        time.sleep(0.7)
    if not found:
        print("未找到收件箱含 Soul 的号码；可改用全部英国号逐一尝试。")
        print("前 5 个英国号（可自行试注册 Soul）：", flush=True)
        for number, url in [(n, f"{BASE}/gb-phone-number/{m}/") for m, n in pairs[:5]]:
            print(f"  {number}  {url}")
        return
    print("\n--- 最可能能注册 Soul 的 5 个号码（站上曾收到 Soul 验证码）---")
    for number, url in found:
        print(f"{number}\t{url}")
    print("\n说明：receivesms.co 无中国(+86)号；上述为英国号，仅当 Soul 支持国际号时可用。Soul 若仅支持中国大陆手机，需用国内接码平台。")


if __name__ == "__main__":
    main()

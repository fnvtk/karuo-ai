#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
receivesms.co 整站收短信内容分析：拉取英国号列表下所有号码的【全部历史分页】收件，
汇总所有短信，按发件人、类型、关键词做统计并输出分析报告。
"""
import re
import time
import urllib.request
from collections import Counter, defaultdict

BASE = "https://www.receivesms.co"
LIST_URL = BASE + "/british-phone-numbers/gb/"
MAX_PAGES_PER_NUMBER = 50  # 每号最多历史页数


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"})
    with urllib.request.urlopen(req, timeout=25) as r:
        return r.read().decode("utf-8", errors="replace")


def parse_number_list(html):
    blocks = re.findall(
        r'href="/gb-phone-number/(\d+)/"[^>]*>.*?<strong>(\+44[\d\s]+)</strong>',
        html,
        re.DOTALL
    )
    return [(mid, num.replace(" ", "").strip()) for mid, num in blocks]


def get_next_page_url(html, mid):
    """解析本页是否还有「Next」分页，返回下一页完整 URL 或 None。"""
    # 下一页链接形如: /united-kingdom-phone-number/21808/2/
    m = re.search(r'<a href="(/united-kingdom-phone-number/\d+/(\d+)/)">Next</a>', html)
    if not m:
        return None
    return BASE + m.group(1)


def parse_all_sms_in_inbox(html):
    """解析一页收件页中所有短信：按 entry-card 块切分，每块内取发件人 + 正文。"""
    # 每个 entry-card 内：from-link 与 entry-body > div.sms 一一对应
    blocks = re.findall(
        r'<article[^>]*class="[^"]*entry-card[^"]*"[^>]*>(.*?)</article>',
        html,
        re.DOTALL
    )
    out = []
    for blk in blocks:
        m_sender = re.search(r'class="from-link">([^<]*)</a>', blk)
        m_sms = re.search(r'<div class="entry-body"><div class="sms">(.*?)</div></div>', blk, re.DOTALL)
        if not m_sender or not m_sms:
            continue
        sender = m_sender.group(1).strip()
        raw = m_sms.group(1)
        text = re.sub(r"<[^>]+>", "", raw)
        text = text.replace("&nbsp;", " ").replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">").replace("&#039;", "'")
        text = " ".join(text.split()).strip()
        if text:
            out.append((sender, text))
    return out


def fetch_all_pages_for_number(mid, number):
    """拉取该号码的全部历史分页，返回 [(sender, text), ...]。"""
    all_msgs = []
    url = f"{BASE}/gb-phone-number/{mid}/"
    page_num = 1
    while url and page_num <= MAX_PAGES_PER_NUMBER:
        try:
            html = fetch(url)
            msgs = parse_all_sms_in_inbox(html)
            all_msgs.extend(msgs)
            next_url = get_next_page_url(html, mid)
            if not next_url or not msgs:
                break
            url = next_url
            page_num += 1
            time.sleep(0.6)
        except Exception as e:
            break
    return all_msgs


def classify_content(text):
    """简单分类：验证码/OTP、营销/推广、通知、其他。"""
    t = text.upper()
    if any(k in t for k in ["CODE", "OTP", "VERIFICATION", "验证码", "验证", "CODIGO", "KODU"]):
        return "验证码/OTP"
    if any(k in t for k in ["PROMO", "OFFER", "DEAL", "SALE", "优惠", "促销", "http", "LINK", ".COM"]):
        return "营销/推广"
    if any(k in t for k in ["LOGIN", "CONFIRM", "ALERT", "NOTICE", "通知", "确认"]):
        return "通知"
    return "其他"


def main():
    print("正在获取英国号码列表…", flush=True)
    html_list = fetch(LIST_URL)
    pairs = parse_number_list(html_list)
    if not pairs:
        print("未解析到任何号码")
        return
    # 可选：仅前 N 个号码（用于快速测试）；设为 None 表示全部
    limit_numbers = None  # None=全部号码（约31个，耗时长）；整数=仅前 N 个号
    if limit_numbers:
        pairs = pairs[:limit_numbers]
        print(f"（仅抓前 {limit_numbers} 个号码）", flush=True)
    print(f"共 {len(pairs)} 个号码，开始拉取每个号码的【全部历史分页】…", flush=True)
    all_messages = []  # (number, sender, text)
    for i, (mid, number) in enumerate(pairs):
        try:
            msgs = fetch_all_pages_for_number(mid, number)
            for sender, text in msgs:
                all_messages.append((number, sender, text))
            print(f"  [{i+1}/{len(pairs)}] {number}: 共 {len(msgs)} 条", flush=True)
        except Exception as e:
            print(f"  [{i+1}/{len(pairs)}] {number}: 失败 {e}", flush=True)
        time.sleep(0.8)
    if not all_messages:
        print("未采集到任何短信")
        return
    # 统计
    by_sender = Counter(s for _, s, _ in all_messages)
    by_type = Counter(classify_content(t) for _, _, t in all_messages)
    keywords = []
    for _, _, t in all_messages:
        for w in re.findall(r"[a-zA-Z]{3,}", t):
            keywords.append(w.lower())
    kw_top = Counter(keywords).most_common(25)
    # 输出报告（Markdown）
    lines = [
        "# receivesms.co 整站收短信内容分析报告",
        "",
        "> 数据来源：receivesms.co 英国临时号码列表下全部号码的**全部历史分页**收件；采集时间：一次运行。",
        "",
        "## 一、概览",
        "",
        f"- **号码数量**：{len(pairs)}",
        f"- **短信总条数**：{len(all_messages)}",
        f"- **去重发件人数量**：{len(by_sender)}",
        "",
        "## 二、按发件人（网站/服务名）统计",
        "",
        "| 发件人 | 条数 |",
        "|:---|:---|",
    ]
    for sender, cnt in by_sender.most_common(40):
        lines.append(f"| {sender} | {cnt} |")
    lines.extend([
        "",
        "## 三、按内容类型分类",
        "",
        "| 类型 | 条数 | 占比 |",
        "|:---|:---|:---|",
    ])
    for typ, cnt in by_type.most_common():
        pct = round(100 * cnt / len(all_messages), 1)
        lines.append(f"| {typ} | {cnt} | {pct}% |")
    lines.extend([
        "",
        "## 四、正文高频词（英文，≥3 字母）",
        "",
        "| 词 | 出现次数 |",
        "|:---|:---|",
    ])
    for w, c in kw_top:
        lines.append(f"| {w} | {c} |")
    lines.extend([
        "",
        "## 五、样例短信（每类各 2 条）",
        "",
    ])
    by_type_list = defaultdict(list)
    for num, sender, text in all_messages:
        typ = classify_content(text)
        by_type_list[typ].append((sender, text[:120]))
    for typ in ["验证码/OTP", "营销/推广", "通知", "其他"]:
        lines.append(f"### {typ}")
        lines.append("")
        for sender, snippet in by_type_list.get(typ, [])[:2]:
            lines.append(f"- **{sender}**：{snippet}…")
        lines.append("")
    report = "\n".join(lines)
    print("\n" + "=" * 60)
    print(report)
    # 写文件
    out_path = "/Users/karuo/Documents/卡若Ai的文件夹/报告/receivesms_整站收短信内容分析.md"
    import os
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(report)
    print("=" * 60)
    print(f"报告已写入：{out_path}")


if __name__ == "__main__":
    main()

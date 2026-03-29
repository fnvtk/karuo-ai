#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
阿里云 DNS：将 quwanzhi.com 下 **A 记录值** 为 存客宝 42.194.245.239 的条目批量改为 kr 宝塔 43.139.27.93。
不修改 MX、TXT、CNAME、NS；仅 Type=A 且 Value 精确匹配旧 IP。

使用：
  python3 阿里云DNS_A记录_存客宝改kr宝塔.py          # 仅打印将修改的记录（dry-run）
  python3 阿里云DNS_A记录_存客宝改kr宝塔.py --apply  # 执行更新

凭证：环境变量 ALIYUN_ACCESS_KEY_ID / ALIYUN_ACCESS_KEY_SECRET，或 运营中枢/工作台/00_账号与API索引.md
"""
from __future__ import annotations

import json
import os
import re
import sys

OLD_IP = "42.194.245.239"
NEW_IP = "43.139.27.93"
DOMAIN = "quwanzhi.com"

_cur = os.path.abspath(__file__)
for _ in range(5):
    _cur = os.path.dirname(_cur)
REPO_ROOT = _cur
INDEX_MD = os.path.join(REPO_ROOT, "运营中枢", "工作台", "00_账号与API索引.md")


def get_aliyun_creds():
    id_val = os.environ.get("ALIYUN_ACCESS_KEY_ID")
    secret_val = os.environ.get("ALIYUN_ACCESS_KEY_SECRET")
    if id_val and secret_val:
        return id_val, secret_val
    if not os.path.isfile(INDEX_MD):
        return None, None
    with open(INDEX_MD, "r", encoding="utf-8") as f:
        text = f.read()
    in_ali = False
    for line in text.splitlines():
        if "### 阿里云" in line:
            in_ali = True
            continue
        if in_ali and line.strip().startswith("### ") and "阿里云" not in line:
            break
        if not in_ali:
            continue
        if "AccessKey" in line and "ID" in line:
            m = re.search(r"`([A-Za-z0-9]+)`", line)
            if m:
                id_val = m.group(1)
        if line.strip().startswith("|") and "Secret" in line and "Access" not in line:
            m = re.search(r"`([A-Za-z0-9]+)`", line)
            if m:
                secret_val = m.group(1)
    return id_val or None, secret_val or None


def main():
    apply_run = "--apply" in sys.argv
    key_id, key_secret = get_aliyun_creds()
    if not key_id or not key_secret:
        print("未配置阿里云凭证")
        return 1
    try:
        from aliyunsdkcore.client import AcsClient
        from aliyunsdkalidns.request.v20150109.DescribeDomainRecordsRequest import (
            DescribeDomainRecordsRequest,
        )
        from aliyunsdkalidns.request.v20150109.UpdateDomainRecordRequest import (
            UpdateDomainRecordRequest,
        )
    except ImportError:
        print("请执行: pip install aliyun-python-sdk-core aliyun-python-sdk-alidns")
        return 1

    client = AcsClient(key_id, key_secret, "cn-hangzhou")
    to_update = []
    page = 1
    while True:
        req = DescribeDomainRecordsRequest()
        req.set_accept_format("json")
        req.set_DomainName(DOMAIN)
        req.set_PageNumber(page)
        req.set_PageSize(500)
        raw = client.do_action_with_exception(req)
        data = json.loads(raw)
        recs = data.get("DomainRecords", {}).get("Record", [])
        if not recs:
            break
        for r in recs:
            if (r.get("Type") or "").upper() != "A":
                continue
            if (r.get("Value") or "").strip() != OLD_IP:
                continue
            rr = (r.get("RR") or "").strip()
            to_update.append(
                {
                    "RecordId": r["RecordId"],
                    "RR": rr,
                    "OldValue": r.get("Value"),
                }
            )
        total = int(data.get("TotalCount") or 0)
        if page * 500 >= total:
            break
        page += 1

    if not to_update:
        print("无 A 记录指向 %s，无需修改（或域名不在本账号）。" % OLD_IP)
        return 0

    print("将处理 %s 条 A 记录：%s -> %s" % (len(to_update), OLD_IP, NEW_IP))
    for item in to_update:
        fqdn = ("%s.%s" % (item["RR"], DOMAIN)).replace("..", ".").strip(".")
        if item["RR"] == "@":
            fqdn = DOMAIN
        print("  - %s (RecordId=%s)" % (fqdn, item["RecordId"]))

    if not apply_run:
        print("\n未加 --apply，以上为 dry-run。确认后执行：\n  python3 %s --apply" % os.path.basename(__file__))
        return 0

    for item in to_update:
        req = UpdateDomainRecordRequest()
        req.set_accept_format("json")
        req.set_RecordId(item["RecordId"])
        req.set_RR(item["RR"])
        req.set_Type("A")
        req.set_Value(NEW_IP)
        client.do_action_with_exception(req)
        print("  ✅ 已更新 %s.%s -> %s" % (item["RR"] or "@", DOMAIN, NEW_IP))

    print("\n完成。请 dig 验证，并尽快完成各设备 frpc 的 server 地址切换。")
    return 0


if __name__ == "__main__":
    sys.exit(main())

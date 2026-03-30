#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
阿里云 DNS：将 quwanzhi.com 下 **A 记录值** 为 kr 宝塔 43.139.27.93 的条目中，
**不属于**「FRP 入口 + 实际部署在 kr 上的站点」的子域，批量改回 **存客宝 42.194.245.239**。

背景：曾用「存客宝→kr」全量改 A，若你希望 **仅 FRP 相关与 kr 本机业务** 留在 kr，
其余子域仍由 **存客宝** 对外解析，可用本脚本恢复。

**不修改**：MX、TXT、CNAME、NS；仅 Type=A 且 Value 精确匹配 KR_IP。

**白名单（保留在 kr，不迁回）**：
- FRP：`open`、`opennas2`（open.quwanzhi.com / opennas2.quwanzhi.com）
- kr 上网关：`kr-ai`
- kr 上 Node/站点（与 `服务器管理/SKILL.md` 端口表一致，按需增补）：见代码常量 STAY_ON_KR_RR

用法：
  python3 阿里云DNS_A记录_kr迁回存客宝_保留FRP与kr业务.py           # dry-run
  python3 阿里云DNS_A记录_kr迁回存客宝_保留FRP与kr业务.py --apply   # 执行

凭证：环境变量 ALIYUN_ACCESS_KEY_ID / ALIYUN_ACCESS_KEY_SECRET，或 运营中枢/工作台/00_账号与API索引.md
"""
from __future__ import annotations

import json
import os
import re
import sys

KR_IP = "43.139.27.93"
CKB_IP = "42.194.245.239"
DOMAIN = "quwanzhi.com"

# 必须留在 kr：FRP 总入口 + 卡若网关 + 实际跑在 kr 宝塔上的站点（子域 RR，小写）
STAY_ON_KR_RR = frozenset(
    {
        "open",
        "opennas2",
        "kr-ai",
        "mckb",
        "ai-hair",
        "kr_wb",
        "krjzk",
        "dlm",
        "docc",
        "soul",
        "kr-users",
        "zp",
        "is-phone",
        "word",
        "ymao",
        "wz-screen",
        "zhiji",
        "zhiji1",
        "wzdj",
        "ai-tf",
        "mbtiadmin",
        # 文档中出现过、可能在 kr 的管理子域（若实际不在 kr 可从集合删除后再跑）
        "kr-op",
        "kr-kf",
        "kr-phone",
    }
)

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
    skip_apex = "--include-apex" not in sys.argv
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
            if (r.get("Value") or "").strip() != KR_IP:
                continue
            rr = (r.get("RR") or "").strip()
            rr_lower = rr.lower() if rr else ""
            if rr == "@" and skip_apex:
                continue
            if rr_lower in STAY_ON_KR_RR or (rr == "@" and not skip_apex):
                continue
            if "*" in rr:
                continue
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
        print("无需要迁回的 A 记录（或全部在白名单 / 非 %s）。" % KR_IP)
        return 0

    print(
        "将迁回存客宝 %s 条 A 记录：%s -> %s（保留白名单见脚本 STAY_ON_KR_RR）"
        % (len(to_update), KR_IP, CKB_IP)
    )
    for item in to_update:
        fqdn = ("%s.%s" % (item["RR"], DOMAIN)).replace("..", ".").strip(".")
        if item["RR"] == "@":
            fqdn = DOMAIN
        print("  - %s (RecordId=%s)" % (fqdn, item["RecordId"]))

    if not apply_run:
        print("\n未加 --apply，以上为 dry-run。若需同时处理根域名 @，加 --include-apex（慎用）。")
        return 0

    for item in to_update:
        req = UpdateDomainRecordRequest()
        req.set_accept_format("json")
        req.set_RecordId(item["RecordId"])
        req.set_RR(item["RR"])
        req.set_Type("A")
        req.set_Value(CKB_IP)
        client.do_action_with_exception(req)
        print("  ✅ 已更新 %s.%s -> %s" % (item["RR"] or "@", DOMAIN, CKB_IP))

    print("\n完成。请 dig 验证；若某子域实际已在 kr 部署，请将其 RR 加入 STAY_ON_KR_RR 后勿迁回。")
    return 0


if __name__ == "__main__":
    sys.exit(main())

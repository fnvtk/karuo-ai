#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
阿里云 DNS：添加 A 记录 kr-ai.quwanzhi.com -> 43.139.27.93（kr宝塔）。
凭证从环境变量或 运营中枢/工作台/00_账号与API索引.md 解析（该文件已在 .gitignore）。
使用：python3 阿里云DNS_添加kr-ai解析.py
"""
import os
import re
import sys

# 脚本在 卡若AI/01_卡资（金）/金仓_存储备份/服务器管理/scripts/
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
        if in_ali and "### " in line and "阿里云" not in line:
            break
        if in_ali:
            if "AccessKey ID" in line or "AccessKey Id" in line:
                m = re.search(r"`([A-Za-z0-9]+)`", line)
                if m:
                    id_val = m.group(1)
            if "Secret" in line and "key" not in line.lower():
                m = re.search(r"`([A-Za-z0-9]+)`", line)
                if m:
                    secret_val = m.group(1)
    return id_val or None, secret_val or None


def main():
    domain = "quwanzhi.com"
    rr = "kr-ai"
    value = "43.139.27.93"
    key_id, key_secret = get_aliyun_creds()
    if not key_id or not key_secret:
        print("未配置阿里云凭证：请设置 ALIYUN_ACCESS_KEY_ID / ALIYUN_ACCESS_KEY_SECRET 或确保 00_账号与API索引.md 中有阿里云段")
        return 1
    try:
        from aliyunsdkcore.client import AcsClient
        from aliyunsdkalidns.request.v20150109.AddDomainRecordRequest import AddDomainRecordRequest
        from aliyunsdkalidns.request.v20150109.DescribeDomainRecordsRequest import DescribeDomainRecordsRequest
    except ImportError:
        os.system("pip3 install aliyun-python-sdk-core aliyun-python-sdk-alidns -q")
        from aliyunsdkcore.client import AcsClient
        from aliyunsdkalidns.request.v20150109.AddDomainRecordRequest import AddDomainRecordRequest
        from aliyunsdkalidns.request.v20150109.DescribeDomainRecordsRequest import DescribeDomainRecordsRequest

    client = AcsClient(key_id, key_secret, "cn-hangzhou")
    # 先查是否已有记录
    req_list = DescribeDomainRecordsRequest()
    req_list.set_accept_format("json")
    req_list.set_DomainName(domain)
    req_list.set_RRKeyWord(rr)
    try:
        resp = client.do_action_with_exception(req_list)
        import json
        data = json.loads(resp)
        records = data.get("DomainRecords", {}).get("Record", [])
        for r in records:
            if (r.get("RR") or "").strip().lower() == rr.lower() and r.get("Value") == value:
                print("解析已存在: %s.%s -> %s" % (rr, domain, value))
                return 0
    except Exception as e:
        pass
    req = AddDomainRecordRequest()
    req.set_accept_format("json")
    req.set_DomainName(domain)
    req.set_RR(rr)
    req.set_Type("A")
    req.set_Value(value)
    try:
        client.do_action_with_exception(req)
        print("已添加解析: %s.%s -> %s" % (rr, domain, value))
        return 0
    except Exception as e:
        print("添加解析失败:", e)
        return 1


if __name__ == "__main__":
    sys.exit(main())

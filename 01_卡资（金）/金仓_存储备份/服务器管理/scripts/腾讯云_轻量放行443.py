#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""若存客宝为轻量应用服务器，放行 443 防火墙"""
import os, re, sys

def _creds():
    root = os.path.dirname(os.path.abspath(__file__))
    for _ in range(6):
        if os.path.basename(root) == "卡若AI":
            break
        root = os.path.dirname(root)
    p = os.path.join(root, "运营中枢", "工作台", "00_账号与API索引.md")
    if not os.path.isfile(p):
        return None, None
    with open(p, "r") as f:
        t = f.read()
    sid = skey = None
    in_t = False
    for line in t.splitlines():
        if "### 腾讯云" in line: in_t = True
        elif in_t and line.strip().startswith("###"): break
        elif in_t:
            m = re.search(r"SecretId[^|]*\|\s*`([^`]+)`", line, re.I)
            if m and "AKID" in m.group(1): sid = m.group(1).strip()
            m = re.search(r"SecretKey[^|]*\|\s*`([^`]+)`", line, re.I)
            if m: skey = m.group(1).strip()
    return sid or os.environ.get("TENCENTCLOUD_SECRET_ID"), skey or os.environ.get("TENCENTCLOUD_SECRET_KEY")

def main():
    sid, skey = _creds()
    if not sid or not skey:
        print("❌ 无凭证"); return 1
    try:
        from tencentcloud.common import credential
        from tencentcloud.lighthouse.v20200324 import lighthouse_client, models
    except ImportError:
        print("pip install tencentcloud-sdk-python-lighthouse"); return 1
    cred = credential.Credential(sid, skey)
    c = lighthouse_client.LighthouseClient(cred, "ap-guangzhou")
    req = models.DescribeInstancesRequest()
    req.Limit = 100
    resp = c.DescribeInstances(req)
    for ins in (resp.InstanceSet or []):
        for ip in (getattr(ins, "PublicAddresses", None) or []):
            if ip == "42.194.245.239":
                iid = getattr(ins, "InstanceId", None)
                print("存客宝为轻量实例:", iid)
                req2 = models.CreateFirewallRulesRequest()
                req2.InstanceId = iid
                r = models.FirewallRule()
                r.Protocol = "TCP"
                r.Port = "443"
                r.CidrBlock = "0.0.0.0/0"
                r.Action = "ACCEPT"
                req2.FirewallRules = [r]
                c.CreateFirewallRules(req2)
                print("✅ 已添加 443 防火墙规则"); return 0
    print("42.194.245.239 非轻量实例（为 CVM）"); return 0

if __name__ == "__main__":
    sys.exit(main())

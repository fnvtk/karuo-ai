#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
通过腾讯云 API（SecretId/SecretKey/APPID）拉取账号下全量云数据库实例，做只读分析，不执行任何变更。
输出用于复盘：整账号维度数据库概况。
"""
import os
import re
import sys
import json

# 账号与API索引路径（运营中枢工作台）
BASE = os.path.dirname(os.path.abspath(__file__))
IDX = os.path.normpath(os.path.join(BASE, "..", "00_账号与API索引.md"))

def 读腾讯云凭证():
    sid = os.environ.get("TENCENTCLOUD_SECRET_ID")
    skey = os.environ.get("TENCENTCLOUD_SECRET_KEY")
    if sid and skey:
        return sid, skey, os.environ.get("TENCENTCLOUD_APPID", "")
    if not os.path.isfile(IDX):
        return None, None, None
    with open(IDX, "r", encoding="utf-8") as f:
        c = f.read()
    m = re.search(r"###\s*腾讯云\s*\n(.*?)(?=###|\Z)", c, re.DOTALL)
    if not m:
        return None, None, None
    b = m.group(1)
    appid = re.search(r"APPID\s*\|\s*`([^`]+)`", b)
    sid_m = re.search(r"SecretId[^|]*\|\s*`([^`]+)`", b)
    skey_m = re.search(r"SecretKey\s*\|\s*`([^`]+)`", b)
    sid = sid_m.group(1).strip() if sid_m else None
    skey = skey_m.group(1).strip() if skey_m else None
    appid_s = appid.group(1).strip() if appid else ""
    return sid, skey, appid_s

def main():
    sid, skey, appid = 读腾讯云凭证()
    if not sid or not skey:
        print("未配置腾讯云 SecretId/SecretKey（环境变量或 00_账号与API索引.md § 腾讯云）", file=sys.stderr)
        sys.exit(1)

    try:
        from tencentcloud.common import credential
        from tencentcloud.cdb.v20170320 import cdb_client, models
    except ImportError:
        print("请安装: pip install tencentcloud-sdk-python-cdb", file=sys.stderr)
        sys.exit(1)

    # 腾讯云 CDB 常见地域
    regions = ["ap-guangzhou", "ap-shanghai", "ap-beijing", "ap-chengdu"]
    all_instances = []
    for region in regions:
        try:
            cred = credential.Credential(sid, skey)
            client = cdb_client.CdbClient(cred, region)
            offset = 0
            limit = 100
            while True:
                req = models.DescribeDBInstancesRequest()
                req.Offset = offset
                req.Limit = limit
                resp = client.DescribeDBInstances(req)
                items = list(resp.Items) if hasattr(resp, "Items") else []
                for ins in items:
                    d = {
                        "Region": region,
                        "InstanceId": getattr(ins, "InstanceId", None),
                        "InstanceName": getattr(ins, "InstanceName", None),
                        "Status": getattr(ins, "Status", None),
                        "Vip": getattr(ins, "Vip", None),
                        "Vport": getattr(ins, "Vport", None),
                        "Memory": getattr(ins, "Memory", None),
                        "Volume": getattr(ins, "Volume", None),
                        "EngineVersion": getattr(ins, "EngineVersion", None),
                        "PayType": getattr(ins, "PayType", None),
                        "ProjectId": getattr(ins, "ProjectId", None),
                        "WanStatus": getattr(ins, "WanStatus", None),
                        "Zone": getattr(ins, "Zone", None),
                    }
                    all_instances.append(d)
                if len(items) < limit:
                    break
                offset += limit
        except Exception as e:
            if "AuthFailure" in str(e) or "ResourceUnavailable" in str(e):
                pass
            else:
                print(region, str(e), file=sys.stderr)

    out = {
        "APPID": appid,
        "TotalCount": len(all_instances),
        "Instances": all_instances,
    }
    print(json.dumps(out, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()

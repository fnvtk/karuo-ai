#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
腾讯云 CVM 查询宝塔服务器
=========================
用途：根据腾讯云主机安全告警中的服务器ID/内网IP，通过 CVM API 定位宝塔服务器，
      输出实例ID、公网IP、内网IP、名称，供后续 SSH 清理恶意文件使用。

告警信息（2026-01-28）：
- 服务器ID: Ihins-l63mj4u9（宝塔 Linux 面板-g9fD）
- 内网IP: 10.1.8.13
- 外网IP: 42.x.x.x
- 恶意文件: /home/www/moneroocean/xmrig, /tmp/syssls

使用前请配置环境变量：
  export TENCENTCLOUD_SECRET_ID="你的SecretId（即AKID）"
  export TENCENTCLOUD_SECRET_KEY="你的SecretKey"

运行：
  python3 腾讯云CVM查询宝塔服务器.py
  python3 腾讯云CVM查询宝塔服务器.py --private-ip 10.1.8.13
  python3 腾讯云CVM查询宝塔服务器.py --instance-id l63mj4u9
"""

import argparse
import os
import sys

# 使用同目录 .venv 中的 SDK（若存在）
def _ensure_sdk():
    try:
        from tencentcloud.cvm.v20170312 import cvm_client, models
        return cvm_client, models
    except ImportError:
        venv_py = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".venv", "bin", "python")
        if os.path.isfile(venv_py):
            print("请使用本目录 venv 运行：")
            print(f"  {venv_py} 腾讯云CVM查询宝塔服务器.py [选项]")
            sys.exit(1)
        print("请先安装依赖：pip install tencentcloud-sdk-python-cvm")
        sys.exit(1)

def main():
    ap = argparse.ArgumentParser(description="腾讯云 CVM 查询宝塔服务器（按内网IP/实例ID）")
    ap.add_argument("--region", default="ap-guangzhou", help="地域，告警为华南广州")
    ap.add_argument("--private-ip", default="10.1.8.13", help="内网IP，告警中的机器")
    ap.add_argument("--instance-id-part", default="", help="实例ID 部分匹配，如 l63mj4u9")
    ap.add_argument("--limit", type=int, default=100, help="单次拉取实例数量")
    args = ap.parse_args()

    secret_id = os.environ.get("TENCENTCLOUD_SECRET_ID")
    secret_key = os.environ.get("TENCENTCLOUD_SECRET_KEY")
    if not secret_id or not secret_key:
        print("请先设置环境变量：")
        print("  export TENCENTCLOUD_SECRET_ID='你的SecretId（AKID）'")
        print("  export TENCENTCLOUD_SECRET_KEY='你的SecretKey'")
        print("SecretKey 在腾讯云控制台 [访问管理]-[API密钥] 中查看，勿泄露。")
        sys.exit(1)

    CvmClient, Models = _ensure_sdk()
    from tencentcloud.common import credential
    cred = credential.Credential(secret_id, secret_key)
    client = CvmClient.CvmClient(cred, args.region)

    req = Models.DescribeInstancesRequest()
    req.Limit = args.limit
    req.Offset = 0
    # 不传 Filters，拉取实例后在本地按内网 IP / 实例ID 过滤

    matched = []
    offset = 0

    while True:
        req.Offset = offset
        try:
            resp = client.DescribeInstances(req)
        except Exception as e:
            print(f"API 调用失败: {e}")
            sys.exit(1)

        instances = getattr(resp, "InstanceSet", None) or []
        for ins in instances:
            pid = getattr(ins, "InstanceId", None) or ""
            name = getattr(ins, "InstanceName", None) or ""
            priv = list(getattr(ins, "PrivateIpAddresses", None) or [])
            pub = list(getattr(ins, "PublicIpAddresses", None) or [])

            priv_ok = args.private_ip and args.private_ip in priv
            id_ok = args.instance_id_part and args.instance_id_part in pid
            if priv_ok or id_ok:
                matched.append({
                    "InstanceId": pid,
                    "InstanceName": name,
                    "PrivateIps": priv,
                    "PublicIps": pub,
                })

        if len(instances) < args.limit:
            break
        offset += args.limit

    if not matched:
        print("未找到匹配的 CVM 实例。")
        print(f"  内网IP: {args.private_ip}")
        if args.instance_id_part:
            print(f"  实例ID 包含: {args.instance_id_part}")
        print("若该机器为轻量应用服务器，需使用 Lighthouse API 另行查询。")
        sys.exit(1)

    print("找到以下宝塔服务器（告警目标）：")
    print("-" * 60)
    for m in matched:
        pub_ip = (m["PublicIps"] or [""])[0] if m["PublicIps"] else ""
        priv_ip = (m["PrivateIps"] or [""])[0] if m["PrivateIps"] else ""
        print(f"  实例ID:   {m['InstanceId']}")
        print(f"  名称:     {m['InstanceName']}")
        print(f"  公网IP:   {pub_ip}")
        print(f"  内网IP:   {priv_ip}")
        print()
    print("清理恶意文件示例：")
    pub0 = (matched[0]["PublicIps"] or [""])[0] if matched[0]["PublicIps"] else "<公网IP>"
    print(f"  python3 清理恶意文件_宝塔.py --ip {pub0}")

if __name__ == "__main__":
    main()

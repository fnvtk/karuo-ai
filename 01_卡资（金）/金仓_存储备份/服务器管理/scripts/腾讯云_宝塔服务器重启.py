#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
腾讯云 API 重启两台宝塔服务器（存客宝、kr宝塔）
凭证：环境变量 TENCENTCLOUD_SECRET_ID/SECRET_KEY，或 00_账号与API索引.md
依赖：pip install tencentcloud-sdk-python-common tencentcloud-sdk-python-cvm
"""
import os
import re
import sys
import time

# 两台宝塔公网 IP
SERVERS = [
    {"name": "存客宝", "ip": "42.194.245.239"},
    {"name": "kr宝塔", "ip": "43.139.27.93"},
]
REGIONS = ["ap-guangzhou", "ap-beijing", "ap-shanghai", "ap-chengdu"]


def _find_karuo_ai_root():
    d = os.path.dirname(os.path.abspath(__file__))
    for _ in range(6):
        if os.path.basename(d) == "卡若AI" or (os.path.isdir(os.path.join(d, "运营中枢")) and os.path.isdir(os.path.join(d, "01_卡资（金）"))):
            return d
        d = os.path.dirname(d)
    return None


def _read_creds():
    root = _find_karuo_ai_root()
    if not root:
        return None, None
    path = os.path.join(root, "运营中枢", "工作台", "00_账号与API索引.md")
    if not os.path.isfile(path):
        return None, None
    with open(path, "r", encoding="utf-8") as f:
        text = f.read()
    secret_id = secret_key = None
    in_tencent = False
    for line in text.splitlines():
        if "### 腾讯云" in line:
            in_tencent = True
            continue
        if in_tencent and line.strip().startswith("###"):
            break
        if not in_tencent:
            continue
        m = re.search(r"\|\s*[^|]*(?:SecretId|密钥)[^|]*\|\s*`([^`]+)`", line, re.I)
        if m:
            val = m.group(1).strip()
            if val.startswith("AKID"):
                secret_id = val
        m = re.search(r"\|\s*SecretKey\s*\|\s*`([^`]+)`", line, re.I)
        if m:
            secret_key = m.group(1).strip()
    return secret_id or None, secret_key or None


def main():
    secret_id = os.environ.get("TENCENTCLOUD_SECRET_ID")
    secret_key = os.environ.get("TENCENTCLOUD_SECRET_KEY")
    if not secret_id or not secret_key:
        sid, skey = _read_creds()
        secret_id = secret_id or sid
        secret_key = secret_key or skey
    if not secret_id or not secret_key:
        print("❌ 未配置腾讯云 SecretId/SecretKey（环境变量或 00_账号与API索引.md）")
        return 1

    try:
        from tencentcloud.common import credential
        from tencentcloud.common.profile.client_profile import ClientProfile
        from tencentcloud.cvm.v20170312 import cvm_client, models as cvm_models
    except ImportError:
        print("请安装: pip install tencentcloud-sdk-python-common tencentcloud-sdk-python-cvm")
        return 1

    cred = credential.Credential(secret_id, secret_key)
    to_reboot = []  # [(instance_id, region, name, ip), ...]

    print("=" * 60)
    print("  腾讯云 API · 查找并重启宝塔服务器")
    print("=" * 60)

    for srv in SERVERS:
        name, ip = srv["name"], srv["ip"]
        found = False
        for region in REGIONS:
            try:
                client = cvm_client.CvmClient(cred, region)
                req = cvm_models.DescribeInstancesRequest()
                req.Limit = 100
                req.Offset = 0
                resp = client.DescribeInstances(req)
                instances = getattr(resp, "InstanceSet", None) or []
                for ins in instances:
                    pub = list(getattr(ins, "PublicIpAddresses", None) or [])
                    if ip in pub:
                        iid = getattr(ins, "InstanceId", None)
                        state = getattr(ins, "InstanceState", "")
                        print("\n[1/3] 找到 %s %s → 实例 %s 地域 %s 状态 %s" % (name, ip, iid, region, state))
                        to_reboot.append((iid, region, name, ip))
                        found = True
                        break
            except Exception as e:
                continue
            if found:
                break
        if not found:
            print("\n⚠️ %s %s 未在腾讯云 CVM 中找到（可能为轻量或其它地域）" % (name, ip))

    if not to_reboot:
        print("\n❌ 无可用实例，退出")
        return 1

    # 按地域分组执行重启
    print("\n" + "=" * 60)
    print("  [2/3] 执行重启")
    print("=" * 60)

    for iid, region, name, ip in to_reboot:
        try:
            client = cvm_client.CvmClient(cred, region)
            req = cvm_models.RebootInstancesRequest()
            req.InstanceIds = [iid]
            req.StopType = "SOFT"  # 软重启
            resp = client.RebootInstances(req)
            print("  ✅ %s (%s) 重启指令已下发" % (name, ip))
        except Exception as e:
            print("  ❌ %s (%s) 重启失败: %s" % (name, ip, e))

    print("\n" + "=" * 60)
    print("  [3/3] 重启进度说明")
    print("=" * 60)
    print("  · 腾讯云 CVM 软重启约 1～3 分钟完成")
    print("  · 重启会解除 fail2ban 等内存中的封禁（因进程重启）")
    print("  · 建议等待 2～3 分钟后用 SSH 或宝塔面板测试")
    print("  · 若仍需解封 IP，在宝塔终端执行下方「IP 解封」命令")
    print("=" * 60)
    return 0


if __name__ == "__main__":
    sys.exit(main())

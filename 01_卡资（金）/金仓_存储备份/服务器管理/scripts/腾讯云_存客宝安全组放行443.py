#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
腾讯云 API 为存客宝 42.194.245.239 安全组放行 443（修复 kr-kf、lytiao 无法访问）
凭证：00_账号与API索引.md 或环境变量
依赖：pip install tencentcloud-sdk-python-common tencentcloud-sdk-python-cvm tencentcloud-sdk-python-vpc
"""
import os
import re
import sys

CKB_IP = "42.194.245.239"
REGIONS = ["ap-guangzhou", "ap-beijing", "ap-shanghai"]

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
    sid = skey = None
    in_t = False
    for line in text.splitlines():
        if "### 腾讯云" in line:
            in_t = True
            continue
        if in_t and line.strip().startswith("###"):
            break
        if not in_t:
            continue
        m = re.search(r"\|\s*[^|]*(?:SecretId|密钥)[^|]*\|\s*`([^`]+)`", line, re.I)
        if m and m.group(1).strip().startswith("AKID"):
            sid = m.group(1).strip()
        m = re.search(r"\|\s*SecretKey\s*\|\s*`([^`]+)`", line, re.I)
        if m:
            skey = m.group(1).strip()
    return sid or os.environ.get("TENCENTCLOUD_SECRET_ID"), skey or os.environ.get("TENCENTCLOUD_SECRET_KEY")

def main():
    secret_id, secret_key = _read_creds()
    if not secret_id or not secret_key:
        print("❌ 未配置腾讯云 SecretId/SecretKey")
        return 1
    try:
        from tencentcloud.common import credential
        from tencentcloud.cvm.v20170312 import cvm_client, models as cvm_models
        from tencentcloud.vpc.v20170312 import vpc_client, models as vpc_models
    except ImportError:
        print("请安装: pip install tencentcloud-sdk-python-common tencentcloud-sdk-python-cvm tencentcloud-sdk-python-vpc")
        return 1

    cred = credential.Credential(secret_id, secret_key)
    sg_ids = []
    region = None
    for r in REGIONS:
        try:
            c = cvm_client.CvmClient(cred, r)
            req = cvm_models.DescribeInstancesRequest()
            req.Limit = 100
            resp = c.DescribeInstances(req)
            for ins in (getattr(resp, "InstanceSet", None) or []):
                if CKB_IP in list(getattr(ins, "PublicIpAddresses", None) or []):
                    sg_ids = list(getattr(ins, "SecurityGroupIds", None) or [])
                    region = r
                    break
        except Exception:
            continue
        if sg_ids:
            break

    if not sg_ids or not region:
        print("❌ 存客宝 %s 未在腾讯云 CVM 中找到" % CKB_IP)
        return 1

    print("=" * 56)
    print("  存客宝安全组放行 443")
    print("=" * 56)
    print("  实例 IP: %s  地域: %s" % (CKB_IP, region))
    print("  安全组: %s" % ", ".join(sg_ids))

    vc = vpc_client.VpcClient(cred, region)
    added = 0
    for sg_id in sg_ids:
        try:
            req = vpc_models.CreateSecurityGroupPoliciesRequest()
            req.SecurityGroupId = sg_id
            policy_set = vpc_models.SecurityGroupPolicySet()
            ing = vpc_models.SecurityGroupPolicy()
            ing.Protocol = "TCP"
            ing.Port = "443"
            ing.CidrBlock = "0.0.0.0/0"
            ing.Action = "ACCEPT"
            ing.PolicyDescription = "HTTPS"
            policy_set.Ingress = [ing]
            req.SecurityGroupPolicySet = policy_set
            vc.CreateSecurityGroupPolicies(req)
            print("  ✅ %s 已添加 443/TCP 入站" % sg_id)
            added += 1
        except Exception as e:
            if "RuleAlreadyExists" in str(e) or "已存在" in str(e):
                print("  ⏭ %s 443 规则已存在" % sg_id)
            else:
                print("  ❌ %s: %s" % (sg_id, e))

    print("")
    print("=" * 56)
    if added > 0:
        print("  请稍等 10 秒后刷新 kr-kf.quwanzhi.com、lytiao.com 测试")
    print("=" * 56)
    return 0

def check_rules():
    """查看当前安全组入站规则"""
    secret_id, secret_key = _read_creds()
    if not secret_id or not secret_key:
        print("❌ 未配置凭证"); return 1
    from tencentcloud.common import credential
    from tencentcloud.cvm.v20170312 import cvm_client, models as cvm_models
    from tencentcloud.vpc.v20170312 import vpc_client, models as vpc_models
    cred = credential.Credential(secret_id, secret_key)
    sg_ids, region = [], None
    for r in REGIONS:
        try:
            c = cvm_client.CvmClient(cred, r)
            req = cvm_models.DescribeInstancesRequest()
            req.Limit = 100
            resp = c.DescribeInstances(req)
            for ins in (getattr(resp, "InstanceSet", None) or []):
                if CKB_IP in list(getattr(ins, "PublicIpAddresses", None) or []):
                    sg_ids = list(getattr(ins, "SecurityGroupIds", None) or [])
                    region = r; break
        except Exception:
            continue
        if sg_ids: break
    if not sg_ids: print("❌ 未找到实例"); return 1
    vc = vpc_client.VpcClient(cred, region)
    for sg_id in sg_ids:
        try:
            req = vpc_models.DescribeSecurityGroupPoliciesRequest()
            req.SecurityGroupId = sg_id
            resp = vc.DescribeSecurityGroupPolicies(req)
            s = resp.SecurityGroupPolicySet
            ing = (s.Ingress or []) if hasattr(s, "Ingress") else []
            print("  %s 入站: %s" % (sg_id, [(getattr(x,"Port",""), getattr(x,"Protocol","")) for x in ing[:8]]))
        except Exception as e:
            print("  %s: %s" % (sg_id, e))
    return 0

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--check":
        sys.exit(check_rules())
    sys.exit(main())

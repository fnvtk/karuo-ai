#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
腾讯云 API 为 kr宝塔 43.139.27.93 安全组放行 9988（宝塔面板，修复 ERR_CONNECTION_CLOSED）
凭证：00_账号与API索引.md 或环境变量
"""
import os, re, sys
KR_IP = "43.139.27.93"
REGIONS = ["ap-guangzhou", "ap-beijing", "ap-shanghai"]

def _read_creds():
    d = os.path.dirname(os.path.abspath(__file__))
    for _ in range(6):
        if os.path.isdir(os.path.join(d, "运营中枢")) and os.path.isdir(os.path.join(d, "01_卡资（金）")):
            p = os.path.join(d, "运营中枢", "工作台", "00_账号与API索引.md")
            if os.path.isfile(p):
                with open(p) as f: t = f.read()
                sid = skey = None
                in_t = False
                for line in t.splitlines():
                    if "### 腾讯云" in line: in_t = True; continue
                    if in_t and line.strip().startswith("###"): break
                    if not in_t: continue
                    m = re.search(r"SecretId[^|]*\|\s*`([^`]+)`", line, re.I)
                    if m and "AKID" in m.group(1): sid = m.group(1).strip()
                    m = re.search(r"SecretKey\s*\|\s*`([^`]+)`", line, re.I)
                    if m: skey = m.group(1).strip()
                return sid or os.environ.get("TENCENTCLOUD_SECRET_ID"), skey or os.environ.get("TENCENTCLOUD_SECRET_KEY")
        d = os.path.dirname(d)
    return None, None

def main():
    sid, skey = _read_creds()
    if not sid or not skey:
        print("❌ 未配置腾讯云凭证"); return 1
    try:
        from tencentcloud.common import credential
        from tencentcloud.cvm.v20170312 import cvm_client, models as cvm_models
        from tencentcloud.vpc.v20170312 import vpc_client, models as vpc_models
    except ImportError:
        print("pip install tencentcloud-sdk-python-cvm tencentcloud-sdk-python-vpc"); return 1
    cred = credential.Credential(sid, skey)
    sg_ids, region = [], None
    KR_INSTANCE_ID = "ins-aw0tnqjo"
    for r in REGIONS:
        try:
            c = cvm_client.CvmClient(cred, r)
            req = cvm_models.DescribeInstancesRequest()
            req.InstanceIds = [KR_INSTANCE_ID]
            resp = c.DescribeInstances(req)
            for ins in (getattr(resp, "InstanceSet", None) or []):
                sg_ids = list(getattr(ins, "SecurityGroupIds", None) or [])
                region = r
                break
        except Exception:
            req = cvm_models.DescribeInstancesRequest()
            req.Limit = 100
            resp = c.DescribeInstances(req)
            for ins in (getattr(resp, "InstanceSet", None) or []):
                if KR_IP in list(getattr(ins, "PublicIpAddresses", None) or []):
                    sg_ids = list(getattr(ins, "SecurityGroupIds", None) or [])
                    region = r; break
        except Exception:
            continue
        if sg_ids: break
    if not sg_ids:
        print("❌ kr宝塔 %s 未在 CVM 中找到" % KR_IP); return 1
    print("kr宝塔 %s 安全组放行 9988" % KR_IP)
    vc = vpc_client.VpcClient(cred, region)
    for sg_id in sg_ids:
        try:
            req = vpc_models.CreateSecurityGroupPoliciesRequest()
            req.SecurityGroupId = sg_id
            ps = vpc_models.SecurityGroupPolicySet()
            ing = vpc_models.SecurityGroupPolicy()
            ing.Protocol, ing.Port, ing.CidrBlock = "TCP", "9988", "0.0.0.0/0"
            ing.Action, ing.PolicyDescription = "ACCEPT", "宝塔面板"
            ps.Ingress = [ing]
            req.SecurityGroupPolicySet = ps
            vc.CreateSecurityGroupPolicies(req)
            print("  ✅ %s 已添加 9988/TCP" % sg_id)
        except Exception as e:
            if "RuleAlreadyExists" in str(e) or "已存在" in str(e) or "duplicate" in str(e).lower():
                print("  ⏭ %s 9988 规则已存在" % sg_id)
            else:
                print("  ❌ %s: %s" % (sg_id, e))
    return 0

if __name__ == "__main__":
    sys.exit(main())

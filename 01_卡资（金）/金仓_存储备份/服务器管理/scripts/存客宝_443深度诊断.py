#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
存客宝 443 深度诊断：实例网络、安全组、弹性网卡、服务器内防火墙
定位 42.194.245.239 的 443 不可达根因
"""
import base64
import json
import os
import re
import sys
import time

CKB_IP = "42.194.245.239"
CKB_INSTANCE_ID = "ins-ciyv2mxa"
REGION = "ap-guangzhou"
REGIONS = ["ap-guangzhou", "ap-beijing", "ap-shanghai"]

# 增强 TAT 诊断：firewalld、fail2ban、完整 iptables、规则顺序
TAT_CMD = """
echo "=== 1. iptables INPUT 完整链（含行号） ==="
iptables -L INPUT -n -v --line-numbers 2>/dev/null | head -60
echo ""
echo "=== 2. iptables 是否存在 443 DROP ==="
iptables -L INPUT -n -v 2>/dev/null | grep -E '443|dpt:443' || echo "(无 443 相关)"
echo ""
echo "=== 3. firewalld 状态 ==="
systemctl is-active firewalld 2>/dev/null || echo "未安装/未运行"
firewall-cmd --list-all 2>/dev/null | head -20 || true
echo ""
echo "=== 4. fail2ban 是否封 443 ==="
fail2ban-client status 2>/dev/null || echo "fail2ban 未运行"
fail2ban-client status nginx-http-auth 2>/dev/null || true
fail2ban-client status sshd 2>/dev/null || true
echo ""
echo "=== 5. 80/443 监听 ==="
ss -tlnp | grep -E ':80 |:443 '
echo ""
echo "=== 6. 宝塔 firewall.json ==="
cat /www/server/panel/data/firewall.json 2>/dev/null
echo ""
echo "=== 7. 本机 curl 127.0.0.1:443 ==="
curl -sI -o /dev/null -w 'HTTP:%{http_code}' --connect-timeout 3 https://127.0.0.1 -k 2>/dev/null || echo "curl_fail"
echo ""
echo "DONE"
"""

def _find_root():
    d = os.path.dirname(os.path.abspath(__file__))
    for _ in range(6):
        if os.path.basename(d) == "卡若AI" or (os.path.isdir(os.path.join(d, "运营中枢")) and os.path.isdir(os.path.join(d, "01_卡资（金）"))):
            return d
        d = os.path.dirname(d)
    return None

def _read_creds():
    root = _find_root()
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
        from tencentcloud.tat.v20201028 import tat_client, models as tat_models
    except ImportError as e:
        print("请安装: pip install tencentcloud-sdk-python-common tencentcloud-sdk-python-cvm tencentcloud-sdk-python-vpc tencentcloud-sdk-python-tat")
        return 1

    cred = credential.Credential(secret_id, secret_key)
    result = {"instance": None, "enis": [], "security_groups": {}, "tat_output": None}

    print("=" * 60)
    print("  存客宝 42.194.245.239 443 深度诊断")
    print("=" * 60)

    # ---------- 1. CVM 实例 ----------
    print("\n【1. CVM 实例】")
    instance_id = None
    region = None
    for r in REGIONS:
        try:
            c = cvm_client.CvmClient(cred, r)
            req = cvm_models.DescribeInstancesRequest()
            req.Limit = 100
            resp = c.DescribeInstances(req)
            for ins in (getattr(resp, "InstanceSet", None) or []):
                if CKB_IP in list(getattr(ins, "PublicIpAddresses", None) or []):
                    instance_id = getattr(ins, "InstanceId", None)
                    region = r
                    result["instance"] = {
                        "id": instance_id,
                        "region": region,
                        "name": getattr(ins, "InstanceName", ""),
                        "private_ips": list(getattr(ins, "PrivateIpAddresses", None) or []),
                        "sg_ids": list(getattr(ins, "SecurityGroupIds", None) or []),
                    }
                    break
        except Exception as e:
            print("  %s: %s" % (r, e))
        if instance_id:
            break

    if not instance_id:
        print("  未找到实例 %s" % CKB_IP)
    else:
        print("  实例ID: %s  地域: %s" % (instance_id, region))
        print("  名称: %s" % (result["instance"].get("name") or "-"))
        print("  内网IP: %s" % ", ".join(result["instance"].get("private_ips") or []))
        print("  实例绑定安全组: %s" % ", ".join(result["instance"].get("sg_ids") or []))

    # ---------- 2. 弹性网卡（含公网IP、isWanIpBlocked）----------
    print("\n【2. 弹性网卡】")
    if region:
        try:
            vc = vpc_client.VpcClient(cred, region)
            req = vpc_models.DescribeNetworkInterfacesRequest()
            f = vpc_models.Filter()
            f.Name = "attachment.instance-id"
            f.Values = [instance_id or CKB_INSTANCE_ID]
            req.Filters = [f]
            resp = vc.DescribeNetworkInterfaces(req)
            enis = getattr(resp, "NetworkInterfaceSet", None) or []
            for eni in enis:
                ni = {
                    "eni_id": getattr(eni, "NetworkInterfaceId", ""),
                    "primary": getattr(eni, "Primary", False),
                    "private_ips": [],
                    "wan_ip": None,
                    "is_wan_blocked": None,
                    "sg_ids": [],
                }
                addrs = getattr(eni, "PrivateIpAddressSet", None) or []
                for a in addrs:
                    pip = getattr(a, "PrivateIpAddress", "")
                    ni["private_ips"].append(pip)
                    wan = getattr(a, "PublicIpAddress", None) or getattr(a, "WanIp", None)
                    if wan == CKB_IP or (wan and CKB_IP in str(wan)):
                        ni["wan_ip"] = wan
                    blocked = getattr(a, "IsWanIpBlocked", None)
                    if blocked is not None:
                        ni["is_wan_blocked"] = blocked
                for g in (getattr(eni, "GroupSet", None) or []):
                    sg_id = getattr(g, "SecurityGroupId", None) or getattr(g, "sgId", None)
                    if sg_id:
                        ni["sg_ids"].append(sg_id)
                result["enis"].append(ni)
                print("  ENI %s (主:%s) | 内网:%s | 公网:%s | 封堵:%s | 安全组:%s" % (
                    ni["eni_id"], ni["primary"], ni["private_ips"],
                    ni["wan_ip"] or "-", ni["is_wan_blocked"], ni["sg_ids"]))
            if not enis:
                print("  (无弹性网卡或 API 无此字段，可能为普通公网IP)")
        except Exception as e:
            print("  DescribeNetworkInterfaces 异常: %s" % e)

    # ---------- 3. 安全组规则（含 443、规则顺序）----------
    print("\n【3. 安全组 443 规则核查】")
    sg_ids = result["instance"].get("sg_ids") if result["instance"] else []
    if not sg_ids and result["enis"]:
        for eni in result["enis"]:
            sg_ids.extend(eni.get("sg_ids", []))
    sg_ids = list(dict.fromkeys(sg_ids))

    if sg_ids and region:
        vc = vpc_client.VpcClient(cred, region)
        for sg_id in sg_ids:
            try:
                req = vpc_models.DescribeSecurityGroupPoliciesRequest()
                req.SecurityGroupId = sg_id
                resp = vc.DescribeSecurityGroupPolicies(req)
                s = resp.SecurityGroupPolicySet
                ing = (s.Ingress or []) if hasattr(s, "Ingress") else []
                rules = []
                for i, x in enumerate(ing):
                    port = getattr(x, "Port", "") or ""
                    proto = getattr(x, "Protocol", "") or ""
                    action = getattr(x, "Action", "") or ""
                    rules.append((i, port, proto, action))
                acc443 = [r for r in rules if "443" in str(r[1]) and str(r[3]).upper() == "ACCEPT"]
                drop443 = [r for r in rules if "443" in str(r[1]) and str(r[3]).upper() == "DROP"]
                result["security_groups"][sg_id] = {"acc443": len(acc443), "drop443": len(drop443), "rules": rules[:15]}
                print("  %s: 443 ACCEPT %d 条 | 443 DROP %d 条 | 总规则 %d" % (
                    sg_id, len(acc443), len(drop443), len(rules)))
                if drop443:
                    print("    ⚠️ 存在 443 DROP！顺序: %s" % drop443)
                if acc443 and not drop443:
                    print("    ✅ 443 仅 ACCEPT")
            except Exception as e:
                print("  %s: %s" % (sg_id, e))

    # ---------- 4. TAT 服务器内诊断 ----------
    print("\n【4. TAT 服务器内诊断】")
    try:
        tat = tat_client.TatClient(cred, REGION)
        req = tat_models.RunCommandRequest()
        req.Content = base64.b64encode(TAT_CMD.encode()).decode()
        req.InstanceIds = [CKB_INSTANCE_ID]
        req.CommandType = "SHELL"
        req.Timeout = 60
        req.CommandName = "CKB_443_DeepDiagnose"
        resp = tat.RunCommand(req)
        inv_id = resp.InvocationId
        print("  已下发，等待 25s...")
        time.sleep(25)
        req2 = tat_models.DescribeInvocationTasksRequest()
        f = tat_models.Filter()
        f.Name = "invocation-id"
        f.Values = [inv_id]
        req2.Filters = [f]
        resp2 = tat.DescribeInvocationTasks(req2)
        for t in (resp2.InvocationTaskSet or []):
            tr = getattr(t, "TaskResult", None)
            if tr:
                try:
                    j = json.loads(tr) if isinstance(tr, str) else tr
                    out = j.get("Output", "")
                    if out:
                        try:
                            import base64 as b64
                            out = b64.b64decode(out).decode("utf-8", errors="replace")
                        except Exception:
                            pass
                        result["tat_output"] = out
                        print("\n--- 服务器输出 ---\n%s\n---" % out[:4500])
                except Exception:
                    pass
    except Exception as e:
        print("  TAT 异常: %s" % e)

    print("\n" + "=" * 60)
    print("【诊断完成】")
    print("=" * 60)
    return 0

if __name__ == "__main__":
    sys.exit(main())

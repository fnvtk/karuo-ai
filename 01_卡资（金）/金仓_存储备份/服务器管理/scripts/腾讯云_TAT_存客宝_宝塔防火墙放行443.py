#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TAT 在存客宝上通过 宝塔 API（本机 127.0.0.1 无需白名单）添加防火墙 443 端口
"""
import base64
import os
import re
import sys
import time

CKB_INSTANCE_ID = "ins-ciyv2mxa"
REGION = "ap-guangzhou"

# 在服务器上执行：宝塔防火墙放行 443 + 重载防火墙
CMD = r'''
set -e
echo "=== 1. 宝塔 firewall.json 添加 443 ==="
python3 << 'PY'
import json, os
p = "/www/server/panel/data/firewall.json"
if os.path.isfile(p):
    with open(p) as f:
        d = json.load(f)
    ps = d.get("ports", "") or ""
    lst = [x.strip() for x in ps.split(",") if x.strip()]
    if "443" not in lst:
        lst.append("443")
        d["ports"] = ",".join(lst)
        with open(p, "w") as f:
            json.dump(d, f, ensure_ascii=False, indent=2)
        print("  firewall.json 443 已添加")
    else:
        print("  firewall.json 已有 443")
PY
echo ""
echo "=== 2. 调用宝塔防火墙重载 ==="
/www/server/panel/pyenv/bin/python -c "
import sys
sys.path.insert(0, '/www/server/panel/class')
try:
    from firewallModel import firewallModel
    f = firewallModel()
    f.add_accept_port('443', '443', 'tcp')
    print('  add_accept_port 443 OK')
except Exception as e:
    print('  add_accept_port:', e)
" 2>/dev/null || true
echo ""
echo "=== 3. iptables 确保 443 ACCEPT ==="
iptables -C INPUT -p tcp --dport 443 -j ACCEPT 2>/dev/null || iptables -I INPUT -p tcp --dport 443 -j ACCEPT
echo "  iptables 443 OK"
echo ""
echo "DONE"
'''

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
    p = os.path.join(root, "运营中枢", "工作台", "00_账号与API索引.md")
    if not os.path.isfile(p):
        return None, None
    with open(p, "r", encoding="utf-8") as f:
        t = f.read()
    sid = skey = None
    in_t = False
    for line in t.splitlines():
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
    sid, skey = _read_creds()
    if not sid or not skey:
        print("❌ 未配置凭证")
        return 1
    try:
        from tencentcloud.common import credential
        from tencentcloud.tat.v20201028 import tat_client, models
    except ImportError:
        print("pip install tencentcloud-sdk-python-tat")
        return 1
    cred = credential.Credential(sid, skey)
    client = tat_client.TatClient(cred, REGION)
    req = models.RunCommandRequest()
    req.Content = base64.b64encode(CMD.encode()).decode()
    req.InstanceIds = [CKB_INSTANCE_ID]
    req.CommandType = "SHELL"
    req.Timeout = 45
    req.CommandName = "CKB_BT_Firewall443"
    resp = client.RunCommand(req)
    print("✅ TAT 已下发 宝塔防火墙 443")
    time.sleep(20)
    try:
        import json as j
        import base64 as b64
        req2 = models.DescribeInvocationTasksRequest()
        f = models.Filter()
        f.Name = "invocation-id"
        f.Values = [resp.InvocationId]
        req2.Filters = [f]
        r2 = client.DescribeInvocationTasks(req2)
        for t in (r2.InvocationTaskSet or []):
            tr = getattr(t, "TaskResult", None)
            if tr:
                try:
                    jj = j.loads(tr) if isinstance(tr, str) else tr
                    out = jj.get("Output", "")
                    if out:
                        try:
                            out = b64.b64decode(out).decode("utf-8", errors="replace")
                        except Exception:
                            pass
                        print(out[:2500])
                except Exception:
                    print(str(tr)[:600])
    except Exception as e:
        print("查询:", e)
    return 0

if __name__ == "__main__":
    sys.exit(main())

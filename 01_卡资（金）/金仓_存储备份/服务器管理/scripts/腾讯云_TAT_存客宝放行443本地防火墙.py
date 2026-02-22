#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TAT 在存客宝上放行 443（iptables + firewalld + 宝塔防火墙）
"""
import base64
import os
import re
import sys
import time

CKB_INSTANCE_ID = "ins-ciyv2mxa"
REGION = "ap-guangzhou"

CMD = r"""
echo "=== 放行 443 至本地防火墙 ==="
# iptables（Ubuntu/Debian 常用）
iptables -I INPUT -p tcp --dport 443 -j ACCEPT 2>/dev/null && echo "  iptables 443 已添加" || true
iptables-save >/dev/null 2>&1 || true
# firewalld（CentOS 常用）
firewall-cmd --permanent --add-port=443/tcp 2>/dev/null && echo "  firewalld 443 已添加" || true
firewall-cmd --reload 2>/dev/null || true
# 宝塔防火墙（若启用）
if [ -f /www/server/panel/pyenv/bin/python ]; then
  /www/server/panel/pyenv/bin/python -c "
import json,os
p='/www/server/panel/data/firewall.json'
if os.path.isfile(p):
  d=json.load(open(p))
  ports=d.get('ports','').split(',') if isinstance(d.get('ports'),str) else []
  if '443' not in [x.strip() for x in ports if x.strip()]:
    ports.append('443')
    d['ports']=','.join(filter(None,ports))
    open(p,'w').write(json.dumps(d,ensure_ascii=False,indent=2))
    print('  宝塔防火墙 443 已添加')
  else:
    print('  宝塔防火墙已有 443')
" 2>/dev/null || true
fi
echo "=== 完成 ==="
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
        print("❌ 未配置腾讯云 SecretId/SecretKey")
        return 1
    try:
        from tencentcloud.common import credential
        from tencentcloud.tat.v20201028 import tat_client, models
    except ImportError:
        print("pip install tencentcloud-sdk-python-common tencentcloud-sdk-python-tat")
        return 1
    cred = credential.Credential(sid, skey)
    client = tat_client.TatClient(cred, REGION)
    req = models.RunCommandRequest()
    req.Content = base64.b64encode(CMD.encode()).decode()
    req.InstanceIds = [CKB_INSTANCE_ID]
    req.CommandType = "SHELL"
    req.Timeout = 30
    req.CommandName = "CKB_Allow443"
    resp = client.RunCommand(req)
    print("✅ TAT 已下发 443 放行，InvocationId:", resp.InvocationId)
    print("  等待 15s 获取输出...")
    time.sleep(15)
    try:
        import json
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
                    j = json.loads(tr) if isinstance(tr, str) else tr
                    out = j.get("Output", "")
                    if out:
                        try:
                            out = b64.b64decode(out).decode("utf-8", errors="replace")
                        except Exception:
                            pass
                        print("  ", out[:2000].replace("\n", "\n   "))
                except Exception:
                    print("  ", str(tr)[:500])
    except Exception as e:
        print("  查询输出:", e)
    return 0

if __name__ == "__main__":
    sys.exit(main())

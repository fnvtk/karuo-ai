#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
腾讯云 TAT 在存客宝上诊断并修复 Nginx 不监听 443 的问题
根因：Nginx 未监听 443 → Connection refused
"""
import base64
import os
import re
import sys
import time
import json

CKB_INSTANCE_ID = "ins-ciyv2mxa"
REGION = "ap-guangzhou"

CMD = """
echo "=== 1. 含 listen 443 的配置 ==="
grep -l 'listen.*443' /www/server/panel/vhost/nginx/*.conf 2>/dev/null || echo "(无)"
echo ""
echo "=== 2. 各站点 SSL 证书路径 ==="
for f in /www/server/panel/vhost/nginx/*.conf; do
  if grep -q 'listen.*443' "$f" 2>/dev/null; then
    echo "--- $f ---"
    grep -E 'ssl_certificate|listen.*443' "$f" | head -6
  fi
done
echo ""
echo "=== 3. 证书文件是否存在 ==="
for cert in /www/server/panel/vhost/cert/*/fullchain.pem; do
  [ -f "$cert" ] && echo "$cert: $(openssl x509 -in "$cert" -noout -dates -subject 2>/dev/null | tr '\\n' ' ')" || true
done
echo ""
echo "=== 4. Nginx 配置测试 ==="
nginx -t 2>&1
echo ""
echo "=== 5. 重载 Nginx ==="
nginx -s reload 2>&1
echo ""
echo "=== 6. 重载后 443 监听 ==="
ss -tlnp | grep -E ':80 |:443 ' || true
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
    path = os.path.join(root or "", "运营中枢", "工作台", "00_账号与API索引.md")
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
        from tencentcloud.tat.v20201028 import tat_client, models
    except ImportError:
        print("pip install tencentcloud-sdk-python-common tencentcloud-sdk-python-tat")
        return 1

    cred = credential.Credential(secret_id, secret_key)
    client = tat_client.TatClient(cred, REGION)
    req = models.RunCommandRequest()
    req.Content = base64.b64encode(CMD.encode()).decode()
    req.InstanceIds = [CKB_INSTANCE_ID]
    req.CommandType = "SHELL"
    req.Timeout = 60
    req.CommandName = "CKB_Nginx443_Fix"
    resp = client.RunCommand(req)
    inv_id = resp.InvocationId
    print("⏳ TAT 已下发 Nginx 443 诊断与修复，等待 25s...")
    time.sleep(25)

    try:
        req2 = models.DescribeInvocationTasksRequest()
        f = models.Filter()
        f.Name = "invocation-id"
        f.Values = [inv_id]
        req2.Filters = [f]
        resp2 = client.DescribeInvocationTasks(req2)
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
                        print("\n--- 服务器输出 ---\n%s\n---" % out[:5000])
                except Exception:
                    print("  TaskResult:", str(tr)[:800])
    except Exception as e:
        print("  查询异常:", e)
    print("\n若 443 仍未监听，需在宝塔 → 网站 → kr-kf/lytiao → SSL 中申请或配置证书后重载")
    return 0

if __name__ == "__main__":
    sys.exit(main())

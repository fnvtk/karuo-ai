#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TAT 在存客宝上：诊断 Nginx 443 不监听原因，并尝试通过宝塔 API（127.0.0.1）批量申请 SSL
服务器内调用 127.0.0.1 无需白名单。
"""
import base64
import json
import os
import re
import sys
import time

CKB_INSTANCE_ID = "ins-ciyv2mxa"
REGION = "ap-guangzhou"
API_KEY = "TNKjqDv5N1QLOU20gcmGVgr82Z4mXzRi"

CMD = r'''
echo "=== 1. nginx -t 完整输出 ==="
nginx -t 2>&1 || true
echo ""
echo "=== 2. 检查各 listen 443 站点的 ssl_certificate 文件 ==="
for f in /www/server/panel/vhost/nginx/*.conf; do
  [ -f "$f" ] || continue
  if grep -q "listen.*443" "$f" 2>/dev/null; then
    cert=$(grep "ssl_certificate " "$f" 2>/dev/null | grep -v "#" | head -1 | awk '{print $2}' | tr -d ';')
    key=$(grep "ssl_certificate_key " "$f" 2>/dev/null | grep -v "#" | head -1 | awk '{print $2}' | tr -d ';')
    echo "--- $(basename $f) ---"
    [ -n "$cert" ] && echo "  cert: $cert" && ([ -f "$cert" ] && echo "    存在" || echo "    不存在")
    [ -n "$key" ] && echo "  key: $key" && ([ -f "$key" ] && echo "    存在" || echo "    不存在")
  fi
done
echo ""
echo "=== 3. 宝塔 Python 批量申请 Let'\''s Encrypt（未配置站点）==="
/www/server/panel/pyenv/bin/python3 << 'PYEND'
import hashlib, json, time, urllib.request, urllib.parse, ssl
ssl._create_default_https_context = ssl._create_unverified_context
API_KEY = "TNKjqDv5N1QLOU20gcmGVgr82Z4mXzRi"
BASE = "https://127.0.0.1:9988"
def sign():
    t = int(time.time())
    s = str(t) + hashlib.md5(API_KEY.encode()).hexdigest()
    return {"request_time": t, "request_token": hashlib.md5(s.encode()).hexdigest()}
def post(path, data):
    payload = sign()
    payload.update(data)
    req = urllib.request.Request(BASE + path, data=urllib.parse.urlencode(payload).encode())
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return json.loads(r.read().decode())
    except Exception as e:
        return {"status": False, "msg": str(e)}
r = post("/data?action=getData", {"table": "sites", "limit": 100, "p": 1})
sites = r.get("data") or []
if isinstance(sites, dict): sites = sites.get("data", []) or []
if not isinstance(sites, list): sites = []
for s in sites:
    if s.get("ssl", 0) or not s.get("name"): continue
    name = str(s.get("name", "")).split()[0]
    if "localhost" in name: continue
    sid = s.get("id")
    print("  申请 %s (id=%s) ..." % (name, sid))
    r2 = post("/acme?action=ApplyCert", {"id": sid, "domains": json.dumps([name]), "auth_type": "http"})
    print("    ", r2.get("msg", r2) if not r2.get("status") else "OK")
    time.sleep(4)
PYEND
echo ""
echo "=== 4. 重载 Nginx ==="
nginx -s reload 2>&1 || /etc/init.d/nginx reload 2>&1
echo ""
echo "=== 5. 443 监听 ==="
ss -tlnp | grep -E ':80 |:443 ' || true
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
    p = os.path.join(root or "", "运营中枢", "工作台", "00_账号与API索引.md")
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
        print("❌ 未配置腾讯云凭证")
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
    req.Timeout = 120
    req.CommandName = "CKB_SSL_DiagFix"
    resp = client.RunCommand(req)
    inv_id = resp.InvocationId
    print("⏳ TAT 已下发 SSL 诊断与修复（约 60s）...")
    time.sleep(60)

    try:
        req2 = models.DescribeInvocationTasksRequest()
        f = models.Filter()
        f.Name = "invocation-id"
        f.Values = [inv_id]
        req2.Filters = [f]
        r2 = client.DescribeInvocationTasks(req2)
        for t in (r2.InvocationTaskSet or []):
            tr = getattr(t, "TaskResult", None)
            if tr:
                try:
                    jj = json.loads(tr) if isinstance(tr, str) else tr
                    out = jj.get("Output", "")
                    if out:
                        try:
                            out = base64.b64decode(out).decode("utf-8", errors="replace")
                        except Exception:
                            pass
                        print("\n--- 服务器输出 ---\n%s\n---" % out[:6000])
                except Exception:
                    print(str(tr)[:800])
    except Exception as e:
        print("查询:", e)
    return 0


if __name__ == "__main__":
    sys.exit(main())

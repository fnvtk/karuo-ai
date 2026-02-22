#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TAT 在存客宝上：确认实际运行的 Nginx 及其配置，强制重载并开放 443
根因推测：宝塔 Nginx 与系统 Nginx 可能不同，需用宝塔的 nginx 重载
"""
import base64
import json
import os
import re
import sys
import time

CKB_INSTANCE_ID = "ins-ciyv2mxa"
REGION = "ap-guangzhou"

CMD = r'''
echo "=== 1. Nginx 进程 ==="
ps aux | grep -E "nginx|PID" | grep -v grep
echo ""
echo "=== 2. 宝塔 Nginx 测试 ==="
BT_NGINX="/www/server/nginx/sbin/nginx"
BT_CONF="/www/server/nginx/conf/nginx.conf"
[ -x "$BT_NGINX" ] && $BT_NGINX -t -c $BT_CONF 2>&1
echo ""
echo "=== 3. 用宝塔 Nginx 重启（覆盖系统 nginx）==="
# 停掉可能的系统 nginx
/etc/init.d/nginx stop 2>/dev/null || killall nginx 2>/dev/null || true
sleep 2
# 启动宝塔 nginx
[ -x "$BT_NGINX" ] && $BT_NGINX -c $BT_CONF 2>&1 && echo "宝塔 Nginx 已启动" || /etc/init.d/nginx start 2>&1
sleep 2
echo ""
echo "=== 4. 443 监听 ==="
ss -tlnp | grep -E ':80 |:443 '
echo ""
echo "=== 5. curl 127.0.0.1:443 ==="
curl -sk -o /dev/null -w "HTTP:%{http_code}" --connect-timeout 3 https://127.0.0.1 -k 2>/dev/null || echo "fail"
echo ""
echo "DONE"
'''


def _read_creds():
    d = os.path.dirname(os.path.abspath(__file__))
    for _ in range(6):
        root = d
        if os.path.basename(d) == "卡若AI":
            break
        d = os.path.dirname(d)
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
        m = re.search(r"SecretId[^|]*\|\s*`([^`]+)`", line, re.I)
        if m and m.group(1).strip().startswith("AKID"):
            sid = m.group(1).strip()
        m = re.search(r"SecretKey[^|]*\|\s*`([^`]+)`", line, re.I)
        if m:
            skey = m.group(1).strip()
    return sid or os.environ.get("TENCENTCLOUD_SECRET_ID"), skey or os.environ.get("TENCENTCLOUD_SECRET_KEY")


def main():
    sid, skey = _read_creds()
    if not sid or not skey:
        print("❌ 未配置腾讯云凭证")
        return 1
    from tencentcloud.common import credential
    from tencentcloud.tat.v20201028 import tat_client, models
    cred = credential.Credential(sid, skey)
    client = tat_client.TatClient(cred, REGION)
    req = models.RunCommandRequest()
    req.Content = base64.b64encode(CMD.encode()).decode()
    req.InstanceIds = [CKB_INSTANCE_ID]
    req.CommandType = "SHELL"
    req.Timeout = 60
    req.CommandName = "CKB_Nginx443_ForceFix"
    resp = client.RunCommand(req)
    print("⏳ TAT 已下发 Nginx 443 强制修复，等待 25s...")
    time.sleep(25)
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
                jj = json.loads(tr) if isinstance(tr, str) else tr
                out = jj.get("Output", "")
                if out:
                    out = base64.b64decode(out).decode("utf-8", errors="replace")
                    print("\n--- 服务器输出 ---\n%s\n---" % out[:4000])
            except Exception:
                print(str(tr)[:600])
    return 0


if __name__ == "__main__":
    sys.exit(main())

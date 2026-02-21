#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
腾讯云 TAT：在 kr宝塔 上修复 lkdie 502 + lytiao ERR_CONNECTION_CLOSED（免 SSH）
凭证：00_账号与API索引.md；依赖：tencentcloud-sdk-python-tat
"""
import base64
import os
import re
import sys
import time

KR_INSTANCE_ID = "ins-aw0tnqjo"
REGION = "ap-guangzhou"

def _read_creds():
    d = os.path.dirname(os.path.abspath(__file__))
    for _ in range(6):
        root = d
        if os.path.isfile(os.path.join(root, "运营中枢", "工作台", "00_账号与API索引.md")):
            path = os.path.join(root, "运营中枢", "工作台", "00_账号与API索引.md")
            with open(path, "r", encoding="utf-8") as f:
                text = f.read()
            sid = skey = None
            in_tx = False
            for line in text.splitlines():
                if "### 腾讯云" in line:
                    in_tx = True
                    continue
                if in_tx and line.strip().startswith("###"):
                    break
                if not in_tx:
                    continue
                m = re.search(r"\|\s*[^|]*(?:SecretId|密钥)[^|]*\|\s*`([^`]+)`", line, re.I)
                if m and m.group(1).strip().startswith("AKID"):
                    sid = m.group(1).strip()
                m = re.search(r"\|\s*SecretKey\s*\|\s*`([^`]+)`", line, re.I)
                if m:
                    skey = m.group(1).strip()
            return sid or None, skey or None
        d = os.path.dirname(d)
    return None, None

SHELL = r'''#!/bin/bash
set -e
echo "=== 1. 重载 Nginx + 重启 PHP-FPM ==="
nginx -t && nginx -s reload
for svc in php-fpm-56 php-fpm-74 php-fpm-80 php-fpm-82 php-fpm php-fpm7.4; do
  systemctl restart $svc 2>/dev/null && echo "  已重启 $svc" && break
done
echo "=== 2. 添加 lytiao redirect 配置 ==="
C=/www/server/panel/vhost/nginx/lytiao_root.conf
if [ ! -f "$C" ]; then
  printf '%s\n' 'server { listen 80; listen [::]:80; server_name lytiao.com www.lytiao.com; return 301 https://zhijipro.lytiao.com$request_uri; }' 'server { listen 443 ssl; listen [::]:443 ssl; server_name lytiao.com www.lytiao.com; ssl_certificate /www/server/panel/vhost/cert/zhijipro.lytiao.com/fullchain.pem; ssl_certificate_key /www/server/panel/vhost/cert/zhijipro.lytiao.com/privkey.pem; return 301 https://zhijipro.lytiao.com$request_uri; }' > "$C"
  echo "  已创建 $C"
fi
nginx -t && nginx -s reload
echo "=== 完成 ==="
'''

def main():
    sid = os.environ.get("TENCENTCLOUD_SECRET_ID")
    skey = os.environ.get("TENCENTCLOUD_SECRET_KEY")
    if not sid or not skey:
        sid, skey = _read_creds()
    if not sid or not skey:
        print("❌ 未配置腾讯云 SecretId/SecretKey")
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
    req.Content = base64.b64encode(SHELL.encode()).decode()
    req.InstanceIds = [KR_INSTANCE_ID]
    req.CommandType = "SHELL"
    req.Timeout = 60
    req.CommandName = "FixLkdieLytiao"
    resp = client.RunCommand(req)
    print("✅ TAT 已下发 InvocationId:", resp.InvocationId)
    print("  等待 45s...")
    time.sleep(45)
    try:
        req2 = models.DescribeInvocationTasksRequest()
        f = models.Filter()
        f.Name = "invocation-id"
        f.Values = [resp.InvocationId]
        req2.Filters = [f]
        r2 = client.DescribeInvocationTasks(req2)
        for t in (r2.InvocationTaskSet or []):
            print("  状态:", getattr(t, "TaskStatus", ""))
            if hasattr(t, "Output") and t.Output:
                print("  输出:", t.Output[:500] if len(t.Output or "") > 500 else t.Output)
    except Exception as e:
        print("  查询:", e)
    return 0

if __name__ == "__main__":
    sys.exit(main())

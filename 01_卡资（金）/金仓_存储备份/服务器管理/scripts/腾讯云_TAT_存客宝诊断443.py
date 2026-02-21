#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
腾讯云 TAT 在存客宝上执行 443/SSL 诊断，并返回输出
凭证：00_账号与API索引.md 或环境变量
"""
import base64
import os
import re
import sys
import time

CKB_INSTANCE_ID = "ins-ciyv2mxa"
REGION = "ap-guangzhou"

CMD = """echo "=== iptables INPUT 80/443 ===" && iptables -L INPUT -n -v 2>/dev/null | head -30 || true
echo "=== firewalld 80/443 ===" && firewall-cmd --list-all 2>/dev/null || true
echo "=== 安全组/防火墙摘要 ===" && echo "服务器内 80/443 均应由 Nginx 监听，若外网 80 通 443 不通，多为腾讯云安全组/轻量防火墙未放行 443"
echo "=== DONE ==="
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
    req.Timeout = 30
    req.CommandName = "CKB_443Diagnose"
    resp = client.RunCommand(req)
    inv_id = resp.InvocationId
    print("⏳ TAT 已下发，等待 20s 获取输出...")
    time.sleep(20)

    try:
        req2 = models.DescribeInvocationTasksRequest()
        f = models.Filter()
        f.Name = "invocation-id"
        f.Values = [inv_id]
        req2.Filters = [f]
        resp2 = client.DescribeInvocationTasks(req2)
        for t in (resp2.InvocationTaskSet or []):
            status = getattr(t, "TaskStatus", "N/A")
            print("  任务状态:", status)
            for attr in ("Output", "OutputUrl", "TaskResult", "ErrorInfo"):
                v = getattr(t, attr, None)
                if v:
                    print("  %s:" % attr, str(v)[:2500])
    except Exception as e:
        print("  查询异常:", e)
    return 0

if __name__ == "__main__":
    sys.exit(main())

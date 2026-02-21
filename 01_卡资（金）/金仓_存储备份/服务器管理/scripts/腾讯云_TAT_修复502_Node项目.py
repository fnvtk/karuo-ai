#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
腾讯云 TAT：在 kr宝塔 上重启 Nginx + 指定 Node 项目（修复 502，免 SSH）
适用：wzdj、word 等 Node 项目 502。凭证：00_账号与API索引.md
"""
import base64
import os
import re
import sys
import time

KR_INSTANCE_ID = "ins-aw0tnqjo"
REGION = "ap-guangzhou"

# 默认重启的项目名（502 常见）
RESTART_NAMES = ["wzdj", "word", "soul", "zhiji", "dlm"]

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

def build_shell(names):
    want_csv = ",".join(n.lower() for n in names)
    names_str = " ".join(names)
    return f'''#!/bin/bash
set -e
echo "=== 1. 重载 Nginx ==="
nginx -t && nginx -s reload
echo "=== 2. 重启 Node 项目: {names_str} ==="
python3 -c "
import hashlib, json, urllib.request, urllib.parse, ssl, time
ssl._create_default_https_context = ssl._create_unverified_context
P, K = 'https://127.0.0.1:9988', 'qcWubCdlfFjS2b2DMT1lzPFaDfmv1cBT'
def sign():
    t = int(time.time())
    s = str(t) + hashlib.md5(K.encode()).hexdigest()
    return {{'request_time': t, 'request_token': hashlib.md5(s.encode()).hexdigest()}}
def post(path, d=None):
    pl = sign()
    if d: pl.update(d)
    r = urllib.request.Request(P+path, data=urllib.parse.urlencode(pl).encode())
    with urllib.request.urlopen(r, timeout=25) as resp:
        return json.loads(resp.read().decode())
items = post('/project/nodejs/get_project_list').get('data') or post('/project/nodejs/get_project_list').get('list') or []
want = set('{want_csv}'.split(','))
for it in items:
    nm = (it.get('name') or '').lower()
    if nm in want:
        post('/project/nodejs/restart_project', {{'project_name': it.get('name') or it.get('project_name')}})
        print('  已重启:', nm)
        time.sleep(2)
"
echo "=== 完成 ==="
'''

def main():
    names = (sys.argv[1:] or RESTART_NAMES)[:10]
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
    shell = build_shell(names)
    cred = credential.Credential(sid, skey)
    client = tat_client.TatClient(cred, REGION)
    req = models.RunCommandRequest()
    req.Content = base64.b64encode(shell.encode()).decode()
    req.InstanceIds = [KR_INSTANCE_ID]
    req.CommandType = "SHELL"
    req.Timeout = 90
    req.CommandName = "Fix502_NodeRestart"
    resp = client.RunCommand(req)
    print("✅ TAT 已下发 InvocationId:", resp.InvocationId)
    print("  重启项目:", ", ".join(names))
    print("  等待 50s...")
    time.sleep(50)
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
                print("  输出:", (t.Output or "")[:600])
    except Exception as e:
        print("  查询:", e)
    return 0

if __name__ == "__main__":
    sys.exit(main())

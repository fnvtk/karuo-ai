#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
腾讯云 TAT：kr宝塔 上对 wzdj 执行 git pull、pnpm install、pnpm build、宝塔 Node 重启
确保 https://wzdj.quwanzhi.com 跑最新代码。需先 push 到 GitHub/Gitea，服务器拉取。
"""
import base64
import os
import re
import sys
import time

KR_INSTANCE_ID = "ins-aw0tnqjo"
REGION = "ap-guangzhou"
WZDJ_DIR = "/www/wwwroot/wzdj"

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

SHELL = '''#!/bin/bash
set -e
echo "=== wzdj 部署 ==="
cd ''' + WZDJ_DIR + '''
if [ ! -d .git ]; then
  echo "ERROR: 非 Git 目录，请先在此目录 clone 仓库"
  exit 1
fi
echo "1. git pull..."
git fetch origin 2>/dev/null || git fetch gitea 2>/dev/null || true
git reset --hard origin/main 2>/dev/null || git reset --hard gitea/main 2>/dev/null || git pull origin main 2>/dev/null || git pull gitea main 2>/dev/null || true
echo "2. pnpm install..."
pnpm install --frozen-lockfile 2>/dev/null || npm install --legacy-peer-deps
echo "3. pnpm build..."
pnpm build 2>/dev/null || npm run build
echo "4. 重启 wzdj（宝塔 Node）..."
python3 -c "
import hashlib, json, urllib.request, urllib.parse, ssl, time
ssl._create_default_https_context = ssl._create_unverified_context
P, K = 'https://127.0.0.1:9988', 'qcWubCdlfFjS2b2DMT1lzPFaDfmv1cBT'
def sign():
    t = int(time.time())
    s = str(t) + hashlib.md5(K.encode()).hexdigest()
    return {'request_time': t, 'request_token': hashlib.md5(s.encode()).hexdigest()}
def post(path, d=None):
    pl = sign()
    if d: pl.update(d)
    r = urllib.request.Request(P+path, data=urllib.parse.urlencode(pl).encode())
    with urllib.request.urlopen(r, timeout=25) as resp:
        return json.loads(resp.read().decode())
items = post('/project/nodejs/get_project_list').get('data') or post('/project/nodejs/get_project_list').get('list') or []
for it in items:
    nm = (it.get('name') or '').lower()
    if nm == 'wzdj':
        post('/project/nodejs/restart_project', {'project_name': it.get('name') or it.get('project_name')})
        print('  已重启 wzdj')
        break
else:
    print('  未找到 wzdj 项目')
"
nginx -t 2>/dev/null && nginx -s reload 2>/dev/null || true
echo "=== 完成 ==="
'''

def main():
    sid = os.environ.get("TENCENTCLOUD_SECRET_ID")
    skey = os.environ.get("TENCENTCLOUD_SECRET_KEY")
    if not sid or not skey:
        sid, skey = _read_creds()
    if not sid or not skey:
        print("❌ 未配置腾讯云 SecretId/SecretKey（见 00_账号与API索引.md）")
        return 1
    try:
        from tencentcloud.common import credential
        from tencentcloud.tat.v20201028 import tat_client, models
    except ImportError:
        print("请安装: pip install tencentcloud-sdk-python-tat")
        return 1
    cred = credential.Credential(sid, skey)
    client = tat_client.TatClient(cred, REGION)
    req = models.RunCommandRequest()
    req.Content = base64.b64encode(SHELL.encode()).decode()
    req.InstanceIds = [KR_INSTANCE_ID]
    req.CommandType = "SHELL"
    req.Timeout = 300
    req.CommandName = "wzdj_deploy_build_restart"
    resp = client.RunCommand(req)
    print("✅ TAT 已下发，InvocationId:", resp.InvocationId)
    print("  服务器将执行: git pull → pnpm install → pnpm build → 重启 wzdj")
    print("  等待约 120s 后查看结果...")
    time.sleep(120)
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
                print("  输出:", (t.Output or "")[:1200])
    except Exception as e:
        print("  查询:", e)
    print("  访问: https://wzdj.quwanzhi.com")
    return 0

if __name__ == "__main__":
    sys.exit(main())

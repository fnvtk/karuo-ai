#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
腾讯云 TAT：仅修正 wzdj 在 site.db 中的路径与启动命令并重启
问题：宝塔里 wzdj 路径为 /www/wwwroot/self/wzdj 导致 MODULE_NOT_FOUND（Node 把路径当模块加载）
处理：将 path 与 project_script 改为 /www/wwwroot/wzdj，再重启 wzdj
"""
import base64
import json
import os
import re
import sys
import time

KR_INSTANCE_ID = "ins-aw0tnqjo"
REGION = "ap-guangzhou"
WZDJ_CORRECT_PATH = "/www/wwwroot/wzdj"
DB_PATH = "/www/server/panel/data/db/site.db"

def _read_creds():
    d = os.path.dirname(os.path.abspath(__file__))
    for _ in range(6):
        root = d
        p = os.path.join(root, "运营中枢", "工作台", "00_账号与API索引.md")
        if os.path.isfile(p):
            with open(p, "r", encoding="utf-8") as f:
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

SHELL = f'''#!/bin/bash
set -e
echo "=== 修正 wzdj 路径并重启 ==="
db="{DB_PATH}"
if [ ! -f "$db" ]; then
  echo "ERROR: site.db not found"; exit 1
fi
# 1. 修正 site.db 中 wzdj 的 path 与 project_config
python3 -c "
import json, sqlite3, os
db = '{DB_PATH}'
path = '{WZDJ_CORRECT_PATH}'
conn = sqlite3.connect(db)
c = conn.cursor()
c.execute(\\\"SELECT id, name, path, project_config FROM sites WHERE project_type='Node' AND name='wzdj'\\\")
row = c.fetchone()
if not row:
    print('wzdj 未在 site.db 中找到')
    exit(1)
sid, name, old_path, cfg_str = row
cfg = json.loads(cfg_str or '{{}}')
cmd = f'cd {{path}} && (pnpm start 2>/dev/null || npm run start)'
cfg['project_script'] = cfg['run_cmd'] = cmd
cfg['path'] = path
c.execute('UPDATE sites SET path=?, project_config=? WHERE id=?', (path, json.dumps(cfg, ensure_ascii=False), sid))
conn.commit()
conn.close()
print('已更新 wzdj path ->', path)
"
# 2. 重启 wzdj（宝塔 API）
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
for it in items:
    nm = (it.get('name') or '').lower()
    if nm == 'wzdj':
        post('/project/nodejs/restart_project', {{'project_name': it.get('name') or it.get('project_name')}})
        print('  已重启 wzdj')
        break
else:
    print('  未找到 wzdj 项目')
"
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
    req.Timeout = 90
    req.CommandName = "wzdj_fix_path_restart"
    resp = client.RunCommand(req)
    print("✅ TAT 已下发，InvocationId:", resp.InvocationId)
    print("  修正 wzdj path 为", WZDJ_CORRECT_PATH, "并重启")
    print("  等待约 55s...")
    time.sleep(55)
    try:
        req2 = models.DescribeInvocationTasksRequest()
        f = models.Filter()
        f.Name = "invocation-id"
        f.Values = [resp.InvocationId]
        req2.Filters = [f]
        r2 = client.DescribeInvocationTasks(req2)
        for t in (r2.InvocationTaskSet or []):
            print("  状态:", getattr(t, "TaskStatus", ""))
            tr = getattr(t, "TaskResult", None)
            out = None
            if tr is not None:
                out = getattr(tr, "Output", tr.__dict__.get("Output", ""))
            if not out and hasattr(t, "Output"):
                out = t.Output
            if out:
                try:
                    text = base64.b64decode(out).decode("utf-8", errors="replace")
                    print("  输出:", text[:1500])
                except Exception:
                    print("  输出:", (out or "")[:1000])
    except Exception as e:
        print("  查询:", e)
    print("  验证: https://wzdj.quwanzhi.com")
    return 0

if __name__ == "__main__":
    sys.exit(main())

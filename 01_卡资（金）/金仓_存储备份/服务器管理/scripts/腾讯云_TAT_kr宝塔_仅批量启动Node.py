#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""TAT：仅批量启动 kr 宝塔 Node 项目（约 15s）"""
import base64, hashlib, json, os, re, sys, time, urllib.request, urllib.parse, ssl
ssl._create_default_https_context = ssl._create_unverified_context
KR_INSTANCE_ID, REGION = "ins-aw0tnqjo", "ap-guangzhou"
PANEL, K = "https://127.0.0.1:9988", "qcWubCdlfFjS2b2DMT1lzPFaDfmv1cBT"

def sign():
    t = int(time.time())
    return {"request_time": t, "request_token": hashlib.md5((str(t) + hashlib.md5(K.encode()).hexdigest()).encode()).hexdigest()}
def post(p, d=None):
    pl = sign()
    if d: pl.update(d)
    r = urllib.request.Request(PANEL + p, data=urllib.parse.urlencode(pl).encode())
    with urllib.request.urlopen(r, timeout=15) as resp:
        return json.loads(resp.read().decode())

def _creds():
    d = os.path.dirname(os.path.abspath(__file__))
    for _ in range(6):
        p = os.path.join(d, "运营中枢", "工作台", "00_账号与API索引.md")
        if os.path.isfile(p):
            t = open(p).read()
            sid = skey = None
            for L in t.splitlines():
                m = re.search(r"SecretId[^|]*\|\s*`([^`]+)`", L, re.I)
                if m and "AKID" in m.group(1): sid = m.group(1).strip()
                m = re.search(r"SecretKey\s*\|\s*`([^`]+)`", L, re.I)
                if m: skey = m.group(1).strip()
            return sid or os.environ.get("TENCENTCLOUD_SECRET_ID"), skey or os.environ.get("TENCENTCLOUD_SECRET_KEY")
        d = os.path.dirname(d)
    return None, None

def main():
    sid, skey = _creds()
    if not sid or not skey:
        print("❌ 未配置凭证"); return 1
    from tencentcloud.common import credential
    from tencentcloud.tat.v20201028 import tat_client, models

    SHELL = r'''#!/bin/bash
echo "【0】确保宝塔 9988 监听"
if ! ss -tlnp 2>/dev/null | grep -q ':9988 '; then
  /etc/init.d/bt start 2>/dev/null || /www/server/panel/bt start 2>/dev/null || true
  sleep 8
fi
echo "【启动 Node】"
PYTHONUNBUFFERED=1 python3 -u -c "
import hashlib,json,time,urllib.request,urllib.parse,ssl
ssl._create_default_https_context=ssl._create_unverified_context
P,K='https://127.0.0.1:9988','qcWubCdlfFjS2b2DMT1lzPFaDfmv1cBT'
def sg():
    t=int(time.time())
    return {'request_time':t,'request_token':hashlib.md5((str(t)+hashlib.md5(K.encode()).hexdigest()).encode()).hexdigest()}
def post(u,d=None):
    pl=sg(); (pl.update(d) if d else None)
    r=urllib.request.Request(P+u,data=urllib.parse.urlencode(pl).encode())
    return json.loads(urllib.request.urlopen(r,timeout=15).read().decode())
items=post('/project/nodejs/get_project_list').get('data')or post('/project/nodejs/get_project_list').get('list')or[]
to_start=[x for x in items if x.get('name') and not x.get('run')]
print('待启动',len(to_start),'个')
for it in to_start:
    n=it.get('name')
    try:
        r=post('/project/nodejs/start_project',{'project_name':n})
        ok=r.get('status') or '成功' in str(r.get('msg',''))
        print(n,':','OK' if ok else 'FAIL')
    except Exception as e: print(n,': ERR',str(e)[:30])
    time.sleep(1.5)
items2=post('/project/nodejs/get_project_list').get('data')or post('/project/nodejs/get_project_list').get('list')or[]
run=sum(1 for x in items2 if x.get('run'))
print('运行',run,'/',len(items2))
uptime
" 2>&1
'''
    cred = credential.Credential(sid, skey)
    cli = tat_client.TatClient(cred, REGION)
    req = models.RunCommandRequest()
    req.Content = base64.b64encode(SHELL.encode("utf-8")).decode()
    req.InstanceIds = [KR_INSTANCE_ID]
    req.CommandType = "SHELL"
    req.Timeout = 50
    req.CommandName = "kr宝塔_仅批量启动Node"
    r = cli.RunCommand(req)
    print("✅ TAT inv:", r.InvocationId)
    time.sleep(25)
    req2 = models.DescribeInvocationTasksRequest()
    f = models.Filter()
    f.Name, f.Values = "invocation-id", [r.InvocationId]
    req2.Filters = [f]
    for t in (cli.DescribeInvocationTasks(req2).InvocationTaskSet or []):
        tr = getattr(t, "TaskResult", None)
        if tr:
            out = getattr(tr, "Output", tr.__dict__.get("Output", ""))
            if out:
                print(base64.b64decode(out).decode("utf-8", errors="replace"))
    return 0

if __name__ == "__main__": sys.exit(main())

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""TAT：修复 souladmin.quwanzhi.com 500 - 重启 Nginx + soul 相关 Node"""
import base64, json, os, re, sys, time

KR_INSTANCE_ID, REGION = "ins-aw0tnqjo", "ap-guangzhou"

SHELL = r'''#!/bin/bash
echo "【1】宝塔"
! ss -tlnp 2>/dev/null | grep -q ':9988 ' && /etc/init.d/bt start 2>/dev/null; sleep 5
echo "【2】重启 Nginx"
nginx -t 2>/dev/null && nginx -s reload 2>/dev/null || /etc/init.d/nginx reload 2>/dev/null || true
echo "【3】重启 soul 相关 Node（宝塔 API）"
PYTHONUNBUFFERED=1 python3 -u -c "
import hashlib,json,time,urllib.request,urllib.parse,ssl
ssl._create_default_https_context=ssl._create_unverified_context
P,K='https://127.0.0.1:9988','qcWubCdlfFjS2b2DMT1lzPFaDfmv1cBT'
def sg(): t=int(time.time()); return {'request_time':t,'request_token':hashlib.md5((str(t)+hashlib.md5(K.encode()).hexdigest()).encode()).hexdigest()}
def post(u,d=None): pl=sg(); (pl.update(d) if d else None); r=urllib.request.Request(P+u,data=urllib.parse.urlencode(pl).encode()); return json.loads(urllib.request.urlopen(r,timeout=15).read().decode())
items=post('/project/nodejs/get_project_list').get('data')or post('/project/nodejs/get_project_list').get('list')or[]
soul_proj=[x for x in items if x.get('name') and ('soul' in (x.get('name')or'').lower() or 'souladmin' in (x.get('name')or'').lower())]
if not soul_proj:
    soul_proj=[x for x in items if x.get('name')]
    print('soul 相关: 无，重启全部 Node',len(soul_proj),'个')
else:
    print('soul 相关:',[x.get('name') for x in soul_proj])
for it in soul_proj:
    n=it.get('name')
    try:
        post('/project/nodejs/stop_project',{'project_name':n}); time.sleep(1)
        r=post('/project/nodejs/start_project',{'project_name':n})
        ok=r.get('status') or '成功' in str(r.get('msg',''))
        print(n,':','OK' if ok else 'FAIL')
    except Exception as e: print(n,': ERR',str(e)[:40])
    time.sleep(2)
print('完成')
" 2>&1
'''

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
    cred = credential.Credential(sid, skey)
    cli = tat_client.TatClient(cred, REGION)
    req = models.RunCommandRequest()
    req.Content = base64.b64encode(SHELL.encode("utf-8")).decode()
    req.InstanceIds = [KR_INSTANCE_ID]
    req.CommandType = "SHELL"
    req.Timeout = 45
    req.CommandName = "kr宝塔_修复souladmin_500"
    r = cli.RunCommand(req)
    print("✅ TAT inv:", r.InvocationId)
    time.sleep(35)
    req2 = models.DescribeInvocationTasksRequest()
    f = models.Filter(); f.Name, f.Values = "invocation-id", [r.InvocationId]
    req2.Filters = [f]
    for t in (cli.DescribeInvocationTasks(req2).InvocationTaskSet or []):
        print("状态:", getattr(t, "TaskStatus", ""))
        tr = getattr(t, "TaskResult", None)
        if tr:
            out = getattr(tr, "Output", tr.__dict__.get("Output", ""))
            if out:
                print(base64.b64decode(out).decode("utf-8", errors="replace"))
    return 0

if __name__ == "__main__": sys.exit(main())

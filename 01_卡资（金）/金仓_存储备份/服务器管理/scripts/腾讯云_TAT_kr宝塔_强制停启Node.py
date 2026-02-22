#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""TAT：强制停止全部 Node + 修复 site.db + 批量启动（精简版，约 90s）"""
import base64, json, os, re, sys, time

KR_INSTANCE_ID, REGION = "ins-aw0tnqjo", "ap-guangzhou"

SHELL = r'''#!/bin/bash
set -e
echo "【1】宝塔"
! ss -tlnp 2>/dev/null | grep -q ':9988 ' && /etc/init.d/bt start 2>/dev/null; sleep 5
echo "【2】强制结束 Node 进程"
pkill -9 -f "node.*www/wwwroot" 2>/dev/null || true
sleep 2
echo "【3】修复 site.db + 停+启"
PYTHONUNBUFFERED=1 python3 -u -c "
import hashlib,json,os,re,sqlite3,subprocess,time,urllib.request,urllib.parse,ssl
ssl._create_default_https_context=ssl._create_unverified_context
P,K='https://127.0.0.1:9988','qcWubCdlfFjS2b2DMT1lzPFaDfmv1cBT'
def sg(): t=int(time.time()); return {'request_time':t,'request_token':hashlib.md5((str(t)+hashlib.md5(K.encode()).hexdigest()).encode()).hexdigest()}
def post(u,d=None): pl=sg(); (pl.update(d) if d else None); r=urllib.request.Request(P+u,data=urllib.parse.urlencode(pl).encode()); return json.loads(urllib.request.urlopen(r,timeout=20).read().decode())
def pids(port):
    try: return {int(x) for x in re.findall(r'pid=(\d+)',subprocess.check_output(\"ss -tlnp 2>/dev/null | grep ':%s ' || true\"%port,shell=True).decode())}
    except: return set()
def ports(it):
    cfg=it.get('project_config') or {}
    if isinstance(cfg,str): cfg=json.loads(cfg) if cfg else {}
    p=[int(cfg['port'])] if cfg.get('port') else []
    p.extend(int(m) for m in re.findall(r'-p\s*(\d+)',str(cfg.get('project_script',''))))
    return sorted(set(p))
FB={'玩值大屏':['/www/wwwroot/self/wanzhi/玩值大屏','/www/wwwroot/self/wanzhi/玩值'],'tongzhi':['/www/wwwroot/self/wanzhi/tongzhi','/www/wwwroot/self/wanzhi/tong'],'神射手':['/www/wwwroot/self/kr/kr-use','/www/wwwroot/self/kr/kr-users'],'AITOUFA':['/www/wwwroot/ext/tools/AITOUFA','/www/wwwroot/ext/tools/AITOL']}
db='/www/server/panel/data/db/site.db'
if os.path.isfile(db):
    c=sqlite3.connect(db); cur=c.cursor(); cur.execute(\"SELECT id,name,path,project_config FROM sites WHERE project_type='Node'\")
    for r in cur.fetchall():
        sid,nm,path,cfg=r[0],r[1],r[2],r[3]or'{}'
        proj=(json.loads(cfg) if cfg else {}).get('path') or path or ''
        if not proj or not os.path.isdir(proj):
            for p in FB.get(nm,[]):
                if os.path.isdir(p): proj=p; break
        if not proj or not os.path.isdir(proj): continue
        cmd='cd %s && (pnpm start 2>/dev/null || npm run start)'%proj
        cfg=json.loads(cfg) if isinstance(cfg,str) else (cfg or {})
        cfg['project_script']=cfg['run_cmd']=cmd; cfg['path']=proj
        cur.execute('UPDATE sites SET path=?, project_config=? WHERE id=?',(proj,json.dumps(cfg,ensure_ascii=False),sid))
    c.commit(); c.close()
print('site.db 已修复')
items=post('/project/nodejs/get_project_list').get('data')or post('/project/nodejs/get_project_list').get('list')or[]
for it in items:
    n=it.get('name')
    if not n: continue
    try:
        for port in ports(it):
            for pid in pids(port): subprocess.call('kill -9 %s'%pid,shell=True)
        pf='/www/server/nodejs/vhost/pids/%s.pid'%n
        if os.path.exists(pf): open(pf,'w').write('0')
        post('/project/nodejs/stop_project',{'project_name':n})
    except: pass
    time.sleep(0.3)
time.sleep(3)
print('停止完成，开始启动')
for it in items:
    n=it.get('name')
    if not n: continue
    try:
        r=post('/project/nodejs/start_project',{'project_name':n})
        ok=r.get('status') or '成功' in str(r.get('msg',''))
        print(n,':','OK' if ok else 'FAIL')
    except Exception as e: print(n,': ERR')
    time.sleep(1.2)
r2=post('/project/nodejs/get_project_list').get('data')or post('/project/nodejs/get_project_list').get('list')or[]
print('运行',sum(1 for x in r2 if x.get('run')),'/',len(r2))
" 2>&1
echo "【4】完成"
uptime
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
    req.Timeout = 120
    req.CommandName = "kr宝塔_强制停启Node"
    r = cli.RunCommand(req)
    print("✅ TAT inv:", r.InvocationId)
    time.sleep(100)
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

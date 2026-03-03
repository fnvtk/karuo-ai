#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""TAT：修复 wzdj.quwanzhi.com 启动失败（Cannot find module '/www/wwwroot/self/wzdj'）
原因：宝塔用 node /path 当入口，应改为 cd /path && (pnpm start || npm run start)
"""
import base64, json, os, re, sys, time
KR_INSTANCE_ID, REGION = "ins-aw0tnqjo", "ap-guangzhou"

SHELL = r'''#!/bin/bash
set -e
echo "【1】确保宝塔 9988 监听"
if ! ss -tlnp 2>/dev/null | grep -q ':9988 '; then
  /etc/init.d/bt start 2>/dev/null || true
  sleep 8
fi

echo "【2】停止 wzdj"
python3 -c "
import hashlib,json,time,urllib.request,urllib.parse,ssl
ssl._create_default_https_context=ssl._create_unverified_context
P,K='https://127.0.0.1:9988','qcWubCdlfFjS2b2DMT1lzPFaDfmv1cBT'
def sg():
    t=int(time.time())
    return {'request_time':t,'request_token':hashlib.md5((str(t)+hashlib.md5(K.encode()).hexdigest()).encode()).hexdigest()}
def post(u,d=None):
    pl=sg()
    if d: pl.update(d)
    r=urllib.request.Request(P+u,data=urllib.parse.urlencode(pl).encode())
    return json.loads(urllib.request.urlopen(r,timeout=15).read().decode())
try:
    post('/project/nodejs/stop_project',{'project_name':'wzdj'})
    print('stop wzdj ok')
except Exception as e: print('stop',e)
" 2>/dev/null || true

echo "【3】修复 site.db 中 wzdj 的 project_script/run_cmd"
python3 -c "
import json,sqlite3,os
db='/www/server/panel/data/db/site.db'
path='/www/wwwroot/self/wzdj'
cmd='cd %s && (PORT=3055 pnpm start 2>/dev/null || PORT=3055 npm run start)' % path
conn=sqlite3.connect(db)
c=conn.cursor()
c.execute('SELECT id,name,path,project_config FROM sites WHERE name=\"wzdj\" AND project_type=\"Node\"')
row=c.fetchone()
if row:
    sid,nm,oldpath,cfg=row[0],row[1],row[2] or '',row[3] or '{}'
    try: cfg=json.loads(cfg)
    except: cfg={}
    cfg['project_script']=cfg['run_cmd']=cmd
    cfg['path']=path
    c.execute('UPDATE sites SET path=?, project_config=? WHERE id=?',(path,json.dumps(cfg,ensure_ascii=False),sid))
    conn.commit()
    print('site.db wzdj fixed:',cmd[:60])
else:
    print('wzdj not found in sites')
conn.close()
"

echo "【4】修复 wzdj.sh 启动脚本（避免 node /path）"
SH=/www/server/nodejs/vhost/scripts/wzdj.sh
if [ -f \"$SH\" ]; then
  python3 -c "
p='$SH'
path='/www/wwwroot/self/wzdj'
new_cmd='cd %s && (PORT=3055 pnpm start 2>/dev/null || PORT=3055 npm run start)' % path
with open(p,'r') as f: lines=f.readlines()
out=[]
for line in lines:
    if '/www/wwwroot/self/wzdj' in line and not line.strip().startswith('#') and ('node' in line.lower() or 'exec' in line or '\$' in line):
        out.append('  ' + new_cmd + '\n')
    else:
        out.append(line)
with open(p,'w') as f: f.writelines(out)
print('wzdj.sh updated')
"
else
  echo \"wzdj.sh not found, skip\"
fi

echo "【5】启动 wzdj"
python3 -c "
import hashlib,json,time,urllib.request,urllib.parse,ssl
ssl._create_default_https_context=ssl._create_unverified_context
P,K='https://127.0.0.1:9988','qcWubCdlfFjS2b2DMT1lzPFaDfmv1cBT'
def sg():
    t=int(time.time())
    return {'request_time':t,'request_token':hashlib.md5((str(t)+hashlib.md5(K.encode()).hexdigest()).encode()).hexdigest()}
def post(u,d=None):
    pl=sg()
    if d: pl.update(d)
    r=urllib.request.Request(P+u,data=urllib.parse.urlencode(pl).encode())
    return json.loads(urllib.request.urlopen(r,timeout=15).read().decode())
r=post('/project/nodejs/start_project',{'project_name':'wzdj'})
print('start wzdj:', r.get('msg') or r)
" 2>&1

echo "【6】完成"
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
    base = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))
    log_path = os.path.join(base, "运营中枢", "工作台", "wzdj_fix_result.txt")
    log_lines = []
    def log(s):
        log_lines.append(s)
        print(s)
    try:
        os.makedirs(os.path.dirname(log_path), exist_ok=True)
        with open(log_path, "w", encoding="utf-8") as f:
            f.write("start\n")
    except Exception:
        pass
    sid, skey = _creds()
    if not sid or not skey:
        log("❌ 未配置凭证")
        try:
            with open(log_path, "w", encoding="utf-8") as f:
                f.write("no creds\n")
        except Exception:
            pass
        return 1
    from tencentcloud.common import credential
    from tencentcloud.tat.v20201028 import tat_client, models
    cred = credential.Credential(sid, skey)
    cli = tat_client.TatClient(cred, REGION)
    req = models.RunCommandRequest()
    req.Content = base64.b64encode(SHELL.encode("utf-8")).decode()
    req.InstanceIds = [KR_INSTANCE_ID]
    req.CommandType = "SHELL"
    req.Timeout = 60
    req.CommandName = "kr宝塔_修复wzdj启动"
    r = cli.RunCommand(req)
    log("✅ TAT inv: " + str(r.InvocationId))
    time.sleep(25)
    req2 = models.DescribeInvocationTasksRequest()
    f = models.Filter()
    f.Name, f.Values = "invocation-id", [r.InvocationId]
    req2.Filters = [f]
    r2 = cli.DescribeInvocationTasks(req2)
    for t in (r2.InvocationTaskSet or []):
        log("状态: " + str(getattr(t, "TaskStatus", "")))
        tr = getattr(t, "TaskResult", None)
        if tr:
            d = tr.__dict__ if hasattr(tr, "__dict__") else {}
            out = d.get("Output", getattr(tr, "Output", ""))
            if out:
                try:
                    decoded = base64.b64decode(out).decode("utf-8", errors="replace")
                    log(decoded)
                except Exception:
                    log(str(out)[:2000])
    try:
        os.makedirs(os.path.dirname(log_path), exist_ok=True)
        with open(log_path, "w", encoding="utf-8") as f:
            f.write("\n".join(log_lines))
    except Exception:
        pass
    return 0


if __name__ == "__main__":
    log_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))), "运营中枢", "工作台", "wzdj_fix_result.txt")
    code = 1
    try:
        code = main()
        with open(log_path, "w", encoding="utf-8") as f:
            f.write("OK exit=%s\n" % code)
    except Exception as e:
        try:
            os.makedirs(os.path.dirname(log_path), exist_ok=True)
            with open(log_path, "w", encoding="utf-8") as f:
                f.write("ERR: %s\n" % e)
        except Exception:
            pass
        raise
    sys.exit(code)

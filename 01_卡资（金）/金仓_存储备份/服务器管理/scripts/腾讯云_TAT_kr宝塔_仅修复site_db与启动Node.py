#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""TAT：仅修复 site.db 启动命令 + 批量启动 Node（精简版，避免超时）"""
import base64, json, os, re, sys, time
KR_INSTANCE_ID, REGION = "ins-aw0tnqjo", "ap-guangzhou"

SCRIPT = r'''#!/bin/bash
# 确保面板
ss -tlnp 2>/dev/null | grep -q ':9988 ' || { /etc/init.d/bt start 2>/dev/null; sleep 6; }
python3 -c '
import hashlib,json,os,re,sqlite3,subprocess,time,urllib.request,urllib.parse,ssl
ssl._create_default_https_context=ssl._create_unverified_context
P,K="https://127.0.0.1:9988","qcWubCdlfFjS2b2DMT1lzPFaDfmv1cBT"
def sg(): t=int(time.time()); return {"request_time":t,"request_token":hashlib.md5((str(t)+hashlib.md5(K.encode()).hexdigest()).encode()).hexdigest()}
def post(p,d=None): r=urllib.request.Request(P+p,data=urllib.parse.urlencode({**sg(),**(d or{})}).encode()); return json.loads(urllib.request.urlopen(r,timeout=20).read().decode())
def pids(port):
    try: return {int(x) for x in re.findall(r"pid=(\d+)",subprocess.check_output("ss -tlnp 2>/dev/null|grep \":%s \"||true"%port,shell=True).decode())}
    except: return set()
def ports(it):
    c=it.get("project_config") or {}
    if isinstance(c,str): c=json.loads(c) if c else {}
    p=[c["port"]] if c.get("port") else []
    p.extend(int(m) for m in re.findall(r"-p\s*(\d+)",str(c.get("project_script",""))))
    return list(set(p))
FB={"玩值大屏":["/www/wwwroot/self/wanzhi/玩值大屏","/www/wwwroot/self/wanzhi/玩值"],"tongzhi":["/www/wwwroot/self/wanzhi/tongzhi","/www/wwwroot/self/wanzhi/tong"],"神射手":["/www/wwwroot/self/kr/kr-use","/www/wwwroot/self/kr/kr-users"],"AITOUFA":["/www/wwwroot/ext/tools/AITOUFA","/www/wwwroot/ext/tools/AITOL"]}
db="/www/server/panel/data/db/site.db"
if os.path.isfile(db):
    conn=sqlite3.connect(db)
    c=conn.cursor()
    c.execute("SELECT id,name,path,project_config FROM sites WHERE project_type=\"Node\"")
    for r in c.fetchall():
        sid,nm,path,cfg=r[0],r[1],r[2],r[3]or"{}"
        path=(path or"").strip()
        cfg=json.loads(cfg) if cfg else {}
        proj=cfg.get("path")or cfg.get("project_path")or path
        if not proj or not os.path.isdir(proj):
            for p in FB.get(nm,[]):
                if os.path.isdir(p): proj=p; break
        if not proj or not os.path.isdir(proj): continue
        cmd="cd %s && (pnpm start 2>/dev/null || npm run start)"%proj
        old=str(cfg.get("project_script")or"").strip()
        if "cd " not in old:
            cfg["project_script"]=cfg["run_cmd"]=cmd
            cfg["path"]=proj
            c.execute("UPDATE sites SET path=?,project_config=? WHERE id=?",(proj,json.dumps(cfg,ensure_ascii=False),sid))
            print("fix:",nm)
    conn.commit()
    conn.close()
items=post("/project/nodejs/get_project_list").get("data")or post("/project/nodejs/get_project_list").get("list")or[]
for it in items:
    nm=it.get("name")
    if not nm or it.get("run"): continue
    try:
        for port in ports(it):
            for pid in pids(port): subprocess.call("kill -9 %s 2>/dev/null"%pid,shell=True)
        pf="/www/server/nodejs/vhost/pids/%s.pid"%nm
        if os.path.exists(pf): open(pf,"w").write("0")
        post("/project/nodejs/stop_project",{"project_name":nm})
        time.sleep(0.3)
        r=post("/project/nodejs/start_project",{"project_name":nm})
        print(nm,":", "OK" if r.get("status") or "成功" in str(r.get("msg","")) else "FAIL")
    except: print(nm,": ERR")
    time.sleep(1)
time.sleep(5)
r2=post("/project/nodejs/get_project_list")
lst=r2.get("data")or r2.get("list")or[]
print("运行",sum(1 for x in lst if x.get("run")),"/",len(lst))
'
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
    if not sid or not skey: print("❌ 未配置凭证"); return 1
    from tencentcloud.common import credential
    from tencentcloud.tat.v20201028 import tat_client, models
    cred = credential.Credential(sid, skey)
    cli = tat_client.TatClient(cred, REGION)
    req = models.RunCommandRequest()
    req.Content = base64.b64encode(SCRIPT.encode("utf-8")).decode()
    req.InstanceIds = [KR_INSTANCE_ID]
    req.CommandType = "SHELL"
    req.Timeout = 120
    req.CommandName = "kr宝塔_仅修复site_db与启动Node"
    r = cli.RunCommand(req)
    print("✅ TAT inv:", r.InvocationId)
    time.sleep(100)
    req2 = models.DescribeInvocationTasksRequest()
    f = models.Filter()
    f.Name, f.Values = "invocation-id", [r.InvocationId]
    req2.Filters = [f]
    r2 = cli.DescribeInvocationTasks(req2)
    for t in (r2.InvocationTaskSet or []):
        tr = getattr(t, "TaskResult", None)
        if tr:
            d = tr.__dict__ if hasattr(tr, "__dict__") else {}
            out = d.get("Output", getattr(tr, "Output", ""))
            if out:
                try: print(base64.b64decode(out).decode("utf-8", errors="replace"))
                except: print(out[:3000])
    return 0

if __name__ == "__main__": sys.exit(main())

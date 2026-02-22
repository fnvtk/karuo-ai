#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""TAT：仅修复 site.db 中 Node 项目启动命令（纯 sqlite3，无 API，约 5s 完成）"""
import base64, json, os, re, sys, time
KR_INSTANCE_ID, REGION = "ins-aw0tnqjo", "ap-guangzhou"

# 项目名 -> 路径，用于 site.db 更新 project_config
UPDATES = [
    ("玩值大屏", "/www/wwwroot/self/wanzhi/玩值大屏"),
    ("玩值大屏", "/www/wwwroot/self/wanzhi/玩值"),
    ("tongzhi", "/www/wwwroot/self/wanzhi/tongzhi"),
    ("tongzhi", "/www/wwwroot/self/wanzhi/tong"),
    ("is_phone", "/www/wwwroot/self/kr/kr-phone"),
    ("ai_hair", "/www/wwwroot/client/ai_hair"),
    ("神射手", "/www/wwwroot/self/kr/kr-use"),
    ("神射手", "/www/wwwroot/self/kr/kr-users"),
    ("AITOUFA", "/www/wwwroot/ext/tools/AITOUFA"),
    ("AITOUFA", "/www/wwwroot/ext/tools/AITOL"),
    ("wzdj", "/www/wwwroot/self/wzdj"),
    ("zhiji", "/www/wwwroot/self/zhiji"),
    ("ymao", "/www/wwwroot/ext/ymao"),
    ("zhaoping", "/www/wwwroot/client/zhaoping"),
    ("word", "/www/wwwroot/self/word"),
]

SHELL = r'''#!/bin/bash
echo "=== 修复 site.db Node 启动命令 ==="
python3 -c "
import json,sqlite3,os
db='/www/server/panel/data/db/site.db'
if not os.path.isfile(db): print('db not found'); exit(1)
conn=sqlite3.connect(db)
c=conn.cursor()
c.execute('SELECT id,name,path,project_config FROM sites WHERE project_type=\"Node\"')
up=0
for row in c.fetchall():
    sid,nm,path,cfg=row[0],row[1],row[2]or'',row[3]or'{}'
    path=(path or'').strip()
    try: cfg=json.loads(cfg)
    except: cfg={}
    proj=cfg.get('path')or cfg.get('project_path')or path
    if not proj or not os.path.isdir(proj):
        for nm2,proj2 in [('玩值大屏','/www/wwwroot/self/wanzhi/玩值大屏'),('玩值大屏','/www/wwwroot/self/wanzhi/玩值'),('tongzhi','/www/wwwroot/self/wanzhi/tongzhi'),('tongzhi','/www/wwwroot/self/wanzhi/tong'),('神射手','/www/wwwroot/self/kr/kr-use'),('神射手','/www/wwwroot/self/kr/kr-users'),('AITOUFA','/www/wwwroot/ext/tools/AITOUFA'),('AITOUFA','/www/wwwroot/ext/tools/AITOL')]:
            if nm==nm2 and os.path.isdir(proj2): proj=proj2; break
    if not proj or not os.path.isdir(proj): continue
    cmd='cd %s && (pnpm start 2>/dev/null || npm run start)'%proj
    # 统一修复为正确启动命令（避免 node /path 等错误格式）
    if True:
        cfg['project_script']=cfg['run_cmd']=cmd
        cfg['path']=proj
        c.execute('UPDATE sites SET path=?, project_config=? WHERE id=?',(proj,json.dumps(cfg,ensure_ascii=False),sid))
        up+=1
        print('fix:',nm,'->',proj)
conn.commit()
conn.close()
print('共修复',up,'个')
"
echo "=== 完成 ==="
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
    req.Content = base64.b64encode(SHELL.encode("utf-8")).decode()
    req.InstanceIds = [KR_INSTANCE_ID]
    req.CommandType = "SHELL"
    req.Timeout = 30
    req.CommandName = "kr宝塔_仅修复site_db"
    r = cli.RunCommand(req)
    print("✅ TAT inv:", r.InvocationId, "（仅修复 site.db，约 5s）")
    time.sleep(15)
    req2 = models.DescribeInvocationTasksRequest()
    f = models.Filter()
    f.Name, f.Values = "invocation-id", [r.InvocationId]
    req2.Filters = [f]
    r2 = cli.DescribeInvocationTasks(req2)
    for t in (r2.InvocationTaskSet or []):
        print("状态:", getattr(t, "TaskStatus", ""))
        tr = getattr(t, "TaskResult", None)
        if tr:
            d = tr.__dict__ if hasattr(tr, "__dict__") else {}
            out = d.get("Output", getattr(tr, "Output", ""))
            if out:
                try: print(base64.b64decode(out).decode("utf-8", errors="replace"))
                except: print(out[:2000])
    return 0

if __name__ == "__main__": sys.exit(main())

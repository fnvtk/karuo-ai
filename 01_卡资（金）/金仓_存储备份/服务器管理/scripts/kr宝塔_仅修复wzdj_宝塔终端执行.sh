#!/bin/bash
# 仅修复 wzdj.quwanzhi.com 启动失败（Cannot find module '/www/wwwroot/self/wzdj'）
# 在宝塔终端或 SSH 执行：bash 本脚本 或 直接粘贴内容执行
set -e
echo "【1】停止 wzdj"
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

echo "【2】修复 site.db 中 wzdj 的 project_script/run_cmd"
python3 -c "
import json,sqlite3
db='/www/server/panel/data/db/site.db'
path='/www/wwwroot/self/wzdj'
cmd='cd %s && (PORT=3055 pnpm start 2>/dev/null || PORT=3055 npm run start)' % path
conn=sqlite3.connect(db)
c=conn.cursor()
c.execute(\"SELECT id,name,path,project_config FROM sites WHERE name='wzdj' AND project_type='Node'\")
row=c.fetchone()
if row:
    sid,nm,oldpath,cfg=row[0],row[1],row[2] or '',row[3] or '{}'
    try: cfg=json.loads(cfg)
    except: cfg={}
    cfg['project_script']=cfg['run_cmd']=cmd
    cfg['path']=path
    c.execute('UPDATE sites SET path=?, project_config=? WHERE id=?',(path,json.dumps(cfg,ensure_ascii=False),sid))
    conn.commit()
    print('site.db wzdj fixed')
else:
    print('wzdj not found in sites')
conn.close()
"

echo "【3】修复 wzdj.sh 启动脚本"
SH=/www/server/nodejs/vhost/scripts/wzdj.sh
if [ -f \"$SH\" ]; then
  python3 -c "
p='/www/server/nodejs/vhost/scripts/wzdj.sh'
path='/www/wwwroot/self/wzdj'
new_cmd='cd %s && (PORT=3055 pnpm start 2>/dev/null || PORT=3055 npm run start)' % path
with open(p,'r') as f: lines=f.readlines()
out=[]
for line in lines:
    # 仅替换“执行该路径”的行：含路径且含 node/exec/$（避免改 export 等）
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

echo "【3.5】释放 3055 端口（避免 EADDRINUSE）"
fuser -k 3055/tcp 2>/dev/null || true
sleep 1

echo "【4】启动 wzdj"
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
"

echo "【5】完成"

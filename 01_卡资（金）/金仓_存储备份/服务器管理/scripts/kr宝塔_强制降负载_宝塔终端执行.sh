#!/bin/bash
# 强制降负载：先停所有 Node/PM2，等负载回落后再手动启动
echo "========== 强制降负载 =========="
echo "【1】停 PM2"
pm2 kill 2>/dev/null || true
systemctl stop pm2-root 2>/dev/null || true
systemctl disable pm2-root 2>/dev/null || true
pkill -9 -f pm2 2>/dev/null || true
echo "【2】结束全部 Node 进程"
pkill -9 -f "node" 2>/dev/null || true
pkill -9 -f "npm" 2>/dev/null || true
pkill -9 -f "pnpm" 2>/dev/null || true
pkill -9 -f "next-server" 2>/dev/null || true
sleep 3
echo "【3】通过宝塔 API 停止所有 Node 项目"
python3 -c "
import hashlib,json,time,urllib.request,urllib.parse,ssl
ssl._create_default_https_context=ssl._create_unverified_context
P,K='https://127.0.0.1:9988','qcWubCdlfFjS2b2DMT1lzPFaDfmv1cBT'
def sg(): t=int(time.time()); return {'request_time':t,'request_token':hashlib.md5((str(t)+hashlib.md5(K.encode()).hexdigest()).encode()).hexdigest()}
def post(p,d=None): pl=sg(); pl.update(d or {}); r=urllib.request.Request(P+p,data=urllib.parse.urlencode(pl).encode()); return json.loads(urllib.request.urlopen(r,timeout=20).read().decode())
for it in post('/project/nodejs/get_project_list').get('data')or[]:
    n=it.get('name')
    if n: post('/project/nodejs/stop_project',{'project_name':n}); time.sleep(0.5)
print('已停止全部')
"
sleep 5
echo "【4】当前负载"
uptime
echo "========== 完成。负载应已下降。需启动的项目请到宝塔 Node 项目里手动点启动 =========="

#!/bin/bash
# kr宝塔 彻底去除 PM2，一律使用宝塔原生 Node 管理器
# 执行：宝塔面板 → 终端 或 SSH，全文复制粘贴运行

echo "========== 彻底去除 PM2，仅用宝塔 Node =========="

echo "【1】停止并禁用 PM2"
pm2 kill 2>/dev/null || true
systemctl stop pm2-root 2>/dev/null || true
systemctl disable pm2-root 2>/dev/null || true
systemctl mask pm2-root 2>/dev/null || true
rm -f /etc/systemd/system/pm2-root.service 2>/dev/null
rm -f /usr/lib/systemd/system/pm2-root.service 2>/dev/null
systemctl daemon-reload 2>/dev/null || true
echo "  PM2 已停止并禁用"

echo ""
echo "【2】清理 PM2 残留进程与配置"
pkill -9 -f "pm2" 2>/dev/null || true
rm -rf /root/.pm2 2>/dev/null
crontab -l 2>/dev/null | grep -v pm2 | crontab - 2>/dev/null || true
echo "  PM2 残留已清理"

echo ""
echo "【3】结束高 CPU 与全部 Node 进程（解决卡顿）"
for pid in $(ps aux | awk '$3>80 && /node|npm|pnpm/ && !/grep/ {print $2}' 2>/dev/null); do
  echo "  kill 高CPU $pid"; kill -9 $pid 2>/dev/null
done
pkill -9 -f "node.*www/wwwroot" 2>/dev/null || true
sleep 2
echo "  Node 进程已清理"

echo ""
echo "【4】修复 site.db 启动命令并停止残留"
python3 << 'FIX'
import hashlib,json,os,re,sqlite3,subprocess,time,urllib.request,urllib.parse,ssl
ssl._create_default_https_context=ssl._create_unverified_context
P,K="https://127.0.0.1:9988","qcWubCdlfFjS2b2DMT1lzPFaDfmv1cBT"
def sg(): t=int(time.time()); return {"request_time":t,"request_token":hashlib.md5((str(t)+hashlib.md5(K.encode()).hexdigest()).encode()).hexdigest()}
def post(p,d=None): pl=sg(); (pl.update(d) if d else None); r=urllib.request.Request(P+p,data=urllib.parse.urlencode(pl).encode()); return json.loads(urllib.request.urlopen(r,timeout=25).read().decode())
PATH_FB={"玩值大屏":["/www/wwwroot/self/wanzhi/玩值大屏","/www/wwwroot/self/wanzhi/玩值"],"tongzhi":["/www/wwwroot/self/wanzhi/tongzhi","/www/wwwroot/self/wanzhi/tong"],"神射手":["/www/wwwroot/self/kr/kr-use","/www/wwwroot/self/kr/kr-users"],"AITOUFA":["/www/wwwroot/ext/tools/AITOUFA","/www/wwwroot/ext/tools/AITOL"]}
items=post("/project/nodejs/get_project_list").get("data")or post("/project/nodejs/get_project_list").get("list")or[]
for it in items:
    n=it.get("name")
    if n:
        try: post("/project/nodejs/stop_project",{"project_name":n}); print("  停:",n)
        except: pass
        time.sleep(0.4)
time.sleep(3)
db="/www/server/panel/data/db/site.db"
if os.path.isfile(db):
    c=sqlite3.connect(db); cur=c.cursor(); cur.execute("SELECT id,name,path,project_config FROM sites WHERE project_type='Node'")
    fixed=0
    for row in cur.fetchall():
        sid,name,path,cfg=row[0],row[1],row[2],row[3]or"{}"
        path=(path or"").strip(); cfg=json.loads(cfg) if cfg else {}
        proj=cfg.get("path")or cfg.get("project_path")or path
        if not proj or not os.path.isdir(proj):
            for p in PATH_FB.get(name,[]):
                if os.path.isdir(p): proj=p; break
        if not proj or not os.path.isdir(proj): continue
        cmd="cd %s && (pnpm start 2>/dev/null || npm run start)"%proj
        cfg["project_script"]=cfg["run_cmd"]=cmd; cfg["path"]=proj
        cur.execute("UPDATE sites SET path=?,project_config=? WHERE id=?",(proj,json.dumps(cfg,ensure_ascii=False),sid)); fixed+=1
    c.commit(); c.close()
    print("  site.db 修复 %d 个" % fixed)
FIX

echo ""
echo "【5】通过宝塔 Node 管理器批量启动"
python3 << 'PY'
import hashlib,json,time,urllib.request,urllib.parse,ssl
ssl._create_default_https_context=ssl._create_unverified_context
P,K="https://127.0.0.1:9988","qcWubCdlfFjS2b2DMT1lzPFaDfmv1cBT"
def sg(): t=int(time.time()); return {"request_time":t,"request_token":hashlib.md5((str(t)+hashlib.md5(K.encode()).hexdigest()).encode()).hexdigest()}
def post(p,d=None): pl=sg(); (pl.update(d) if d else None); r=urllib.request.Request(P+p,data=urllib.parse.urlencode(pl).encode()); return json.loads(urllib.request.urlopen(r,timeout=25).read().decode())
items=post("/project/nodejs/get_project_list").get("data")or post("/project/nodejs/get_project_list").get("list")or[]
to_start=[it for it in items if it.get("name") and not it.get("run")]
print("  待启动 %d 个" % len(to_start))
for it in to_start:
    n=it.get("name")
    if n:
        try: post("/project/nodejs/start_project",{"project_name":n}); print("  启:",n)
        except: pass
        time.sleep(1.5)
items2=post("/project/nodejs/get_project_list").get("data")or post("/project/nodejs/get_project_list").get("list")or[]
run=sum(1 for x in items2 if x.get("run"))
print("  运行 %d / %d" % (run,len(items2)))
PY

echo ""
echo "【6】负载检查"
uptime
echo ""
echo "========== 完成：PM2 已去除，仅用宝塔 Node 管理器，卡顿应缓解 =========="

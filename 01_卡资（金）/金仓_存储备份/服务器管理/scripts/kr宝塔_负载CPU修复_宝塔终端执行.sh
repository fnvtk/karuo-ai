#!/bin/bash
# kr宝塔 负载与 CPU 过载修复 - 宝塔面板「终端」或 SSH 执行
# 1. PM2 清理 2. 杀高 CPU 进程 3. 停 Node 4. 修复 site.db 5. 批量启动

echo "========== kr宝塔 负载与 CPU 修复 =========="
echo "【0】PM2 清理（防止重启循环导致 CPU 100%）"
pm2 kill 2>/dev/null || true
systemctl stop pm2-root 2>/dev/null || true
systemctl disable pm2-root 2>/dev/null || true
echo "  PM2 已清理"
echo ""
echo "【1】负载与 CPU 诊断"
uptime
echo "--- CPU TOP10 ---"
ps aux --sort=-%cpu | head -11
echo ""
echo "【2】结束高 CPU Node 进程（CPU>80%）"
for pid in $(ps aux | awk '$3>80 && /node|npm|pnpm/ && !/grep/ {print $2}' 2>/dev/null); do
  echo "  kill -9 $pid"; kill -9 $pid 2>/dev/null
done
echo "--- 清理异常 Node 进程 ---"
pkill -9 -f "node.*www/wwwroot" 2>/dev/null || true
sleep 3
echo ""
echo "【3】通过宝塔 API 停止全部 Node 并修复 site.db，然后批量启动"
python3 << 'PY'
import hashlib,json,os,re,sqlite3,subprocess,time,urllib.request,urllib.parse,ssl
ssl._create_default_https_context=ssl._create_unverified_context
P,K="https://127.0.0.1:9988","qcWubCdlfFjS2b2DMT1lzPFaDfmv1cBT"
def sg(): t=int(time.time()); return {"request_time":t,"request_token":hashlib.md5((str(t)+hashlib.md5(K.encode()).hexdigest()).encode()).hexdigest()}
def post(p,d=None): pl=sg(); (pl.update(d) if d else None); r=urllib.request.Request(P+p,data=urllib.parse.urlencode(pl).encode()); return json.loads(urllib.request.urlopen(r,timeout=25).read().decode())
def pids(port):
    try: return {int(x) for x in re.findall(r"pid=(\d+)",subprocess.check_output("ss -tlnp 2>/dev/null | grep ':%s ' || true"%port,shell=True).decode())}
    except: return set()
def ports(it):
    cfg=it.get("project_config") or {}
    if isinstance(cfg,str): cfg=json.loads(cfg) if cfg else {}
    p=[]; [p.append(int(cfg["port"])) if cfg.get("port") else None]
    p.extend(int(m) for m in re.findall(r"-p\s*(\d+)",str(cfg.get("project_script",""))))
    return sorted(set(p))
PATH_FB={"玩值大屏":["/www/wwwroot/self/wanzhi/玩值大屏","/www/wwwroot/self/wanzhi/玩值"],"tongzhi":["/www/wwwroot/self/wanzhi/tongzhi","/www/wwwroot/self/wanzhi/tong"],"神射手":["/www/wwwroot/self/kr/kr-use","/www/wwwroot/self/kr/kr-users"],"AITOUFA":["/www/wwwroot/ext/tools/AITOUFA","/www/wwwroot/ext/tools/AITOL"]}
items=post("/project/nodejs/get_project_list").get("data")or post("/project/nodejs/get_project_list").get("list")or[]
print("停止 Node 项目")
for it in items:
    n=it.get("name")
    if n:
        try:
            for port in ports(it): [subprocess.call("kill -9 %s 2>/dev/null"%pid,shell=True) for pid in pids(port)]
            pf="/www/server/nodejs/vhost/pids/%s.pid"%n
            if os.path.exists(pf): open(pf,"w").write("0")
            post("/project/nodejs/stop_project",{"project_name":n}); print("  停:",n)
        except: pass
        time.sleep(0.4)
time.sleep(4)
print("\n修复 site.db")
db="/www/server/panel/data/db/site.db"; fixed=0
if os.path.isfile(db):
    c=sqlite3.connect(db); cur=c.cursor(); cur.execute("SELECT id,name,path,project_config FROM sites WHERE project_type='Node'")
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
        print("  修复:",name,"->",proj)
    c.commit(); c.close()
print("  共修复 %d 个"%fixed)
print("\n批量启动 Node")
for rnd in range(3):
    items=post("/project/nodejs/get_project_list").get("data")or post("/project/nodejs/get_project_list").get("list")or[]
    to_start=[it for it in items if it.get("name") and not it.get("run")]
    if not to_start: print("  全部已运行"); break
    print("  第%d轮: %d 个"%(rnd+1,len(to_start)))
    for it in to_start:
        n=it.get("name")
        if n:
            try: post("/project/nodejs/start_project",{"project_name":n}); print("  启:",n)
            except: pass
            time.sleep(1.5)
    time.sleep(10)
items2=post("/project/nodejs/get_project_list").get("data")or post("/project/nodejs/get_project_list").get("list")or[]
run=sum(1 for x in items2 if x.get("run"))
print("\n运行 %d / %d"%(run,len(items2)))
print("========== 完成 ==========")
PY

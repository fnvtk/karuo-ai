#!/bin/bash
# kr宝塔 运行堵塞 + Node 深度修复 - 宝塔面板「终端」执行
# 1. 诊断负载/CPU 2. 停 Node 3. 修复 site.db 4. 查日志 5. 批量启动

echo "========== kr宝塔 运行堵塞 + Node 深度修复 =========="
echo "【0】运行堵塞诊断"
uptime
echo "--- CPU TOP10 ---"
ps aux --sort=-%cpu | head -11
echo "--- 结束异常高 CPU node 进程 ---"
for pid in $(ps aux | awk '$3>80 && /node|npm|pnpm/ && !/grep/ {print $2}' 2>/dev/null); do
  echo "  kill $pid"; kill -9 $pid 2>/dev/null
done
sleep 2

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
print("\n【1】停止 Node"); items=post("/project/nodejs/get_project_list").get("data")or post("/project/nodejs/get_project_list").get("list")or[]
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
print("\n【2】修复 site.db"); db="/www/server/panel/data/db/site.db"; fixed=0
if os.path.isfile(db):
    c=sqlite3.connect(db); cur=c.cursor(); cur.execute("SELECT id,name,path,project_config FROM sites WHERE project_type='Node'")
    for row in cur.fetchall():
        sid,name,path,cfg=row[0],row[1],row[2],row[3]or"{}"
        path=(path or"").strip(); cfg=json.loads(cfg) if cfg else {}
        proj=cfg.get("path")or cfg.get("project_path")or path
        if not proj or not os.path.isdir(proj):
            for p in PATH_FB.get(name,[]):
                if os.path.isdir(p): proj=p; break
        if not proj or not os.path.isdir(proj): print("  跳过",name); continue
        cmd="cd %s && (pnpm start 2>/dev/null || npm run start)"%proj
        old=str(cfg.get("project_script")or cfg.get("run_cmd")or"").strip()
        if "cd " not in old or proj not in old:
            cfg["project_script"]=cfg["run_cmd"]=cmd; cfg["path"]=proj
            cur.execute("UPDATE sites SET path=?,project_config=? WHERE id=?",(proj,json.dumps(cfg,ensure_ascii=False),sid)); fixed+=1
            print("  修复:",name,"->",proj)
    c.commit(); c.close()
print("  共修复 %d 个"%fixed)
print("\n【3】Node 日志"); ld="/www/server/nodejs/vhost"
for it in items:
    n=it.get("name")
    if not n: continue
    for lp in ["%s/log/%s.log"%(ld,n),"%s/logs/%s.log"%(ld,n)]:
        if os.path.isfile(lp):
            try: tail="".join(open(lp,"r",encoding="utf-8",errors="ignore").readlines()[-5:]).strip(); print("---",n,"---\n%s\n"%(tail[-600:]if tail else"(空)"))
            except: pass
            break
    else: print(n,": 无日志\n")
print("\n【4】批量启动")
for rnd in range(3):
    items=post("/project/nodejs/get_project_list").get("data")or post("/project/nodejs/get_project_list").get("list")or[]
    to_start=[it for it in items if it.get("name") and not it.get("run")]
    if not to_start: print("  全部已运行"); break
    print("  第%d轮: %d 个"%(rnd+1,len(to_start)))
    for it in to_start:
        n=it.get("name")
        if not n: continue
        try:
            for port in ports(it): [subprocess.call("kill -9 %s 2>/dev/null"%pid,shell=True) for pid in pids(port)]
            pf="/www/server/nodejs/vhost/pids/%s.pid"%n
            if os.path.exists(pf): open(pf,"w").write("0")
            post("/project/nodejs/stop_project",{"project_name":n}); time.sleep(0.5)
            r=post("/project/nodejs/start_project",{"project_name":n})
            print("    %s: %s"%(n,"OK" if r.get("status") or "成功" in str(r.get("msg","")) else "FAIL"))
        except: print("    %s: ERR"%n)
        time.sleep(2)
    time.sleep(10)
print("\n【5】最终状态"); items2=post("/project/nodejs/get_project_list").get("data")or post("/project/nodejs/get_project_list").get("list")or[]
run_c=sum(1 for x in items2 if x.get("run")); print("  运行 %d/%d"%(run_c,len(items2)))
for it in items2: print("    %s: %s"%(it.get("name"),"运行中" if it.get("run") else "未启动"))
print("\n--- 修复后负载 ---"); subprocess.call("uptime",shell=True)
PY
echo ""
echo "========== 完成 =========="

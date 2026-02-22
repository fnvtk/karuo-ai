#!/bin/bash
# kr宝塔 中文目录改英文迁移 - 在宝塔面板「终端」中执行
# 1. 删映射 2. 重命名目录 3. 更新 site.db 4. 更新 Nginx 5. 只用宝塔 Nginx 6. 启动 Node

echo "=== kr宝塔 中文目录改英文迁移 ==="

# 1. 停止 Node（面板先到 Node 项目 手动停止，或下方 API）
echo ""
echo "【1】停止 Node"
python3 -c '
import hashlib,json,time,urllib.request,urllib.parse,ssl
ssl._create_default_https_context=ssl._create_unverified_context
K="qcWubCdlfFjS2b2DMT1lzPFaDfmv1cBT"
t=int(time.time())
tk=hashlib.md5((str(t)+hashlib.md5(K.encode()).hexdigest()).encode()).hexdigest()
def post(p,d=None):
    r=urllib.request.Request("https://127.0.0.1:9988"+p,data=urllib.parse.urlencode({"request_time":t,"request_token":tk,**({}if d is None else d)}).encode())
    return json.loads(urllib.request.urlopen(r,timeout=15).read().decode())
for it in post("/project/nodejs/get_project_list").get("data")or post("/project/nodejs/get_project_list").get("list")or[]:
    n=it.get("name")
    if n: 
        try: post("/project/nodejs/stop_project",{"project_name":n});print("  stop:",n)
        except: pass
        time.sleep(0.3)
'
sleep 3

# 2. 删除符号链接
echo ""
echo "【2】删除符号链接"
cd /www/wwwroot
for x in ext client self archive test; do [ -L "$x" ] && rm -f "$x" && echo "  rm $x"; done

# 3. 重命名
echo ""
echo "【3】重命名目录"
cd /www/wwwroot
([ -d "扩展" ] && [ ! -e "ext" ] && mv 扩展 ext && echo "  扩展->ext") || true
([ -d "客户" ] && [ ! -e "client" ] && mv 客户 client && echo "  客户->client") || true
([ -d "自营" ] && [ ! -e "self" ] && mv 自营 self && echo "  自营->self") || true
([ -d "self/玩值" ] && [ ! -e "self/wanzhi" ] && mv self/玩值 self/wanzhi && echo "  玩值->wanzhi") || true
([ -d "ext/小工具" ] && [ ! -e "ext/tools" ] && mv ext/小工具 ext/tools && echo "  小工具->tools") || true
([ -d "归档" ] && [ ! -e "archive" ] && mv 归档 archive && echo "  归档->archive") || true
([ -d "测试" ] && [ ! -e "test" ] && mv 测试 test && echo "  测试->test") || true

# 4. 更新 site.db
echo ""
echo "【4】更新 site.db"
python3 << 'PYDB'
import json,os,sqlite3
R=[("/www/wwwroot/自营/玩值/","/www/wwwroot/self/wanzhi/"),("/www/wwwroot/自营/","/www/wwwroot/self/"),("/www/wwwroot/扩展/小工具/","/www/wwwroot/ext/tools/"),("/www/wwwroot/扩展/","/www/wwwroot/ext/"),("/www/wwwroot/客户/","/www/wwwroot/client/"),("/www/wwwroot/归档/","/www/wwwroot/archive/"),("/www/wwwroot/测试/","/www/wwwroot/test/")]
def rp(s):
    if not s: return s
    for a,b in R: s=s.replace(a,b)
    return s
def ro(o):
    if isinstance(o,dict): return {k:ro(v) for k,v in o.items()}
    if isinstance(o,list): return [ro(x) for x in o]
    if isinstance(o,str) and "/www/wwwroot/" in o: return rp(o)
    return o
db="/www/server/panel/data/db/site.db"
if os.path.isfile(db):
    c=sqlite3.connect(db)
    cur=c.cursor()
    cur.execute("SELECT id,path,project_config FROM sites")
    n=0
    for row in cur.fetchall():
        sid,path,cfg=row[0],row[1]or"",row[2]or"{}"
        np=rp(path)
        try: nc=json.dumps(ro(json.loads(cfg)),ensure_ascii=False)
        except: nc=rp(cfg)
        if np!=path or nc!=cfg: cur.execute("UPDATE sites SET path=?,project_config=? WHERE id=?",(np,nc,sid)); n+=1
    c.commit();c.close()
    print("  更新%d条"%n)
PYDB

# 5. 更新 Nginx
echo ""
echo "【5】更新 Nginx 配置"
for d in /www/server/panel/vhost/nginx /www/server/nginx/conf/vhost; do
  [ -d "$d" ] || continue
  for f in "$d"/*.conf; do
    [ -f "$f" ] || continue
    if grep -qE '自营|扩展|客户|玩值|小工具|归档|测试' "$f" 2>/dev/null; then
      sed -i 's|/www/wwwroot/自营/玩值/|/www/wwwroot/self/wanzhi/|g; s|/www/wwwroot/自营/|/www/wwwroot/self/|g; s|/www/wwwroot/扩展/小工具/|/www/wwwroot/ext/tools/|g; s|/www/wwwroot/扩展/|/www/wwwroot/ext/|g; s|/www/wwwroot/客户/|/www/wwwroot/client/|g; s|/www/wwwroot/归档/|/www/wwwroot/archive/|g; s|/www/wwwroot/测试/|/www/wwwroot/test/|g' "$f"
      echo "  更新: $f"
    fi
  done
done

# 6. 只用宝塔 Nginx
echo ""
echo "【6】Nginx 只用宝塔版"
killall nginx 2>/dev/null || true
sleep 2
/www/server/nginx/sbin/nginx -c /www/server/nginx/conf/nginx.conf 2>/dev/null
sleep 1
nginx -t 2>/dev/null && nginx -s reload 2>/dev/null
echo "  宝塔 Nginx 已启动"

# 7. 更新 Node 启动命令
echo ""
echo "【7】更新 Node 启动命令"
python3 << 'PYNC'
import json,sqlite3
P={"玩值大屏":"/www/wwwroot/self/wanzhi/玩值大屏","tongzhi":"/www/wwwroot/self/wanzhi/tongzhi","is_phone":"/www/wwwroot/self/kr/kr-phone","ai_hair":"/www/wwwroot/client/ai_hair","AITOUFA":"/www/wwwroot/ext/tools/AITOUFA","wzdj":"/www/wwwroot/self/wzdj","zhiji":"/www/wwwroot/self/zhiji","ymao":"/www/wwwroot/ext/ymao","zhaoping":"/www/wwwroot/client/zhaoping","神射手":"/www/wwwroot/self/kr/kr-use","word":"/www/wwwroot/self/word"}
db="/www/server/panel/data/db/site.db"
if __import__("os").path.isfile(db):
    c=sqlite3.connect(db)
    cur=c.cursor()
    cur.execute("SELECT id,name,project_config FROM sites WHERE project_type='Node'")
    for row in cur.fetchall():
        sid,name,cfg=row[0],row[1],row[2]or"{}"
        path=P.get(name)
        if path:
            try: j=json.loads(cfg)
            except: j={}
            cmd="cd %s && (pnpm start 2>/dev/null || npm run start)"%path
            j["project_script"]=j["run_cmd"]=cmd
            cur.execute("UPDATE sites SET project_config=? WHERE id=?",(json.dumps(j,ensure_ascii=False),sid))
            print("  ",name)
    c.commit();c.close()
PYNC

# 8. 启动 Node
echo ""
echo "【8】启动 Node 项目"
python3 -c '
import hashlib,json,time,urllib.request,urllib.parse,ssl,subprocess,re,os
ssl._create_default_https_context=ssl._create_unverified_context
K="qcWubCdlfFjS2b2DMT1lzPFaDfmv1cBT"
def sign():
    t=int(time.time())
    return {"request_time":t,"request_token":hashlib.md5((str(t)+hashlib.md5(K.encode()).hexdigest()).encode()).hexdigest()}
def post(p,d=None):
    pl=sign()
    if d: pl.update(d)
    r=urllib.request.Request("https://127.0.0.1:9988"+p,data=urllib.parse.urlencode(pl).encode())
    return json.loads(urllib.request.urlopen(r,timeout=30).read().decode())
def pids(port):
    try: return {int(x) for x in re.findall(r"pid=(\d+)",subprocess.check_output("ss -tlnp 2>/dev/null | grep \":%s \" || true"%port,shell=True).decode())}
    except: return set()
def ports(it):
    cfg=it.get("project_config") or {}
    if isinstance(cfg,str): cfg=json.loads(cfg) if cfg else {}
    p=[]
    if cfg.get("port"): p.append(int(cfg["port"]))
    p.extend(int(m) for m in re.findall(r"-p\s*(\d+)",str(cfg.get("project_script",""))))
    return p
items=post("/project/nodejs/get_project_list").get("data")or post("/project/nodejs/get_project_list").get("list")or[]
for it in items:
    n=it.get("name")
    if not n: continue
    try:
        for port in ports(it):
            for pid in pids(port): subprocess.call("kill -9 %s 2>/dev/null"%pid,shell=True)
        pf="/www/server/nodejs/vhost/pids/%s.pid"%n
        if os.path.exists(pf): open(pf,"w").write("0")
        post("/project/nodejs/stop_project",{"project_name":n})
        time.sleep(0.5)
        r=post("/project/nodejs/start_project",{"project_name":n})
        print("  %s: %s"%(n,"OK" if r.get("status") or "成功" in str(r.get("msg","")) else "FAIL"))
    except: print("  %s: ERR"%n)
    time.sleep(1)
time.sleep(5)
r2=post("/project/nodejs/get_project_list")
items2=r2.get("data")or r2.get("list")or[]
print("  运行 %d/%d"%(sum(1 for x in items2 if x.get("run")),len(items2)))
'
echo ""
echo "=== 完成 ==="

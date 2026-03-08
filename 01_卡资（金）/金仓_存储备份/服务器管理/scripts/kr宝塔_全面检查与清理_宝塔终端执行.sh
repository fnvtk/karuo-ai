#!/bin/bash
# kr宝塔 全面检查：进程、病毒可疑项、卡顿，并清理
# 执行：宝塔面板 → 终端 或 SSH

echo "========== 全面检查与清理 =========="

echo ""
echo "【1】负载与 CPU TOP15"
uptime
ps aux --sort=-%cpu 2>/dev/null | head -16

echo ""
echo "【2】可疑进程检测（矿机/病毒常见名）"
for p in kdevtmpfsi kinsing xmrig miner; do
  found=$(ps aux | grep -E "$p" | grep -v grep 2>/dev/null)
  if [ -n "$found" ]; then
    echo "  可疑: $found"
    ps aux | grep -E "$p" | grep -v grep | awk '{print $2}' | xargs -r kill -9 2>/dev/null
  fi
done
echo "  检查完成"

echo ""
echo "【3】crontab 与定时任务"
crontab -l 2>/dev/null || echo "  无 crontab"
ls -la /etc/cron.d/ 2>/dev/null | head -10
grep -r "wget\|curl.*\|\|" /var/spool/cron/ /etc/cron.d/ 2>/dev/null | head -5 || true

echo ""
echo "【4】/tmp 与 /var/tmp 可疑可执行文件"
find /tmp /var/tmp -type f -executable 2>/dev/null | head -10 || true

echo ""
echo "【5】PM2 与 Node 清理"
pm2 kill 2>/dev/null || true
systemctl stop pm2-root 2>/dev/null || true
systemctl disable pm2-root 2>/dev/null || true
pkill -9 -f "pm2" 2>/dev/null || true
for pid in $(ps aux | awk '$3>80 && /node|npm|pnpm/ && !/grep/ {print $2}' 2>/dev/null); do
  kill -9 $pid 2>/dev/null
done
pkill -9 -f "node.*www/wwwroot" 2>/dev/null || true
sleep 2

echo ""
echo "【6】通过宝塔 Node 修复并启动"
python3 << 'PY'
import hashlib,json,os,sqlite3,time,urllib.request,urllib.parse,ssl
ssl._create_default_https_context=ssl._create_unverified_context
P,K="https://127.0.0.1:9988","qcWubCdlfFjS2b2DMT1lzPFaDfmv1cBT"
def sg(): t=int(time.time()); return {"request_time":t,"request_token":hashlib.md5((str(t)+hashlib.md5(K.encode()).hexdigest()).encode()).hexdigest()}
def post(p,d=None): pl=sg(); (pl.update(d) if d else None); r=urllib.request.Request(P+p,data=urllib.parse.urlencode(pl).encode()); return json.loads(urllib.request.urlopen(r,timeout=25).read().decode())
PATH_FB={"玩值大屏":["/www/wwwroot/self/wanzhi/玩值大屏","/www/wwwroot/self/wanzhi/玩值"],"tongzhi":["/www/wwwroot/self/wanzhi/tongzhi","/www/wwwroot/self/wanzhi/tong"],"神射手":["/www/wwwroot/self/kr/kr-use","/www/wwwroot/self/kr/kr-users"],"AITOUFA":["/www/wwwroot/ext/tools/AITOUFA","/www/wwwroot/ext/tools/AITOL"]}
items=post("/project/nodejs/get_project_list").get("data")or[]
for it in items:
    if it.get("name"): post("/project/nodejs/stop_project",{"project_name":it["name"]}); time.sleep(0.3)
time.sleep(3)
db="/www/server/panel/data/db/site.db"
if os.path.isfile(db):
    c=sqlite3.connect(db); cur=c.cursor(); cur.execute("SELECT id,name,path,project_config FROM sites WHERE project_type='Node'")
    for row in cur.fetchall():
        sid,name,path,cfg=row[0],row[1],row[2],row[3]or"{}"
        path=(path or"").strip(); cfg=json.loads(cfg) if cfg else {}
        proj=cfg.get("path")or cfg.get("project_path")or path
        if not proj or not os.path.isdir(proj):
            for p in PATH_FB.get(name,[]):
                if os.path.isdir(p): proj=p; break
        if proj and os.path.isdir(proj):
            cmd="cd %s && (pnpm start 2>/dev/null || npm run start)"%proj
            cfg["project_script"]=cfg["run_cmd"]=cmd; cfg["path"]=proj
            cur.execute("UPDATE sites SET path=?,project_config=? WHERE id=?",(proj,json.dumps(cfg,ensure_ascii=False),sid))
    c.commit(); c.close()
for rnd in range(3):
    items=post("/project/nodejs/get_project_list").get("data")or[]
    to_start=[it for it in items if it.get("name") and not it.get("run")]
    if not to_start: break
    for it in to_start:
        if it.get("name"): post("/project/nodejs/start_project",{"project_name":it["name"]}); time.sleep(1.5)
    time.sleep(8)
run=sum(1 for x in (post("/project/nodejs/get_project_list").get("data")or[]) if x.get("run"))
print("  运行 %d 个 Node" % run)
PY

echo ""
echo "【7】清理后负载"
uptime
echo ""
echo "========== 完成 =========="

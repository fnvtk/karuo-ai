#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
腾讯云 TAT：kr宝塔 运行堵塞 + Node 深度修复
1. 运行堵塞诊断：负载/CPU/TOP 进程、结束异常 node 进程
2. 停止全部 Node、修复 site.db 启动命令、查 Node 日志
3. 批量启动 Node，验证状态
凭证：00_账号与API索引.md
"""
import base64
import json
import os
import re
import sys
import time

KR_INSTANCE_ID = "ins-aw0tnqjo"
REGION = "ap-guangzhou"

SHELL_SCRIPT = r'''#!/bin/bash
echo "========== kr宝塔 运行堵塞 + Node 深度修复 =========="

# 【-1】确保宝塔面板监听 9988
echo ""
echo "【-1】宝塔面板"
if ! ss -tlnp 2>/dev/null | grep -q ':9988 '; then
  echo "  启动宝塔面板..."
  /etc/init.d/bt start 2>/dev/null || /www/server/panel/bt start 2>/dev/null || true
  sleep 8
fi
ss -tlnp 2>/dev/null | grep 9988 || echo "  9988 未监听，API 可能失败"

# 【0】运行堵塞诊断
echo ""
echo "【0】运行堵塞诊断"
echo "--- 负载 ---"
uptime
echo "--- 内存 ---"
free -m | head -2
echo "--- CPU TOP10 ---"
ps aux --sort=-%cpu 2>/dev/null | head -11
echo "--- 结束异常 node/npm/pnpm 进程(占用>80%%CPU) ---"
for pid in $(ps aux | awk '$3>80 && /node|npm|pnpm/ && !/grep/ {print $2}' 2>/dev/null); do
  echo "  kill $pid"; kill -9 $pid 2>/dev/null
done
sleep 2

python3 - << 'PYMAIN'
import hashlib, json, os, re, sqlite3, subprocess, time, urllib.request, urllib.parse, ssl

ssl._create_default_https_context = ssl._create_unverified_context
PANEL, K = "https://127.0.0.1:9988", "qcWubCdlfFjS2b2DMT1lzPFaDfmv1cBT"

def sign():
    t = int(time.time())
    s = str(t) + hashlib.md5(K.encode()).hexdigest()
    return {"request_time": t, "request_token": hashlib.md5(s.encode()).hexdigest()}
def post(p, d=None):
    pl = sign()
    if d: pl.update(d)
    r = urllib.request.Request(PANEL + p, data=urllib.parse.urlencode(pl).encode())
    with urllib.request.urlopen(r, timeout=25) as resp:
        return json.loads(resp.read().decode())
def pids(port):
    try:
        o = subprocess.check_output("ss -tlnp 2>/dev/null | grep ':%s ' || true" % port, shell=True, universal_newlines=True)
        return {int(x) for x in re.findall(r"pid=(\d+)", o)}
    except: return set()
def ports(it):
    cfg = it.get("project_config") or {}
    if isinstance(cfg, str):
        try: cfg = json.loads(cfg)
        except: cfg = {}
    ps = []
    if cfg.get("port"): ps.append(int(cfg["port"]))
    for m in re.findall(r"-p\s*(\d+)", str(cfg.get("project_script",""))): ps.append(int(m))
    return sorted(set(ps))

# 项目名 -> 可能路径（site.db 路径不存在时兜底）
PATH_FALLBACK = {
    "玩值大屏": ["/www/wwwroot/self/wanzhi/玩值大屏", "/www/wwwroot/self/wanzhi/玩值"],
    "tongzhi": ["/www/wwwroot/self/wanzhi/tongzhi", "/www/wwwroot/self/wanzhi/tong"],
    "神射手": ["/www/wwwroot/self/kr/kr-use", "/www/wwwroot/self/kr/kr-users"],
    "AITOUFA": ["/www/wwwroot/ext/tools/AITOUFA", "/www/wwwroot/ext/tools/AITOL"],
}

# 【1】停止全部 Node
print("\n【1】停止 Node 项目")
r0 = post("/project/nodejs/get_project_list")
items = r0.get("data") or r0.get("list") or []
for it in items:
    name = it.get("name")
    if not name: continue
    try:
        for port in ports(it):
            for pid in pids(port): subprocess.call("kill -9 %s 2>/dev/null" % pid, shell=True)
        pf = "/www/server/nodejs/vhost/pids/%s.pid" % name
        if os.path.exists(pf): open(pf, "w").write("0")
        post("/project/nodejs/stop_project", {"project_name": name})
        print("  停: %s" % name)
    except Exception as e: print("  停 %s: %s" % (name, str(e)[:40]))
    time.sleep(0.4)
time.sleep(4)

# 【2】修复 site.db + 查日志
print("\n【2】修复 site.db 启动命令")
db = "/www/server/panel/data/db/site.db"
fixed = 0
if os.path.isfile(db):
    conn = sqlite3.connect(db)
    c = conn.cursor()
    c.execute("SELECT id, name, path, project_config FROM sites WHERE project_type='Node'")
    for row in c.fetchall():
        sid, name, path, cfg_str = row[0], row[1], row[2], row[3] or "{}"
        path = (path or "").strip()
        try: cfg = json.loads(cfg_str) if cfg_str else {}
        except: cfg = {}
        proj_path = cfg.get("path") or cfg.get("project_path") or path
        if not proj_path or not os.path.isdir(proj_path):
            for p in PATH_FALLBACK.get(name, []):
                if os.path.isdir(p): proj_path = p; break
        if not proj_path or not os.path.isdir(proj_path):
            print("  跳过 %s (路径不存在)" % name)
            continue
        cmd = "cd %s && (pnpm start 2>/dev/null || npm run start)" % proj_path
        old = str(cfg.get("project_script") or cfg.get("run_cmd") or "").strip()
        if "cd " not in old or proj_path not in old:
            cfg["project_script"] = cfg["run_cmd"] = cmd
            cfg["path"] = proj_path
            c.execute("UPDATE sites SET path=?, project_config=? WHERE id=?", (proj_path, json.dumps(cfg, ensure_ascii=False), sid))
            fixed += 1
            print("  修复: %s -> %s" % (name, proj_path))
    conn.commit()
    conn.close()
print("  共修复 %d 个" % fixed)

# 【3】Node 日志（每个项目最后 5 行）
print("\n【3】Node 项目日志（最后 5 行）")
log_dir = "/www/server/nodejs/vhost"
for it in items:
    name = it.get("name")
    if not name: continue
    for lp in ["%s/log/%s.log" % (log_dir, name), "%s/logs/%s.log" % (log_dir, name)]:
        if os.path.isfile(lp):
            try:
                lines = open(lp, "r", encoding="utf-8", errors="ignore").readlines()
                tail = "".join(lines[-5:]).strip()
                if tail: print("  --- %s ---\n%s" % (name, tail[-800:]))
            except: pass
            break
    else:
        print("  %s: 无日志文件" % name)
    print("")

# 【4】批量启动（3 轮）
print("\n【4】批量启动 Node")
for rnd in range(3):
    r1 = post("/project/nodejs/get_project_list")
    items = r1.get("data") or r1.get("list") or []
    to_start = [it for it in items if it.get("name") and not it.get("run")]
    if not to_start: print("  全部已运行"); break
    print("  第%d轮: %d 个待启动" % (rnd + 1, len(to_start)))
    for it in to_start:
        name = it.get("name")
        if not name: continue
        try:
            for port in ports(it):
                for pid in pids(port): subprocess.call("kill -9 %s 2>/dev/null" % pid, shell=True)
            pf = "/www/server/nodejs/vhost/pids/%s.pid" % name
            if os.path.exists(pf): open(pf, "w").write("0")
            post("/project/nodejs/stop_project", {"project_name": name})
            time.sleep(0.5)
            r = post("/project/nodejs/start_project", {"project_name": name})
            ok = r.get("status") is True or "成功" in str(r.get("msg", ""))
            print("    %s: %s" % (name, "OK" if ok else "FAIL"))
        except Exception as e: print("    %s: ERR" % name)
        time.sleep(2)
    time.sleep(10)

# 【5】最终状态 + 负载
print("\n【5】最终状态")
r2 = post("/project/nodejs/get_project_list")
items2 = r2.get("data") or r2.get("list") or []
run_c = sum(1 for x in items2 if x.get("run"))
print("  运行 %d / %d" % (run_c, len(items2)))
for it in items2:
    print("    %s: %s" % (it.get("name"), "运行中" if it.get("run") else "未启动"))
print("\n--- 修复后负载 ---")
subprocess.call("uptime", shell=True)
subprocess.call("ps aux --sort=-%cpu | head -6", shell=True)
PYMAIN

echo ""
echo "========== 完成 =========="
'''

def _read_creds():
    d = os.path.dirname(os.path.abspath(__file__))
    for _ in range(6):
        if os.path.isfile(os.path.join(d, "运营中枢", "工作台", "00_账号与API索引.md")):
            with open(os.path.join(d, "运营中枢", "工作台", "00_账号与API索引.md")) as f:
                t = f.read()
            sid = skey = None
            for line in t.splitlines():
                m = re.search(r"SecretId[^|]*\|\s*`([^`]+)`", line, re.I)
                if m and "AKID" in m.group(1): sid = m.group(1).strip()
                m = re.search(r"SecretKey\s*\|\s*`([^`]+)`", line, re.I)
                if m: skey = m.group(1).strip()
            return sid or os.environ.get("TENCENTCLOUD_SECRET_ID"), skey or os.environ.get("TENCENTCLOUD_SECRET_KEY")
        d = os.path.dirname(d)
    return None, None


def main():
    sid, skey = _read_creds()
    if not sid or not skey:
        print("❌ 未配置腾讯云凭证"); return 1
    try:
        from tencentcloud.common import credential
        from tencentcloud.tat.v20201028 import tat_client, models
    except ImportError:
        print("pip install tencentcloud-sdk-python-tat"); return 1

    cred = credential.Credential(sid, skey)
    client = tat_client.TatClient(cred, REGION)
    req = models.RunCommandRequest()
    req.Content = base64.b64encode(SHELL_SCRIPT.encode("utf-8")).decode()
    req.InstanceIds = [KR_INSTANCE_ID]
    req.CommandType = "SHELL"
    req.Timeout = 600
    req.CommandName = "kr宝塔_运行堵塞与Node深度修复"
    resp = client.RunCommand(req)
    inv_id = resp.InvocationId
    print("✅ TAT 已下发 InvocationId:", inv_id)
    print("  步骤: 运行堵塞诊断 → 停 Node → 修复 site.db → 查日志 → 批量启动")
    print("  等待 180s...")
    time.sleep(180)

    try:
        req2 = models.DescribeInvocationTasksRequest()
        f = models.Filter()
        f.Name, f.Values = "invocation-id", [inv_id]
        req2.Filters = [f]
        r2 = client.DescribeInvocationTasks(req2)
        for t in (r2.InvocationTaskSet or []):
            print("\n状态:", getattr(t, "TaskStatus", ""))
            tr = getattr(t, "TaskResult", None)
            if tr:
                j = json.loads(tr) if isinstance(tr, str) else {}
                out = j.get("Output", "")
                if out:
                    try: out = base64.b64decode(out).decode("utf-8", errors="replace")
                    except: pass
                    print(out[:8000])
    except Exception as e:
        print("查询:", e)
    return 0


if __name__ == "__main__":
    sys.exit(main())

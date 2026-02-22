#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
腾讯云 TAT：kr宝塔 全量修复
1. Nginx：确保使用宝塔 Nginx（若系统 Nginx 在运行则 kill 后启动宝塔 Nginx）
2. Node 项目：全部在宝塔 Node 下启动（run=False 的逐一 stop→清端口→start）
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
echo "=== kr宝塔 全量修复：宝塔面板 + Nginx(仅宝塔) + 全部 Node 项目 ==="

# 0. 宝塔面板：确保 9988 可访问
echo ""
echo "【0】宝塔面板检查"
if ! ss -tlnp 2>/dev/null | grep -q ':9988 '; then
  echo "  9988 未监听，启动宝塔面板..."
  /etc/init.d/bt start 2>/dev/null || /www/server/panel/bt start 2>/dev/null || true
  sleep 5
fi
echo "  面板状态检查完成"

# 1. Nginx：强制使用宝塔 Nginx（禁止系统 /usr/sbin/nginx）
echo ""
echo "【1】Nginx 强制宝塔化（禁用系统 nginx）"
# 若有系统 nginx（/usr/sbin/nginx）则全部杀掉
ps aux | grep nginx | grep -v grep | grep -q "/usr/sbin/nginx" && {
  echo "  检测到系统 Nginx，切为宝塔 Nginx..."; killall nginx 2>/dev/null || true; sleep 2;
}
# 确保宝塔 Nginx 运行（/www/server/nginx）
pgrep -f "/www/server/nginx" >/dev/null 2>&1 || /www/server/nginx/sbin/nginx -c /www/server/nginx/conf/nginx.conf
nginx -t 2>/dev/null && nginx -s reload 2>/dev/null || true
echo "  Nginx 已使用宝塔版本"

# 2. 全部 Node 项目批量启动（宝塔 API）
echo ""
echo "【2】Node 项目批量启动（宝塔 API）"
python3 - << 'PYEOF'
import hashlib, json, os, re, subprocess, time, urllib.request, urllib.parse, ssl
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
    with urllib.request.urlopen(r, timeout=30) as resp:
        return json.loads(resp.read().decode())
def pids(port):
    try:
        o = subprocess.check_output("ss -tlnp 2>/dev/null | grep ':%s ' || true" % port, shell=True, universal_newlines=True)
        return sorted({int(x) for x in re.findall(r"pid=(\d+)", o)})
    except: return []
def ports(it):
    cfg = it.get("project_config") or {}
    if isinstance(cfg, str):
        try: cfg = json.loads(cfg)
        except: cfg = {}
    ps = []
    if cfg.get("port"): ps.append(int(cfg["port"]))
    for m in re.findall(r"-p\s*(\d+)", str(cfg.get("project_script",""))): ps.append(int(m))
    return sorted(set(ps))

items = post("/project/nodejs/get_project_list").get("data") or post("/project/nodejs/get_project_list").get("list") or []
to_start = [it for it in items if it.get("name") and it.get("run") is not True]
print("  未运行项目数: %d / %d" % (len(to_start), len(items)))
for it in to_start:
    name = it.get("name") or it.get("project_name")
    if not name: continue
    try:
        for port in ports(it):
            for pid in pids(port):
                try: subprocess.call("kill -9 %s 2>/dev/null" % pid, shell=True)
                except: pass
        pf = "/www/server/nodejs/vhost/pids/%s.pid" % name
        if os.path.exists(pf):
            try: open(pf,"w").write("0")
            except: pass
        post("/project/nodejs/stop_project", {"project_name": name})
        time.sleep(0.5)
        r = post("/project/nodejs/start_project", {"project_name": name})
        ok = r.get("status") is True or "成功" in str(r.get("msg",""))
        print("  %s: %s" % (name, "OK" if ok else "FAIL"))
    except Exception as e:
        print("  %s: ERR %s" % (name, str(e)[:60]))
    time.sleep(1)

time.sleep(5)
items2 = post("/project/nodejs/get_project_list").get("data") or []
run_c = sum(1 for x in items2 if x.get("run"))
print("  结果: 运行 %d / 共 %d" % (run_c, len(items2)))
PYEOF

echo ""
echo "=== 完成 ==="
'''

def _read_creds():
    d = os.path.dirname(os.path.abspath(__file__))
    for _ in range(6):
        root = d
        if os.path.isfile(os.path.join(root, "运营中枢", "工作台", "00_账号与API索引.md")):
            path = os.path.join(root, "运营中枢", "工作台", "00_账号与API索引.md")
            with open(path, "r", encoding="utf-8") as f:
                text = f.read()
            sid = skey = None
            in_tx = False
            for line in text.splitlines():
                if "### 腾讯云" in line:
                    in_tx = True
                    continue
                if in_tx and line.strip().startswith("###"):
                    break
                if not in_tx:
                    continue
                m = re.search(r"\|\s*[^|]*(?:SecretId|密钥)[^|]*\|\s*`([^`]+)`", line, re.I)
                if m and m.group(1).strip().startswith("AKID"):
                    sid = m.group(1).strip()
                m = re.search(r"\|\s*SecretKey\s*\|\s*`([^`]+)`", line, re.I)
                if m:
                    skey = m.group(1).strip()
            return sid or None, skey or None
        d = os.path.dirname(d)
    return None, None


def main():
    sid = os.environ.get("TENCENTCLOUD_SECRET_ID")
    skey = os.environ.get("TENCENTCLOUD_SECRET_KEY")
    if not sid or not skey:
        sid, skey = _read_creds()
    if not sid or not skey:
        print("❌ 未配置腾讯云 SecretId/SecretKey")
        return 1
    try:
        from tencentcloud.common import credential
        from tencentcloud.tat.v20201028 import tat_client, models
    except ImportError:
        print("pip install tencentcloud-sdk-python-tat")
        return 1

    cred = credential.Credential(sid, skey)
    client = tat_client.TatClient(cred, REGION)
    req = models.RunCommandRequest()
    req.Content = base64.b64encode(SHELL_SCRIPT.encode()).decode()
    req.InstanceIds = [KR_INSTANCE_ID]
    req.CommandType = "SHELL"
    req.Timeout = 180
    req.CommandName = "kr宝塔_全量修复"
    resp = client.RunCommand(req)
    print("✅ TAT 已下发 InvocationId:", resp.InvocationId)
    print("  步骤: Nginx 强制宝塔 → 全部 Node 项目启动")
    print("  等待 90s...")
    time.sleep(90)
    try:
        req2 = models.DescribeInvocationTasksRequest()
        f = models.Filter()
        f.Name = "invocation-id"
        f.Values = [resp.InvocationId]
        req2.Filters = [f]
        r2 = client.DescribeInvocationTasks(req2)
        for t in (r2.InvocationTaskSet or []):
            st = getattr(t, "TaskStatus", "")
            print("  状态:", st)
            tr = getattr(t, "TaskResult", None)
            if tr:
                j = json.loads(tr) if isinstance(tr, str) else (vars(tr) if hasattr(tr, "__dict__") else {})
                out = j.get("Output", "")
                if out:
                    try: out = base64.b64decode(out).decode("utf-8", errors="replace")
                    except: pass
                    print("  输出:\n", (out or "")[:4000])
                err = j.get("Error", "")
                if err:
                    try: err = base64.b64decode(err).decode("utf-8", errors="replace")
                    except: pass
                    print("  错误:", (err or "")[:1000])
            elif getattr(t, "Output", None):
                print("  输出:", (t.Output or "")[:4000])
    except Exception as e:
        print("  查询:", e)
    return 0


if __name__ == "__main__":
    sys.exit(main())

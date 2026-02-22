#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
腾讯云 TAT 在 kr宝塔 CVM 上执行 Node 批量修复（无需 SSH）
凭证：00_账号与API索引.md 或环境变量
依赖：pip install tencentcloud-sdk-python-common tencentcloud-sdk-python-tat
"""
import base64
import json
import os
import re
import sys
import time

KR_INSTANCE_ID = "ins-aw0tnqjo"
REGION = "ap-guangzhou"

def _find_karuo_ai_root():
    d = os.path.dirname(os.path.abspath(__file__))
    for _ in range(6):
        if os.path.basename(d) == "卡若AI" or (os.path.isdir(os.path.join(d, "运营中枢")) and os.path.isdir(os.path.join(d, "01_卡资（金）"))):
            return d
        d = os.path.dirname(d)
    return None

def _read_creds():
    root = _find_karuo_ai_root()
    if not root:
        return None, None
    path = os.path.join(root, "运营中枢", "工作台", "00_账号与API索引.md")
    if not os.path.isfile(path):
        return None, None
    with open(path, "r", encoding="utf-8") as f:
        text = f.read()
    secret_id = secret_key = None
    in_tencent = False
    for line in text.splitlines():
        if "### 腾讯云" in line:
            in_tencent = True
            continue
        if in_tencent and line.strip().startswith("###"):
            break
        if not in_tencent:
            continue
        m = re.search(r"\|\s*[^|]*(?:SecretId|密钥)[^|]*\|\s*`([^`]+)`", line, re.I)
        if m:
            val = m.group(1).strip()
            if val.startswith("AKID"):
                secret_id = val
        m = re.search(r"\|\s*SecretKey\s*\|\s*`([^`]+)`", line, re.I)
        if m:
            secret_key = m.group(1).strip()
    return secret_id or None, secret_key or None

# 在服务器上执行的 Node 批量修复脚本（内联）
NODE_FIX_SCRIPT = r'''
import hashlib, json, os, re, subprocess, time, urllib.request, urllib.parse, ssl
ssl._create_default_https_context = ssl._create_unverified_context
PANEL, API_KEY = "https://127.0.0.1:9988", "qcWubCdlfFjS2b2DMT1lzPFaDfmv1cBT"
def sign():
    n = int(time.time())
    s = str(n) + hashlib.md5(API_KEY.encode()).hexdigest()
    return {"request_time": n, "request_token": hashlib.md5(s.encode()).hexdigest()}
def post(p, d=None):
    pl = sign()
    if d: pl.update(d)
    r = urllib.request.Request(PANEL + p, data=urllib.parse.urlencode(pl).encode())
    with urllib.request.urlopen(r, timeout=25) as resp:
        return json.loads(resp.read().decode())
def pids(port):
    try:
        o = subprocess.check_output("ss -tlnp | grep ':%s ' || true" % port, shell=True, universal_newlines=True)
        return sorted({int(x) for x in re.findall(r"pid=(\d+)", o)})
    except: return []
def ports(it):
    cfg = it.get("project_config") or {}
    ps = []
    if cfg.get("port"): ps.append(int(cfg["port"]))
    for m in re.findall(r"-p\s*(\d+)", str(cfg.get("project_script",""))): ps.append(int(m))
    return sorted(set(ps))
items = post("/project/nodejs/get_project_list").get("data") or post("/project/nodejs/get_project_list").get("list") or []
for it in items:
    try:
        name = it.get("name")
        if not name or it.get("run") is True: continue
        for port in ports(it):
            for pid in pids(port):
                try: subprocess.call("kill -9 %s" % pid, shell=True)
                except: pass
        pf = "/www/server/nodejs/vhost/pids/%s.pid" % name
        if os.path.exists(pf):
            try: open(pf,"w").write("0")
            except: pass
        post("/project/nodejs/stop_project", {"project_name": name})
        r = post("/project/nodejs/start_project", {"project_name": name})
        ok = r.get("status") is True or "成功" in str(r.get("msg",""))
        print("%s: %s" % (name, "OK" if ok else "FAIL"))
    except Exception as e:
        print("%s: ERR %s" % (name, str(e)[:80]))
    time.sleep(1)
time.sleep(4)
items2 = post("/project/nodejs/get_project_list").get("data") or []
run_c = sum(1 for x in items2 if x.get("run"))
print("RUN:%d STOP:%d" % (run_c, len(items2)-run_c))
'''

def main():
    secret_id = os.environ.get("TENCENTCLOUD_SECRET_ID")
    secret_key = os.environ.get("TENCENTCLOUD_SECRET_KEY")
    if not secret_id or not secret_key:
        sid, skey = _read_creds()
        secret_id = secret_id or sid
        secret_key = secret_key or skey
    if not secret_id or not secret_key:
        print("❌ 未配置腾讯云 SecretId/SecretKey")
        return 1
    try:
        from tencentcloud.common import credential
        from tencentcloud.tat.v20201028 import tat_client, models
    except ImportError:
        print("请安装: pip install tencentcloud-sdk-python-common tencentcloud-sdk-python-tat")
        return 1

    cred = credential.Credential(secret_id, secret_key)
    client = tat_client.TatClient(cred, REGION)
    req = models.RunCommandRequest()
    req.Content = base64.b64encode(NODE_FIX_SCRIPT.encode()).decode()
    req.InstanceIds = [KR_INSTANCE_ID]
    req.CommandType = "SHELL"
    req.Timeout = 120
    req.CommandName = "NodeBatchFix"
    resp = client.RunCommand(req)
    inv_id = resp.InvocationId
    print("✅ TAT 执行已下发 InvocationId:", inv_id)
    print("  等待 30s 后查询结果...")
    time.sleep(30)
    # 查询执行结果（Filter 方式）
    try:
        req2 = models.DescribeInvocationTasksRequest()
        f = models.Filter()
        f.Name = "invocation-id"
        f.Values = [inv_id]
        req2.Filters = [f]
        resp2 = client.DescribeInvocationTasks(req2)
        for t in (resp2.InvocationTaskSet or []):
            print("  任务:", getattr(t, "InvocationTaskId", t), "状态:", getattr(t, "TaskStatus", "N/A"))
            tr = getattr(t, "TaskResult", None)
            if tr:
                try:
                    j = json.loads(tr) if isinstance(tr, str) else {}
                    out = j.get("Output", "")
                    if out:
                        out = base64.b64decode(out).decode("utf-8", errors="replace")
                        print("  输出:", out[:1200])
                except Exception:
                    pass
    except Exception as e:
        print("  查询结果异常:", e)
    print("=" * 50)
    return 0

if __name__ == "__main__":
    sys.exit(main())

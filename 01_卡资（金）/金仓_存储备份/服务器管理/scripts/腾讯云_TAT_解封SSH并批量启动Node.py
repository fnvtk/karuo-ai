#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
腾讯云 TAT：在 kr宝塔 CVM 上解封 fail2ban SSH + 批量启动 Node（免 SSH）

凭证：00_账号与API索引.md 或环境变量 TENCENTCLOUD_SECRET_ID / TENCENTCLOUD_SECRET_KEY
依赖：pip install tencentcloud-sdk-python-common tencentcloud-sdk-python-tat

用法：python3 腾讯云_TAT_解封SSH并批量启动Node.py [本机IP]
      不传 IP 时默认 211.156.92.72
"""
import base64
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

# Node 批量修复 Python 脚本（与 腾讯云_TAT_Node批量修复.py 一致）
NODE_FIX_B64 = base64.b64encode(r'''
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
    name = it.get("name")
    if not name or it.get("run") is True: continue
    for port in ports(it):
        for pid in pids(port): subprocess.call("kill -9 %s" % pid, shell=True)
    pf = "/www/server/nodejs/vhost/pids/%s.pid" % name
    if os.path.exists(pf): open(pf,"w").write("0")
    post("/project/nodejs/stop_project", {"project_name": name})
    r = post("/project/nodejs/start_project", {"project_name": name})
    ok = r.get("status") is True or "成功" in str(r.get("msg",""))
    print(name, "OK" if ok else "FAIL")
    time.sleep(1)
time.sleep(4)
items2 = post("/project/nodejs/get_project_list").get("data") or []
run_c = sum(1 for x in items2 if x.get("run"))
print("RUN:", run_c, "STOP:", len(items2)-run_c)
'''.encode()).decode()

def build_shell(unban_ip: str) -> str:
    # 白名单：默认 + 当前 IP + 常见办公 IP，防止多网络环境
    allow_ips = "127.0.0.1/8 ::1 " + unban_ip + " 211.156.92.72 140.245.37.56"
    allow_ips = " ".join(dict.fromkeys(allow_ips.split()))  # 去重
    return f'''#!/bin/bash
set -e
IP="{unban_ip}"
echo "=== 1. 永久白名单：将 $IP 等加入 fail2ban（今后不再封禁）==="
mkdir -p /etc/fail2ban/jail.d
echo -e "[DEFAULT]\\nignoreip = {allow_ips}" > /etc/fail2ban/jail.d/99-allow-ckb-ip.conf
echo "  已写入 99-allow-ckb-ip.conf"
echo "=== 2. 重启 fail2ban 并立即解封 $IP ==="
systemctl restart fail2ban 2>/dev/null || service fail2ban restart 2>/dev/null || true
sleep 2
fail2ban-client set sshd unbanip "$IP" 2>/dev/null || true
fail2ban-client set ssh-iptables unbanip "$IP" 2>/dev/null || true
echo "  已解封 $IP"
echo "=== 3. Node 批量启动 ==="
echo "{NODE_FIX_B64}" | base64 -d | python3 -
echo "=== 完成 ==="
'''

def main():
    unban_ip = (sys.argv[1:] or ["211.156.92.72"])[0]

    secret_id = os.environ.get("TENCENTCLOUD_SECRET_ID")
    secret_key = os.environ.get("TENCENTCLOUD_SECRET_KEY")
    if not secret_id or not secret_key:
        sid, skey = _read_creds()
        secret_id = secret_id or sid
        secret_key = secret_key or skey
    if not secret_id or not secret_key:
        print("❌ 未配置腾讯云 SecretId/SecretKey（环境变量或 00_账号与API索引.md）")
        return 1
    try:
        from tencentcloud.common import credential
        from tencentcloud.tat.v20201028 import tat_client, models
    except ImportError:
        print("请安装: pip install tencentcloud-sdk-python-common tencentcloud-sdk-python-tat")
        return 1

    shell = build_shell(unban_ip)
    cred = credential.Credential(secret_id, secret_key)
    client = tat_client.TatClient(cred, REGION)
    req = models.RunCommandRequest()
    req.Content = base64.b64encode(shell.encode()).decode()
    req.InstanceIds = [KR_INSTANCE_ID]
    req.CommandType = "SHELL"
    req.Timeout = 180
    req.CommandName = "UnbanSSH_NodeBatchFix"
    resp = client.RunCommand(req)
    inv_id = resp.InvocationId
    print("✅ 腾讯云 TAT 执行已下发")
    print("   InvocationId:", inv_id)
    print("   解封 IP:", unban_ip)
    print("   等待 60s 后查询结果...")
    time.sleep(60)
    try:
        req2 = models.DescribeInvocationTasksRequest()
        f = models.Filter()
        f.Name = "invocation-id"
        f.Values = [inv_id]
        req2.Filters = [f]
        resp2 = client.DescribeInvocationTasks(req2)
        for t in (resp2.InvocationTaskSet or []):
            print("  任务状态:", getattr(t, "TaskStatus", "N/A"))
            if hasattr(t, "Output") and t.Output:
                print("  输出:\n", t.Output or "")
    except Exception as e:
        print("  查询异常:", e)
    print("=" * 50)
    return 0

if __name__ == "__main__":
    sys.exit(main())

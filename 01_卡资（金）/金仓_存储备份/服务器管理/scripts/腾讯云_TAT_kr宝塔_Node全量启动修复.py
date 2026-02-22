#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
腾讯云 TAT + 宝塔 API：kr宝塔 Node 全量启动修复
1. 修复 site.db 中所有 Node 项目的 project_script（MODULE_NOT_FOUND 根因：node /path 改为 cd /path && npm run start）
2. 停止全部 Node、清端口、批量启动
3. 验证直到全部运行或超时
凭证：00_账号与API索引.md 腾讯云 SecretId/SecretKey，宝塔 API 密钥 qcWubCdlfFjS2b2DMT1lzPFaDfmv1cBT
"""
import base64
import json
import os
import re
import sys
import time

KR_INSTANCE_ID = "ins-aw0tnqjo"
REGION = "ap-guangzhou"
BT_API_KEY = "qcWubCdlfFjS2b2DMT1lzPFaDfmv1cBT"

SHELL_SCRIPT = r'''#!/bin/bash
echo "=== kr宝塔 Node 全量启动修复 ==="

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
    for m in re.findall(r"-p\s*(\d+)", str(cfg.get("project_script", ""))): ps.append(int(m))
    return sorted(set(ps))

# 【1】修复 site.db 启动命令
print("\n【1】修复 site.db 启动命令")
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
        # 从 project_config 取 path 作为项目根目录
        proj_path = cfg.get("path") or cfg.get("project_path") or path
        if not proj_path or not os.path.isdir(proj_path):
            print("  跳过 %s (路径不存在: %s)" % (name, proj_path))
            continue
        old_script = str(cfg.get("project_script") or cfg.get("run_cmd") or "").strip()
        cmd = "cd %s && (pnpm start 2>/dev/null || npm run start)" % proj_path
        if "cd " not in old_script or proj_path not in old_script:
            cfg["project_script"] = cmd
            cfg["run_cmd"] = cmd
            cfg["path"] = proj_path
            c.execute("UPDATE sites SET path=?, project_config=? WHERE id=?", (proj_path, json.dumps(cfg, ensure_ascii=False), sid))
            fixed += 1
            print("  已修复: %s -> %s" % (name, proj_path))
    conn.commit()
    conn.close()
print("  共修复 %d 个项目" % fixed)

# 【2】停止全部 Node
print("\n【2】停止 Node 项目")
r0 = post("/project/nodejs/get_project_list")
items = r0.get("data") or r0.get("list") or []
for it in items:
    name = it.get("name")
    if name:
        try:
            for port in ports(it):
                for pid in pids(port): subprocess.call("kill -9 %s 2>/dev/null" % pid, shell=True)
            pf = "/www/server/nodejs/vhost/pids/%s.pid" % name
            if os.path.exists(pf): open(pf, "w").write("0")
            post("/project/nodejs/stop_project", {"project_name": name})
            print("  停: %s" % name)
        except Exception as e: print("  停 %s: %s" % (name, str(e)[:40]))
        time.sleep(0.5)
time.sleep(3)

# 【3】批量启动（最多3轮）
print("\n【3】批量启动 Node 项目")
for round_num in range(3):
    r1 = post("/project/nodejs/get_project_list")
    items = r1.get("data") or r1.get("list") or []
    to_start = [it for it in items if it.get("name") and not it.get("run")]
    if not to_start:
        print("  全部已运行")
        break
    print("  第%d轮: 待启动 %d 个" % (round_num + 1, len(to_start)))
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
        except Exception as e: print("    %s: ERR %s" % (name, str(e)[:30]))
        time.sleep(1.5)
    time.sleep(8)

# 【4】最终状态
print("\n【4】最终状态")
r2 = post("/project/nodejs/get_project_list")
items2 = r2.get("data") or r2.get("list") or []
run_count = sum(1 for x in items2 if x.get("run"))
total = len(items2)
print("  运行 %d / %d" % (run_count, total))
for it in items2:
    print("    %s: %s" % (it.get("name"), "运行中" if it.get("run") else "未启动"))
PYMAIN

echo ""
echo "=== 完成 ==="
'''

def _read_creds():
    d = os.path.dirname(os.path.abspath(__file__))
    for _ in range(6):
        root = d
        if os.path.isfile(os.path.join(root, "运营中枢", "工作台", "00_账号与API索引.md")):
            with open(os.path.join(root, "运营中枢", "工作台", "00_账号与API索引.md"), "r", encoding="utf-8") as f:
                text = f.read()
            sid = skey = None
            in_tx = False
            for line in text.splitlines():
                if "### 腾讯云" in line or "腾讯云" in line and "Secret" in line: in_tx = True
                if in_tx and "### " in line and "腾讯云" not in line: break
                m = re.search(r"SecretId[^|]*\|\s*`([^`]+)`", line, re.I)
                if m and "AKID" in str(m.group(1)): sid = m.group(1).strip()
                m = re.search(r"SecretKey\s*\|\s*`([^`]+)`", line, re.I)
                if m: skey = m.group(1).strip()
            return sid or os.environ.get("TENCENTCLOUD_SECRET_ID"), skey or os.environ.get("TENCENTCLOUD_SECRET_KEY")
        d = os.path.dirname(d)
    return None, None


def main():
    sid, skey = _read_creds()
    if not sid or not skey:
        print("❌ 未配置腾讯云 SecretId/SecretKey"); return 1
    try:
        from tencentcloud.common import credential
        from tencentcloud.tat.v20201028 import tat_client, models
    except ImportError:
        print("请安装: pip install tencentcloud-sdk-python-tat"); return 1

    cred = credential.Credential(sid, skey)
    client = tat_client.TatClient(cred, REGION)
    req = models.RunCommandRequest()
    req.Content = base64.b64encode(SHELL_SCRIPT.encode("utf-8")).decode()
    req.InstanceIds = [KR_INSTANCE_ID]
    req.CommandType = "SHELL"
    req.Timeout = 300
    req.CommandName = "kr宝塔_Node全量启动修复"
    resp = client.RunCommand(req)
    inv_id = resp.InvocationId
    print("✅ TAT 已下发 InvocationId:", inv_id)
    print("  步骤: 修复 site.db 启动命令 → 停止 Node → 批量启动(3轮) → 验证")
    print("  等待 150s 后查询结果...")
    time.sleep(150)

    try:
        req2 = models.DescribeInvocationTasksRequest()
        f = models.Filter()
        f.Name, f.Values = "invocation-id", [inv_id]
        req2.Filters = [f]
        r2 = client.DescribeInvocationTasks(req2)
        for t in (r2.InvocationTaskSet or []):
            st = getattr(t, "TaskStatus", "")
            print("\n状态:", st)
            tr = getattr(t, "TaskResult", None)
            if tr:
                j = json.loads(tr) if isinstance(tr, str) else {}
                out = j.get("Output", "")
                if out:
                    try:
                        out = base64.b64decode(out).decode("utf-8", errors="replace")
                    except:
                        pass
                    print(out[:7000])
    except Exception as e:
        print("查询失败:", e)
    return 0


if __name__ == "__main__":
    sys.exit(main())

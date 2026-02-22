#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
腾讯云 TAT：在 kr宝塔 上对 word、ai_hair、is_phone 执行：
1. 通过宝塔 API get_project_list 获取项目配置与路径
2. 查看启动日志（cat 常见日志路径）
3. 如发现 MODULE_NOT_FOUND，在项目目录执行 pnpm install（或 npm install）
4. 通过宝塔 API restart_project 重启

全程使用宝塔 API（127.0.0.1）进行操作，凭证见 00_账号与API索引.md
"""
import base64
import os
import re
import sys
import time

KR_INSTANCE_ID = "ins-aw0tnqjo"
REGION = "ap-guangzhou"
TARGET_NAMES = ["word", "ai_hair", "is_phone"]

# 已知项目路径（API 无 path 时的后备）
PATH_MAP = {
    "word": "/www/wwwroot/self/word",
    "ai_hair": "/www/wwwroot/client/ai_hair",
    "is_phone": "/www/wwwroot/self/kr/kr-phone",
}

SHELL_SCRIPT = r'''#!/bin/bash
set -e
echo "=== kr宝塔 word/ai_hair/is_phone 诊断修复（宝塔 API）==="
python3 - << 'PYEOF'
import hashlib, json, os, subprocess, time, urllib.request, urllib.parse, ssl
ssl._create_default_https_context = ssl._create_unverified_context
PANEL, K = "https://127.0.0.1:9988", "qcWubCdlfFjS2b2DMT1lzPFaDfmv1cBT"
PATH_MAP = {"word": "/www/wwwroot/self/word", "ai_hair": "/www/wwwroot/client/ai_hair", "is_phone": "/www/wwwroot/self/kr/kr-phone"}
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

items = post("/project/nodejs/get_project_list").get("data") or post("/project/nodejs/get_project_list").get("list") or []
by_name = {str(it.get("name","")).lower(): it for it in items}

for nm in ["word", "ai_hair", "is_phone"]:
    print("\n--- %s ---" % nm)
    it = by_name.get(nm) or by_name.get(nm.replace("_",""))
    if not it:
        print("  未找到项目，跳过")
        continue
    cfg = it.get("project_config") or {}
    if isinstance(cfg, str):
        try: cfg = json.loads(cfg)
        except: cfg = {}
    path = (it.get("path") or it.get("project_path") or cfg.get("path") or
            cfg.get("project_path") or cfg.get("projectDir") or PATH_MAP.get(nm))
    if not path or not os.path.isdir(path):
        path = PATH_MAP.get(nm)
    print("  路径:", path)
    # 尝试查看日志
    log_paths = [
        "/www/server/nodejs/vhost/log/%s.log" % it.get("name", nm),
        "/www/server/nodejs/vhost/logs/%s.log" % it.get("name", nm),
        os.path.join(path or "", "logs", "out.log"),
        os.path.join(path or "", "log", "out.log"),
    ]
    log_content = ""
    for lp in log_paths:
        try:
            with open(lp, "r", encoding="utf-8", errors="ignore") as f:
                log_content = f.read()[-4000:]
            print("  日志(%s) 尾 200 字符:" % lp)
            print("  ", repr(log_content[-200:]))
            break
        except: pass
    has_mod = "MODULE_NOT_FOUND" in log_content or "Cannot find module" in log_content
    if has_mod and path and os.path.isdir(path):
        print("  检测到 MODULE_NOT_FOUND，执行 pnpm install...")
        try:
            subprocess.check_output("cd '%s' && (pnpm install 2>/dev/null || npm install 2>/dev/null || true)" % path, shell=True, timeout=120)
            print("  依赖安装完成")
        except Exception as e:
            print("  依赖安装异常:", str(e)[:100])
    # 通过 API 重启
    pname = it.get("name") or it.get("project_name") or nm
    try:
        post("/project/nodejs/stop_project", {"project_name": pname})
        time.sleep(1)
        r = post("/project/nodejs/start_project", {"project_name": pname})
        ok = r.get("status") is True or "成功" in str(r.get("msg",""))
        print("  重启:", "OK" if ok else "FAIL", r.get("msg","")[:80])
    except Exception as e:
        print("  重启异常:", str(e)[:100])
    time.sleep(2)

print("\n=== 完成 ===")
PYEOF
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
    req.CommandName = "WordAiHairIsPhone_DiagFix"
    resp = client.RunCommand(req)
    print("✅ TAT 已下发 InvocationId:", resp.InvocationId)
    print("  目标项目: word, ai_hair, is_phone")
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
            print("  状态:", getattr(t, "TaskStatus", ""))
            out = getattr(t, "Output", None) or ""
            if out:
                print("  输出:\n", out[:3500])
    except Exception as e:
        print("  查询:", e)
    return 0


if __name__ == "__main__":
    sys.exit(main())

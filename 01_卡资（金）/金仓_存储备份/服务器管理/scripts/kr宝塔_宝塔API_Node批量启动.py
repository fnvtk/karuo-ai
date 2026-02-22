#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
kr宝塔 43.139.27.93：通过宝塔 API 批量启动未运行的 Node 项目。
界面显示的状态为真实状态，本脚本据此对 run=False 项目执行 start_project。

使用：python3 kr宝塔_宝塔API_Node批量启动.py
需将本机公网 IP 加入 kr宝塔 面板「设置」→「API 接口」→ 白名单。
"""
import time
import hashlib
import json

try:
    import requests
    import urllib3
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
    USE_REQUESTS = True
except ImportError:
    import urllib.request
    import urllib.parse
    import ssl
    ssl._create_default_https_context = ssl._create_unverified_context
    USE_REQUESTS = False

PANEL_URL = "https://43.139.27.93:9988"
API_KEY = "qcWubCdlfFjS2b2DMT1lzPFaDfmv1cBT"

def sign():
    t = int(time.time())
    s = str(t) + hashlib.md5(API_KEY.encode()).hexdigest()
    return {"request_time": t, "request_token": hashlib.md5(s.encode()).hexdigest()}

def post(endpoint, data=None):
    url = PANEL_URL + endpoint
    payload = sign()
    if data:
        payload.update(data)
    if USE_REQUESTS:
        r = requests.post(url, data=payload, timeout=25, verify=False)
        return r.json()
    req = urllib.request.Request(url, data=urllib.parse.urlencode(payload).encode())
    with urllib.request.urlopen(req, timeout=25) as resp:
        return json.loads(resp.read().decode())

def main():
    print("=" * 56)
    print("  kr宝塔 · 宝塔 API 批量启动 Node 项目（以界面真实状态为准）")
    print("=" * 56)

    # 1. 获取项目列表
    print("\n【1】获取 Node 项目列表...")
    try:
        r = post("/project/nodejs/get_project_list")
    except Exception as e:
        if "IP" in str(e) or "校验" in str(e) or "403" in str(e):
            print("  ❌ IP 校验失败。请到 kr宝塔 面板「设置」→「API 接口」将本机公网 IP 加入白名单。")
            return 1
        raise

    if r.get("status") is not True:
        print("  ❌ 获取失败:", r.get("msg", r))
        return 1

    items = r.get("data") or r.get("list") or []
    if not isinstance(items, list):
        print("  ❌ 列表格式异常:", r)
        return 1

    # 2. 筛选未运行项目并启动
    to_start = [it for it in items if it.get("name") and it.get("run") is not True]
    if not to_start:
        print("  所有项目已运行，无需操作。")
        return 0

    print("  未运行项目数:", len(to_start))
    for it in to_start:
        print("    -", it.get("name"))

    print("\n【2】逐项启动...")
    for it in to_start:
        name = it.get("name") or it.get("project_name")
        if not name:
            continue
        try:
            # 先 stop 再 start（清理残留）
            post("/project/nodejs/stop_project", {"project_name": name})
            time.sleep(1)
            r2 = post("/project/nodejs/start_project", {"project_name": name})
            ok = r2.get("status") is True or "成功" in str(r2.get("msg", ""))
            print("  %s: %s" % (name, "OK" if ok else "FAIL - %s" % (r2.get("msg", "")[:80])))
        except Exception as e:
            print("  %s: ERR %s" % (name, str(e)[:80]))
        time.sleep(2)

    # 3. 回查
    print("\n【3】回查运行状态...")
    time.sleep(5)
    try:
        r3 = post("/project/nodejs/get_project_list")
        items2 = r3.get("data") or r3.get("list") or []
        run_cnt = sum(1 for x in items2 if x.get("run") is True)
        for it in items2:
            print("  %s: run=%s listen_ok=%s" % (it.get("name"), it.get("run"), it.get("listen_ok")))
        print("\n  运行中: %d / %d" % (run_cnt, len(items2)))
    except Exception as e:
        print("  回查异常:", e)

    print("=" * 56)
    return 0

if __name__ == "__main__":
    exit(main())

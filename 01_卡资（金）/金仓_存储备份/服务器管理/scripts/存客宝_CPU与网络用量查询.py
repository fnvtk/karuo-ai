#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
存客宝宝塔 42.194.245.239：查询 CPU 与网络用量。
依赖：仅标准库。需将本机 IP 加入存客宝面板「设置」→「API 接口」白名单。
"""
import time
import hashlib
import json
import urllib.request
import urllib.parse
import ssl

PANEL_URL = "https://42.194.245.239:9988"
API_KEY = "TNKjqDv5N1QLOU20gcmGVgr82Z4mXzRi"
ssl._create_default_https_context = ssl._create_unverified_context

def sign():
    t = int(time.time())
    s = str(t) + hashlib.md5(API_KEY.encode()).hexdigest()
    return {"request_time": t, "request_token": hashlib.md5(s.encode()).hexdigest()}

def post(endpoint, data=None):
    url = PANEL_URL + endpoint
    payload = sign()
    if data:
        payload.update(data)
    req = urllib.request.Request(url, data=urllib.parse.urlencode(payload).encode())
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read().decode())
    except Exception as e:
        return {"status": False, "msg": str(e)}

def main():
    print("=" * 56)
    print("  存客宝宝塔 42.194.245.239 · CPU 与网络用量")
    print("=" * 56)

    # 1. 系统总览（CPU、内存、负载、磁盘）
    sys_info = post("/system?action=GetSystemTotal", {})
    if sys_info.get("status") is False or sys_info.get("msg"):
        print("❌ 系统接口:", sys_info.get("msg", sys_info))
        print("\n说明：将本机 IP 加入存客宝面板「设置」→「API 接口」白名单后可重新运行本脚本。")
        return 1
    if "cpuRealUsed" not in sys_info and "load_average" not in sys_info:
        print("❌ 未返回系统数据（可能 IP 未加入 API 白名单）:", sys_info)
        return 1

    print("\n【CPU 与负载】")
    print("  CPU 使用率: %s%%" % sys_info.get("cpuRealUsed", "N/A"))
    print("  负载(1/5/15): %s" % sys_info.get("load_average", "N/A"))
    print("\n【内存】")
    print("  已用: %s%%" % sys_info.get("memRealUsed", "N/A"))
    print("  总/已用: %s / %s" % (sys_info.get("memTotal", "N/A"), sys_info.get("memRealUsed", "N/A")))
    print("\n【磁盘】")
    print("  使用率: %s%%" % sys_info.get("diskPer", "N/A"))

    # 2. 网络状态（实时流量）
    net_info = post("/system?action=GetNetWork", {})
    if net_info.get("status") is False or net_info.get("msg"):
        print("\n【网络】❌", net_info.get("msg", net_info))
        return 0
    if isinstance(net_info, dict) and (net_info.get("net_in") is not None or net_info.get("net_out") is not None or "net" in str(net_info).lower()):
        print("\n【网络流量】")
        for k, v in sorted(net_info.items()):
            if v is not None and (k.startswith("net") or "byte" in k.lower() or "flow" in k.lower() or "in" in k or "out" in k):
                print("  %s: %s" % (k, v))
        if not any(k.startswith("net") or "in" in k or "out" in k for k in (net_info.keys() if isinstance(net_info, dict) else [])):
            print("  原始数据:", json.dumps(net_info, ensure_ascii=False, indent=2)[:500])
    else:
        print("\n【网络】 原始返回:", json.dumps(net_info, ensure_ascii=False)[:400])

    print("\n" + "=" * 56)
    return 0

if __name__ == "__main__":
    exit(main())

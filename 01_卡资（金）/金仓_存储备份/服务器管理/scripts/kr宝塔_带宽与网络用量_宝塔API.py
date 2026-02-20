#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
kr宝塔 43.139.27.93：通过宝塔 API 查询 CPU、内存、网络实时流量。
需将本机 IP 加入 kr宝塔 面板「设置」→「API 接口」白名单。
"""
import time
import hashlib
import json
import urllib.request
import urllib.parse
import ssl

PANEL_URL = "https://43.139.27.93:9988"
API_KEY = "qcWubCdlfFjS2b2DMT1lzPFaDfmv1cBT"
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
    print("  kr宝塔 43.139.27.93 · CPU 与网络用量（宝塔 API）")
    print("=" * 56)

    sys_info = post("/system?action=GetSystemTotal", {})
    if sys_info.get("status") is False or sys_info.get("msg"):
        print("\n❌ 系统接口:", sys_info.get("msg", sys_info))
        print("说明：将本机 IP 加入 kr宝塔 面板「设置」→「API 接口」白名单后可重新运行。")
        return 1
    print("\n【CPU 与负载】")
    print("  CPU: %s%%  负载(1/5/15): %s" % (sys_info.get("cpuRealUsed", "N/A"), sys_info.get("load_average", "N/A")))
    print("【内存】 已用: %s%%" % sys_info.get("memRealUsed", "N/A"))
    print("【磁盘】 使用率: %s%%" % sys_info.get("diskPer", "N/A"))

    net_info = post("/system?action=GetNetWork", {})
    if net_info.get("status") is False or net_info.get("msg"):
        print("\n【网络】❌", net_info.get("msg", net_info))
        return 0
    if isinstance(net_info, dict) and (net_info.get("net_in") is not None or net_info.get("net_out") is not None):
        print("\n【网络流量】")
        for k in ["net_in", "net_out", "net_all"]:
            if k in net_info and net_info[k] is not None:
                print("  %s: %s" % (k, net_info[k]))
        for k, v in sorted(net_info.items()):
            if v is not None and k not in ("net_in", "net_out", "net_all") and ("net" in k or "byte" in k.lower() or "flow" in k.lower()):
                print("  %s: %s" % (k, v))
    else:
        print("\n【网络】 原始:", json.dumps(net_info, ensure_ascii=False)[:300])
    print("\n" + "=" * 56)
    return 0

if __name__ == "__main__":
    exit(main())

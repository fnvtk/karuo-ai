#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
存客宝：通过宝塔 API 为所有站点批量申请 Let's Encrypt SSL，并重载 Nginx
解决 443 无法访问（Nginx 未监听 443）问题。

使用：python3 存客宝_宝塔API_全站SSL申请.py
需将执行机 IP 加入存客宝宝塔 API 白名单。
"""
import hashlib
import json
import sys
import time
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


def post(endpoint, data):
    url = PANEL_URL + endpoint
    payload = sign()
    payload.update(data)
    req = urllib.request.Request(url, data=urllib.parse.urlencode(payload).encode(), method="POST")
    req.add_header("Content-Type", "application/x-www-form-urlencoded")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode())
    except Exception as e:
        return {"status": False, "msg": str(e)}


def main():
    print("=" * 60)
    print("  存客宝 · 全站 SSL 批量申请与修复")
    print("=" * 60)

    # 1. 获取站点列表
    sites_r = post("/data?action=getData", {"table": "sites", "limit": 100, "p": 1})
    if sites_r.get("status") is not True:
        print("❌ 获取站点列表失败:", sites_r)
        return 1

    site_list = sites_r.get("data") or []
    if isinstance(site_list, dict):
        site_list = site_list.get("data", site_list) if isinstance(site_list.get("data"), list) else []
    if not isinstance(site_list, list):
        site_list = []

    print("[1] 共 %d 个站点" % len(site_list))

    # 2. 逐个处理：未配置 SSL 的尝试申请 Let's Encrypt
    applied = []
    skipped = []
    failed = []

    for s in site_list:
        name = s.get("name", "")
        sid = s.get("id")
        ssl_status = s.get("ssl", 0)
        if not name or not sid:
            continue
        domain = name.split()[0] if " " in name else name
        if "localhost" in domain or domain == "default":
            continue

        if ssl_status:
            skipped.append(name)
            continue

        # 申请 Let's Encrypt
        print("  [申请] %s (id=%s) ..." % (domain, sid))
        r = post("/acme?action=apply_cert", {
            "domains": json.dumps([domain]),
            "auth_type": "http",
            "id": sid,
        })
        if r.get("status") is True:
            applied.append(domain)
            print("    ✅ 已申请")
        else:
            msg = r.get("msg", str(r))
            if "already" in str(msg).lower() or "已" in str(msg):
                applied.append(domain)
                print("    ✅ 已有证书")
            else:
                failed.append((domain, msg))
                print("    ❌", msg[:80])

        time.sleep(2)

    # 3. 对已有 SSL 的站点，尝试续期/更新（SetSSL 确保开启）
    for s in site_list:
        name = s.get("name", "")
        sid = s.get("id")
        ssl_status = s.get("ssl", 0)
        if not name or not sid or not ssl_status:
            continue
        domain = name.split()[0] if " " in name else name
        # 确保 SSL 已启用
        r = post("/site?action=SetSSL", {
            "id": sid,
            "type": "1",
        })
        if r.get("status") is True:
            print("  [确认] %s SSL 已启用" % domain)
        time.sleep(0.5)

    # 4. 重载 Nginx
    print("\n[2] 重载 Nginx ...")
    reload_r = post("/system?action=ServiceAdmin", {"name": "nginx", "type": "reload"})
    if reload_r.get("status") is True:
        print("  ✅ Nginx 已重载")
    else:
        print("  ❌ 重载失败:", reload_r.get("msg", reload_r))

    # 5. 汇总
    print("\n" + "=" * 60)
    print("  汇总")
    print("=" * 60)
    print("  已申请/确认: %s" % ", ".join(applied) if applied else "(无)")
    print("  已有 SSL 跳过: %d 个" % len(skipped))
    if failed:
        print("  申请失败:")
        for d, m in failed:
            print("    - %s: %s" % (d, m[:60]))
    print("\n  请访问 https://kr-kf.quwanzhi.com 等域名测试")
    return 0 if not failed else 1


if __name__ == "__main__":
    sys.exit(main())

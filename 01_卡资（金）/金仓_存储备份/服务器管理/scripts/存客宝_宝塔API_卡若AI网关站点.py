#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
存客宝宝塔 API：添加站点 kr-ai.quwanzhi.com，Nginx 反代到 kr宝塔 网关 43.139.27.93:8000。
部署到存客宝的站点/域名一律用宝塔 API 处理，不手改面板。

使用：python3 存客宝_宝塔API_卡若AI网关站点.py
注意：存客宝面板「设置」→「API 接口」需将执行机 IP 加入白名单，否则返回 IP校验失败。
"""
import time
import hashlib
import json
import urllib.request
import urllib.parse
import ssl

# 存客宝宝塔
PANEL_URL = "https://42.194.245.239:9988"
API_KEY = "TNKjqDv5N1QLOU20gcmGVgr82Z4mXzRi"

DOMAIN = "kr-ai.quwanzhi.com"
# 网关在 kr宝塔 43.139.27.93:8000，存客宝 Nginx 反代到该地址
BACKEND = "http://43.139.27.93:8000"

NGINX_CONF = f"""server
{{
    listen 80;
    listen [::]:80;
    server_name {DOMAIN};
    location / {{
        proxy_pass {BACKEND};
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_read_timeout 60s;
    }}
    access_log /www/wwwlogs/{DOMAIN}.log;
    error_log /www/wwwlogs/{DOMAIN}.error.log;
}}
"""

ssl._create_default_https_context = ssl._create_unverified_context


def sign():
    t = int(time.time())
    s = str(t) + hashlib.md5(API_KEY.encode()).hexdigest()
    return {"request_time": t, "request_token": hashlib.md5(s.encode()).hexdigest()}


def post(endpoint, data):
    url = PANEL_URL + endpoint
    payload = sign()
    payload.update(data)
    req = urllib.request.Request(url, data=urllib.parse.urlencode(payload).encode())
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read().decode())
    except Exception as e:
        return {"status": False, "msg": str(e)}


def main():
    print("=" * 60)
    print("  存客宝宝塔 API：卡若AI 网关站点 kr-ai.quwanzhi.com")
    print("=" * 60)

    # 1. 面板连通
    sys_info = post("/system?action=GetSystemTotal", {})
    if sys_info.get("cpuRealUsed") is None:
        print("❌ 面板连接失败:", sys_info)
        return 1
    print("[1] 面板正常 (CPU: %s%%)" % sys_info.get("cpuRealUsed", "?"))

    # 2. 检查站点是否存在
    sites = post("/data?action=getData", {"table": "sites", "limit": 100, "p": 1})
    site_list = sites.get("data", []) if isinstance(sites.get("data"), list) else []
    exists = any(DOMAIN in str(s.get("name", "")) for s in (site_list or []))
    if not exists:
        add = post("/site?action=AddSite", {
            "webname": json.dumps({"domain": DOMAIN, "domainlist": [], "count": 0}),
            "path": "/www/wwwroot/kr-ai",
            "type_id": "0",
            "type": "PHP",
            "version": "00",
            "port": "80",
            "ps": "卡若AI网关",
        })
        if add.get("status") is True:
            print("[2] 已添加站点:", DOMAIN)
        else:
            print("[2] 添加站点:", add.get("msg", add))
    else:
        print("[2] 站点已存在:", DOMAIN)

    # 3. 写入 Nginx 反代配置
    save = post("/files?action=SaveFileBody", {
        "path": "/www/server/panel/vhost/nginx/%s.conf" % DOMAIN,
        "data": NGINX_CONF,
        "encoding": "utf-8",
    })
    if save.get("status") is True:
        print("[3] 已通过宝塔 API 写入 Nginx 反代 -> %s" % BACKEND)
    else:
        print("[3] 写入 Nginx:", save.get("msg", save))
        return 1

    # 4. 重载 Nginx
    reload_r = post("/system?action=ServiceAdmin", {"name": "nginx", "type": "reload"})
    if reload_r.get("status") is True:
        print("[4] Nginx 已重载")
    else:
        print("[4] 重载 Nginx:", reload_r.get("msg", reload_r))

    print()
    print("完成。阿里云 A 记录 kr-ai -> 42.194.245.239 生效后访问：")
    print("  curl -s -X POST \"http://%s/v1/chat\" -H \"Content-Type: application/json\" -d '{\"prompt\":\"你的问题\"}' | jq -r '.reply'" % DOMAIN)
    return 0


if __name__ == "__main__":
    exit(main())

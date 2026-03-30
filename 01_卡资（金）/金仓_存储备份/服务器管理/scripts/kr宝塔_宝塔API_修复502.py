#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
kr宝塔 43.139.27.93：通过宝塔 API 修复 502（重启 Nginx、按关键词重启 Node 项目）。
使用：
  python3 kr宝塔_宝塔API_修复502.py
      默认：重启 Nginx + 名称含 soul/souladmin/soul-admin 的 Node 项目。
  python3 kr宝塔_宝塔API_修复502.py yzg
      在默认关键词基础上，额外匹配名称含 yzg 的项目（如 yzg.quwanzhi.com 对应站点）。
  python3 kr宝塔_宝塔API_修复502.py --only yzg
      仅重启 Nginx + 名称含 yzg 的 Node 项目（不碰 soul 相关）。
需将本机 IP 加入 kr宝塔 面板「设置」→「API 接口」白名单。
若站点为 PHP 而非 Node：面板「软件商店」对应 PHP → 服务 → 重启 php-fpm；或 SSH 上检查
nginx 的 fastcgi_pass / proxy_pass 与上游端口是否一致。
"""
import sys
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
        r = requests.post(url, data=payload, timeout=20, verify=False)
        return r.json()
    req = urllib.request.Request(url, data=urllib.parse.urlencode(payload).encode())
    with urllib.request.urlopen(req, timeout=20) as resp:
        return json.loads(resp.read().decode())

def _match_keywords():
    argv = [a.strip() for a in sys.argv[1:] if a.strip()]
    default = ["soul", "souladmin", "soul-admin"]
    if argv and argv[0] == "--only":
        rest = [a.lower() for a in argv[1:]]
        if not rest:
            print("用法: python3 kr宝塔_宝塔API_修复502.py --only yzg [更多关键词…]")
            return None
        return rest
    extra = [a.lower() for a in argv]
    return [x.lower() for x in default] + extra


def main():
    match_keys = _match_keywords()
    if match_keys is None:
        return 2

    print("=" * 56)
    print("  kr宝塔 · 宝塔 API 修复 502（关键词: %s）" % ", ".join(match_keys))
    print("=" * 56)

    # 1. 重启 Nginx
    print("\n【1】重启 Nginx...")
    try:
        r = post("/system?action=ServiceAdmin", {"name": "nginx", "type": "restart"})
        if r.get("status") is True or (isinstance(r.get("msg"), str) and "成功" in r.get("msg", "")):
            print("  Nginx 重启成功。")
        else:
            print("  响应:", r)
    except Exception as e:
        if "IP" in str(e) or "校验" in str(e) or "403" in str(e):
            print("  ❌ API 白名单未通过。请到 kr宝塔 面板「设置」→「API 接口」将本机公网 IP 加入白名单后重试。")
            return 1
        print("  请求异常:", e)
        return 1

    # 2. 获取 Node 项目列表并重启 soul 相关
    print("\n【2】查找并重启 soul 相关 Node 项目...")
    try:
        r = post("/project/nodejs/get_project_list", {})
        if r.get("status") is not True:
            print("  获取项目列表失败或接口不可用:", r.get("msg", r))
        else:
            data = r.get("data") or r.get("list") or []
            if not isinstance(data, list):
                data = []
            restarted = []
            for p in data:
                name = (p.get("name") or p.get("project_name") or "").lower()
                blob = json.dumps(p, ensure_ascii=False).lower()
                key_hit = any(k in name for k in match_keys)
                # 项目名不含关键词时，用配置全文匹配带点的关键词（如 yzg.quwanzhi.com）
                domain_hit = any(
                    ("." in k) and (k in blob) for k in match_keys
                )
                if key_hit or domain_hit:
                    proj_name = p.get("name") or p.get("project_name")
                    try:
                        post("/project/nodejs/restart_project", {"project_name": proj_name})
                        restarted.append(proj_name)
                    except Exception as e2:
                        print("  重启 %s 失败: %s" % (proj_name, e2))
            if restarted:
                print("  已重启:", ", ".join(restarted))
            else:
                print(
                    "  未找到名称匹配以下关键词的 Node 项目，或列表为空：%s。"
                    " 若 502 仍存在：① 面板「Node 项目」手动重启对应项目；② 若为 PHP 站，重启 PHP-FPM；③ SSH 上核对 nginx 的 proxy_pass/fastcgi_pass 与上游是否存活。"
                    % ", ".join(match_keys)
                )
    except Exception as e:
        print("  请求异常:", e)

    print("\n" + "=" * 56)
    print("请刷新对应域名（如 yzg.quwanzhi.com / soul 系列）验证；若仍 502，按上文②③排查。")
    print("=" * 56)
    return 0

if __name__ == "__main__":
    exit(main())

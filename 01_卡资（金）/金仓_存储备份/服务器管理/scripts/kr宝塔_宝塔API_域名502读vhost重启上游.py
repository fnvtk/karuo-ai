#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
kr 宝塔（43.139.27.93）：通过宝塔 API 读取站点 Nginx vhost，解析 proxy_pass / fastcgi_pass，
自动重启对应 Node 项目或尝试重启 PHP-FPM，并重启 Nginx。

适用：yzg.quwanzhi.com 等出现 502（上游未响应）且本机已加入面板「API 接口」白名单。

用法：
  python3 kr宝塔_宝塔API_域名502读vhost重启上游.py
  python3 kr宝塔_宝塔API_域名502读vhost重启上游.py yzg.quwanzhi.com
"""
from __future__ import annotations

import hashlib
import json
import re
import sys
import time

try:
    import requests
    import urllib3

    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
    USE_REQUESTS = True
except ImportError:
    import ssl
    import urllib.parse
    import urllib.request

    ssl._create_default_https_context = ssl._create_unverified_context
    USE_REQUESTS = False

PANEL_URL = "https://43.139.27.93:9988"
API_KEY = "qcWubCdlfFjS2b2DMT1lzPFaDfmv1cBT"


def sign():
    t = int(time.time())
    s = str(t) + hashlib.md5(API_KEY.encode()).hexdigest()
    return {"request_time": t, "request_token": hashlib.md5(s.encode()).hexdigest()}


def post(endpoint, data=None, timeout=30):
    url = PANEL_URL + endpoint
    payload = sign()
    if data:
        payload.update(data)
    if USE_REQUESTS:
        r = requests.post(url, data=payload, timeout=timeout, verify=False)
        return r.json()
    req = urllib.request.Request(url, data=urllib.parse.urlencode(payload).encode())
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode())


def service_restart(name: str) -> dict:
    return post("/system?action=ServiceAdmin", {"name": name, "type": "restart"})


def nginx_restart() -> dict:
    return service_restart("nginx")


def get_vhost_body(domain: str) -> tuple[str | None, str]:
    """返回 (内容, 实际使用的路径)。"""
    candidates = [
        "/www/server/panel/vhost/nginx/%s.conf" % domain,
        "/www/server/panel/vhost/nginx/%s.conf" % domain.replace(".", "_"),
    ]
    for path in candidates:
        r = post(
            "/files?action=GetFileBody",
            {"path": path, "encoding": "utf-8"},
        )
        body = r.get("data")
        if isinstance(body, str) and len(body.strip()) > 20:
            return body, path
        # 部分面板返回在 msg
        msg = r.get("msg")
        if isinstance(msg, str) and "server_name" in msg and len(msg) > 50:
            return msg, path
    return None, candidates[0]


def fetch_node_list():
    r = post("/project/nodejs/get_project_list", {})
    if r.get("status") is not True:
        raise RuntimeError("get_project_list: %s" % str(r)[:400])
    data = r.get("data") or r.get("list") or []
    if not isinstance(data, list):
        raise RuntimeError("项目列表格式异常: %s" % str(r)[:400])
    return data


def collect_ports(item: dict) -> list[int]:
    ports: list[int] = []
    cfg = item.get("project_config") or {}
    p = cfg.get("port")
    if p:
        try:
            ports.append(int(p))
        except (TypeError, ValueError):
            pass
    script = str(cfg.get("project_script") or "")
    for m in re.findall(r"-p\s*(\d+)", script):
        try:
            ports.append(int(m))
        except ValueError:
            pass
    return sorted(set(ports))


def extract_nginx_root_paths(vhost: str) -> list[str]:
    """提取 vhost 中 root 指令路径（去引号）。"""
    paths: list[str] = []
    for m in re.finditer(r"^\s*root\s+([^;]+);", vhost, re.I | re.MULTILINE):
        p = m.group(1).strip().strip("'\"")
        if p:
            paths.append(p)
    return paths


def print_root_advisory(vhost: str) -> None:
    roots = extract_nginx_root_paths(vhost)
    if not roots:
        return
    print("\n【2b】vhost 内 root 路径（与面板「根目录」应对齐）：")
    for p in roots:
        print("   ", p)
    for p in roots:
        if p.rstrip("/").endswith("/admin"):
            print(
                "\n  ⚠ 提示：root 落在 **/admin** 子目录时，通常只适合「只托管管理端静态页」。"
                "若整站为 SPA / 前后端分离，常见做法是：root 指向 **构建输出目录（如 dist）** 或项目根，"
                "并配置 **try_files $uri $uri/ /index.html**；若走 **反代**，请确认 **proxy_pass** 端口上进程已启动。"
            )


def parse_upstream_port(vhost: str) -> int | None:
    for pat in [
        r"proxy_pass\s+https?://127\.0\.0\.1:(\d+)",
        r"proxy_pass\s+https?://localhost:(\d+)",
        r"proxy_pass\s+https?://\[::1\]:(\d+)",
    ]:
        m = re.search(pat, vhost, re.I)
        if m:
            return int(m.group(1))
    return None


def parse_php_version(vhost: str) -> str | None:
    m = re.search(r"php-cgi-(\d+)\.sock", vhost)
    if m:
        return m.group(1)
    m = re.search(r"/www/server/php/(\d+)/", vhost)
    if m:
        return m.group(1)
    m = re.search(r"php-fpm-(\d+)", vhost)
    if m:
        return m.group(1)
    return None


def restart_node_on_port(port: int) -> list[str]:
    items = fetch_node_list()
    restarted = []
    for it in items:
        name = it.get("name") or it.get("project_name")
        if not name:
            continue
        if port in collect_ports(it):
            post("/project/nodejs/restart_project", {"project_name": name})
            restarted.append(name)
    return restarted


def restart_php_candidates(ver: str) -> tuple[str | None, list[str]]:
    """宝塔常见 php-fpm 服务名变体，逐个尝试 restart。"""
    ver = str(ver).strip()
    if not ver:
        return None, []
    tried = []
    names = [
        "php%s-php-fpm" % ver,
        "php-fpm-%s" % ver,
        "php-fpm-%s.%s" % (ver[0], ver[1:]) if len(ver) == 2 and ver.isdigit() else "",
        "php-%s-php-fpm" % ver,
    ]
    names = [n for n in names if n]
    for n in names:
        tried.append(n)
        r = service_restart(n)
        ok = r.get("status") is True or (
            isinstance(r.get("msg"), str) and "成功" in r.get("msg", "")
        )
        if ok:
            return n, tried
    return None, tried


def main() -> int:
    domain = (sys.argv[1] if len(sys.argv) > 1 else "yzg.quwanzhi.com").strip()
    print("=" * 60)
    print("  kr宝塔 · 按 vhost 反查上游并修复 502")
    print("  域名:", domain)
    print("=" * 60)

    print("\n【1】重启 Nginx...")
    try:
        r = nginx_restart()
        print(" ", r.get("msg", r) if isinstance(r, dict) else r)
    except Exception as e:
        if "IP" in str(e) or "校验" in str(e) or "403" in str(e):
            print("  ❌ API 白名单未通过，请将本机公网 IP 加入 kr 面板「设置 → API 接口」。")
            return 1
        print("  请求异常:", e)
        return 1

    print("\n【2】读取 vhost...")
    try:
        body, path = get_vhost_body(domain)
    except Exception as e:
        print("  读文件失败:", e)
        return 1
    if not body:
        print("  ❌ 无法读取配置:", path)
        print("     请到面板「网站」确认域名是否存在，或 conf 文件名是否与域名一致。")
        return 1
    print("  配置文件:", path, "长度:", len(body))
    print_root_advisory(body)

    port = parse_upstream_port(body)
    if port is not None:
        print("\n【3】检测到反代本机端口:", port)
        try:
            restarted = restart_node_on_port(port)
        except Exception as e:
            print("  拉取/重启 Node 失败:", e)
            return 1
        if restarted:
            print("  已重启 Node 项目:", ", ".join(restarted))
        else:
            print(
                "  ⚠ 未在宝塔 Node 列表中找到监听该端口的项目；"
                "可能为 Docker/非宝塔托管进程，请在面板「Docker」或 SSH 用 ss -tlnp 查 %s 并手动拉起。"
                % port
            )
        print("\n【4】再次重启 Nginx 使连接池刷新...")
        print(" ", nginx_restart().get("msg", ""))
        print("\n完成。请浏览器访问 https://%s 验证。" % domain)
        return 0

    php_ver = parse_php_version(body)
    if php_ver:
        print("\n【3】检测到 PHP 相关配置，推断版本段:", php_ver)
        name, tried = restart_php_candidates(php_ver)
        if name:
            print("  已重启:", name)
        else:
            print("  ⚠ 未能通过 API 匹配到 php-fpm 服务名，已尝试:", tried)
            print("     请在面板「软件商店 → 已安装 → 对应 PHP → 服务 → 重启」。")
        print("\n【4】再次重启 Nginx...")
        print(" ", nginx_restart().get("msg", ""))
        print("\n完成。请访问 https://%s 验证。" % domain)
        return 0

    print("\n【3】未能从 vhost 解析 proxy_pass 端口或 PHP sock 路径。")
    print("     请把该站点「配置文件」中含 proxy_pass / fastcgi_pass 的几行发到对话，便于定点修复。")
    snippet = "\n".join(
        [ln for ln in body.splitlines() if "pass" in ln.lower()][:25]
    )
    if snippet.strip():
        print("----- 含 pass 的行（摘录）-----")
        print(snippet[:2000])
    return 2


if __name__ == "__main__":
    raise SystemExit(main())

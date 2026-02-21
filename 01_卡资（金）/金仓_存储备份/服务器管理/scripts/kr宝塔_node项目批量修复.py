#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
kr宝塔：仅使用宝塔 Node 项目接口，批量修复 run=False 项目。

策略：
1) 拉取 Node 项目列表
2) 对 run=False 项目：
   - stop_project
   - 杀掉其目标端口上的冲突进程（EADDRINUSE）
   - 清理 pid 文件
   - start_project
3) 回查 run/listen_ok
"""

import hashlib
import json
import os
import re
import ssl
import subprocess
import time
import urllib.parse
import urllib.request

ssl._create_default_https_context = ssl._create_unverified_context

PANEL = "https://127.0.0.1:9988"
API_KEY = "qcWubCdlfFjS2b2DMT1lzPFaDfmv1cBT"


def sign():
    now = int(time.time())
    s = str(now) + hashlib.md5(API_KEY.encode("utf-8")).hexdigest()
    return {
        "request_time": now,
        "request_token": hashlib.md5(s.encode("utf-8")).hexdigest(),
    }


def post(path, data=None, timeout=25):
    payload = sign()
    if data:
        payload.update(data)
    req = urllib.request.Request(
        PANEL + path, data=urllib.parse.urlencode(payload).encode("utf-8")
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        txt = resp.read().decode("utf-8", errors="ignore")
    try:
        return json.loads(txt)
    except Exception:
        return {"raw": txt[:800]}


def fetch_list():
    result = post("/project/nodejs/get_project_list")
    items = result.get("data") if isinstance(result, dict) else None
    if not isinstance(items, list):
        items = result.get("list") if isinstance(result, dict) else None
    if not isinstance(items, list):
        raise RuntimeError("获取 Node 项目列表失败: %s" % str(result)[:300])
    return items


def pids_on_port(port):
    cmd = "ss -tlnp | grep ':%s ' || true" % port
    out = subprocess.check_output(cmd, shell=True, universal_newlines=True)
    return sorted({int(x) for x in re.findall(r"pid=(\d+)", out)})


def collect_ports(item):
    ports = []
    cfg = item.get("project_config") or {}
    p = cfg.get("port")
    if p:
        try:
            ports.append(int(p))
        except Exception:
            pass
    script = str(cfg.get("project_script") or "")
    for m in re.findall(r"-p\s*(\d+)", script):
        try:
            ports.append(int(m))
        except Exception:
            pass
    return sorted(set(ports))


def main():
    items = fetch_list()
    operations = []

    for it in items:
        name = it.get("name")
        if not name or it.get("run") is True:
            continue

        ports = collect_ports(it)
        post("/project/nodejs/stop_project", {"project_name": name})

        killed = []
        for port in ports:
            for pid in pids_on_port(port):
                subprocess.call("kill -9 %s" % pid, shell=True)
                killed.append((port, pid))

        pid_file = "/www/server/nodejs/vhost/pids/%s.pid" % name
        try:
            if os.path.exists(pid_file):
                with open(pid_file, "w", encoding="utf-8") as f:
                    f.write("0")
        except Exception:
            pass

        r = post("/project/nodejs/start_project", {"project_name": name})
        ok = isinstance(r, dict) and (
            r.get("status") is True or "成功" in str(r.get("msg", ""))
        )
        msg = str(r.get("msg", r) if isinstance(r, dict) else r)[:220]
        operations.append((name, ports, killed, ok, msg))
        time.sleep(1)

    print("=== 操作结果 ===")
    for row in operations:
        print(row)

    time.sleep(4)
    items2 = fetch_list()
    run_cnt = sum(1 for x in items2 if x.get("run") is True)
    stop_cnt = sum(1 for x in items2 if x.get("run") is not True)

    print("\n=== 回查(run/listen_ok) ===")
    for x in items2:
        print((x.get("name"), x.get("run"), x.get("listen_ok")))
    print("\nSUMMARY", run_cnt, stop_cnt)


if __name__ == "__main__":
    main()

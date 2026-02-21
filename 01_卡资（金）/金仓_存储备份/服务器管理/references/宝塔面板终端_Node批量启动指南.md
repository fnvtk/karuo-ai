# 宝塔面板终端 · Node 项目批量启动指南

> 当 SSH 无法连接时，在 **kr宝塔 宝塔面板 → 终端** 内直接执行本脚本即可批量启动 Node 项目。

---

## 操作步骤

### 1. 打开宝塔面板终端

- 登录 https://43.139.27.93:9988
- 左侧菜单 → **终端**

### 2. 创建脚本并执行

在终端中依次执行：

```bash
# 创建脚本文件
cat > /tmp/kr_node_batch_fix.py << 'ENDOFSCRIPT'
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""kr宝塔 Node 项目批量启动 - 宝塔面板终端版"""
import hashlib, json, os, re, subprocess, time, urllib.request, urllib.parse
import ssl
ssl._create_default_https_context = ssl._create_unverified_context
PANEL = "https://127.0.0.1:9988"
API_KEY = "qcWubCdlfFjS2b2DMT1lzPFaDfmv1cBT"

def sign():
    now = int(time.time())
    s = str(now) + hashlib.md5(API_KEY.encode("utf-8")).hexdigest()
    return {"request_time": now, "request_token": hashlib.md5(s.encode("utf-8")).hexdigest()}

def post(path, data=None, timeout=25):
    payload = sign()
    if data:
        payload.update(data)
    req = urllib.request.Request(PANEL + path, data=urllib.parse.urlencode(payload).encode("utf-8"))
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        txt = resp.read().decode("utf-8", errors="ignore")
    try:
        return json.loads(txt)
    except Exception:
        return {"raw": txt[:800]}

def fetch_list():
    result = post("/project/nodejs/get_project_list")
    items = result.get("data") or result.get("list")
    if not isinstance(items, list):
        raise RuntimeError("获取列表失败: %s" % str(result)[:300])
    return items

def pids_on_port(port):
    try:
        out = subprocess.check_output("ss -tlnp | grep ':%s ' || true" % port, shell=True, universal_newlines=True)
        return sorted({int(x) for x in re.findall(r"pid=(\d+)", out)})
    except Exception:
        return []

def collect_ports(item):
    ports = []
    cfg = item.get("project_config") or {}
    if cfg.get("port"):
        try:
            ports.append(int(cfg["port"]))
        except Exception:
            pass
    for m in re.findall(r"-p\s*(\d+)", str(cfg.get("project_script", ""))):
        try:
            ports.append(int(m))
        except Exception:
            pass
    return sorted(set(ports))

def main():
    items = fetch_list()
    ops = []
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
                open(pid_file, "w").write("0")
        except Exception:
            pass
        r = post("/project/nodejs/start_project", {"project_name": name})
        ok = isinstance(r, dict) and (r.get("status") is True or "成功" in str(r.get("msg", "")))
        ops.append((name, ok, str(r.get("msg", r))[:150]))
        time.sleep(1)
    print("=== 操作结果 ===")
    for name, ok, msg in ops:
        print("%s: %s | %s" % (name, "OK" if ok else "FAIL", msg))
    time.sleep(4)
    items2 = fetch_list()
    run_cnt = sum(1 for x in items2 if x.get("run") is True)
    print("\n=== 回查 ===")
    for x in items2:
        print("  %s: run=%s listen_ok=%s" % (x.get("name"), x.get("run"), x.get("listen_ok")))
    print("\nSUMMARY: 运行中 %d, 未运行 %d" % (run_cnt, len(items2) - run_cnt))

if __name__ == "__main__":
    main()
ENDOFSCRIPT

# 执行
python3 /tmp/kr_node_batch_fix.py
```

### 3. 查看输出

终端会输出每个项目的启动结果，以及最终回查的 `run` / `listen_ok` 状态。

---

## 注意事项

- **MODULE_NOT_FOUND**：玩值大屏、wzdj、tongzhi 等若报此错，需在 **Node 项目 → 编辑** 中把启动命令改为 `cd /项目根目录 && node server.js` 或 `npm run start`，勿用目录路径当入口。详见 `references/Node项目未启动_MODULE_NOT_FOUND修复指南.md`。
- 若某项目因端口占用失败，脚本会自动尝试清理端口后重试；若仍失败，需在面板中手动检查该项目配置。

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
腾讯云 TAT：kr宝塔 中文目录改英文迁移
1. 停止全部 Node 项目
2. 删除 /www/wwwroot 下所有符号链接（ext->扩展、client->客户、self->自营 等）
3. 重命名中文目录为英文：扩展→ext、客户→client、自营→self、玩值→wanzhi、小工具→tools
4. 更新 site.db 中所有 path、project_config 路径
5. 更新 Nginx vhost 配置中所有中文路径
6. 强制只用宝塔 Nginx（killall nginx 后启动宝塔版）
7. 批量启动全部 Node 项目
"""
import base64
import json
import os
import re
import sys
import time

KR_INSTANCE_ID = "ins-aw0tnqjo"
REGION = "ap-guangzhou"

# 中文路径 → 英文路径（用于 site.db、nginx 批量替换）
PATH_REPLACES = [
    ("/www/wwwroot/自营/玩值/", "/www/wwwroot/self/wanzhi/"),
    ("/www/wwwroot/自营/", "/www/wwwroot/self/"),
    ("/www/wwwroot/扩展/小工具/", "/www/wwwroot/ext/tools/"),
    ("/www/wwwroot/扩展/", "/www/wwwroot/ext/"),
    ("/www/wwwroot/客户/", "/www/wwwroot/client/"),
    ("/www/wwwroot/归档/", "/www/wwwroot/archive/"),
    ("/www/wwwroot/测试/", "/www/wwwroot/test/"),
]
# 替换顺序：先替换更长的路径，避免 /自营/ 误替换 /自营/玩值/ 的前缀

SHELL_SCRIPT = r'''#!/bin/bash
echo "=== kr宝塔 中文目录改英文迁移 ==="

# 0. 宝塔面板
echo ""
echo "【0】宝塔面板"
if ! ss -tlnp 2>/dev/null | grep -q ':9988 '; then
  /etc/init.d/bt start 2>/dev/null || /www/server/panel/bt start 2>/dev/null || true
  sleep 5
fi

# 1. 停止全部 Node 项目
echo ""
echo "【1】停止 Node 项目"
python3 - << 'PY1'
import hashlib, json, time, urllib.request, urllib.parse, ssl
ssl._create_default_https_context = ssl._create_unverified_context
PANEL, K = "https://127.0.0.1:9988", "qcWubCdlfFjS2b2DMT1lzPFaDfmv1cBT"
def sign():
    t = int(time.time())
    return {"request_time": t, "request_token": __import__("hashlib").md5((str(t) + __import__("hashlib").md5(K.encode()).hexdigest()).encode()).hexdigest()}
def post(p, d=None):
    pl = sign()
    if d: pl.update(d)
    r = urllib.request.Request(PANEL + p, data=urllib.parse.urlencode(pl).encode())
    with urllib.request.urlopen(r, timeout=30) as resp:
        return json.loads(resp.read().decode())
items = post("/project/nodejs/get_project_list").get("data") or post("/project/nodejs/get_project_list").get("list") or []
for it in items:
    name = it.get("name")
    if name:
        try: post("/project/nodejs/stop_project", {"project_name": name}); print("  停:", name)
        except: pass
        time.sleep(0.3)
PY1

sleep 3

# 2. 删除符号链接
echo ""
echo "【2】删除符号链接"
cd /www/wwwroot
for x in ext client self archive test; do
  if [ -L "$x" ]; then
    rm -f "$x" && echo "  删除链接: $x"
  fi
done

# 3. 重命名中文目录为英文（按依赖顺序）
echo ""
echo "【3】重命名目录"
cd /www/wwwroot
([ -d "扩展" ] && [ ! -e "ext" ] && mv "扩展" "ext" && echo "  扩展 -> ext") || true
([ -d "客户" ] && [ ! -e "client" ] && mv "客户" "client" && echo "  客户 -> client") || true
([ -d "自营" ] && [ ! -e "self" ] && mv "自营" "self" && echo "  自营 -> self") || true
([ -d "self/玩值" ] && [ ! -e "self/wanzhi" ] && mv "self/玩值" "self/wanzhi" && echo "  玩值 -> wanzhi") || true
([ -d "ext/小工具" ] && [ ! -e "ext/tools" ] && mv "ext/小工具" "ext/tools" && echo "  小工具 -> tools") || true
([ -d "归档" ] && [ ! -e "archive" ] && mv "归档" "archive" && echo "  归档 -> archive") || true
([ -d "测试" ] && [ ! -e "test" ] && mv "测试" "test" && echo "  测试 -> test") || true

# 4. 更新 site.db
echo ""
echo "【4】更新 site.db"
python3 - << 'PY2'
import json, os, re, sqlite3

REPLACES = [
    ("/www/wwwroot/自营/玩值/", "/www/wwwroot/self/wanzhi/"),
    ("/www/wwwroot/自营/", "/www/wwwroot/self/"),
    ("/www/wwwroot/扩展/小工具/", "/www/wwwroot/ext/tools/"),
    ("/www/wwwroot/扩展/", "/www/wwwroot/ext/"),
    ("/www/wwwroot/客户/", "/www/wwwroot/client/"),
    ("/www/wwwroot/归档/", "/www/wwwroot/archive/"),
    ("/www/wwwroot/测试/", "/www/wwwroot/test/"),
]

def replace_path(s):
    if not s or not isinstance(s, str): return s
    for a, b in REPLACES:
        s = s.replace(a, b)
    return s

def replace_in_obj(obj):
    if isinstance(obj, dict):
        return {k: replace_in_obj(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [replace_in_obj(x) for x in obj]
    if isinstance(obj, str) and "/www/wwwroot/" in obj:
        return replace_path(obj)
    return obj

db = "/www/server/panel/data/db/site.db"
if os.path.isfile(db):
    conn = sqlite3.connect(db)
    c = conn.cursor()
    # 获取需要 path 或 project_config 的列
    c.execute("PRAGMA table_info(sites)")
    cols = [r[1] for r in c.fetchall()]
    path_cols = [x for x in cols if "path" in x.lower() or "config" in x.lower()]
    c.execute("SELECT id, path, project_config FROM sites")
    n = 0
    for row in c.fetchall():
        sid, path, cfg = row[0], row[1] or "", row[2] or "{}"
        new_path = replace_path(path)
        try:
            cfg_obj = json.loads(cfg) if cfg else {}
            new_cfg = replace_in_obj(cfg_obj)
            new_cfg_str = json.dumps(new_cfg, ensure_ascii=False)
        except:
            new_cfg_str = replace_path(cfg)
        if new_path != path or new_cfg_str != cfg:
            c.execute("UPDATE sites SET path=?, project_config=? WHERE id=?", (new_path, new_cfg_str, sid))
            n += 1
    conn.commit()
    conn.close()
    print("  更新 %d 条 sites 记录" % n)
else:
    print("  site.db 不存在")
PY2

# 5. 更新 Nginx 配置
echo ""
echo "【5】更新 Nginx 配置"
for f in /www/server/panel/vhost/nginx/*.conf /www/server/nginx/conf/vhost/*.conf 2>/dev/null; do
  [ -f "$f" ] || continue
  if grep -q "自营\|扩展\|客户\|玩值\|小工具\|归档\|测试" "$f" 2>/dev/null; then
    sed -i 's|/www/wwwroot/自营/玩值/|/www/wwwroot/self/wanzhi/|g' "$f"
    sed -i 's|/www/wwwroot/自营/|/www/wwwroot/self/|g' "$f"
    sed -i 's|/www/wwwroot/扩展/小工具/|/www/wwwroot/ext/tools/|g' "$f"
    sed -i 's|/www/wwwroot/扩展/|/www/wwwroot/ext/|g' "$f"
    sed -i 's|/www/wwwroot/客户/|/www/wwwroot/client/|g' "$f"
    sed -i 's|/www/wwwroot/归档/|/www/wwwroot/archive/|g' "$f"
    sed -i 's|/www/wwwroot/测试/|/www/wwwroot/test/|g' "$f"
    echo "  已更新: $f"
  fi
done

# 6. 强制只用宝塔 Nginx
echo ""
echo "【6】Nginx 只用宝塔版"
killall nginx 2>/dev/null || true
sleep 2
/www/server/nginx/sbin/nginx -c /www/server/nginx/conf/nginx.conf 2>/dev/null || true
sleep 1
nginx -t 2>/dev/null && nginx -s reload 2>/dev/null
echo "  宝塔 Nginx 已启动并重载"

# 7. 更新 Node 项目 project_config 中的启动命令路径
echo ""
echo "【7】更新 Node 启动命令路径"
python3 - << 'PY3'
import hashlib, json, os, sqlite3, time, urllib.request, urllib.parse, ssl
ssl._create_default_https_context = ssl._create_unverified_context
REPLACES = [
    ("/www/wwwroot/自营/玩值/", "/www/wwwroot/self/wanzhi/"),
    ("/www/wwwroot/自营/", "/www/wwwroot/self/"),
    ("/www/wwwroot/扩展/小工具/", "/www/wwwroot/ext/tools/"),
    ("/www/wwwroot/扩展/", "/www/wwwroot/ext/"),
    ("/www/wwwroot/客户/", "/www/wwwroot/client/"),
]
def replace_path(s):
    for a, b in REPLACES: s = s.replace(a, b)
    return s

PROJECT_CMD = {
    "玩值大屏": "/www/wwwroot/self/wanzhi/玩值大屏",
    "tongzhi": "/www/wwwroot/self/wanzhi/tongzhi",
    "is_phone": "/www/wwwroot/self/kr/kr-phone",
    "ai_hair": "/www/wwwroot/client/ai_hair",
    "AITOUFA": "/www/wwwroot/ext/tools/AITOUFA",
    "wzdj": "/www/wwwroot/self/wzdj",
    "zhiji": "/www/wwwroot/self/zhiji",
    "ymao": "/www/wwwroot/ext/ymao",
    "zhaoping": "/www/wwwroot/client/zhaoping",
    "神射手": "/www/wwwroot/self/kr/kr-use",
    "word": "/www/wwwroot/self/word",
}
db = "/www/server/panel/data/db/site.db"
if os.path.isfile(db):
    conn = sqlite3.connect(db)
    c = conn.cursor()
    c.execute("SELECT id, name, project_config FROM sites WHERE project_type='Node'")
    for row in c.fetchall():
        sid, name, cfg_str = row[0], row[1], row[2] or "{}"
        path = PROJECT_CMD.get(name)
        if not path: continue
        try: cfg = json.loads(cfg_str)
        except: cfg = {}
        cmd = "cd %s && (pnpm start 2>/dev/null || npm run start)" % path
        cfg["project_script"] = cmd
        cfg["run_cmd"] = cmd
        c.execute("UPDATE sites SET project_config=? WHERE id=?", (json.dumps(cfg, ensure_ascii=False), sid))
        print("  %s" % name)
    conn.commit()
    conn.close()
PY3

# 8. 批量启动 Node 项目
echo ""
echo "【8】批量启动 Node 项目"
python3 - << 'PY4'
import hashlib, json, os, re, subprocess, time, urllib.request, urllib.parse, ssl
ssl._create_default_https_context = ssl._create_unverified_context
PANEL, K = "https://127.0.0.1:9988", "qcWubCdlfFjS2b2DMT1lzPFaDfmv1cBT"
def sign():
    t = int(time.time())
    s = str(t) + hashlib.md5(K.encode()).hexdigest()
    return {"request_time": t, "request_token": hashlib.md5(s.encode()).hexdigest()}
def post(p, d=None):
    pl = sign()
    if d: pl.update(d)
    r = urllib.request.Request(PANEL + p, data=urllib.parse.urlencode(pl).encode())
    with urllib.request.urlopen(r, timeout=30) as resp:
        return json.loads(resp.read().decode())
def pids(port):
    try:
        o = subprocess.check_output("ss -tlnp 2>/dev/null | grep ':%s ' || true" % port, shell=True, universal_newlines=True)
        return {int(x) for x in re.findall(r"pid=(\d+)", o)}
    except: return set()
def ports(it):
    cfg = it.get("project_config") or {}
    if isinstance(cfg, str):
        try: cfg = json.loads(cfg)
        except: cfg = {}
    ps = []
    if cfg.get("port"): ps.append(int(cfg["port"]))
    for m in re.findall(r"-p\s*(\d+)", str(cfg.get("project_script",""))): ps.append(int(m))
    return ps

r0 = post("/project/nodejs/get_project_list")
items = r0.get("data") or r0.get("list") or []
for it in items:
    name = it.get("name")
    if not name: continue
    try:
        for port in ports(it):
            for pid in pids(port):
                subprocess.call("kill -9 %s 2>/dev/null" % pid, shell=True)
        pf = "/www/server/nodejs/vhost/pids/%s.pid" % name
        if os.path.exists(pf):
            try: open(pf,"w").write("0")
            except: pass
        post("/project/nodejs/stop_project", {"project_name": name})
        time.sleep(0.5)
        r = post("/project/nodejs/start_project", {"project_name": name})
        ok = r.get("status") is True or "成功" in str(r.get("msg",""))
        print("  %s: %s" % (name, "OK" if ok else "FAIL"))
    except Exception as e:
        print("  %s: ERR" % name)
    time.sleep(1)

time.sleep(5)
r1 = post("/project/nodejs/get_project_list")
items2 = r1.get("data") or r1.get("list") or []
run_c = sum(1 for x in items2 if x.get("run"))
print("  运行 %d / %d" % (run_c, len(items2)))
PY4

echo ""
echo "=== 迁移完成 ==="
'''

def _read_creds():
    d = os.path.dirname(os.path.abspath(__file__))
    for _ in range(6):
        if os.path.isfile(os.path.join(d, "运营中枢", "工作台", "00_账号与API索引.md")):
            with open(os.path.join(d, "运营中枢", "工作台", "00_账号与API索引.md")) as f:
                t = f.read()
            sid = skey = None
            in_t = False
            for line in t.splitlines():
                if "### 腾讯云" in line: in_t = True; continue
                if in_t and line.strip().startswith("###"): break
                if not in_t: continue
                m = re.search(r"SecretId[^|]*\|\s*`([^`]+)`", line, re.I)
                if m and "AKID" in m.group(1): sid = m.group(1).strip()
                m = re.search(r"SecretKey\s*\|\s*`([^`]+)`", line, re.I)
                if m: skey = m.group(1).strip()
            return sid or os.environ.get("TENCENTCLOUD_SECRET_ID"), skey or os.environ.get("TENCENTCLOUD_SECRET_KEY")
        d = os.path.dirname(d)
    return None, None


def main():
    sid, skey = _read_creds()
    if not sid or not skey:
        print("❌ 未配置腾讯云凭证"); return 1
    try:
        from tencentcloud.common import credential
        from tencentcloud.tat.v20201028 import tat_client, models
    except ImportError:
        print("pip install tencentcloud-sdk-python-tat"); return 1

    cred = credential.Credential(sid, skey)
    client = tat_client.TatClient(cred, REGION)
    req = models.RunCommandRequest()
    req.Content = base64.b64encode(SHELL_SCRIPT.encode("utf-8")).decode()
    req.InstanceIds = [KR_INSTANCE_ID]
    req.CommandType = "SHELL"
    req.Timeout = 600
    req.CommandName = "kr宝塔_中文目录改英文迁移"
    resp = client.RunCommand(req)
    print("✅ TAT 已下发 InvocationId:", resp.InvocationId)
    print("  步骤: 停 Node → 删映射 → 重命名目录 → 更新 site.db → 更新 Nginx → 只启用宝塔 Nginx → 启动 Node")
    print("  等待 180s...")
    time.sleep(180)
    try:
        req2 = models.DescribeInvocationTasksRequest()
        f = models.Filter()
        f.Name, f.Values = "invocation-id", [resp.InvocationId]
        req2.Filters = [f]
        r2 = client.DescribeInvocationTasks(req2)
        for t in (r2.InvocationTaskSet or []):
            print("  状态:", getattr(t, "TaskStatus", ""))
            tr = getattr(t, "TaskResult", None)
            if tr:
                j = json.loads(tr) if isinstance(tr, str) else {}
                out = j.get("Output", "")
                if out:
                    try: out = base64.b64decode(out).decode("utf-8", errors="replace")
                    except: pass
                    print("  输出:\n", (out or "")[:6000])
    except Exception as e:
        print("  查询:", e)
    return 0


if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
腾讯云 TAT：kr宝塔 中文路径 + MODULE_NOT_FOUND 修复
1. 创建符号链接（ext->扩展、client->客户、self->自营）避免中文路径问题
2. 修复 site.db 中 Node 项目的启动命令（project_config.project_script）
    若为 node /path/to/dir（目录当入口）则改为 cd /path && npm run start
3. 批量重启全部 Node 项目
"""
import base64
import json
import os
import re
import sys
import time

KR_INSTANCE_ID = "ins-aw0tnqjo"
REGION = "ap-guangzhou"

# 项目名 -> (根目录, 建议启动命令)
PROJECT_FIX = {
    "玩值大屏": ("/www/wwwroot/自营/玩值/玩值大屏", "cd /www/wwwroot/自营/玩值/玩值大屏 && (pnpm start 2>/dev/null || npm run start)"),
    "tongzhi": ("/www/wwwroot/自营/玩值/tongzhi", "cd /www/wwwroot/自营/玩值/tongzhi && (pnpm start 2>/dev/null || npm run start)"),
    "is_phone": ("/www/wwwroot/自营/kr/kr-phone", "cd /www/wwwroot/自营/kr/kr-phone && (pnpm start 2>/dev/null || npm run start)"),
    "ai_hair": ("/www/wwwroot/客户/ai_hair", "cd /www/wwwroot/客户/ai_hair && (pnpm start 2>/dev/null || npm run start)"),
    "AITOUFA": ("/www/wwwroot/扩展/小工具/AITOUFA", "cd /www/wwwroot/扩展/小工具/AITOUFA && (pnpm start 2>/dev/null || npm run start)"),
    "wzdj": ("/www/wwwroot/自营/wzdj", "cd /www/wwwroot/自营/wzdj && (pnpm start 2>/dev/null || npm run start)"),
    "zhiji": ("/www/wwwroot/自营/zhiji", "cd /www/wwwroot/自营/zhiji && (pnpm start 2>/dev/null || npm run start)"),
    "ymao": ("/www/wwwroot/扩展/ymao", "cd /www/wwwroot/扩展/ymao && (pnpm start 2>/dev/null || npm run start)"),
    "zhaoping": ("/www/wwwroot/客户/zhaoping", "cd /www/wwwroot/客户/zhaoping && (pnpm start 2>/dev/null || npm run start)"),
    "神射手": ("/www/wwwroot/自营/kr/kr-use", "cd /www/wwwroot/自营/kr/kr-use && (pnpm start 2>/dev/null || npm run start)"),
    "word": ("/www/wwwroot/自营/word", "cd /www/wwwroot/自营/word && (pnpm start 2>/dev/null || npm run start)"),
}

SHELL_SCRIPT = r'''#!/bin/bash
echo "=== kr宝塔 中文路径 + MODULE_NOT_FOUND 修复 ==="

# 1. 创建符号链接（ext->扩展、client->客户、self->自营）
echo ""
echo "【1】符号链接"
cd /www/wwwroot
for pair in "ext:扩展" "client:客户" "self:自营"; do
  a="${pair%%:*}"; b="${pair##*:}"
  if [ -d "$b" ] && [ ! -e "$a" ]; then
    ln -s "$b" "$a" 2>/dev/null && echo "  $a -> $b"
  fi
done

# 2. 修复 site.db 中 Node 项目启动命令
echo ""
echo "【2】修复 site.db 启动命令"
python3 - << 'PYEOF'
import hashlib, json, os, sqlite3, time, urllib.request, urllib.parse, ssl, subprocess

ssl._create_default_https_context = ssl._create_unverified_context
PANEL, K = "https://127.0.0.1:9988", "qcWubCdlfFjS2b2DMT1lzPFaDfmv1cBT"
PROJECT_FIX = {
    "玩值大屏": ("/www/wwwroot/自营/玩值/玩值大屏", "cd /www/wwwroot/自营/玩值/玩值大屏 && (pnpm start 2>/dev/null || npm run start)"),
    "tongzhi": ("/www/wwwroot/自营/玩值/tongzhi", "cd /www/wwwroot/自营/玩值/tongzhi && (pnpm start 2>/dev/null || npm run start)"),
    "is_phone": ("/www/wwwroot/自营/kr/kr-phone", "cd /www/wwwroot/自营/kr/kr-phone && (pnpm start 2>/dev/null || npm run start)"),
    "ai_hair": ("/www/wwwroot/客户/ai_hair", "cd /www/wwwroot/客户/ai_hair && (pnpm start 2>/dev/null || npm run start)"),
    "AITOUFA": ("/www/wwwroot/扩展/小工具/AITOUFA", "cd /www/wwwroot/扩展/小工具/AITOUFA && (pnpm start 2>/dev/null || npm run start)"),
    "wzdj": ("/www/wwwroot/自营/wzdj", "cd /www/wwwroot/自营/wzdj && (pnpm start 2>/dev/null || npm run start)"),
    "zhiji": ("/www/wwwroot/自营/zhiji", "cd /www/wwwroot/自营/zhiji && (pnpm start 2>/dev/null || npm run start)"),
    "ymao": ("/www/wwwroot/扩展/ymao", "cd /www/wwwroot/扩展/ymao && (pnpm start 2>/dev/null || npm run start)"),
    "zhaoping": ("/www/wwwroot/客户/zhaoping", "cd /www/wwwroot/客户/zhaoping && (pnpm start 2>/dev/null || npm run start)"),
    "神射手": ("/www/wwwroot/自营/kr/kr-use", "cd /www/wwwroot/自营/kr/kr-use && (pnpm start 2>/dev/null || npm run start)"),
    "word": ("/www/wwwroot/自营/word", "cd /www/wwwroot/自营/word && (pnpm start 2>/dev/null || npm run start)"),
}

def sign():
    t = int(time.time())
    s = str(t) + hashlib.md5(K.encode()).hexdigest()
    return {"request_time": t, "request_token": hashlib.md5(s.encode()).hexdigest()}
def post(p, d=None):
    pl = sign()
    if d: pl.update(d)
    r = urllib.request.Request(PANEL + p, data=urllib.parse.urlencode(pl).encode())
    with urllib.request.urlopen(r, timeout=25) as resp:
        return json.loads(resp.read().decode())

db = "/www/server/panel/data/db/site.db"
if not os.path.isfile(db):
    print("  site.db 不存在")
else:
    conn = sqlite3.connect(db)
    c = conn.cursor()
    c.execute("SELECT id, name, project_config FROM sites WHERE project_type='Node'")
    rows = c.fetchall()
    updated = 0
    for row in rows:
        sid, name, cfg_str = row[0], row[1], row[2] or "{}"
        if name not in PROJECT_FIX:
            continue
        path, cmd = PROJECT_FIX[name]
        try:
            cfg = json.loads(cfg_str) if cfg_str else {}
        except: cfg = {}
        old_script = str(cfg.get("project_script") or cfg.get("run_cmd") or "").strip()
        need_fix = (
            not old_script or
            "cd " not in old_script and ("node /" in old_script or old_script == path or old_script.rstrip("/") == path)
        )
        if need_fix:
            cfg["project_script"] = cmd
            cfg["run_cmd"] = cmd
            c.execute("UPDATE sites SET project_config=? WHERE id=?", (json.dumps(cfg, ensure_ascii=False), sid))
            updated += 1
            print("  %s: 已修复" % name)
    conn.commit()
    conn.close()
    print("  更新 %d 个项目" % updated)

# 3. pnpm install 可能缺失依赖的项目
print("\n【3】安装依赖（可选）")
for name, (path, _) in PROJECT_FIX.items():
    if os.path.isdir(path) and os.path.isfile(os.path.join(path, "package.json")):
        try:
            subprocess.check_output("cd '%s' && (pnpm install 2>/dev/null || npm install 2>/dev/null) || true" % path, shell=True, timeout=90)
        except: pass

# 4. 批量重启 Node 项目（宝塔 API）
print("\n【4】批量重启 Node 项目")
r0 = post("/project/nodejs/get_project_list")
items = r0.get("data") or r0.get("list") or []
for it in items:
    name = it.get("name")
    if not name: continue
    try:
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
print("\n  运行 %d / %d" % (run_c, len(items2)))
PYEOF

echo ""
echo "=== 完成 ==="
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
    req.Content = base64.b64encode(SHELL_SCRIPT.encode()).decode()
    req.InstanceIds = [KR_INSTANCE_ID]
    req.CommandType = "SHELL"
    req.Timeout = 300
    req.CommandName = "kr宝塔_中文路径与MODULE修复"
    resp = client.RunCommand(req)
    print("✅ TAT 已下发 InvocationId:", resp.InvocationId)
    print("  步骤: 符号链接 → 修复 site.db 启动命令 → pnpm install → 批量重启")
    print("  等待 120s...")
    time.sleep(120)
    try:
        req2 = models.DescribeInvocationTasksRequest()
        f = models.Filter()
        f.Name, f.Values = "invocation-id", [resp.InvocationId]
        req2.Filters = [f]
        r2 = client.DescribeInvocationTasks(req2)
        for t in (r2.InvocationTaskSet or []):
            st = getattr(t, "TaskStatus", "")
            print("  状态:", st)
            tr = getattr(t, "TaskResult", None)
            if tr:
                j = json.loads(tr) if isinstance(tr, str) else {}
                out = j.get("Output", "")
                if out:
                    try: out = base64.b64decode(out).decode("utf-8", errors="replace")
                    except: pass
                    print("  输出:\n", (out or "")[:5000])
    except Exception as e:
        print("  查询:", e)
    return 0


if __name__ == "__main__":
    sys.exit(main())

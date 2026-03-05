#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
腾讯云 TAT 在存客宝上清理 Linux.Risk.Miner.Jcnw 挖矿木马
告警文件：/tmp/.esd101/.system3d
"""
import base64
import json
import os
import re
import sys
import time

CKB_INSTANCE_ID = "ins-ciyv2mxa"
REGION = "ap-guangzhou"

CMD = r'''
echo "=== 1. 查找占用恶意文件的进程 ==="
f="/tmp/.esd101/.system3d"
[ -f "$f" ] && fuser -v "$f" 2>/dev/null || echo "  文件不存在或无进程占用"
lsof "$f" 2>/dev/null || true
echo ""
echo "=== 2. 结束相关进程 ==="
for pid in $(lsof -t "$f" 2>/dev/null); do kill -9 $pid 2>/dev/null && echo "  已结束 PID $pid"; done
pkill -9 -f ".esd101" 2>/dev/null && echo "  已结束 .esd101 相关进程" || true
pkill -9 -f ".system3d" 2>/dev/null && echo "  已结束 .system3d 相关进程" || true
sleep 1
echo ""
echo "=== 3. 删除恶意文件及目录 ==="
rm -rf /tmp/.esd101 2>/dev/null && echo "  已删除 /tmp/.esd101" || echo "  删除失败或不存在"
echo ""
echo "=== 4. 检查 /tmp 下其他隐藏目录 ==="
ls -la /tmp/ | head -30
echo ""
echo "=== 5. 检查定时任务（crontab）==="
crontab -l 2>/dev/null | grep -v "^#" || echo "  无 crontab"
for u in root www; do echo "  [$u]"; crontab -u $u -l 2>/dev/null | grep -v "^#" || true; done
echo ""
echo "=== 6. 检查 /etc/cron 可疑项 ==="
grep -r "\.esd101\|\.system3d\|/tmp/\." /etc/cron* 2>/dev/null || echo "  无"
echo ""
echo "=== 7. 高 CPU 进程（前 10）==="
ps aux --sort=-%cpu | head -12
echo ""
echo "DONE"
'''


def _read_creds():
    d = os.path.dirname(os.path.abspath(__file__))
    for _ in range(6):
        root = d
        if os.path.basename(d) == "卡若AI":
            break
        d = os.path.dirname(d)
    p = os.path.join(root, "运营中枢", "工作台", "00_账号与API索引.md")
    if not os.path.isfile(p):
        return None, None
    with open(p, "r", encoding="utf-8") as f:
        t = f.read()
    sid = skey = None
    in_t = False
    for line in t.splitlines():
        if "### 腾讯云" in line:
            in_t = True
            continue
        if in_t and line.strip().startswith("###"):
            break
        if not in_t:
            continue
        m = re.search(r"SecretId[^|]*\|\s*`([^`]+)`", line, re.I)
        if m and m.group(1).strip().startswith("AKID"):
            sid = m.group(1).strip()
        m = re.search(r"SecretKey[^|]*\|\s*`([^`]+)`", line, re.I)
        if m:
            skey = m.group(1).strip()
    return sid or os.environ.get("TENCENTCLOUD_SECRET_ID"), skey or os.environ.get("TENCENTCLOUD_SECRET_KEY")


def main():
    print("存客宝 挖矿木马清理 TAT 下发...", flush=True)
    sid, skey = _read_creds()
    if not sid or not skey:
        print("❌ 未配置腾讯云凭证", flush=True)
        return 1
    try:
        from tencentcloud.common import credential
        from tencentcloud.tat.v20201028 import tat_client, models
    except ImportError:
        print("pip install tencentcloud-sdk-python-tat")
        return 1
    cred = credential.Credential(sid, skey)
    client = tat_client.TatClient(cred, REGION)
    req = models.RunCommandRequest()
    req.Content = base64.b64encode(CMD.encode()).decode()
    req.InstanceIds = [CKB_INSTANCE_ID]
    req.CommandType = "SHELL"
    req.Timeout = 60
    req.CommandName = "CKB_KillMiner"
    resp = client.RunCommand(req)
    inv_id = resp.InvocationId
    print("⏳ TAT 已下发挖矿木马清理，等待 25s...")
    time.sleep(25)
    req2 = models.DescribeInvocationTasksRequest()
    f = models.Filter()
    f.Name = "invocation-id"
    f.Values = [inv_id]
    req2.Filters = [f]
    r2 = client.DescribeInvocationTasks(req2)
    for t in (r2.InvocationTaskSet or []):
        tr = getattr(t, "TaskResult", None)
        if tr:
            try:
                jj = json.loads(tr) if isinstance(tr, str) else tr
                out = jj.get("Output", "")
                if out:
                    out = base64.b64decode(out).decode("utf-8", errors="replace")
                    print("\n--- 服务器输出 ---\n%s\n---" % out[:5000])
            except Exception:
                print(str(tr)[:600])
    print("\n建议：登录腾讯云控制台 → 入侵检测 → 文件查杀，确认处置并加强防护。")
    return 0


if __name__ == "__main__":
    sys.exit(main())

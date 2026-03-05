#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
腾讯云 TAT 在存客宝上清除主机安全告警的恶意文件（挖矿 Linux.Risk.Miner.Jcnw）
路径：/tmp/.esd101/.system3d
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
set -e
echo "=== 1. 恶意文件与目录（腾讯云主机安全告警）==="
MAL_PATH="/tmp/.esd101"
MAL_FILE="/tmp/.esd101/.system3d"
[ -f "$MAL_FILE" ] && echo "  存在: $MAL_FILE" || echo "  文件已不存在"
[ -d "$MAL_PATH" ] && echo "  目录存在: $MAL_PATH" || echo "  目录已不存在"
echo ""
echo "=== 2. 占用该路径的进程 ==="
fuser -v "$MAL_FILE" 2>/dev/null || true
lsof "$MAL_FILE" 2>/dev/null || true
for pid in $(lsof +D "$MAL_PATH" 2>/dev/null | awk 'NR>1 {print $2}' | sort -u); do
  echo "  进程 PID=$pid"
  ps -p $pid -o pid,user,cmd 2>/dev/null || true
done
echo ""
echo "=== 3. 终止关联进程 ==="
for pid in $(lsof +D "$MAL_PATH" 2>/dev/null | awk 'NR>1 {print $2}' | sort -u); do
  kill -9 $pid 2>/dev/null && echo "  已 kill -9 $pid" || true
done
sleep 1
echo ""
echo "=== 4. 删除恶意文件与目录 ==="
rm -rf "$MAL_FILE" "$MAL_PATH" 2>/dev/null && echo "  已删除 $MAL_PATH 及内容" || echo "  删除完成或路径不存在"
echo ""
echo "=== 5. 再次确认 ==="
[ -d "$MAL_PATH" ] && echo "  警告: 目录仍存在" || echo "  目录已清除"
echo ""
echo "=== 6. 检查 /tmp 下其他隐藏可疑目录 ==="
ls -la /tmp/ | grep -E '^d.*\.' || echo "  (无其他隐藏目录或已清理)"
echo ""
echo "=== 7. 当前用户 crontab 是否含可疑项 ==="
crontab -l 2>/dev/null | grep -v '^#' | grep -v '^$' || echo "  (无 crontab 或为空)"
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
    sid, skey = _read_creds()
    if not sid or not skey:
        print("❌ 未配置腾讯云凭证")
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
    req.CommandName = "CKB_CleanMalware"
    resp = client.RunCommand(req)
    inv_id = resp.InvocationId
    print("⏳ TAT 已下发清除恶意文件（存客宝 42.194.245.239），等待 25s...")
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
                print(str(tr)[:800])
    print("\n建议：登录腾讯云控制台 → 主机安全 → 入侵检测 → 文件查杀，确认告警已处理。")
    return 0


if __name__ == "__main__":
    sys.exit(main())

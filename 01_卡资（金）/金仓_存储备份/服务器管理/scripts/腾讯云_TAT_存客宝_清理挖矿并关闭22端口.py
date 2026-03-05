#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TAT 存客宝：清理挖矿木马 + 关闭 22 端口（仅保留 22022 防暴力破解入口）
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
echo "=== 1. 清理挖矿木马 ==="
f="/tmp/.esd101/.system3d"
[ -f "$f" ] && for pid in $(lsof -t "$f" 2>/dev/null); do kill -9 $pid 2>/dev/null; done
pkill -9 -f ".esd101" 2>/dev/null || true
pkill -9 -f ".system3d" 2>/dev/null || true
sleep 1
rm -rf /tmp/.esd101
(crontab -l 2>/dev/null | grep -v "esd101\|system3d\|/tmp/\.") | crontab - 2>/dev/null || true
echo "  已清理 /tmp/.esd101 与 crontab"

echo ""
echo "=== 2. 关闭 22 端口（保留 22022）==="
# 2.1 确保 sshd 只监听 22022
CFG="/etc/ssh/sshd_config"
if [ -f "$CFG" ]; then
  cp "$CFG" "$CFG.bak.$(date +%Y%m%d%H%M)"
  sed -i '/^Port /d' "$CFG"
  sed -i '/^#Port /d' "$CFG"
  echo "Port 22022" >> "$CFG"
  echo "  已设置 sshd 仅 Port 22022"
fi
# 2.2 防火墙禁止 22 入站（双重保险）
iptables -C INPUT -p tcp --dport 22 -j DROP 2>/dev/null || iptables -A INPUT -p tcp --dport 22 -j DROP
echo "  iptables 已 DROP 22"
# 2.3 重启 sshd 使配置生效
systemctl restart sshd 2>/dev/null || service sshd restart 2>/dev/null || /etc/init.d/sshd restart 2>/dev/null
echo "  sshd 已重启，现仅监听 22022"

echo ""
echo "=== 3. 检查 ==="
ss -tlnp | grep -E ":22|:22022" || true
echo ""
echo "DONE. 今后 SSH 仅用: ssh -p 22022 root@42.194.245.239"
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
    req.Timeout = 90
    req.CommandName = "CKB_CleanMiner_ClosePort22"
    resp = client.RunCommand(req)
    inv_id = resp.InvocationId
    print("⏳ TAT 已下发：清理挖矿 + 关闭 22 端口，等待 35s...")
    time.sleep(35)
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
                    print("\n--- 服务器输出 ---\n%s\n---" % out[:4000])
            except Exception:
                print(str(tr)[:600])
    print("\n✅ 完成后 SSH 仅用：ssh -p 22022 root@42.194.245.239")
    return 0


if __name__ == "__main__":
    sys.exit(main())

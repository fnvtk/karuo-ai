#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
腾讯云 TAT：kr宝塔 负载诊断（只读，不杀进程）
输出：uptime、内存、磁盘、连接数、CPU/内存 TOP20、node 进程详情
"""
import base64
import json
import os
import re
import sys
import time

KR_INSTANCE_ID = "ins-aw0tnqjo"
REGION = "ap-guangzhou"

DIAG_SCRIPT = r'''#!/bin/bash
echo "========== kr宝塔 负载诊断 =========="
echo ""
echo "【1】负载与运行时间"
uptime
echo ""
echo "【2】内存"
free -m
echo ""
echo "【3】磁盘"
df -h / /www 2>/dev/null
echo ""
echo "【4】连接数(ESTABLISHED)"
echo "总数:" $(ss -ant state established 2>/dev/null | wc -l)
echo ""
echo "【5】各端口连接数 TOP15"
ss -antn state established 2>/dev/null | awk '{print $4}' | cut -d: -f2 | sort | uniq -c | sort -rn | head -15
echo ""
echo "【6】单IP连接数 TOP10"
ss -antn state established 2>/dev/null | awk '{print $5}' | cut -d: -f1 | sort | uniq -c | sort -rn | head -10
echo ""
echo "【7】CPU TOP20"
ps aux --sort=-%cpu 2>/dev/null | head -21
echo ""
echo "【8】内存 TOP20"
ps aux --sort=-%mem 2>/dev/null | head -21
echo ""
echo "【9】Node/npm/pnpm 进程"
ps aux | grep -E 'node|npm|pnpm|next-server' | grep -v grep
echo ""
echo "【10】Node 进程数"
echo "node:" $(pgrep -c node 2>/dev/null || echo 0)
echo "npm:" $(pgrep -c npm 2>/dev/null || echo 0)
echo ""
echo "========== 诊断完成 =========="
'''

def _read_creds():
    d = os.path.dirname(os.path.abspath(__file__))
    for _ in range(6):
        if os.path.isfile(os.path.join(d, "运营中枢", "工作台", "00_账号与API索引.md")):
            with open(os.path.join(d, "运营中枢", "工作台", "00_账号与API索引.md")) as f:
                t = f.read()
            sid = skey = None
            for line in t.splitlines():
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
    req.Content = base64.b64encode(DIAG_SCRIPT.encode("utf-8")).decode()
    req.InstanceIds = [KR_INSTANCE_ID]
    req.CommandType = "SHELL"
    req.Timeout = 60
    req.CommandName = "kr宝塔_负载诊断"
    resp = client.RunCommand(req)
    inv_id = resp.InvocationId
    print("✅ TAT 已下发 InvocationId:", inv_id)
    print("  等待 90s 获取诊断输出...")
    time.sleep(90)

    try:
        req2 = models.DescribeInvocationTasksRequest()
        f = models.Filter()
        f.Name, f.Values = "invocation-id", [inv_id]
        req2.Filters = [f]
        r2 = client.DescribeInvocationTasks(req2)
        for t in (r2.InvocationTaskSet or []):
            print("\n状态:", getattr(t, "TaskStatus", ""))
            tr = getattr(t, "TaskResult", None)
            if tr:
                j = json.loads(tr) if isinstance(tr, str) else {}
                out = j.get("Output", "")
                if out:
                    try: out = base64.b64decode(out).decode("utf-8", errors="replace")
                    except: pass
                    print(out)
    except Exception as e:
        print("查询:", e)
    return 0


if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""TAT：kr宝塔 彻底去除 PM2，仅用宝塔 Node 管理器"""
import base64, os, re, sys, time
KR_INSTANCE_ID, REGION = "ins-aw0tnqjo", "ap-guangzhou"
SCRIPT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "kr宝塔_彻底去除PM2_仅用宝塔Node_宝塔终端执行.sh")

def _creds():
    d = os.path.dirname(os.path.abspath(__file__))
    for _ in range(6):
        p = os.path.join(d, "运营中枢", "工作台", "00_账号与API索引.md")
        if os.path.isfile(p):
            t = open(p).read()
            sid = skey = None
            for L in t.splitlines():
                m = re.search(r"SecretId[^|]*\|\s*`([^`]+)`", L, re.I)
                if m and "AKID" in m.group(1): sid = m.group(1).strip()
                m = re.search(r"SecretKey\s*\|\s*`([^`]+)`", L, re.I)
                if m: skey = m.group(1).strip()
            return sid or os.environ.get("TENCENTCLOUD_SECRET_ID"), skey or os.environ.get("TENCENTCLOUD_SECRET_KEY")
        d = os.path.dirname(d)
    return None, None

def main():
    sid, skey = _creds()
    if not sid or not skey: print("❌ 未配置凭证"); return 1
    with open(SCRIPT, "r", encoding="utf-8") as f:
        shell = f.read()
    from tencentcloud.common import credential
    from tencentcloud.tat.v20201028 import tat_client, models
    cred = credential.Credential(sid, skey)
    cli = tat_client.TatClient(cred, REGION)
    req = models.RunCommandRequest()
    req.Content = base64.b64encode(shell.encode("utf-8")).decode()
    req.InstanceIds = [KR_INSTANCE_ID]
    req.CommandType = "SHELL"
    req.Timeout = 120
    req.CommandName = "kr宝塔_彻底去除PM2"
    r = cli.RunCommand(req)
    print("✅ TAT 已下发")
    time.sleep(100)
    req2 = models.DescribeInvocationTasksRequest()
    f = models.Filter()
    f.Name, f.Values = "invocation-id", [r.InvocationId]
    req2.Filters = [f]
    for t in (cli.DescribeInvocationTasks(req2).InvocationTaskSet or []):
        tr = getattr(t, "TaskResult", None)
        if tr and getattr(tr, "Output", None):
            try: print(base64.b64decode(tr.Output).decode("utf-8", errors="replace"))
            except: pass
    return 0

if __name__ == "__main__": sys.exit(main())

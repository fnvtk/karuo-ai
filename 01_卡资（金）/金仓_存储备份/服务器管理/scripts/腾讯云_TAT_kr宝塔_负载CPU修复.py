#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""TAT：kr宝塔 负载与 CPU 过载修复（PM2 清理 + 杀高 CPU Node + 停/修/启 Node）"""
import base64, os, re, sys, time

KR_INSTANCE_ID, REGION = "ins-aw0tnqjo", "ap-guangzhou"
SCRIPT_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "kr宝塔_负载CPU修复_宝塔终端执行.sh")


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
    if not sid or not skey:
        print("❌ 未配置凭证"); return 1
    with open(SCRIPT_PATH, "r", encoding="utf-8") as f:
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
    req.CommandName = "kr宝塔_负载CPU修复"
    r = cli.RunCommand(req)
    print("✅ TAT inv:", r.InvocationId)
    time.sleep(100)
    req2 = models.DescribeInvocationTasksRequest()
    f = models.Filter()
    f.Name, f.Values = "invocation-id", [r.InvocationId]
    req2.Filters = [f]
    r2 = cli.DescribeInvocationTasks(req2)
    for t in (r2.InvocationTaskSet or []):
        print("状态:", getattr(t, "TaskStatus", ""))
        tr = getattr(t, "TaskResult", None)
        if tr:
            out = getattr(tr, "Output", tr.__dict__.get("Output", ""))
            if out:
                try:
                    print(base64.b64decode(out).decode("utf-8", errors="replace"))
                except Exception:
                    print(str(out)[:2000])
    return 0


if __name__ == "__main__":
    sys.exit(main())

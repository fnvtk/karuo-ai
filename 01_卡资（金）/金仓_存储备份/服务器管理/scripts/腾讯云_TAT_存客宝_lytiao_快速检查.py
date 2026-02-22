#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""快速检查 lytiao 容器状态，获取 TAT 输出"""
import base64, json, os, re, sys, time
CKB_ID, REGION = "ins-ciyv2mxa", "ap-guangzhou"
def _cred():
    d = os.path.dirname(os.path.abspath(__file__))
    for _ in range(6):
        r = os.path.join(d, "运营中枢", "工作台", "00_账号与API索引.md")
        if os.path.isfile(r):
            t = open(r, encoding="utf-8").read()
            sid = skey = None
            in_t = False
            for L in t.splitlines():
                if "### 腾讯云" in L: in_t = True
                elif in_t and L.strip().startswith("###"): break
                elif in_t:
                    m = re.search(r"SecretId[^|]*\|\s*`([^`]+)`", L, re.I)
                    if m and m.group(1).strip().startswith("AKID"): sid = m.group(1).strip()
                    m = re.search(r"SecretKey[^|]*\|\s*`([^`]+)`", L, re.I)
                    if m: skey = m.group(1).strip()
            return sid or os.environ.get("TENCENTCLOUD_SECRET_ID"), skey or os.environ.get("TENCENTCLOUD_SECRET_KEY")
        d = os.path.dirname(d)
    return None, None
CMD = """cd /opt/lytiao_docker 2>/dev/null && docker compose ps -a
echo "---"
docker ps -a --filter name=lytiao
echo "---"
ss -tlnp | grep -E '8080|8090' || true
echo "---"
curl -sI -o /dev/null -w '8090: %{http_code}' http://127.0.0.1:8090/ 2>/dev/null || echo "8090 curl fail"
"""
def main():
    sid, skey = _cred()
    if not sid or not skey: print("❌ 无凭证"); return 1
    from tencentcloud.common import credential
    from tencentcloud.tat.v20201028 import tat_client, models
    cred = credential.Credential(sid, skey)
    client = tat_client.TatClient(cred, REGION)
    req = models.RunCommandRequest()
    req.Content = base64.b64encode(CMD.encode()).decode()
    req.InstanceIds = [CKB_ID]
    req.CommandType, req.Timeout = "SHELL", 30
    req.CommandName = "CKB_lytiao_Check"
    r = client.RunCommand(req)
    inv = r.InvocationId
    print("⏳ 等待 25s...")
    time.sleep(25)
    req2 = models.DescribeInvocationTasksRequest()
    f = models.Filter(); f.Name, f.Values = "invocation-id", [inv]
    req2.Filters = [f]
    r2 = client.DescribeInvocationTasks(req2)
    for t in (r2.InvocationTaskSet or []):
        print("状态:", getattr(t, "TaskStatus", ""))
        tr = getattr(t, "TaskResult", None)
        if tr:
            try:
                j = tr if hasattr(tr, "get") else (json.loads(tr) if isinstance(tr, str) else vars(tr) if hasattr(tr, "__dict__") else {})
                o = (j.get("Output", "") if isinstance(j, dict) else "") or getattr(tr, "Output", "")
                if o:
                    try:
                        o = base64.b64decode(o).decode("utf-8", errors="replace")
                    except Exception:
                        pass
                    print("\n--- 服务器输出 ---\n", o)
            except Exception as e:
                print("解析:", e, "raw:", str(tr)[:300])
    return 0
if __name__ == "__main__":
    sys.exit(main())

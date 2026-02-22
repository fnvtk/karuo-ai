#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""仅启动 lytiao 容器（不重新构建），并返回详细输出"""
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

# 只启动，不构建；若镜像不存在会报错，便于定位
CMD = """cd /opt/lytiao_docker
sed -i 's/8080:80/8090:80/g' docker-compose.yml
docker compose down 2>/dev/null
docker compose up -d 2>&1
echo "---"
docker ps -a --filter name=lytiao
echo "---"
curl -sI -o /dev/null -w 'HTTP: %{http_code}' http://127.0.0.1:8090/ 2>/dev/null || echo "curl fail"
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
    req.CommandType, req.Timeout = "SHELL", 120
    req.CommandName = "CKB_lytiao_Start"
    r = client.RunCommand(req)
    print("已下发，等待 90s...")
    time.sleep(90)
    req2 = models.DescribeInvocationTasksRequest()
    f = models.Filter(); f.Name, f.Values = "invocation-id", [r.InvocationId]
    req2.Filters = [f]
    r2 = client.DescribeInvocationTasks(req2)
    for t in (r2.InvocationTaskSet or []):
        print("状态:", getattr(t, "TaskStatus", ""))
        tr = getattr(t, "TaskResult", None)
        if tr:
            try:
                j = json.loads(tr) if isinstance(tr, str) else (tr if hasattr(tr, "get") else vars(tr))
                o = j.get("Output", "") if isinstance(j, dict) else ""
                e = j.get("Error", "") if isinstance(j, dict) else ""
                if o:
                    try: o = base64.b64decode(o).decode("utf-8", errors="replace")
                    except: pass
                    print("\n--- 输出 ---\n", o)
                if e:
                    try: e = base64.b64decode(e).decode("utf-8", errors="replace")
                    except: pass
                    print("\n--- 错误 ---\n", e)
            except Exception as ex:
                print("解析异常:", ex, "| raw:", str(tr)[:600])
    return 0

if __name__ == "__main__":
    sys.exit(main())

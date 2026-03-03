#!/usr/bin/env python3
"""启动 kr宝塔 sshd 并放行安全组，结果写文件。"""
import os, re, sys, base64, time

_here = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(_here))  # 卡若AI
INDEX = os.path.join(ROOT, "运营中枢", "工作台", "00_账号与API索引.md")
OUT = os.path.join(ROOT, "运营中枢", "工作台", "kr_ssh_start_result.txt")

def log(msg):
    with open(OUT, "a", encoding="utf-8") as f:
        f.write(msg + "\n")

def main():
    # 确保输出目录存在
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    if os.path.isfile(OUT):
        os.remove(OUT)
    log("=== kr宝塔 SSH 启动与连接检查 ===\n")

    # 读凭证
    with open(INDEX) as f:
        t = f.read()
    sid = skey = None
    in_t = False
    for line in t.splitlines():
        if "### 腾讯云" in line: in_t = True; continue
        if in_t and line.strip().startswith("###"): break
        if in_t:
            m = re.search(r"SecretId[^|]*\|\s*`([^`]+)`", line, re.I)
            if m and "AKID" in m.group(1): sid = m.group(1).strip()
            m = re.search(r"SecretKey\s*\|\s*`([^`]+)`", line, re.I)
            if m: skey = m.group(1).strip()
    if not sid or not skey:
        log("ERR: 未找到腾讯云凭证"); return 1

    from tencentcloud.common import credential
    from tencentcloud.cvm.v20170312 import cvm_client, models as cvm_models
    from tencentcloud.vpc.v20170312 import vpc_client, models as vpc_models
    from tencentcloud.tat.v20201028 import tat_client, models as tat_models

    cred = credential.Credential(sid, skey)
    KR_ID = "ins-aw0tnqjo"
    REGION = "ap-guangzhou"

    # 1. 安全组放行 22、22022
    log("1. 安全组放行 22、22022")
    try:
        cvm = cvm_client.CvmClient(cred, REGION)
        r = cvm.DescribeInstances(cvm_models.DescribeInstancesRequest(InstanceIds=[KR_ID]))
        ins = (r.InstanceSet or [None])[0]
        if not ins: log("  ERR: 未找到实例"); return 1
        sg_ids = list(getattr(ins, "SecurityGroupIds", None) or [])
        vpc = vpc_client.VpcClient(cred, REGION)
        for port, desc in [("22", "SSH"), ("22022", "SSH-宝塔")]:
            for sg_id in sg_ids:
                try:
                    req = vpc_models.CreateSecurityGroupPoliciesRequest()
                    req.SecurityGroupId = sg_id
                    ps = vpc_models.SecurityGroupPolicySet()
                    ing = vpc_models.SecurityGroupPolicy()
                    ing.Protocol, ing.Port, ing.CidrBlock = "TCP", port, "0.0.0.0/0"
                    ing.Action, ing.PolicyDescription = "ACCEPT", desc
                    ps.Ingress = [ing]
                    req.SecurityGroupPolicySet = ps
                    vpc.CreateSecurityGroupPolicies(req)
                    log("  OK %s -> %s/TCP" % (sg_id, port))
                except Exception as e:
                    if "RuleAlreadyExists" in str(e) or "已存在" in str(e): log("  已存在 %s" % port)
                    else: log("  ERR %s: %s" % (port, e))
    except Exception as e:
        log("  安全组 ERR: %s" % e)

    # 2. TAT 启动 sshd
    log("\n2. TAT 启动 sshd")
    CMD = """systemctl enable sshd; systemctl start sshd; sleep 1; systemctl is-active sshd; ss -tlnp | grep sshd"""
    try:
        tat = tat_client.TatClient(cred, REGION)
        req = tat_models.RunCommandRequest()
        req.Content = base64.b64encode(CMD.encode()).decode()
        req.InstanceIds = [KR_ID]
        req.CommandType = "SHELL"
        req.Timeout = 30
        req.CommandName = "kr_sshd_start"
        r = tat.RunCommand(req)
        inv_id = r.InvocationId
        log("  InvocationId: %s" % inv_id)
        for _ in range(8):
            time.sleep(4)
            req2 = tat_models.DescribeInvocationTasksRequest()
            req2.Filters = [{"Name": "invocation-id", "Values": [inv_id]}]
            r2 = tat.DescribeInvocationTasks(req2)
            tasks = r2.InvocationTaskSet or []
            if tasks and tasks[0].TaskStatus in ("SUCCESS", "FAILED", "TIMEOUT"):
                res = tasks[0].TaskResult
                log("  Status: %s" % tasks[0].TaskStatus)
                if res and res.Output:
                    log("  Output:\n" + base64.b64decode(res.Output).decode("utf-8", errors="replace"))
                break
    except Exception as e:
        log("  TAT ERR: %s" % e)

    log("\n3. 请在本机执行 SSH 测试:")
    log("   ssh -p 22022 -o StrictHostKeyChecking=no root@43.139.27.93")
    log("   密码: Zhiqun1984 (首字母大写Z)")
    log("\n完成。")
    return 0

if __name__ == "__main__":
    sys.exit(main())

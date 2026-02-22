#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
存客宝 www.lytiao.com Docker 一键确保运行
1. TAT 全量部署 + 验证
2. 安全组放行 8080
3. 获取并打印服务器执行结果
"""
import base64
import json
import os
import re
import sys
import time

CKB_INSTANCE_ID = "ins-ciyv2mxa"
REGION = "ap-guangzhou"

def _find_root():
    d = os.path.dirname(os.path.abspath(__file__))
    for _ in range(6):
        if os.path.basename(d) == "卡若AI" or (os.path.isdir(os.path.join(d, "运营中枢")) and os.path.isdir(os.path.join(d, "01_卡资（金）"))):
            return d
        d = os.path.dirname(d)
    return None

def _read_creds():
    root = _find_root()
    if not root:
        return None, None
    path = os.path.join(root, "运营中枢", "工作台", "00_账号与API索引.md")
    if not os.path.isfile(path):
        return None, None
    with open(path, "r", encoding="utf-8") as f:
        text = f.read()
    sid = skey = None
    in_t = False
    for line in text.splitlines():
        if "### 腾讯云" in line:
            in_t = True
            continue
        if in_t and line.strip().startswith("###"):
            break
        if not in_t:
            continue
        m = re.search(r"\|\s*[^|]*(?:SecretId|密钥)[^|]*\|\s*`([^`]+)`", line, re.I)
        if m and m.group(1).strip().startswith("AKID"):
            sid = m.group(1).strip()
        m = re.search(r"\|\s*SecretKey\s*\|\s*`([^`]+)`", line, re.I)
        if m:
            skey = m.group(1).strip()
    return sid or os.environ.get("TENCENTCLOUD_SECRET_ID"), skey or os.environ.get("TENCENTCLOUD_SECRET_KEY")

# 完整部署：创建配置、复制网站、构建、启动、验证
CMD = """set -e
SRC="/www/wwwroot/www.lytiao.com"
DIR="/opt/lytiao_docker"
mkdir -p "$DIR"
echo ">>> 1. 创建 Docker 配置"
cat > "$DIR/Dockerfile" << 'DFEND'
FROM php:7.1-apache
RUN a2enmod rewrite
RUN apt-get update && apt-get install -y libpng-dev libjpeg-dev libzip-dev zip unzip \\
  && docker-php-ext-configure gd --with-png-dir=/usr --with-jpeg-dir=/usr \\
  && docker-php-ext-install -j$(nproc) gd mysqli pdo pdo_mysql zip \\
  && apt-get clean && rm -rf /var/lib/apt/lists/*
WORKDIR /var/www/html
EXPOSE 80
DFEND
cat > "$DIR/docker-compose.yml" << 'DCEND'
version: "3.8"
services:
  lytiao-web:
    build: .
    container_name: lytiao-www
    ports:
      - "8090:80"
    volumes:
      - ./www:/var/www/html:ro
    restart: unless-stopped
    environment:
      - TZ=Asia/Shanghai
DCEND
echo ">>> 2. 复制网站文件"
rm -rf "$DIR/www"
cp -a "$SRC" "$DIR/www"
echo ">>> 3. 构建并启动"
cd "$DIR"
docker compose down 2>/dev/null || true
docker compose up -d --build
sleep 5
echo ">>> 4. 验证容器状态"
docker ps -a --filter "name=lytiao"
echo ""
echo ">>> 5. 本机访问测试"
curl -sI -o /dev/null -w "HTTP状态: %{http_code}\\n" --connect-timeout 5 http://127.0.0.1:8090/ || echo "curl失败"
echo ""
echo "DONE"
"""

def main():
    secret_id, secret_key = _read_creds()
    if not secret_id or not secret_key:
        print("❌ 未配置腾讯云凭证")
        return 1

    try:
        from tencentcloud.common import credential
        from tencentcloud.tat.v20201028 import tat_client, models
    except ImportError:
        print("pip install tencentcloud-sdk-python-common tencentcloud-sdk-python-tat")
        return 1

    # 1. 安全组放行 8080
    print("========== 1. 安全组放行 8090 ==========")
    try:
        from tencentcloud.common import credential
        from tencentcloud.cvm.v20170312 import cvm_client, models as cvm_models
        from tencentcloud.vpc.v20170312 import vpc_client, models as vpc_models
        cred = credential.Credential(secret_id, secret_key)
        sg_ids, region = [], None
        for r in ["ap-guangzhou", "ap-beijing", "ap-shanghai"]:
            try:
                c = cvm_client.CvmClient(cred, r)
                req = cvm_models.DescribeInstancesRequest()
                req.Limit = 100
                resp = c.DescribeInstances(req)
                for ins in (getattr(resp, "InstanceSet", None) or []):
                    if "42.194.245.239" in list(getattr(ins, "PublicIpAddresses", None) or []):
                        sg_ids = list(getattr(ins, "SecurityGroupIds", None) or [])
                        region = r
                        break
            except Exception:
                continue
            if sg_ids:
                break
        if sg_ids and region:
            vc = vpc_client.VpcClient(cred, region)
            for sg_id in sg_ids:
                try:
                    req = vpc_models.CreateSecurityGroupPoliciesRequest()
                    req.SecurityGroupId = sg_id
                    ps = vpc_models.SecurityGroupPolicySet()
                    ing = vpc_models.SecurityGroupPolicy()
                    ing.Protocol, ing.Port, ing.CidrBlock = "TCP", "8090", "0.0.0.0/0"
                    ing.Action, ing.PolicyDescription = "ACCEPT", "lytiao-Docker"
                    ps.Ingress = [ing]
                    req.SecurityGroupPolicySet = ps
                    vc.CreateSecurityGroupPolicies(req)
                    print("  ✅ %s 已添加 8080/TCP" % sg_id)
                except Exception as e:
                    if "RuleAlreadyExists" in str(e) or "已存在" in str(e):
                        print("  ⏭ 8080 规则已存在")
                    else:
                        print("  ❌", e)
        else:
            print("  未找到存客宝实例，跳过放行")
    except ImportError as e:
        print("  跳过(缺 vpc 包): pip install tencentcloud-sdk-python-vpc")
    except Exception as e:
        print("  放行异常:", e)

    # 2. TAT 部署
    print("\n========== 2. TAT 部署 lytiao 容器 ==========")
    cred = credential.Credential(secret_id, secret_key)
    client = tat_client.TatClient(cred, REGION)
    req = models.RunCommandRequest()
    req.Content = base64.b64encode(CMD.encode()).decode()
    req.InstanceIds = [CKB_INSTANCE_ID]
    req.CommandType = "SHELL"
    req.Timeout = 600
    req.CommandName = "CKB_lytiao_Ensure"
    resp = client.RunCommand(req)
    inv_id = resp.InvocationId
    print("  已下发 InvocationId:", inv_id)
    print("  等待 90s 获取执行结果...")

    time.sleep(90)

    # 3. 获取输出
    print("\n========== 3. 服务器执行结果 ==========")
    try:
        req2 = models.DescribeInvocationTasksRequest()
        f = models.Filter()
        f.Name = "invocation-id"
        f.Values = [inv_id]
        req2.Filters = [f]
        resp2 = client.DescribeInvocationTasks(req2)
        for t in (resp2.InvocationTaskSet or []):
            status = getattr(t, "TaskStatus", "N/A")
            exit_code = getattr(t, "ExitCode", None)
            print("  任务状态:", status, "退出码:", exit_code)
            tr = getattr(t, "TaskResult", None)
            if tr:
                try:
                    if hasattr(tr, "get"):
                        j = tr
                    else:
                        j = json.loads(tr) if isinstance(tr, str) else vars(tr)
                    out = j.get("Output", "") if isinstance(j, dict) else getattr(tr, "Output", "")
                    if out:
                        try:
                            out = base64.b64decode(out).decode("utf-8", errors="replace")
                        except Exception:
                            pass
                        print(out[-4000:] if len(out) > 4000 else out)
                    err = j.get("Error", "") if isinstance(j, dict) else getattr(tr, "Error", "")
                    if err:
                        try:
                            err = base64.b64decode(err).decode("utf-8", errors="replace")
                        except Exception:
                            pass
                        print("--- 错误 ---\n", err[:3000])
                    # 打印完整 TaskResult 用于调试
                    if status == "FAILED" and not out and not err:
                        print("--- 原始 TaskResult ---\n", str(tr)[:1500])
                except Exception as e:
                    print("  TaskResult:", type(tr), str(tr)[:500])
    except Exception as e:
        print("  查询异常:", e)

    print("\n========== 完成 ==========")
    print("  访问: http://42.194.245.239:8090  （8080 被 frps 占用，已改用 8090）")
    print("  宝塔 Docker 总览点击「刷新容器列表」可见 lytiao-www")
    return 0

if __name__ == "__main__":
    sys.exit(main())

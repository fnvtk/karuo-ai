#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
腾讯云 TAT 在存客宝 CVM 上执行 Nginx 重启与站点诊断（修复 kr-kf.quwanzhi.com、lytiao.com 无法访问）
凭证：00_账号与API索引.md 或环境变量
"""
import base64
import os
import re
import sys
import time

CKB_INSTANCE_ID = "ins-ciyv2mxa"
REGION = "ap-guangzhou"

def _find_karuo_ai_root():
    d = os.path.dirname(os.path.abspath(__file__))
    for _ in range(6):
        if os.path.basename(d) == "卡若AI" or (os.path.isdir(os.path.join(d, "运营中枢")) and os.path.isdir(os.path.join(d, "01_卡资（金）"))):
            return d
        d = os.path.dirname(d)
    return None

def _read_creds():
    root = _find_karuo_ai_root()
    if not root:
        return None, None
    path = os.path.join(root, "运营中枢", "工作台", "00_账号与API索引.md")
    if not os.path.isfile(path):
        return None, None
    with open(path, "r", encoding="utf-8") as f:
        text = f.read()
    secret_id = secret_key = None
    in_tencent = False
    for line in text.splitlines():
        if "### 腾讯云" in line:
            in_tencent = True
            continue
        if in_tencent and line.strip().startswith("###"):
            break
        if not in_tencent:
            continue
        m = re.search(r"\|\s*[^|]*(?:SecretId|密钥)[^|]*\|\s*`([^`]+)`", line, re.I)
        if m:
            val = m.group(1).strip()
            if val.startswith("AKID"):
                secret_id = val
        m = re.search(r"\|\s*SecretKey\s*\|\s*`([^`]+)`", line, re.I)
        if m:
            secret_key = m.group(1).strip()
    return secret_id or None, secret_key or None

# 在存客宝上执行：Nginx 配置检查、重载、端口监听检查
CMD = """echo "=== 端口监听 ===" && ss -tlnp | grep -E ':80 |:443 ' || true
echo "=== Nginx 测试 ===" && nginx -t 2>&1
echo "=== Nginx 重载 ===" && nginx -s reload 2>&1
echo "=== kr-kf lytiao 配置存在 ===" && grep -l -E 'kr-kf|lytiao' /www/server/panel/vhost/nginx/*.conf 2>/dev/null | head -5
echo "=== 完成 ==="
"""

def main():
    secret_id = os.environ.get("TENCENTCLOUD_SECRET_ID")
    secret_key = os.environ.get("TENCENTCLOUD_SECRET_KEY")
    if not secret_id or not secret_key:
        sid, skey = _read_creds()
        secret_id = secret_id or sid
        secret_key = secret_key or skey
    if not secret_id or not secret_key:
        print("❌ 未配置腾讯云 SecretId/SecretKey")
        return 1
    try:
        from tencentcloud.common import credential
        from tencentcloud.tat.v20201028 import tat_client, models
    except ImportError:
        print("请安装: pip install tencentcloud-sdk-python-common tencentcloud-sdk-python-tat")
        return 1

    cred = credential.Credential(secret_id, secret_key)
    client = tat_client.TatClient(cred, REGION)
    req = models.RunCommandRequest()
    req.Content = base64.b64encode(CMD.encode()).decode()
    req.InstanceIds = [CKB_INSTANCE_ID]
    req.CommandType = "SHELL"
    req.Timeout = 30
    req.CommandName = "CKB_NginxReload"
    resp = client.RunCommand(req)
    inv_id = resp.InvocationId
    print("✅ 存客宝 Nginx 重载指令已下发 InvocationId:", inv_id)
    print("  预计 10s 内生效，请刷新 kr-kf.quwanzhi.com 与 lytiao.com 测试")
    return 0

if __name__ == "__main__":
    sys.exit(main())

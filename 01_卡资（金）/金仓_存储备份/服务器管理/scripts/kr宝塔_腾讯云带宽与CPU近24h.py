#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
kr宝塔 43.139.27.93：腾讯云 CVM 近 24 小时 CPU、公网出/入带宽。
若该 IP 属于腾讯云 CVM 且与 00_账号与API索引.md 同账号，可看到监控曲线。
凭证：环境变量 TENCENTCLOUD_SECRET_ID / TENCENTCLOUD_SECRET_KEY，或 00_账号与API索引.md 腾讯云段落。
依赖：pip install tencentcloud-sdk-python-common tencentcloud-sdk-python-cvm tencentcloud-sdk-python-monitor
"""
import os
import re
import sys
from datetime import datetime, timedelta

KR_PUBLIC_IP = "43.139.27.93"
REGIONS = ["ap-beijing", "ap-guangzhou", "ap-shanghai", "ap-chengdu"]

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

def main():
    secret_id = os.environ.get("TENCENTCLOUD_SECRET_ID")
    secret_key = os.environ.get("TENCENTCLOUD_SECRET_KEY")
    if not secret_id or not secret_key:
        sid, skey = _read_creds()
        secret_id = secret_id or sid
        secret_key = secret_key or skey
    if not secret_id or not secret_key:
        print("未配置腾讯云 SecretId/SecretKey（环境变量或 00_账号与API索引.md）")
        return 1

    try:
        from tencentcloud.common import credential
        from tencentcloud.common.profile.client_profile import ClientProfile
        from tencentcloud.cvm.v20170312 import cvm_client, models as cvm_models
    except ImportError:
        print("请安装: pip install tencentcloud-sdk-python-common tencentcloud-sdk-python-cvm")
        return 1

    cred = credential.Credential(secret_id, secret_key)
    instance_id = None
    instance_region = None

    for region in REGIONS:
        try:
            cp = ClientProfile()
            client = cvm_client.CvmClient(cred, region)
            req = cvm_models.DescribeInstancesRequest()
            req.Limit = 100
            req.Offset = 0
            resp = client.DescribeInstances(req)
            instances = getattr(resp, "InstanceSet", None) or []
            for ins in instances:
                pub = list(getattr(ins, "PublicIpAddresses", None) or [])
                if KR_PUBLIC_IP in pub:
                    instance_id = getattr(ins, "InstanceId", None)
                    instance_region = region
                    break
        except Exception:
            continue
        if instance_id:
            break

    if not instance_id:
        print("kr宝塔 %s 未在腾讯云 CVM（%s）中找到，可能为轻量或其它云。" % (KR_PUBLIC_IP, ", ".join(REGIONS)))
        print("请用宝塔面板「监控」查看带宽，或将本机 IP 加入 kr宝塔 API 白名单后运行 kr宝塔_带宽与网络用量_宝塔API.py")
        return 0

    print("=" * 60)
    print("  kr宝塔 %s · 近 24 小时 CPU 与带宽（腾讯云 CVM）" % KR_PUBLIC_IP)
    print("  实例ID: %s  地域: %s" % (instance_id, instance_region))
    print("=" * 60)

    try:
        from tencentcloud.monitor.v20180724 import monitor_client, models as mon_models
    except ImportError:
        print("\n未安装 tencentcloud-sdk-python-monitor，仅查到实例，无法拉取监控。")
        print("安装: pip install tencentcloud-sdk-python-monitor")
        return 0

    end_time = datetime.now()
    start_time = end_time - timedelta(hours=24)
    start_str = start_time.strftime("%Y-%m-%dT%H:%M:%S+08:00")
    end_str = end_time.strftime("%Y-%m-%dT%H:%M:%S+08:00")
    mcp = ClientProfile()
    mon_cli = monitor_client.MonitorClient(cred, instance_region, mcp)

    for metric_name, desc in [
        ("CPUUsage", "CPU使用率(%)"),
        ("WanOuttraffic", "公网出带宽(Mbps)"),
        ("WanIntraffic", "公网入带宽(Mbps)"),
    ]:
        try:
            req = mon_models.GetMonitorDataRequest()
            req.Namespace = "QCE/CVM"
            req.MetricName = metric_name
            req.Period = 300
            req.StartTime = start_str
            req.EndTime = end_str
            inst = mon_models.Instance()
            if hasattr(mon_models, "Dimension"):
                d = mon_models.Dimension()
                d.Name = "InstanceId"
                d.Value = instance_id
                inst.Dimensions = [d]
            else:
                inst.Dimensions = [{"Name": "InstanceId", "Value": instance_id}]
            req.Instances = [inst]
            resp = mon_cli.GetMonitorData(req)
            pts = getattr(resp, "DataPoints", None) or []
            if pts and getattr(pts[0], "Values", None):
                vals = list(pts[0].Values)
                if vals:
                    avg_val = sum(vals) / len(vals)
                    max_val = max(vals)
                    min_val = min(vals)
                    print("\n【%s】近24小时" % desc)
                    print("  平均: %s  最大: %s  最小: %s  采样数: %s" % (round(avg_val, 2), round(max_val, 2), round(min_val, 2), len(vals)))
        except Exception as e:
            print("\n【%s】 请求异常: %s" % (desc, e))

    print("\n" + "=" * 60)
    print("若带宽长期接近或超过购买带宽上限，可在宝塔/腾讯云控制台做限速或升级带宽。")
    print("=" * 60)
    return 0

if __name__ == "__main__":
    sys.exit(main())

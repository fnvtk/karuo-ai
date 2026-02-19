#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
存客宝服务器 42.194.245.239 腾讯云 API 全量分析：
- CVM 实例信息（多地域查找）
- 监控数据：CPU、公网出带宽、流量（近24小时）
- 账单：本月消费及按产品汇总
凭证：从 00_账号与API索引.md 腾讯云段落读取 SecretId/SecretKey，或环境变量。
依赖：pip install tencentcloud-sdk-python-common tencentcloud-sdk-python-cvm tencentcloud-sdk-python-monitor tencentcloud-sdk-python-billing
"""
import os
import re
import sys
from datetime import datetime, timedelta

# 存客宝公网 IP
CKB_PUBLIC_IP = "42.194.245.239"
# 尝试的地域（42.194.x 常见于北京/广州）
REGIONS = ["ap-beijing", "ap-guangzhou", "ap-shanghai"]

def _find_karuo_ai_root():
    d = os.path.dirname(os.path.abspath(__file__))
    for _ in range(6):
        if os.path.basename(d) == "卡若AI" or (os.path.isdir(os.path.join(d, "运营中枢")) and os.path.isdir(os.path.join(d, "01_卡资（金）"))):
            return d
        d = os.path.dirname(d)
    return None

def _read_creds_from_index():
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
        sid, skey = _read_creds_from_index()
        secret_id = secret_id or sid
        secret_key = secret_key or skey
    if not secret_id or not secret_key:
        print("未配置腾讯云 SecretId/SecretKey（环境变量或 00_账号与API索引.md）")
        return 1

    try:
        from tencentcloud.common import credential
        from tencentcloud.common.profile.client_profile import ClientProfile
        from tencentcloud.common.profile.http_profile import HttpProfile
        from tencentcloud.cvm.v20170312 import cvm_client, models as cvm_models
    except ImportError:
        print("请安装: pip install tencentcloud-sdk-python-common tencentcloud-sdk-python-cvm")
        return 1

    cred = credential.Credential(secret_id, secret_key)

    # ---------- 1. CVM 查找存客宝实例 ----------
    print("=" * 60)
    print("  存客宝服务器 42.194.245.239 · 腾讯云 API 全量分析")
    print("=" * 60)

    instance_id = None
    instance_region = None
    instance_info = None

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
                if CKB_PUBLIC_IP in pub:
                    instance_id = getattr(ins, "InstanceId", None)
                    instance_region = region
                    instance_info = {
                        "InstanceId": instance_id,
                        "InstanceName": getattr(ins, "InstanceName", ""),
                        "PrivateIps": list(getattr(ins, "PrivateIpAddresses", None) or []),
                        "PublicIps": pub,
                        "CPU": getattr(ins, "CPU", None),
                        "Memory": getattr(ins, "Memory", None),
                        "InstanceState": getattr(ins, "InstanceState", None),
                    }
                    break
        except Exception as e:
            continue
        if instance_id:
            break

    if not instance_id:
        print("\n【CVM】未在 ap-beijing/ap-guangzhou/ap-shanghai 找到公网 IP %s 的实例。" % CKB_PUBLIC_IP)
        print("  若存客宝为轻量应用服务器，需用 Lighthouse API 查询。")
    else:
        print("\n【CVM 实例】")
        print("  实例ID:   %s" % instance_id)
        print("  地域:     %s" % instance_region)
        print("  名称:     %s" % (instance_info.get("InstanceName") or "-"))
        print("  公网IP:   %s" % CKB_PUBLIC_IP)
        print("  内网IP:   %s" % (", ".join(instance_info.get("PrivateIps") or [])))
        mem = instance_info.get("Memory")
        if mem is not None and mem == 16:
            mem_str = "16 GB"
        elif mem is not None:
            mem_str = "%s MB" % mem
        else:
            mem_str = "-"
        print("  CPU/内存: %s 核 / %s" % (instance_info.get("CPU") or "-", mem_str))
        print("  状态:     %s" % (instance_info.get("InstanceState") or "-"))

    # ---------- 2. 监控数据（需实例 ID 且在同一地域） ----------
    if instance_id and instance_region:
        try:
            from tencentcloud.monitor.v20180724 import monitor_client, models as mon_models
        except ImportError:
            print("\n【监控】未安装 tencentcloud-sdk-python-monitor，跳过 CPU/带宽 监控数据。")
        else:
            end_time = datetime.now()
            start_time = end_time - timedelta(hours=24)
            start_str = start_time.strftime("%Y-%m-%dT%H:%M:%S+08:00")
            end_str = end_time.strftime("%Y-%m-%dT%H:%M:%S+08:00")
            mcp = ClientProfile()
            mon_cli = monitor_client.MonitorClient(cred, instance_region, mcp)

            for metric_name, desc in [("CPUUsage", "CPU使用率(%)"), ("WanOuttraffic", "公网出带宽(Mbps)")]:
                try:
                    req = mon_models.GetMonitorDataRequest()
                    req.Namespace = "QCE/CVM"
                    req.MetricName = metric_name
                    req.Period = 300
                    req.StartTime = start_str
                    req.EndTime = end_str
                    # Instances: 每个元素为 Instance，Dimensions 为 [Dimension]
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
                            print("\n【监控 %s】近24小时" % desc)
                            print("  平均: %s  最大: %s  最小: %s  点数: %s" % (round(avg_val, 2), round(max_val, 2), round(min_val, 2), len(vals)))
                except Exception as e:
                    print("\n【监控 %s】 请求异常: %s" % (desc, e))

    # ---------- 3. 账单（本月） ----------
    try:
        from tencentcloud.billing.v20180709 import billing_client, models as bill_models
    except ImportError:
        print("\n【账单】未安装 tencentcloud-sdk-python-billing，跳过。")
    else:
        now = datetime.now()
        month = now.strftime("%Y-%m")
        begin_time = "%s-01 00:00:00" % month
        end_time = now.strftime("%Y-%m-%d 23:59:59")
        hp = HttpProfile(endpoint="billing.tencentcloudapi.com")
        cp = ClientProfile(httpProfile=hp)
        bill_cli = billing_client.BillingClient(cred, "", cp)
        req = bill_models.DescribeBillDetailRequest()
        req.Month = month
        req.BeginTime = begin_time
        req.EndTime = end_time
        req.Offset = 0
        req.Limit = 300
        total_cost = 0
        details = []
        while True:
            resp = bill_cli.DescribeBillDetail(req)
            ds = getattr(resp, "DetailSet", None) or []
            for d in ds:
                try:
                    cost = float(getattr(d, "RealTotalCost", 0) or getattr(d, "TotalCost", 0) or 0)
                except (TypeError, ValueError):
                    cost = 0
                total_cost += cost
                details.append({
                    "product": getattr(d, "BusinessCodeName", "") or getattr(d, "ProductCodeName", "") or "-",
                    "cost": cost,
                })
            if len(ds) < req.Limit:
                break
            req.Offset += req.Limit

        print("\n【账单】本月 %s 至 %s" % (begin_time[:10], end_time[:10]))
        print("  合计: ¥ %.2f" % total_cost)
        if details:
            by_product = {}
            for x in details:
                k = x["product"]
                by_product[k] = by_product.get(k, 0) + x["cost"]
            print("  按产品:")
            for k, v in sorted(by_product.items(), key=lambda t: -t[1]):
                print("    %s: ¥ %.2f" % (k, v))

    # ---------- 4. 问题与建议 ----------
    print("\n" + "=" * 60)
    print("【结论与建议】")
    if not instance_id:
        print("  - 存客宝 CVM 未在本脚本尝试的地域中找到，请到控制台确认实例地域与类型（CVM / 轻量）。")
    else:
        print("  - 存客宝为 CVM，地域 %s；可到控制台查看该实例监控与流量趋势。" % instance_region)
    print("  - 费用以腾讯云账单为准；若本月消费偏高，请在「账单明细」中按产品筛选「云服务器」「公网网络」等。")
    print("  - 建议在腾讯云控制台为存客宝实例设置费用/流量告警。")
    print("=" * 60)
    return 0

if __name__ == "__main__":
    sys.exit(main())

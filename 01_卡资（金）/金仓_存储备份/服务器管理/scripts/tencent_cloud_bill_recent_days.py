#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
查询腾讯云指定日期范围的消费情况。
依赖：pip install tencentcloud-sdk-python-common tencentcloud-sdk-python-billing
凭证：环境变量 TENCENTCLOUD_SECRET_ID、TENCENTCLOUD_SECRET_KEY，或从 00_账号与API索引.md 读取。
用法：
  python tencent_cloud_bill_recent_days.py [days]           # 最近 N 天，默认 2
  python tencent_cloud_bill_recent_days.py 2026-02-15 2026-02-19   # 指定起止日期
"""
import os
import re
import sys
from datetime import datetime, timedelta

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
        # 支持 "SecretId（密钥）" 或 "SecretId" 列名
        m = re.search(r"\|\s*[^|]*(?:SecretId|密钥)[^|]*\|\s*`([^`]+)`", line, re.I)
        if m:
            val = m.group(1).strip()
            if val.startswith("AKID"):
                secret_id = val
        m = re.search(r"\|\s*SecretKey\s*\|\s*`([^`]+)`", line, re.I)
        if m:
            secret_key = m.group(1).strip()
    return secret_id or None, secret_key or None

def main(days=2, start_date=None, end_date=None):
    secret_id = os.environ.get("TENCENTCLOUD_SECRET_ID")
    secret_key = os.environ.get("TENCENTCLOUD_SECRET_KEY")
    if not secret_id or not secret_key:
        sid, skey = _read_creds_from_index()
        if sid:
            secret_id = secret_id or sid
        if skey:
            secret_key = secret_key or skey
    if not secret_id or not secret_key:
        print("未配置 TENCENTCLOUD_SECRET_ID 或 TENCENTCLOUD_SECRET_KEY")
        print("请在本机设置环境变量，或在 运营中枢/工作台/00_账号与API索引.md 的腾讯云段落添加 SecretKey（密钥为 SecretId）")
        print("\n直接查看消费：登录 https://console.cloud.tencent.com/expense/overview")
        return 1

    try:
        from tencentcloud.common import credential
        from tencentcloud.common.profile.client_profile import ClientProfile
        from tencentcloud.common.profile.http_profile import HttpProfile
        from tencentcloud.billing.v20180709 import billing_client, models
    except ImportError:
        print("请先安装: pip install tencentcloud-sdk-python-common tencentcloud-sdk-python-billing")
        return 1

    if start_date is None or end_date is None:
        end_date = datetime.now().date()
        start_date = end_date - timedelta(days=days - 1)
    # API 要求 BeginTime/EndTime 必须在同月，跨月会报错；此处用目标月查整月（优先当前月）
    month = end_date.strftime("%Y-%m")

    cred = credential.Credential(secret_id, secret_key)
    hp = HttpProfile(endpoint="billing.tencentcloudapi.com")
    cp = ClientProfile(httpProfile=hp)
    client = billing_client.BillingClient(cred, "", cp)

    def _parse_cost(d):
        cost = 0
        comp_set = getattr(d, "ComponentSet", None) or []
        for c in comp_set:
            try:
                cost += float(getattr(c, "RealCost", 0) or getattr(c, "Cost", 0) or 0)
            except (TypeError, ValueError):
                pass
        if cost == 0:
            try:
                cost = float(getattr(d, "RealTotalCost", 0) or getattr(d, "TotalCost", 0) or 0)
            except (TypeError, ValueError):
                pass
        return cost

    req = models.DescribeBillDetailRequest()
    req.Month = month
    req.Offset = 0
    req.Limit = 300

    total_cost = 0
    details = []
    while True:
        resp = client.DescribeBillDetail(req)
        if not resp.DetailSet:
            break
        for d in resp.DetailSet:
            cost = _parse_cost(d)
            if cost == 0:
                continue
            total_cost += cost
            fee_begin = getattr(d, "FeeBeginTime", "") or getattr(d, "BillDay", "")
            details.append({
                "product": getattr(d, "BusinessCodeName", "") or getattr(d, "ProductCodeName", "") or "-",
                "cost": cost,
                "day": str(fee_begin)[:10] if fee_begin else "?",
            })
        if len(resp.DetailSet) < req.Limit:
            break
        req.Offset += req.Limit

    print(f"\n腾讯云消费（{month} 月）")
    print("=" * 50)
    print(f"合计：¥ {total_cost:.2f}")
    if details:
        by_product = {}
        by_day = {}
        for x in details:
            k = x["product"]
            by_product[k] = by_product.get(k, 0) + x["cost"]
            d = x.get("day", "?")
            by_day[d] = by_day.get(d, 0) + x["cost"]
        print("\n按产品汇总：")
        for k, v in sorted(by_product.items(), key=lambda t: -t[1]):
            print(f"  {k}: ¥ {v:.2f}")
        if by_day:
            print("\n按日汇总（前10天）：")
            for d, v in sorted(by_day.items(), key=lambda t: t[0])[:10]:
                print(f"  {d}: ¥ {v:.2f}")
            if len(by_day) > 10:
                print(f"  ... 共 {len(by_day)} 天")
    else:
        print("（无明细或 API 未返回；请登录控制台查看：https://console.cloud.tencent.com/expense/overview）")
    return 0

if __name__ == "__main__":
    start_date = end_date = None
    if len(sys.argv) >= 3:
        try:
            start_date = datetime.strptime(sys.argv[1], "%Y-%m-%d").date()
            end_date = datetime.strptime(sys.argv[2], "%Y-%m-%d").date()
        except ValueError:
            pass
    days = int(sys.argv[1]) if len(sys.argv) == 2 and start_date is None else 2
    sys.exit(main(days=days, start_date=start_date, end_date=end_date))

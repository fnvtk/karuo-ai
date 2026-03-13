#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SMSOnline 付费接码自动化脚本：取号 → 轮询收验证码 → 超时自动退号。
用法：
  python3 smsonline_receive_sms.py --country 中国 --service Soul
  python3 smsonline_receive_sms.py --country-id 1 --service-id 2
  python3 smsonline_receive_sms.py --list-countries
  python3 smsonline_receive_sms.py --list-services
"""
import json
import sys
import time
import urllib.request
import argparse

API_KEY = "2w9hva2mzvbubw5sj3vqwkuv9ib43ku29okhwyragkx4o2kgzw7eb9oy8pjh4gc3"
BASE = "https://smsonline.io/api/v1/virtual-number"
TIMEOUT_SEC = 120
POLL_INTERVAL = 5
PROXY = None  # 如需代理："http://127.0.0.1:7897"


def api(endpoint, **params):
    params["apiKey"] = API_KEY
    qs = "&".join(f"{k}={v}" for k, v in params.items())
    url = f"{BASE}/{endpoint}?{qs}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    if PROXY:
        handler = urllib.request.ProxyHandler({"https": PROXY, "http": PROXY})
        opener = urllib.request.build_opener(handler)
    else:
        opener = urllib.request.build_opener()
    with opener.open(req, timeout=20) as r:
        data = json.loads(r.read().decode("utf-8"))
    if data.get("status") == -1:
        print(f"API ERROR: {data}", file=sys.stderr)
    return data


def list_countries():
    data = api("get-countries")
    if isinstance(data, dict) and "data" in data:
        for c in data["data"]:
            print(f"  {c.get('id', '?')}\t{c.get('name', '?')}")
    else:
        print(json.dumps(data, indent=2, ensure_ascii=False))


def list_services():
    data = api("get-services")
    if isinstance(data, dict) and "data" in data:
        for s in data["data"]:
            print(f"  {s.get('id', '?')}\t{s.get('name', '?')}")
    else:
        print(json.dumps(data, indent=2, ensure_ascii=False))


def get_products(country_id, service_id):
    data = api("get-products", countryId=country_id, serviceId=service_id)
    if isinstance(data, dict) and "data" in data:
        for p in data["data"]:
            print(f"  operator={p.get('operatorId','?')} price={p.get('price','?')} stock={p.get('count','?')}")
    else:
        print(json.dumps(data, indent=2, ensure_ascii=False))
    return data


def buy_number(country_id, service_id, operator_id):
    data = api("buy-service", countryId=country_id, serviceId=service_id, operatorId=operator_id)
    return data


def get_sms(order_id):
    data = api("get-sms", id=order_id)
    return data


def cancel_order(order_id):
    data = api("change-status", id=order_id, status=4)
    return data


def finish_order(order_id):
    data = api("change-status", id=order_id, status=3)
    return data


def receive_sms_flow(country_id, service_id, operator_id=None):
    """完整流程：买号→轮询→超时退号。"""
    if not operator_id:
        prod = api("get-products", countryId=country_id, serviceId=service_id)
        if isinstance(prod, dict) and "data" in prod and prod["data"]:
            operator_id = prod["data"][0].get("operatorId", 0)
            price = prod["data"][0].get("price", "?")
            print(f"选择运营商 {operator_id}，价格 {price}")
        else:
            print("无可用运营商/库存", file=sys.stderr)
            return None, None
    print(f"正在购买号码（country={country_id}, service={service_id}, operator={operator_id}）…")
    buy = buy_number(country_id, service_id, operator_id)
    order_id = buy.get("data", {}).get("id") or buy.get("id")
    number = buy.get("data", {}).get("number") or buy.get("number")
    if not order_id:
        print(f"购买失败：{buy}", file=sys.stderr)
        return None, None
    print(f"号码：{number}  订单：{order_id}")
    print(f"请在目标网站用该号码发验证码，轮询中（最多 {TIMEOUT_SEC} 秒）…", flush=True)
    start = time.time()
    code = None
    while time.time() - start < TIMEOUT_SEC:
        time.sleep(POLL_INTERVAL)
        elapsed = int(time.time() - start)
        sms = get_sms(order_id)
        sms_text = sms.get("data", {}).get("sms") or sms.get("sms")
        sms_code = sms.get("data", {}).get("code") or sms.get("code")
        if sms_text or sms_code:
            code = sms_code or sms_text
            print(f"\n收到验证码！({elapsed}s)")
            print(f"  号码：{number}")
            print(f"  验证码/短信：{code}")
            finish_order(order_id)
            print("  订单已标记完成。")
            return number, code
        print(f"  等待中 {elapsed}s…", flush=True)
    print(f"\n超时 {TIMEOUT_SEC}s 未收到验证码，正在取消退费…")
    cancel_order(order_id)
    print("  订单已取消（退费）。")
    return number, None


def main():
    p = argparse.ArgumentParser(description="SMSOnline 付费接码")
    p.add_argument("--list-countries", action="store_true")
    p.add_argument("--list-services", action="store_true")
    p.add_argument("--country-id", type=int)
    p.add_argument("--service-id", type=int)
    p.add_argument("--operator-id", type=int, default=None)
    p.add_argument("--products", action="store_true")
    p.add_argument("--proxy", default=None, help="如 http://127.0.0.1:7897")
    args = p.parse_args()
    global PROXY
    if args.proxy:
        PROXY = args.proxy
    if args.list_countries:
        list_countries()
    elif args.list_services:
        list_services()
    elif args.products and args.country_id and args.service_id:
        get_products(args.country_id, args.service_id)
    elif args.country_id and args.service_id:
        receive_sms_flow(args.country_id, args.service_id, args.operator_id)
    else:
        p.print_help()


if __name__ == "__main__":
    main()

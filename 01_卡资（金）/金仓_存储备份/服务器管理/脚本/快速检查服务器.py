#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
快速检查服务器状态
==================
用途：一键检查所有服务器的基本状态

使用方法：
python3 快速检查服务器.py
"""

import time
import hashlib
import requests
import urllib3

# 禁用SSL警告
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# 服务器配置（小型宝塔已下线，仅存客宝、kr宝塔）
服务器列表 = {
    "存客宝": {
        "面板地址": "https://42.194.245.239:9988",
        "密钥": "TNKjqDv5N1QLOU20gcmGVgr82Z4mXzRi"
    },
    "kr宝塔": {
        "面板地址": "https://43.139.27.93:9988",
        "密钥": "qcWubCdlfFjS2b2DMT1lzPFaDfmv1cBT"
    }
}

def 生成签名(api_key: str) -> tuple:
    """生成宝塔API签名"""
    now_time = int(time.time())
    sign_str = str(now_time) + hashlib.md5(api_key.encode('utf-8')).hexdigest()
    request_token = hashlib.md5(sign_str.encode('utf-8')).hexdigest()
    return now_time, request_token

def 获取系统信息(面板地址: str, 密钥: str) -> dict:
    """获取系统基础统计信息"""
    now_time, request_token = 生成签名(密钥)
    
    url = f"{面板地址}/system?action=GetSystemTotal"
    data = {
        "request_time": now_time,
        "request_token": request_token
    }
    
    try:
        response = requests.post(url, data=data, timeout=10, verify=False)
        return response.json()
    except Exception as e:
        return {"error": str(e)}

def 检查单台服务器(名称: str, 配置: dict) -> dict:
    """检查单台服务器状态"""
    try:
        系统信息 = 获取系统信息(配置["面板地址"], 配置["密钥"])
        
        if isinstance(系统信息, dict) and "error" not in 系统信息 and 系统信息.get("status") != False:
            return {
                "名称": 名称,
                "状态": "✅ 正常",
                "CPU": f"{系统信息.get('cpuRealUsed', 'N/A')}%",
                "内存": f"{系统信息.get('memRealUsed', 'N/A')}%",
                "磁盘": f"{系统信息.get('diskPer', 'N/A')}%"
            }
        else:
            return {
                "名称": 名称,
                "状态": "❌ API错误",
                "错误": str(系统信息)
            }
    except Exception as e:
        return {
            "名称": 名称,
            "状态": "❌ 连接失败",
            "错误": str(e)
        }

def main():
    print("=" * 60)
    print("                 服务器状态检查报告")
    print("=" * 60)
    print()
    
    for 名称, 配置 in 服务器列表.items():
        结果 = 检查单台服务器(名称, 配置)
        print(f"📦 {结果['名称']}")
        print(f"   状态: {结果['状态']}")
        if "CPU" in 结果:
            print(f"   CPU: {结果['CPU']} | 内存: {结果['内存']} | 磁盘: {结果['磁盘']}")
        if "错误" in 结果:
            print(f"   错误: {结果['错误'][:50]}...")
        print()
    
    print("=" * 60)

if __name__ == "__main__":
    main()

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SSL证书检查脚本
===============
用途：检查所有服务器的SSL证书状态

使用方法：
python3 ssl证书检查.py
python3 ssl证书检查.py --fix  # 自动修复过期证书
"""

import sys
import time
import hashlib
import requests
import urllib3
from datetime import datetime

# 禁用SSL警告
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# 服务器配置（小型宝塔已下线）
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

def 获取证书列表(面板地址: str, 密钥: str) -> dict:
    """获取SSL证书列表"""
    now_time, request_token = 生成签名(密钥)
    
    url = f"{面板地址}/ssl?action=GetCertList"
    data = {
        "request_time": now_time,
        "request_token": request_token
    }
    
    try:
        response = requests.post(url, data=data, timeout=10, verify=False)
        return response.json()
    except Exception as e:
        return {"error": str(e)}

def 获取网站列表(面板地址: str, 密钥: str) -> dict:
    """获取网站列表"""
    now_time, request_token = 生成签名(密钥)
    
    url = f"{面板地址}/data?action=getData&table=sites"
    data = {
        "request_time": now_time,
        "request_token": request_token,
        "limit": 100,
        "p": 1
    }
    
    try:
        response = requests.post(url, data=data, timeout=10, verify=False)
        return response.json()
    except Exception as e:
        return {"error": str(e)}

def 检查服务器证书(名称: str, 配置: dict) -> dict:
    """检查单台服务器的证书状态"""
    print(f"\n检查服务器: {名称}")
    print("-" * 40)
    
    try:
        # 获取网站列表
        网站数据 = 获取网站列表(配置["面板地址"], 配置["密钥"])
        
        if "error" in 网站数据:
            print(f"   ❌ API错误: {网站数据['error']}")
            return {"error": 网站数据['error']}
        
        网站列表 = 网站数据.get("data", [])
        
        if not 网站列表:
            print("   ⚠️  没有找到网站")
            return {"网站数": 0}
        
        print(f"   📊 共 {len(网站列表)} 个网站")
        
        # 统计
        已配置SSL = 0
        未配置SSL = 0
        
        for 网站 in 网站列表:
            网站名 = 网站.get("name", "未知")
            ssl状态 = 网站.get("ssl", 0)
            
            if ssl状态:
                已配置SSL += 1
                状态标识 = "🔒"
            else:
                未配置SSL += 1
                状态标识 = "🔓"
            
            print(f"      {状态标识} {网站名}")
        
        print(f"\n   统计: 已配置SSL {已配置SSL} 个, 未配置 {未配置SSL} 个")
        
        return {
            "网站数": len(网站列表),
            "已配置SSL": 已配置SSL,
            "未配置SSL": 未配置SSL
        }
        
    except Exception as e:
        print(f"   ❌ 检查失败: {e}")
        return {"error": str(e)}

def main():
    自动修复 = "--fix" in sys.argv
    
    print("=" * 60)
    print("               SSL证书状态检查报告")
    print(f"               {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    
    总统计 = {
        "服务器数": 0,
        "网站总数": 0,
        "已配置SSL": 0,
        "未配置SSL": 0
    }
    
    for 服务器名称, 配置 in 服务器列表.items():
        结果 = 检查服务器证书(服务器名称, 配置)
        
        if "error" not in 结果:
            总统计["服务器数"] += 1
            总统计["网站总数"] += 结果.get("网站数", 0)
            总统计["已配置SSL"] += 结果.get("已配置SSL", 0)
            总统计["未配置SSL"] += 结果.get("未配置SSL", 0)
    
    print("\n" + "=" * 60)
    print("                     汇总统计")
    print("=" * 60)
    print(f"   服务器数量: {总统计['服务器数']}")
    print(f"   网站总数:   {总统计['网站总数']}")
    print(f"   已配置SSL:  {总统计['已配置SSL']} 🔒")
    print(f"   未配置SSL:  {总统计['未配置SSL']} 🔓")
    print("=" * 60)
    
    if 自动修复 and 总统计['未配置SSL'] > 0:
        print("\n⚠️  --fix 模式需要手动在宝塔面板配置SSL证书")
        print("   建议使用通配符证书 *.quwanzhi.com")

if __name__ == "__main__":
    main()

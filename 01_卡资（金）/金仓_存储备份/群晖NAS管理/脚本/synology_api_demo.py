#!/usr/bin/env python3
"""
群晖DSM API演示脚本
展示如何通过官方API和第三方库操作群晖NAS
"""

import requests
import json
from typing import Optional

# NAS配置
NAS_CONFIG = {
    "ip": "192.168.1.201",
    "port": 5000,
    "username": "fnvtk",
    "password": "zhiqun1984",
    "use_https": False
}

class SynologyAPI:
    """群晖DSM官方API封装"""
    
    def __init__(self, ip: str, port: int, username: str, password: str, use_https: bool = False):
        self.base_url = f"{'https' if use_https else 'http'}://{ip}:{port}/webapi"
        self.username = username
        self.password = password
        self.sid: Optional[str] = None
    
    def login(self) -> bool:
        """登录获取sid"""
        url = f"{self.base_url}/auth.cgi"
        params = {
            "api": "SYNO.API.Auth",
            "version": "3",
            "method": "login",
            "account": self.username,
            "passwd": self.password,
            "session": "FileStation",
            "format": "sid"
        }
        
        try:
            response = requests.get(url, params=params, verify=False, timeout=10)
            data = response.json()
            
            if data.get("success"):
                self.sid = data["data"]["sid"]
                print(f"✓ 登录成功，SID: {self.sid[:20]}...")
                return True
            else:
                print(f"✗ 登录失败: {data.get('error', {}).get('code', 'unknown')}")
                return False
        except Exception as e:
            print(f"✗ 登录异常: {e}")
            return False
    
    def logout(self) -> bool:
        """登出"""
        if not self.sid:
            return True
            
        url = f"{self.base_url}/auth.cgi"
        params = {
            "api": "SYNO.API.Auth",
            "version": "1",
            "method": "logout",
            "session": "FileStation"
        }
        
        try:
            response = requests.get(url, params=params, verify=False, timeout=10)
            self.sid = None
            print("✓ 已登出")
            return True
        except:
            return False
    
    def get_info(self) -> dict:
        """获取DSM信息"""
        url = f"{self.base_url}/entry.cgi"
        params = {
            "api": "SYNO.DSM.Info",
            "version": "2",
            "method": "getinfo",
            "_sid": self.sid
        }
        
        response = requests.get(url, params=params, verify=False, timeout=10)
        return response.json()
    
    def list_shares(self) -> dict:
        """列出共享文件夹"""
        url = f"{self.base_url}/entry.cgi"
        params = {
            "api": "SYNO.FileStation.List",
            "version": "2",
            "method": "list_share",
            "_sid": self.sid
        }
        
        response = requests.get(url, params=params, verify=False, timeout=10)
        return response.json()
    
    def list_files(self, folder_path: str) -> dict:
        """列出文件夹内容"""
        url = f"{self.base_url}/entry.cgi"
        params = {
            "api": "SYNO.FileStation.List",
            "version": "2",
            "method": "list",
            "folder_path": folder_path,
            "_sid": self.sid
        }
        
        response = requests.get(url, params=params, verify=False, timeout=10)
        return response.json()


def demo_official_api():
    """演示官方API用法"""
    print("=" * 60)
    print("群晖DSM官方API演示")
    print("=" * 60)
    print()
    
    api = SynologyAPI(**NAS_CONFIG)
    
    # 登录
    if not api.login():
        return
    
    print()
    
    # 获取系统信息
    print("【系统信息】")
    info = api.get_info()
    if info.get("success"):
        data = info["data"]
        print(f"  型号: {data.get('model', 'N/A')}")
        print(f"  DSM版本: {data.get('version_string', 'N/A')}")
        print(f"  温度: {data.get('temperature', 'N/A')}°C")
    print()
    
    # 列出共享文件夹
    print("【共享文件夹】")
    shares = api.list_shares()
    if shares.get("success"):
        for share in shares["data"]["shares"][:5]:  # 只显示前5个
            print(f"  📁 {share['name']} - {share['path']}")
    print()
    
    # 登出
    api.logout()


def demo_synology_api_lib():
    """演示第三方库synology-api用法"""
    print("=" * 60)
    print("synology-api库演示")
    print("=" * 60)
    print()
    
    try:
        from synology_api import filestation
        
        fs = filestation.FileStation(
            ip_address=NAS_CONFIG["ip"],
            port=str(NAS_CONFIG["port"]),
            username=NAS_CONFIG["username"],
            password=NAS_CONFIG["password"],
            secure=NAS_CONFIG["use_https"],
            cert_verify=False
        )
        
        # 列出共享文件夹
        print("【共享文件夹（synology-api）】")
        shares = fs.get_list_share()
        if shares and shares.get("success"):
            for share in shares["data"]["shares"][:5]:
                print(f"  📁 {share['name']}")
        
        print()
        print("✓ synology-api库工作正常")
        
    except ImportError:
        print("⚠ 未安装synology-api库")
        print("  安装命令: pip install synology-api")
    except Exception as e:
        print(f"✗ 错误: {e}")


def main():
    import urllib3
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
    
    print()
    print("群晖NAS API演示脚本")
    print(f"目标: {NAS_CONFIG['ip']}:{NAS_CONFIG['port']}")
    print()
    
    # 演示官方API
    demo_official_api()
    print()
    
    # 演示第三方库
    demo_synology_api_lib()
    print()
    
    print("=" * 60)
    print("演示完成")
    print("=" * 60)


if __name__ == "__main__":
    main()

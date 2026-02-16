#!/usr/bin/env python3
"""
NAS 快速测试脚本
用途：Python方式快速连接和测试群晖NAS（无第三方依赖）
更新：2026-01-21
"""

import urllib.request
import urllib.parse
import json
from typing import Optional, Dict, List

# 配置
NAS_IP = "192.168.1.201"
NAS_USER = "fnvtk"
NAS_PASS = "Zhiqun1984"


class SynologyNAS:
    """群晖NAS API客户端（纯标准库实现）"""
    
    def __init__(self, ip: str = NAS_IP, user: str = NAS_USER, password: str = NAS_PASS):
        self.ip = ip
        self.user = user
        self.password = password
        self.base_url = f"http://{ip}:5000/webapi"
        self.sid: Optional[str] = None
    
    def _request(self, endpoint: str, params: dict, timeout: int = 30) -> dict:
        """发送 HTTP GET 请求"""
        query = urllib.parse.urlencode(params)
        url = f"{self.base_url}/{endpoint}?{query}"
        try:
            with urllib.request.urlopen(url, timeout=timeout) as resp:
                return json.loads(resp.read().decode('utf-8'))
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def login(self) -> bool:
        """登录获取 SID"""
        data = self._request("auth.cgi", {
            "api": "SYNO.API.Auth",
            "version": "3",
            "method": "login",
            "account": self.user,
            "passwd": self.password,
            "session": "PythonClient",
            "format": "sid"
        })
        if data.get("success"):
            self.sid = data["data"]["sid"]
            return True
        print(f"登录失败: {data}")
        return False
    
    def logout(self):
        """登出"""
        if self.sid:
            self._request("auth.cgi", {
                "api": "SYNO.API.Auth",
                "version": "1",
                "method": "logout",
                "session": "PythonClient",
                "_sid": self.sid
            }, timeout=5)
            self.sid = None
    
    def _api_call(self, api: str, version: int, method: str, **kwargs) -> Dict:
        """通用 API 调用"""
        if not self.sid:
            raise Exception("未登录，请先调用 login()")
        
        params = {
            "api": api,
            "version": str(version),
            "method": method,
            "_sid": self.sid,
            **kwargs
        }
        return self._request("entry.cgi", params)
    
    def get_system_info(self) -> Dict:
        """获取系统信息"""
        result = self._api_call("SYNO.DSM.Info", 2, "getinfo")
        return result.get("data", {})
    
    def list_docker_containers(self) -> List[Dict]:
        """列出 Docker 容器"""
        result = self._api_call("SYNO.Docker.Container", 1, "list", limit=100, offset=0)
        return result.get("data", {}).get("containers", [])
    
    def docker_start(self, name: str) -> bool:
        """启动容器"""
        result = self._api_call("SYNO.Docker.Container", 1, "start", name=name)
        return result.get("success", False)
    
    def docker_stop(self, name: str) -> bool:
        """停止容器"""
        result = self._api_call("SYNO.Docker.Container", 1, "stop", name=name)
        return result.get("success", False)
    
    def list_shares(self) -> List[Dict]:
        """列出共享文件夹"""
        result = self._api_call("SYNO.FileStation.List", 2, "list_share")
        return result.get("data", {}).get("shares", [])


def main():
    """主函数 - 快速测试"""
    print("=" * 50)
    print("  群晖NAS快速测试")
    print(f"  IP: {NAS_IP}")
    print("=" * 50)
    print()
    
    nas = SynologyNAS()
    
    # 登录
    print("1. 登录测试...")
    if not nas.login():
        print("   ❌ 登录失败")
        return
    print("   ✅ 登录成功")
    print()
    
    # 系统信息
    print("2. 系统信息...")
    try:
        info = nas.get_system_info()
        print(f"   型号: {info.get('model', 'N/A')}")
        print(f"   版本: {info.get('version_string', 'N/A')}")
        print(f"   温度: {info.get('temperature', 'N/A')}°C")
        print(f"   内存: {info.get('ram', 'N/A')} MB")
        uptime = info.get('uptime', 0)
        print(f"   运行: {uptime // 86400}天 {(uptime % 86400) // 3600}小时")
    except Exception as e:
        print(f"   ⚠️ 获取失败: {e}")
    print()
    
    # Docker 容器
    print("3. Docker 容器...")
    try:
        containers = nas.list_docker_containers()
        running = sum(1 for c in containers if c.get('status') == 'running')
        print(f"   总计: {len(containers)} 个 | 运行: {running}")
        for c in containers:
            name = c.get('name', 'unknown')
            status = "🟢" if c.get('status') == 'running' else "🔴"
            print(f"   {status} {name}")
    except Exception as e:
        print(f"   ⚠️ 获取失败: {e}")
    print()
    
    # 登出
    nas.logout()
    print("4. 已登出")
    print()
    print("=" * 50)
    print("  测试完成")
    print("=" * 50)


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
NAS 远程管理器 v1.0
===================
支持通过 QuickConnect 外网访问群晖NAS

功能：
- 自动发现NAS连接信息（QuickConnect/直连）
- 系统状态监控
- Docker容器管理
- 文件管理
- 支持外网/内网自动切换

作者：卡若AI
日期：2026-01-23
"""

import urllib.request
import urllib.parse
import urllib.error
import json
import ssl
import time
import socket
from typing import Optional, Dict, List, Any
from dataclasses import dataclass
from enum import Enum

# ==================== 配置 ====================

@dataclass
class NASConfig:
    """NAS配置"""
    quickconnect_id: str = "udbfnvtk"
    internal_ip: str = "192.168.1.201"
    username: str = "fnvtk"
    password: str = "zhiqun1984"
    http_port: int = 5000
    https_port: int = 5001


class ConnectionMode(Enum):
    """连接模式"""
    INTERNAL = "内网直连"
    QUICKCONNECT = "QuickConnect"
    RELAY = "中继穿透"
    DIRECT_IP = "外网直连"


# ==================== QuickConnect 服务发现 ====================

class QuickConnectResolver:
    """QuickConnect 服务发现器"""
    
    QC_SERVERS = [
        "cnc.quickconnect.cn",      # 中国联通
        "ctc.quickconnect.cn",      # 中国电信
        "cmc.quickconnect.cn",      # 中国移动
        "global.quickconnect.to",   # 全球
    ]
    
    def __init__(self, qc_id: str):
        self.qc_id = qc_id
        self.ctx = ssl.create_default_context()
        self.ctx.check_hostname = False
        self.ctx.verify_mode = ssl.CERT_NONE
    
    def _request(self, url: str, data: dict = None, timeout: int = 10) -> dict:
        """发送请求"""
        try:
            if data:
                data = json.dumps(data).encode('utf-8')
                req = urllib.request.Request(url, data=data)
                req.add_header('Content-Type', 'application/json')
            else:
                req = urllib.request.Request(url)
            req.add_header('User-Agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)')
            
            with urllib.request.urlopen(req, timeout=timeout, context=self.ctx) as resp:
                return json.loads(resp.read().decode('utf-8'))
        except Exception as e:
            return {"error": str(e)}
    
    def resolve(self) -> Dict[str, Any]:
        """解析QuickConnect获取NAS连接信息"""
        result = {
            "success": False,
            "mode": None,
            "host": None,
            "port": None,
            "external_ip": None,
            "relay_ip": None,
            "relay_port": None,
            "error": None
        }
        
        for server in self.QC_SERVERS:
            url = f"https://{server}/Serv.php"
            
            # 获取服务器信息
            resp = self._request(url, {
                "version": 1,
                "command": "get_server_info",
                "serverID": self.qc_id,
                "id": "dsm_portal_https"
            })
            
            if resp.get("errno") == 0 and "server" in resp:
                srv = resp["server"]
                
                # 外网直连信息
                if "external" in srv:
                    result["external_ip"] = srv["external"].get("ip")
                    result["port"] = srv["external"].get("port", 5001)
                
                # 内网信息
                if "interface" in srv:
                    for iface in srv["interface"]:
                        if iface.get("ip"):
                            result["internal_ip"] = iface["ip"]
                            break
                
                result["success"] = True
                result["mode"] = ConnectionMode.QUICKCONNECT
                return result
            
            # 即使errno!=0，也可能有外网IP信息
            if "server" in resp:
                srv = resp.get("server", {})
                if "external" in srv:
                    result["external_ip"] = srv["external"].get("ip")
                    result["port"] = srv["external"].get("port")
            
            # 尝试获取中继信息
            relay_resp = self._request(url, {
                "version": 1,
                "command": "request_tunnel",
                "serverID": self.qc_id,
                "id": "dsm_portal_https"
            }, timeout=15)
            
            if relay_resp.get("errno") == 0:
                result["relay_ip"] = relay_resp.get("relay_ip")
                result["relay_port"] = relay_resp.get("relay_port")
                result["success"] = True
                result["mode"] = ConnectionMode.RELAY
                return result
        
        result["error"] = "NAS离线或QuickConnect未启用"
        return result


# ==================== NAS API 客户端 ====================

class SynologyAPI:
    """群晖NAS API客户端"""
    
    def __init__(self, config: NASConfig):
        self.config = config
        self.sid: Optional[str] = None
        self.base_url: Optional[str] = None
        self.connection_mode: Optional[ConnectionMode] = None
        
        self.ctx = ssl.create_default_context()
        self.ctx.check_hostname = False
        self.ctx.verify_mode = ssl.CERT_NONE
    
    def _request(self, endpoint: str, params: dict, timeout: int = 15) -> dict:
        """发送API请求"""
        if not self.base_url:
            return {"success": False, "error": "未连接"}
        
        query = urllib.parse.urlencode(params)
        url = f"{self.base_url}/webapi/{endpoint}?{query}"
        
        try:
            req = urllib.request.Request(url)
            req.add_header('User-Agent', 'Mozilla/5.0')
            
            with urllib.request.urlopen(req, timeout=timeout, context=self.ctx) as resp:
                return json.loads(resp.read().decode('utf-8'))
        except urllib.error.URLError as e:
            return {"success": False, "error": f"连接失败: {e.reason}"}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def _test_connection(self, base_url: str, timeout: int = 10) -> bool:
        """测试连接是否可用"""
        try:
            params = {
                "api": "SYNO.API.Info",
                "version": "1",
                "method": "query",
                "query": "all"
            }
            query = urllib.parse.urlencode(params)
            url = f"{base_url}/webapi/query.cgi?{query}"
            
            req = urllib.request.Request(url)
            with urllib.request.urlopen(req, timeout=timeout, context=self.ctx) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                return data.get("success", False)
        except:
            return False
    
    def auto_connect(self) -> bool:
        """自动选择最佳连接方式"""
        print("🔍 正在发现NAS连接...")
        
        # 1. 尝试内网直连
        print("   尝试内网直连...")
        internal_url = f"http://{self.config.internal_ip}:{self.config.http_port}"
        if self._test_connection(internal_url, timeout=3):
            self.base_url = internal_url
            self.connection_mode = ConnectionMode.INTERNAL
            print(f"   ✅ 内网直连成功: {internal_url}")
            return self.login()
        
        # 2. 通过QuickConnect解析
        print("   尝试QuickConnect...")
        resolver = QuickConnectResolver(self.config.quickconnect_id)
        qc_info = resolver.resolve()
        
        if qc_info.get("success"):
            # 尝试外网直连
            if qc_info.get("external_ip"):
                print(f"   发现外网IP: {qc_info['external_ip']}")
                for port in [5001, 5000, 443]:
                    external_url = f"https://{qc_info['external_ip']}:{port}"
                    print(f"   尝试: {external_url}")
                    if self._test_connection(external_url, timeout=10):
                        self.base_url = external_url
                        self.connection_mode = ConnectionMode.DIRECT_IP
                        print(f"   ✅ 外网直连成功")
                        return self.login()
            
            # 尝试中继
            if qc_info.get("relay_ip"):
                relay_url = f"https://{qc_info['relay_ip']}:{qc_info['relay_port']}"
                print(f"   尝试中继: {relay_url}")
                if self._test_connection(relay_url, timeout=15):
                    self.base_url = relay_url
                    self.connection_mode = ConnectionMode.RELAY
                    print(f"   ✅ 中继连接成功")
                    return self.login()
        
        # 3. 尝试QuickConnect域名
        print("   尝试QuickConnect域名...")
        qc_url = f"https://{self.config.quickconnect_id}.quickconnect.cn"
        # QuickConnect域名需要特殊处理，这里简化
        
        print("   ❌ 所有连接方式均失败")
        print(f"   错误: {qc_info.get('error', '未知')}")
        return False
    
    def login(self) -> bool:
        """登录获取SID"""
        data = self._request("auth.cgi", {
            "api": "SYNO.API.Auth",
            "version": "3",
            "method": "login",
            "account": self.config.username,
            "passwd": self.config.password,
            "session": "RemoteManager",
            "format": "sid"
        })
        
        if data.get("success"):
            self.sid = data["data"]["sid"]
            return True
        
        error_code = data.get("error", {}).get("code", "未知")
        print(f"   ❌ 登录失败，错误码: {error_code}")
        return False
    
    def logout(self):
        """登出"""
        if self.sid:
            self._request("auth.cgi", {
                "api": "SYNO.API.Auth",
                "version": "1",
                "method": "logout",
                "session": "RemoteManager",
                "_sid": self.sid
            })
            self.sid = None
    
    def _api_call(self, api: str, version: int, method: str, **kwargs) -> Dict:
        """通用API调用"""
        if not self.sid:
            return {"success": False, "error": "未登录"}
        
        params = {
            "api": api,
            "version": str(version),
            "method": method,
            "_sid": self.sid,
            **kwargs
        }
        return self._request("entry.cgi", params)
    
    # ==================== 系统信息 ====================
    
    def get_system_info(self) -> Dict:
        """获取系统信息"""
        return self._api_call("SYNO.DSM.Info", 2, "getinfo")
    
    def get_storage_info(self) -> Dict:
        """获取存储信息"""
        return self._api_call("SYNO.Storage.CGI.Storage", 1, "load_info")
    
    def get_network_info(self) -> Dict:
        """获取网络信息"""
        return self._api_call("SYNO.DSM.Network", 2, "list")
    
    # ==================== Docker管理 ====================
    
    def list_containers(self) -> List[Dict]:
        """列出Docker容器"""
        result = self._api_call("SYNO.Docker.Container", 1, "list", limit=100, offset=0)
        return result.get("data", {}).get("containers", [])
    
    def start_container(self, name: str) -> bool:
        """启动容器"""
        result = self._api_call("SYNO.Docker.Container", 1, "start", name=name)
        return result.get("success", False)
    
    def stop_container(self, name: str) -> bool:
        """停止容器"""
        result = self._api_call("SYNO.Docker.Container", 1, "stop", name=name)
        return result.get("success", False)
    
    def restart_container(self, name: str) -> bool:
        """重启容器"""
        result = self._api_call("SYNO.Docker.Container", 1, "restart", name=name)
        return result.get("success", False)
    
    # ==================== 文件管理 ====================
    
    def list_shares(self) -> List[Dict]:
        """列出共享文件夹"""
        result = self._api_call("SYNO.FileStation.List", 2, "list_share")
        return result.get("data", {}).get("shares", [])
    
    def list_files(self, folder_path: str) -> List[Dict]:
        """列出文件夹内容"""
        result = self._api_call("SYNO.FileStation.List", 2, "list", folder_path=folder_path)
        return result.get("data", {}).get("files", [])


# ==================== 远程管理器 ====================

class NASRemoteManager:
    """NAS远程管理器 - 主入口"""
    
    def __init__(self, config: NASConfig = None):
        self.config = config or NASConfig()
        self.api = SynologyAPI(self.config)
        self.connected = False
    
    def connect(self) -> bool:
        """连接NAS"""
        self.connected = self.api.auto_connect()
        return self.connected
    
    def disconnect(self):
        """断开连接"""
        self.api.logout()
        self.connected = False
    
    def status(self) -> Dict:
        """获取完整状态"""
        if not self.connected:
            return {"error": "未连接"}
        
        status = {
            "connection": {
                "mode": self.api.connection_mode.value if self.api.connection_mode else None,
                "url": self.api.base_url
            },
            "system": {},
            "storage": [],
            "docker": {"running": 0, "stopped": 0, "containers": []}
        }
        
        # 系统信息
        sys_info = self.api.get_system_info()
        if sys_info.get("success"):
            d = sys_info["data"]
            status["system"] = {
                "model": d.get("model"),
                "version": d.get("version_string"),
                "temperature": d.get("temperature"),
                "uptime_days": d.get("uptime", 0) // 86400
            }
        
        # 存储信息
        storage_info = self.api.get_storage_info()
        if storage_info.get("success"):
            for vol in storage_info.get("data", {}).get("volumes", []):
                total = int(vol.get("size", {}).get("total", 0))
                used = int(vol.get("size", {}).get("used", 0))
                status["storage"].append({
                    "name": vol.get("display_name", vol.get("id")),
                    "total_gb": round(total / (1024**3), 1),
                    "used_gb": round(used / (1024**3), 1),
                    "free_gb": round((total - used) / (1024**3), 1),
                    "percent": round(used / total * 100, 1) if total > 0 else 0
                })
        
        # Docker容器
        containers = self.api.list_containers()
        for c in containers:
            is_running = c.get("status") == "running"
            if is_running:
                status["docker"]["running"] += 1
            else:
                status["docker"]["stopped"] += 1
            status["docker"]["containers"].append({
                "name": c.get("name"),
                "status": "🟢 运行" if is_running else "🔴 停止",
                "image": c.get("image", "").split(":")[0]
            })
        
        return status
    
    def print_status(self):
        """打印状态"""
        status = self.status()
        
        if "error" in status:
            print(f"❌ {status['error']}")
            return
        
        print()
        print("=" * 55)
        print("  NAS-2 远程状态")
        print("=" * 55)
        
        # 连接信息
        conn = status["connection"]
        print(f"\n📡 连接模式: {conn['mode']}")
        print(f"   地址: {conn['url']}")
        
        # 系统信息
        sys = status["system"]
        print(f"\n💻 系统信息:")
        print(f"   型号: {sys.get('model', 'N/A')}")
        print(f"   版本: {sys.get('version', 'N/A')}")
        print(f"   温度: {sys.get('temperature', 'N/A')}°C")
        print(f"   运行: {sys.get('uptime_days', 0)} 天")
        
        # 存储信息
        print(f"\n💾 存储空间:")
        for vol in status["storage"]:
            print(f"   {vol['name']}: {vol['used_gb']}GB / {vol['total_gb']}GB ({vol['percent']}%)")
        
        # Docker容器
        docker = status["docker"]
        print(f"\n🐳 Docker容器: {docker['running']} 运行 / {docker['stopped']} 停止")
        for c in docker["containers"][:10]:
            print(f"   {c['status']} {c['name']}")
        
        print()
        print("=" * 55)


# ==================== 命令行入口 ====================

def main():
    """主函数"""
    import sys
    
    print()
    print("╔═══════════════════════════════════════════════════════╗")
    print("║           NAS 远程管理器 v1.0                         ║")
    print("║           支持 QuickConnect 外网访问                  ║")
    print("╚═══════════════════════════════════════════════════════╝")
    print()
    
    manager = NASRemoteManager()
    
    if not manager.connect():
        print("\n❌ 无法连接到NAS")
        print("\n可能的解决方案:")
        print("   1. 检查NAS是否开机")
        print("   2. 在DSM中启用QuickConnect:")
        print("      控制面板 > 外部访问 > QuickConnect > 启用")
        print("   3. 检查公司网络防火墙设置")
        print("   4. 使用VPN连接到公司网络")
        return 1
    
    print(f"\n✅ 已连接 (模式: {manager.api.connection_mode.value})")
    
    # 显示状态
    manager.print_status()
    
    # 交互模式
    if len(sys.argv) > 1 and sys.argv[1] == "-i":
        print("\n进入交互模式 (输入 'help' 查看命令, 'quit' 退出)")
        while True:
            try:
                cmd = input("\nNAS> ").strip().lower()
                
                if cmd == "quit" or cmd == "exit":
                    break
                elif cmd == "help":
                    print("  status    - 显示NAS状态")
                    print("  docker    - 列出Docker容器")
                    print("  shares    - 列出共享文件夹")
                    print("  start <n> - 启动容器")
                    print("  stop <n>  - 停止容器")
                    print("  quit      - 退出")
                elif cmd == "status":
                    manager.print_status()
                elif cmd == "docker":
                    for c in manager.api.list_containers():
                        status = "🟢" if c.get("status") == "running" else "🔴"
                        print(f"  {status} {c.get('name')}")
                elif cmd == "shares":
                    for s in manager.api.list_shares():
                        print(f"  📁 {s.get('name')}")
                elif cmd.startswith("start "):
                    name = cmd[6:].strip()
                    if manager.api.start_container(name):
                        print(f"  ✅ 已启动 {name}")
                    else:
                        print(f"  ❌ 启动失败")
                elif cmd.startswith("stop "):
                    name = cmd[5:].strip()
                    if manager.api.stop_container(name):
                        print(f"  ✅ 已停止 {name}")
                    else:
                        print(f"  ❌ 停止失败")
                elif cmd:
                    print(f"  未知命令: {cmd}")
                    
            except KeyboardInterrupt:
                print("\n")
                break
            except EOFError:
                break
    
    manager.disconnect()
    print("\n👋 已断开连接")
    return 0


if __name__ == "__main__":
    exit(main())

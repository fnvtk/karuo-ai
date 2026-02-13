#!/usr/bin/env python3
"""
流量自动化工具集
基于历史项目提炼的 macOS 可用版本

使用前请安装依赖:
    pip install selenium requests

作者: 卡若AI
"""

import subprocess
import random
import time
import os
import shutil
import requests
import re
from typing import Optional

# ============================================
# 模块1: 设备指纹工具
# ============================================

class DeviceFingerprint:
    """设备指纹重置工具"""
    
    @staticmethod
    def generate_mac() -> str:
        """生成随机MAC地址"""
        mac = [random.randint(0x00, 0xff) for _ in range(6)]
        mac[0] = mac[0] & 0xfe  # 确保是单播地址
        mac[0] = mac[0] | 0x02  # 设置本地管理位
        return ':'.join(f'{x:02x}' for x in mac)
    
    @staticmethod
    def get_current_mac(interface: str = 'en0') -> Optional[str]:
        """获取当前MAC地址"""
        result = subprocess.run(
            f'ifconfig {interface} | grep ether',
            shell=True, capture_output=True, text=True
        )
        if result.returncode == 0:
            match = re.search(r'ether\s+([\da-f:]+)', result.stdout)
            return match.group(1) if match else None
        return None
    
    @staticmethod
    def reset_mac(interface: str = 'en0') -> Optional[str]:
        """
        重置MAC地址 (需要sudo权限)
        
        使用方法:
            sudo python3 traffic_automation.py reset_mac
        """
        new_mac = DeviceFingerprint.generate_mac()
        commands = [
            f'sudo ifconfig {interface} ether {new_mac}',
            f'sudo ifconfig {interface} down',
            f'sudo ifconfig {interface} up'
        ]
        for cmd in commands:
            result = subprocess.run(cmd, shell=True, capture_output=True)
            if result.returncode != 0:
                print(f"命令执行失败: {cmd}")
                return None
        return new_mac


# ============================================
# 模块2: VPN管理工具
# ============================================

class VPNManager:
    """VPN管理工具"""
    
    @staticmethod
    def get_external_ip() -> Optional[str]:
        """获取外网IP"""
        sources = [
            ('http://ip.sb', lambda r: r.text.strip()),
            ('http://ifconfig.me/ip', lambda r: r.text.strip()),
            ('http://ip138.com/ic.asp', lambda r: re.search(r'\[([\d.]+)\]', r.text).group(1)),
        ]
        for url, parser in sources:
            try:
                response = requests.get(url, timeout=10)
                if response.status_code == 200:
                    return parser(response)
            except:
                continue
        return None
    
    @staticmethod
    def list_vpn_services() -> list:
        """列出所有VPN服务"""
        result = subprocess.run(
            'networksetup -listnetworkserviceorder',
            shell=True, capture_output=True, text=True
        )
        services = []
        for line in result.stdout.split('\n'):
            if 'VPN' in line or 'PPP' in line:
                match = re.search(r'\(\d+\)\s+(.+)', line)
                if match:
                    services.append(match.group(1))
        return services
    
    @staticmethod
    def connect(vpn_name: str) -> bool:
        """连接VPN"""
        result = subprocess.run(
            f'networksetup -connectpppoeservice "{vpn_name}"',
            shell=True, capture_output=True
        )
        if result.returncode == 0:
            time.sleep(5)  # 等待连接
            return True
        return False
    
    @staticmethod
    def disconnect(vpn_name: str) -> bool:
        """断开VPN"""
        result = subprocess.run(
            f'networksetup -disconnectpppoeservice "{vpn_name}"',
            shell=True, capture_output=True
        )
        return result.returncode == 0
    
    @staticmethod
    def get_status(vpn_name: str) -> str:
        """获取VPN状态"""
        result = subprocess.run(
            f'networksetup -showpppoestatus "{vpn_name}"',
            shell=True, capture_output=True, text=True
        )
        return result.stdout.strip() if result.returncode == 0 else "unknown"


# ============================================
# 模块3: 浏览器数据清理
# ============================================

class BrowserCleaner:
    """浏览器数据清理工具"""
    
    @staticmethod
    def clear_chrome():
        """清理Chrome浏览数据"""
        chrome_path = os.path.expanduser(
            '~/Library/Application Support/Google/Chrome/Default'
        )
        targets = ['Cookies', 'History', 'Cache', 'Visited Links', 
                   'Web Data', 'Login Data', 'Local Storage']
        
        cleared = []
        for target in targets:
            full_path = os.path.join(chrome_path, target)
            if os.path.exists(full_path):
                try:
                    if os.path.isdir(full_path):
                        shutil.rmtree(full_path)
                    else:
                        os.remove(full_path)
                    cleared.append(target)
                except:
                    pass
        return cleared
    
    @staticmethod
    def clear_safari():
        """清理Safari浏览数据"""
        commands = [
            'rm -rf ~/Library/Safari/LocalStorage/*',
            'rm -rf ~/Library/Safari/History.db*',
            'rm -rf ~/Library/Cookies/*',
            'rm -rf ~/Library/Caches/com.apple.Safari/*',
        ]
        for cmd in commands:
            subprocess.run(cmd, shell=True, capture_output=True)
    
    @staticmethod
    def clear_all():
        """清理所有浏览器"""
        BrowserCleaner.clear_chrome()
        BrowserCleaner.clear_safari()


# ============================================
# 模块4: 网页自动化
# ============================================

class WebAutomation:
    """网页自动化工具 (需要selenium)"""
    
    def __init__(self, headless: bool = False):
        try:
            from selenium import webdriver
            from selenium.webdriver.chrome.options import Options
            
            options = Options()
            if headless:
                options.add_argument('--headless')
            
            # 防检测设置
            options.add_argument('--disable-blink-features=AutomationControlled')
            options.add_experimental_option('excludeSwitches', ['enable-automation'])
            options.add_experimental_option('useAutomationExtension', False)
            
            # 随机UA
            user_agents = [
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 11_0_0) AppleWebKit/537.36',
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 12_0_0) AppleWebKit/605.1.15',
            ]
            options.add_argument(f'--user-agent={random.choice(user_agents)}')
            
            self.driver = webdriver.Chrome(options=options)
            self.driver.execute_cdp_cmd('Page.addScriptToEvaluateOnNewDocument', {
                'source': 'Object.defineProperty(navigator, "webdriver", {get: () => undefined})'
            })
        except ImportError:
            raise ImportError("请先安装selenium: pip install selenium")
    
    def baidu_search_and_click(self, keyword: str, target_domain: str, max_pages: int = 5) -> bool:
        """
        百度搜索并点击目标域名
        
        参数:
            keyword: 搜索关键词
            target_domain: 目标域名 (如 'lkdie.com')
            max_pages: 最大翻页数
        """
        from selenium.webdriver.common.by import By
        from selenium.webdriver.common.keys import Keys
        
        self.driver.get('https://www.baidu.com')
        self._random_sleep(1, 3)
        
        # 搜索
        search_box = self.driver.find_element(By.ID, 'kw')
        search_box.clear()
        self._type_slowly(search_box, keyword)
        search_box.send_keys(Keys.RETURN)
        self._random_sleep(2, 4)
        
        # 翻页查找
        for page in range(max_pages):
            print(f"正在搜索第 {page + 1} 页...")
            
            results = self.driver.find_elements(By.CSS_SELECTOR, '.result.c-container')
            for result in results:
                try:
                    if target_domain.lower() in result.text.lower():
                        link = result.find_element(By.TAG_NAME, 'a')
                        self._scroll_to_element(link)
                        self._random_sleep(0.5, 1.5)
                        link.click()
                        
                        # 模拟浏览
                        self._simulate_browse()
                        self.driver.back()
                        print(f"已点击目标: {target_domain}")
                        return True
                except:
                    continue
            
            # 翻页
            try:
                next_btn = self.driver.find_element(By.LINK_TEXT, '下一页>')
                next_btn.click()
                self._random_sleep(2, 4)
            except:
                break
        
        return False
    
    def _type_slowly(self, element, text: str):
        """模拟人工打字"""
        for char in text:
            element.send_keys(char)
            time.sleep(random.uniform(0.05, 0.2))
    
    def _scroll_to_element(self, element):
        """滚动到元素位置"""
        self.driver.execute_script(
            "arguments[0].scrollIntoView({behavior: 'smooth', block: 'center'});", 
            element
        )
    
    def _simulate_browse(self):
        """模拟真实浏览行为"""
        # 随机滚动
        for _ in range(random.randint(3, 8)):
            scroll_distance = random.randint(200, 500)
            self.driver.execute_script(f'window.scrollBy(0, {scroll_distance})')
            self._random_sleep(0.5, 2)
        
        # 停留一段时间
        self._random_sleep(10, 30)
    
    def _random_sleep(self, min_sec: float, max_sec: float):
        """随机等待"""
        time.sleep(random.uniform(min_sec, max_sec))
    
    def close(self):
        """关闭浏览器"""
        if self.driver:
            self.driver.quit()


# ============================================
# 完整工作流
# ============================================

def run_full_workflow(
    keyword: str,
    target_domain: str,
    loops: int = 5,
    vpn_name: Optional[str] = None,
    reset_mac: bool = False
):
    """
    完整流量刷取工作流
    
    参数:
        keyword: 搜索关键词
        target_domain: 目标域名
        loops: 循环次数
        vpn_name: VPN名称(可选)
        reset_mac: 是否重置MAC(需要sudo)
    """
    print(f"开始流量自动化任务: {keyword} -> {target_domain}")
    print(f"计划执行 {loops} 轮")
    
    for i in range(loops):
        print(f"\n{'='*50}")
        print(f"第 {i + 1}/{loops} 轮")
        print('='*50)
        
        # 1. 重置MAC (可选)
        if reset_mac:
            new_mac = DeviceFingerprint.reset_mac()
            if new_mac:
                print(f"✓ MAC已重置: {new_mac}")
            else:
                print("✗ MAC重置失败(需要sudo权限)")
        
        # 2. 清理浏览器
        BrowserCleaner.clear_chrome()
        print("✓ 浏览器数据已清理")
        
        # 3. 连接VPN (可选)
        if vpn_name:
            if VPNManager.connect(vpn_name):
                ip = VPNManager.get_external_ip()
                print(f"✓ VPN已连接, IP: {ip}")
            else:
                print("✗ VPN连接失败")
        
        # 4. 执行自动浏览
        try:
            bot = WebAutomation()
            success = bot.baidu_search_and_click(keyword, target_domain)
            if success:
                print("✓ 搜索点击完成")
            else:
                print("✗ 未找到目标")
        except Exception as e:
            print(f"✗ 自动化失败: {e}")
        finally:
            bot.close()
        
        # 5. 断开VPN
        if vpn_name:
            VPNManager.disconnect(vpn_name)
            print("✓ VPN已断开")
        
        # 6. 等待
        if i < loops - 1:
            wait_time = random.randint(30, 120)
            print(f"等待 {wait_time} 秒后继续...")
            time.sleep(wait_time)
    
    print(f"\n任务完成! 共执行 {loops} 轮")


# ============================================
# CLI 命令行接口
# ============================================

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='流量自动化工具')
    subparsers = parser.add_subparsers(dest='command', help='可用命令')
    
    # reset_mac 命令
    mac_parser = subparsers.add_parser('reset_mac', help='重置MAC地址')
    mac_parser.add_argument('-i', '--interface', default='en0', help='网络接口')
    
    # get_ip 命令
    subparsers.add_parser('get_ip', help='获取外网IP')
    
    # clear 命令
    subparsers.add_parser('clear', help='清理浏览器数据')
    
    # vpn 命令
    vpn_parser = subparsers.add_parser('vpn', help='VPN管理')
    vpn_parser.add_argument('action', choices=['list', 'connect', 'disconnect', 'status'])
    vpn_parser.add_argument('-n', '--name', help='VPN名称')
    
    # run 命令
    run_parser = subparsers.add_parser('run', help='运行完整流程')
    run_parser.add_argument('keyword', help='搜索关键词')
    run_parser.add_argument('target', help='目标域名')
    run_parser.add_argument('-l', '--loops', type=int, default=5, help='循环次数')
    run_parser.add_argument('-v', '--vpn', help='VPN名称')
    run_parser.add_argument('--reset-mac', action='store_true', help='重置MAC')
    
    args = parser.parse_args()
    
    if args.command == 'reset_mac':
        new_mac = DeviceFingerprint.reset_mac(args.interface)
        print(f"新MAC地址: {new_mac}" if new_mac else "重置失败")
    
    elif args.command == 'get_ip':
        ip = VPNManager.get_external_ip()
        print(f"外网IP: {ip}" if ip else "获取失败")
    
    elif args.command == 'clear':
        BrowserCleaner.clear_all()
        print("浏览器数据已清理")
    
    elif args.command == 'vpn':
        if args.action == 'list':
            services = VPNManager.list_vpn_services()
            print("VPN服务列表:")
            for s in services:
                print(f"  - {s}")
        elif args.action == 'connect':
            if not args.name:
                print("请指定VPN名称: -n NAME")
            else:
                success = VPNManager.connect(args.name)
                print("连接成功" if success else "连接失败")
        elif args.action == 'disconnect':
            if not args.name:
                print("请指定VPN名称: -n NAME")
            else:
                VPNManager.disconnect(args.name)
                print("已断开")
        elif args.action == 'status':
            if not args.name:
                print("请指定VPN名称: -n NAME")
            else:
                status = VPNManager.get_status(args.name)
                print(f"状态: {status}")
    
    elif args.command == 'run':
        run_full_workflow(
            args.keyword,
            args.target,
            loops=args.loops,
            vpn_name=args.vpn,
            reset_mac=args.reset_mac
        )
    
    else:
        parser.print_help()


if __name__ == '__main__':
    main()

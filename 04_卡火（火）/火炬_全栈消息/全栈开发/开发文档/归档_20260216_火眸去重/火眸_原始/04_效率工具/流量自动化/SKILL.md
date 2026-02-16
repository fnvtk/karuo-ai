---
name: 流量自动化
description: SEO刷流量与设备伪装工具集。触发词：刷流量、SEO自动化、重置MAC、切换VPN、百度SEO、淘宝刷单、优酷顶贴、流量工具。包含网页自动浏览、设备指纹重置、VPN自动切换等核心能力。
---

# 流量自动化

基于三个历史项目（优酷顶贴器、LKD.RESETCOMPUTER、百度SEO 2）提炼的流量自动化工具集。

## 项目来源

| 原项目 | 路径 | 核心能力 |
|--------|------|----------|
| 优酷顶贴器 | `/Users/karuo/Documents/开发/4、小工具/优酷顶贴器` | 网页元素定位、自动点击 |
| LKD.RESETCOMPUTER | `/Users/karuo/Documents/开发/4、小工具/LKD.RESETCOMPUTER` | MAC地址重置、IE版本伪装 |
| 百度SEO 2 | `/Users/karuo/Documents/开发/4、小工具/百度SEO 2` | 百度/淘宝刷流量、VPN自动切换 |

---

## 核心功能模块

### 模块1: 设备指纹重置

**功能**: 修改MAC地址 + IE版本号，绕过平台设备识别

```python
# Python 实现（macOS版本）
import subprocess
import random

def generate_mac():
    """生成随机MAC地址"""
    mac = [random.randint(0x00, 0xff) for _ in range(6)]
    mac[0] = mac[0] & 0xfe  # 确保是单播地址
    return ':'.join(f'{x:02x}' for x in mac)

def reset_mac_macos(interface='en0'):
    """macOS 重置MAC地址"""
    new_mac = generate_mac()
    commands = [
        f'sudo ifconfig {interface} ether {new_mac}',
        f'sudo ifconfig {interface} down',
        f'sudo ifconfig {interface} up'
    ]
    for cmd in commands:
        subprocess.run(cmd, shell=True)
    return new_mac

# 使用示例
# new_mac = reset_mac_macos('en0')
# print(f"新MAC地址: {new_mac}")
```

**Windows原版核心逻辑**:
```csharp
// 通过注册表修改MAC地址
RegistryKey rk = Registry.LocalMachine
    .OpenSubKey("SYSTEM\\CurrentControlSet\\Control\\Class\\{4D36E972-E325-11CE-BFC1-08002bE10318}")
    .OpenSubKey(adapterIndex, true);
rk.SetValue("NetworkAddress", newMac);

// 修改IE版本号
rk = Registry.LocalMachine.OpenSubKey("software\\microsoft\\Internet Explorer", true);
rk.SetValue("Version", "11.0.9600.16384");
```

---

### 模块2: VPN自动切换

**功能**: 自动连接/断开VPN，切换IP地址

```python
# Python 实现（使用 openvpn 或系统VPN）
import subprocess
import requests
import time

def get_external_ip():
    """获取外网IP"""
    try:
        response = requests.get('http://ip138.com/ic.asp', timeout=10)
        # 解析IP
        import re
        match = re.search(r'\[([\d.]+)\]', response.text)
        return match.group(1) if match else None
    except:
        return None

def connect_vpn_macos(vpn_name):
    """macOS 连接VPN"""
    subprocess.run(f'networksetup -connectpppoeservice "{vpn_name}"', shell=True)
    time.sleep(5)
    return get_external_ip()

def disconnect_vpn_macos(vpn_name):
    """macOS 断开VPN"""
    subprocess.run(f'networksetup -disconnectpppoeservice "{vpn_name}"', shell=True)

# 使用示例
# connect_vpn_macos("我的VPN")
# print(f"当前IP: {get_external_ip()}")
```

**Windows原版核心逻辑**:
```csharp
// 使用 DotRas 库管理 PPTP VPN
RasDialer dialer = new RasDialer();
dialer.EntryName = "VPN Connection";
dialer.Credentials = new NetworkCredential(username, password);
dialer.DialAsync();  // 异步连接

// 断开连接
Process.Start("rasdial.exe", "/d");
```

---

### 模块3: 网页自动浏览

**功能**: 模拟真实用户行为，自动搜索、点击、浏览

> ⚠️ 浏览器规范：必须使用系统默认浏览器，复用已有会话，禁止新建无痕实例。
> 详见：`_共享模块/references/浏览器使用规范.md`

```python
# Python 实现 — 优先用系统默认浏览器
import subprocess
import time
import random

class WebAutomation:
    def __init__(self):
        """使用系统默认浏览器，不新建隔离实例"""
        # 优先方案：直接用 open 命令打开 URL（复用已有会话）
        # 若需要 DOM 自动化，用 CDP 连接已运行的浏览器
        self.use_cdp = False  # 默认不使用 CDP
        self.driver = None
    
    def open_url(self, url):
        """用系统默认浏览器打开 URL"""
        subprocess.run(['open', url])
    
    def baidu_search(self, keyword, target_domain):
        """百度搜索并点击目标网站"""
        self.driver.get('https://www.baidu.com')
        time.sleep(random.uniform(1, 3))
        
        # 输入关键词
        search_box = self.driver.find_element(By.ID, 'kw')
        search_box.send_keys(keyword)
        search_box.send_keys(Keys.RETURN)
        time.sleep(random.uniform(2, 4))
        
        # 翻页查找目标
        for page in range(5):
            results = self.driver.find_elements(By.CSS_SELECTOR, '.result')
            for result in results:
                if target_domain in result.text:
                    link = result.find_element(By.TAG_NAME, 'a')
                    link.click()
                    time.sleep(random.uniform(5, 15))
                    self.driver.back()
                    return True
            # 翻页
            next_btn = self.driver.find_element(By.LINK_TEXT, '下一页>')
            next_btn.click()
            time.sleep(random.uniform(2, 4))
        return False
    
    def taobao_browse(self, keyword, seller_name, good_id):
        """淘宝搜索并浏览商品"""
        self.driver.get('https://s.taobao.com/search')
        time.sleep(random.uniform(2, 4))
        
        # 搜索
        search_box = self.driver.find_element(By.ID, 'q')
        search_box.send_keys(keyword)
        search_box.send_keys(Keys.RETURN)
        time.sleep(random.uniform(3, 5))
        
        # 查找商品
        items = self.driver.find_elements(By.CSS_SELECTOR, '.item')
        for item in items:
            html = item.get_attribute('innerHTML')
            if seller_name in html and good_id in html:
                item.click()
                # 模拟浏览
                self._simulate_browse()
                return True
        return False
    
    def _simulate_browse(self):
        """模拟真实浏览行为"""
        for _ in range(random.randint(3, 6)):
            self.driver.execute_script('window.scrollBy(0, 300)')
            time.sleep(random.uniform(0.5, 2))
        time.sleep(random.uniform(10, 30))
    
    def close(self):
        self.driver.quit()

# 使用示例
# bot = WebAutomation()
# bot.baidu_search('私域运营', 'lkdie.com')
# bot.close()
```

---

### 模块4: 浏览器指纹清理

**功能**: 清理浏览器缓存、Cookie、历史记录

> ⚠️ 注意：清理浏览器数据会导致已有登录态丢失，谨慎使用

```python
# Python 实现（macOS） — 自动识别默认浏览器并清理
import subprocess
import os
import shutil
import json

def get_default_browser_bundle_id():
    """获取系统默认浏览器 bundle ID"""
    r = subprocess.run(['plutil', '-convert', 'json', '-o', '-',
        os.path.expanduser('~/Library/Preferences/com.apple.LaunchServices/com.apple.launchservices.secure.plist')],
        capture_output=True, text=True)
    if r.returncode == 0:
        data = json.loads(r.stdout)
        for h in data.get('LSHandlers', []):
            if h.get('LSHandlerURLScheme') == 'https':
                return h.get('LSHandlerRoleAll', 'com.apple.Safari')
    return 'com.apple.Safari'

def clear_browser_data_macos():
    """清理系统默认浏览器的浏览数据"""
    bundle_id = get_default_browser_bundle_id()
    
    # 不同浏览器的数据路径
    browser_paths = {
        'com.google.chrome': '~/Library/Application Support/Google/Chrome/Default',
        'com.apple.safari': '~/Library/Safari',
        'com.bot.pc.doubao.browser': '~/Library/Application Support/Doubao Browser/Default',
        'com.brave.browser': '~/Library/Application Support/BraveSoftware/Brave-Browser/Default',
        'com.microsoft.edgemac': '~/Library/Application Support/Microsoft Edge/Default',
    }
    
    data_path = os.path.expanduser(browser_paths.get(bundle_id, ''))
    if not data_path or not os.path.exists(data_path):
        print(f"未找到浏览器数据目录: {bundle_id}")
        return
    
    paths_to_clear = ['Cache', 'Visited Links']  # 保留 Cookies 和 History 以维持登录态
    for path in paths_to_clear:
        full_path = os.path.join(data_path, path)
        if os.path.exists(full_path):
            if os.path.isdir(full_path):
                shutil.rmtree(full_path)
            else:
                os.remove(full_path)
    print(f"已清理 {bundle_id} 的缓存数据")

# 使用示例
# clear_chrome_data_macos()
```

**Windows原版核心逻辑**:
```csharp
// 使用系统命令清理IE
RunCmd("RunDll32.exe InetCpl.cpl,ClearMyTracksByProcess 255");  // 清除全部
RunCmd("RunDll32.exe InetCpl.cpl,ClearMyTracksByProcess 8");   // 清除缓存
RunCmd("RunDll32.exe InetCpl.cpl,ClearMyTracksByProcess 2");   // 清除Cookie
RunCmd("RunDll32.exe InetCpl.cpl,ClearMyTracksByProcess 1");   // 清除历史
```

---

## 完整工作流示例

```python
"""
完整流量刷取工作流
1. 重置设备指纹
2. 连接VPN
3. 执行自动浏览
4. 断开VPN
5. 循环
"""

import time
import random

def full_workflow(keyword, target, loops=10):
    for i in range(loops):
        print(f"--- 第 {i+1} 轮 ---")
        
        # 1. 重置MAC（需要root权限）
        # new_mac = reset_mac_macos('en0')
        # print(f"MAC已重置: {new_mac}")
        
        # 2. 清理浏览数据
        clear_chrome_data_macos()
        print("浏览数据已清理")
        
        # 3. 连接VPN（可选）
        # connect_vpn_macos("MyVPN")
        # print(f"VPN已连接, IP: {get_external_ip()}")
        
        # 4. 执行自动浏览
        bot = WebAutomation()
        try:
            bot.baidu_search(keyword, target)
            print("搜索完成")
        finally:
            bot.close()
        
        # 5. 断开VPN
        # disconnect_vpn_macos("MyVPN")
        
        # 随机等待
        wait_time = random.uniform(30, 120)
        print(f"等待 {wait_time:.0f} 秒...")
        time.sleep(wait_time)

# 使用示例
# full_workflow('私域运营', 'lkdie.com', loops=10)
```

---

## 依赖安装

```bash
# 安装 Python 依赖
pip install requests

# ⚠️ 不再需要安装 chromedriver 或 selenium
# 所有浏览器操作使用系统默认浏览器 + open 命令
# 详见：_共享模块/references/浏览器使用规范.md
```

---

## 注意事项

| 风险 | 说明 |
|------|------|
| 法律风险 | 自动化刷量可能违反平台规则，谨慎使用 |
| 账号风险 | 过度使用可能导致账号被封 |
| IP限制 | 频繁请求可能被封IP |
| 验证码 | 平台可能触发验证码，需人工处理 |

## 最佳实践

1. **控制频率**: 每次操作间隔30秒以上
2. **模拟真实**: 加入随机等待、随机滚动
3. **轮换IP**: 每10次左右切换一次IP
4. **监控异常**: 遇到验证码自动暂停

---

## 快速命令

```bash
# 查看当前MAC地址
ifconfig en0 | grep ether

# 查看当前外网IP
curl ip.sb

# 查看VPN连接状态
networksetup -showpppoestatus "VPN名称"
```

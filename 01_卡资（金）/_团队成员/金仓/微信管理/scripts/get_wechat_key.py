#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
微信数据库密钥获取脚本

由于 SIP 保护，直接通过脚本获取密钥比较困难。
本脚本提供引导式操作流程。

使用方法:
    python get_wechat_key.py
"""

import os
import subprocess
import sys
from pathlib import Path

# ANSI 颜色
GREEN = '\033[92m'
YELLOW = '\033[93m'
RED = '\033[91m'
BLUE = '\033[94m'
RESET = '\033[0m'
BOLD = '\033[1m'


def print_step(num, text):
    print(f"\n{BLUE}{BOLD}[步骤 {num}]{RESET} {text}")


def print_info(text):
    print(f"  {GREEN}✓{RESET} {text}")


def print_warn(text):
    print(f"  {YELLOW}⚠{RESET} {text}")


def print_error(text):
    print(f"  {RED}✗{RESET} {text}")


def check_sip_status():
    """检查 SIP 状态"""
    try:
        result = subprocess.run(
            ["csrutil", "status"],
            capture_output=True, text=True
        )
        return "enabled" in result.stdout.lower()
    except Exception:
        return True


def check_wechat_running():
    """检查微信是否运行"""
    try:
        result = subprocess.run(
            ["pgrep", "-x", "WeChat"],
            capture_output=True, text=True
        )
        return result.returncode == 0
    except Exception:
        return False


def get_wechat_pid():
    """获取微信进程 PID"""
    try:
        result = subprocess.run(
            ["pgrep", "-x", "WeChat"],
            capture_output=True, text=True
        )
        if result.returncode == 0:
            return result.stdout.strip()
    except Exception:
        pass
    return None


def main():
    print(f"""
{BOLD}╔══════════════════════════════════════════════════════════════╗
║           微信数据库密钥获取指南 (macOS)                      ║
╚══════════════════════════════════════════════════════════════╝{RESET}
""")

    # 检查环境
    print(f"{BOLD}环境检查:{RESET}")
    
    sip_enabled = check_sip_status()
    if sip_enabled:
        print_warn("SIP 已启用 - 需要特殊权限才能调试微信进程")
    else:
        print_info("SIP 已禁用 - 可以使用 LLDB 调试")
    
    wechat_running = check_wechat_running()
    if wechat_running:
        pid = get_wechat_pid()
        print_info(f"微信正在运行 (PID: {pid})")
    else:
        print_warn("微信未运行")

    # 方案选择
    print(f"""
{BOLD}可用方案:{RESET}

  {GREEN}方案 A{RESET}: LLDB 断点法 (推荐，需要 SIP 关闭或开发者权限)
  {YELLOW}方案 B{RESET}: 签名微信应用 (无需关闭 SIP，但较复杂)
  {BLUE}方案 C{RESET}: 使用已解密数据库 (如果之前导出过)
""")

    if sip_enabled:
        print(f"""
{YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{RESET}
{BOLD}当前 SIP 已启用，推荐使用方案 B 或先尝试方案 A{RESET}
{YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{RESET}
""")

    # 方案 A 详细步骤
    print(f"""
{BOLD}══════════════════════════════════════════════════════════════
方案 A: LLDB 断点法
══════════════════════════════════════════════════════════════{RESET}
""")

    print_step(1, "完全退出微信")
    print("""
    在 Dock 栏右键微信 → 退出
    或终端执行: killall WeChat
""")

    print_step(2, "重新打开微信，但不要登录")
    print("""
    打开微信应用，停留在登录界面，不要扫码或输入密码
""")

    print_step(3, "打开新终端窗口，附加 LLDB 调试器")
    print(f"""
    {BLUE}# 复制以下命令到终端执行:{RESET}
    lldb -p $(pgrep -x WeChat)
    
    {YELLOW}# 如果提示权限不足，可能需要:{RESET}
    sudo lldb -p $(pgrep -x WeChat)
""")

    print_step(4, "在 LLDB 中设置断点")
    print(f"""
    {BLUE}# 在 LLDB 提示符 (lldb) 下输入:{RESET}
    (lldb) br set -n sqlite3_key
    
    {GREEN}# 应该看到类似输出:{RESET}
    Breakpoint 1: where = libsqlcipher.dylib`sqlite3_key ...
""")

    print_step(5, "继续执行并登录微信")
    print(f"""
    {BLUE}# 在 LLDB 中输入:{RESET}
    (lldb) c
    
    然后在微信界面扫码登录
""")

    print_step(6, "断点触发后读取密钥")
    print(f"""
    {GREEN}# 登录成功后，LLDB 会自动暂停，显示类似:{RESET}
    Process XXXXX stopped
    * thread #1 ...
    
    {BLUE}# 然后输入以下命令读取密钥:{RESET}
    (lldb) memory read --size 1 --format x --count 32 $rsi
    
    {GREEN}# 输出示例 (这就是你的密钥):{RESET}
    0x12345678: 0xab 0xcd 0xef 0x12 0x34 0x56 0x78 0x9a
    0x12345680: 0xbc 0xde 0xf0 0x12 0x34 0x56 0x78 0x9a
    0x12345688: 0xcd 0xef 0x01 0x23 0x45 0x67 0x89 0xab
    0x12345690: 0xde 0xf0 0x12 0x34 0x56 0x78 0x9a 0xbc
""")

    print_step(7, "保存密钥并退出")
    print(f"""
    {BLUE}# 将上面的十六进制值去掉 0x 和空格，拼接成一个字符串:{RESET}
    abcdef123456789abcdef0123456789abcdef0123456789abcdef0123456789abc
    
    {BLUE}# 退出 LLDB:{RESET}
    (lldb) quit
    
    {GREEN}# 将密钥保存到配置文件:{RESET}
    复制密钥到 ~/.config/wechat_manager/config.yaml 的 db_key 字段
""")

    # 方案 B
    print(f"""
{BOLD}══════════════════════════════════════════════════════════════
方案 B: 重签名微信 (无需关闭 SIP)
══════════════════════════════════════════════════════════════{RESET}
""")

    print_step(1, "创建签名文件")
    print(f"""
    {BLUE}# 创建 entitlements.plist 文件:{RESET}
    
    cat > /tmp/entitlements.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
    <true/>
    <key>com.apple.security.cs.disable-library-validation</key>
    <true/>
    <key>com.apple.security.get-task-allow</key>
    <true/>
</dict>
</plist>
EOF
""")

    print_step(2, "备份并重签名微信")
    print(f"""
    {BLUE}# 备份原版微信:{RESET}
    cp -r /Applications/WeChat.app /Applications/WeChat_backup.app
    
    {BLUE}# 重签名 (需要 Xcode Command Line Tools):{RESET}
    codesign --force --deep --sign - --entitlements /tmp/entitlements.plist /Applications/WeChat.app
    
    {YELLOW}# 注意: 重签名后微信可能无法自动更新，需要时可恢复备份{RESET}
""")

    print_step(3, "按方案 A 步骤 3-7 操作")
    print("""
    重签名后，LLDB 调试应该不再需要关闭 SIP
""")

    # 验证密钥
    print(f"""
{BOLD}══════════════════════════════════════════════════════════════
验证密钥是否正确
══════════════════════════════════════════════════════════════{RESET}
""")

    print(f"""
    获取密钥后，可以用以下方式验证:
    
    {BLUE}# 1. 安装 sqlcipher{RESET}
    brew install sqlcipher
    
    {BLUE}# 2. 找到微信数据库文件{RESET}
    find ~/Library/Containers/com.tencent.xinWeChat -name "*.db" 2>/dev/null | head -5
    
    {BLUE}# 3. 尝试解密打开{RESET}
    sqlcipher /path/to/your/wechat.db
    
    {GREEN}# 在 sqlcipher 提示符下输入:{RESET}
    PRAGMA key = "x'你的64位十六进制密钥'";
    PRAGMA cipher_page_size = 4096;  -- 微信 4.x
    PRAGMA kdf_iter = 256000;
    PRAGMA cipher_hmac_algorithm = HMAC_SHA256;
    PRAGMA cipher_kdf_algorithm = PBKDF2_HMAC_SHA256;
    
    {GREEN}# 测试是否解密成功:{RESET}
    SELECT name FROM sqlite_master WHERE type='table' LIMIT 5;
    
    {GREEN}# 如果显示表名，说明密钥正确！{RESET}
""")

    # 常见问题
    print(f"""
{BOLD}══════════════════════════════════════════════════════════════
常见问题
══════════════════════════════════════════════════════════════{RESET}

{YELLOW}Q: LLDB 提示 "attach failed" 或权限不足?{RESET}
A: 1. 确保使用 sudo lldb
   2. 考虑使用方案 B 重签名微信
   3. 或在恢复模式下关闭 SIP: csrutil disable

{YELLOW}Q: 断点没有触发?{RESET}
A: 1. 确保微信是先打开再附加 LLDB
   2. 断点设置后要输入 c 继续
   3. 登录时才会调用 sqlite3_key

{YELLOW}Q: 密钥解密失败?{RESET}
A: 1. 确认微信版本 (3.x 用 v3 参数，4.x 用 v4 参数)
   2. 检查密钥长度是否为 64 位十六进制
   3. 确保没有多余的空格或字符

{YELLOW}Q: 如何恢复重签名的微信?{RESET}
A: rm -rf /Applications/WeChat.app
   mv /Applications/WeChat_backup.app /Applications/WeChat.app
""")

    print(f"""
{BOLD}══════════════════════════════════════════════════════════════{RESET}
完成后，运行以下命令生成报告:
  python wechat_manager.py report
{BOLD}══════════════════════════════════════════════════════════════{RESET}
""")


if __name__ == "__main__":
    main()

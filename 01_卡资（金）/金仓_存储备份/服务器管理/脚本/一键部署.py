#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
一键部署脚本
============
用途：根据配置文件一键部署Node项目到宝塔服务器

使用方法：
python3 一键部署.py 项目名称 本地项目路径

示例：
python3 一键部署.py soul /Users/karuo/Documents/开发/3、自营项目/一场soul的创业实验
"""

import sys
import os
import subprocess
import time

# 默认服务器配置
默认配置 = {
    "服务器IP": "42.194.232.22",
    "SSH用户": "root",
    "SSH密码": "Zhiqun1984",
    "服务器根目录": "/www/wwwroot"
}

def 执行命令(命令: str, 显示输出: bool = True) -> tuple:
    """执行shell命令"""
    result = subprocess.run(命令, shell=True, capture_output=True, text=True)
    if 显示输出 and result.stdout:
        print(result.stdout)
    if result.stderr and "Warning" not in result.stderr:
        print(f"错误: {result.stderr}")
    return result.returncode, result.stdout

def 部署项目(项目名称: str, 本地路径: str):
    """执行部署流程"""
    服务器路径 = f"{默认配置['服务器根目录']}/{项目名称}"
    压缩文件 = f"/tmp/{项目名称}_update.tar.gz"
    
    print(f"\n{'='*60}")
    print(f"开始部署: {项目名称}")
    print(f"本地路径: {本地路径}")
    print(f"服务器路径: {服务器路径}")
    print(f"{'='*60}\n")
    
    # 步骤1: 压缩项目
    print("📦 步骤1: 压缩项目文件...")
    排除项 = "--exclude='node_modules' --exclude='.next' --exclude='.git' --exclude='android' --exclude='out'"
    压缩命令 = f"cd '{本地路径}' && tar {排除项} -czf {压缩文件} ."
    code, _ = 执行命令(压缩命令, False)
    if code != 0:
        print("❌ 压缩失败")
        return False
    
    # 获取文件大小
    大小 = os.path.getsize(压缩文件) / 1024 / 1024
    print(f"   ✅ 压缩完成，大小: {大小:.2f} MB")
    
    # 步骤2: 上传到服务器
    print("\n📤 步骤2: 上传到服务器...")
    上传命令 = f"sshpass -p '{默认配置['SSH密码']}' scp -o StrictHostKeyChecking=no {压缩文件} {默认配置['SSH用户']}@{默认配置['服务器IP']}:/tmp/"
    code, _ = 执行命令(上传命令, False)
    if code != 0:
        print("❌ 上传失败")
        return False
    print("   ✅ 上传完成")
    
    # 步骤3-6: SSH远程执行
    print("\n🔧 步骤3-6: 服务器端操作...")
    
    SSH前缀 = f"sshpass -p '{默认配置['SSH密码']}' ssh -o StrictHostKeyChecking=no {默认配置['SSH用户']}@{默认配置['服务器IP']}"
    
    # 清理旧文件
    清理命令 = f"{SSH前缀} 'cd {服务器路径} && rm -rf app components lib public styles *.json *.js *.ts *.mjs *.md .next 2>/dev/null || true'"
    执行命令(清理命令, False)
    print("   ✅ 清理旧文件")
    
    # 解压
    解压命令 = f"{SSH前缀} 'cd {服务器路径} && tar -xzf /tmp/{项目名称}_update.tar.gz'"
    执行命令(解压命令, False)
    print("   ✅ 解压新代码")
    
    # 安装依赖
    print("\n📚 安装依赖 (这可能需要几分钟)...")
    安装命令 = f"{SSH前缀} 'cd {服务器路径} && pnpm install 2>&1'"
    执行命令(安装命令, True)
    
    # 构建
    print("\n🏗️  构建项目...")
    构建命令 = f"{SSH前缀} 'cd {服务器路径} && pnpm run build 2>&1'"
    执行命令(构建命令, True)
    
    # 清理临时文件
    清理临时命令 = f"{SSH前缀} 'rm -f /tmp/{项目名称}_update.tar.gz'"
    执行命令(清理临时命令, False)
    os.remove(压缩文件)
    
    print(f"\n{'='*60}")
    print("✅ 部署完成！")
    print(f"{'='*60}")
    print("\n⚠️  请在宝塔面板手动重启项目：")
    print(f"   1. 登录 https://42.194.232.22:9988/ckbpanel")
    print(f"   2. 进入【网站】→【Node项目】")
    print(f"   3. 找到 {项目名称}，点击【重启】")
    
    return True

def main():
    if len(sys.argv) < 3:
        print("用法: python3 一键部署.py <项目名称> <本地项目路径>")
        print("\n示例:")
        print("  python3 一键部署.py soul /Users/karuo/Documents/开发/3、自营项目/一场soul的创业实验")
        print("  python3 一键部署.py kr_wb /Users/karuo/Documents/开发/4、小工具/whiteboard")
        sys.exit(1)
    
    项目名称 = sys.argv[1]
    本地路径 = sys.argv[2]
    
    if not os.path.exists(本地路径):
        print(f"❌ 本地路径不存在: {本地路径}")
        sys.exit(1)
    
    确认 = input(f"\n确认部署 {项目名称} 到服务器? (y/n): ")
    if 确认.lower() != 'y':
        print("已取消部署")
        sys.exit(0)
    
    部署项目(项目名称, 本地路径)

if __name__ == "__main__":
    main()

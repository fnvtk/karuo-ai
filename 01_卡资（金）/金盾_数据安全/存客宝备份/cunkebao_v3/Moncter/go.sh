#!/bin/bash
set -euo pipefail  # 严格模式：报错立即退出、禁止未定义变量、管道错误触发退出

# ================= 配置项（可根据实际情况修改）=================
# PHP 脚本路径（相对路径/绝对路径均可，推荐绝对路径更稳定）
PHP_SCRIPT="start.php"
# PHP 解释器路径（默认自动查找，若提示 php 未找到，手动指定如 /usr/bin/php）
PHP_BIN=$(which php || echo "/usr/bin/php")
# ==============================================================

# 1. 检查 PHP 解释器是否存在且可执行
if [ ! -x "$PHP_BIN" ]; then
    echo -e "\033[31m错误：未找到可执行的 PHP 解释器！\033[0m"
    echo "  解决方案："
    echo "    1. 安装 PHP：sudo apt install php-cli（Ubuntu/Debian）或 sudo dnf install php-cli（CentOS/RHEL）"
    echo "    2. 若已安装，手动修改脚本中的 PHP_BIN 为实际路径（通过 which php 查询）"
    exit 1
fi

# 2. 检查 PHP 脚本是否存在
if [ ! -f "$PHP_SCRIPT" ]; then
    echo -e "\033[31m错误：未找到脚本文件 $PHP_SCRIPT！\033[0m"
    echo "  请确保脚本与 $PHP_SCRIPT 在同一目录，或修改脚本中的 PHP_SCRIPT 为绝对路径"
    exit 1
fi

# 3. 给 PHP 脚本添加执行权限（自动修复权限问题）
if [ ! -x "$PHP_SCRIPT" ]; then
    echo -e "\033[33m警告：$PHP_SCRIPT 缺少执行权限，正在自动添加...\033[0m"
    chmod u+x "$PHP_SCRIPT" || {
        echo -e "\033[31m错误：添加执行权限失败，请用 sudo 运行脚本！\033[0m"
        exit 1
    }
fi

# 4. 执行核心命令（带日志输出优化）
echo -e "\033[32m=== 开始执行：$PHP_BIN $PHP_SCRIPT start ===\033[0m"
$PHP_BIN "$PHP_SCRIPT" start

# 5. 执行结果判断
if [ $? -eq 0 ]; then
    echo -e "\033[32m=== 执行成功！===\033[0m"
else
    echo -e "\033[31m=== 执行失败！请查看上方错误信息 ===\033[0m"
    exit 1
fi
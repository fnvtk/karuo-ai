@echo off
chcp 65001 >nul 2>&1
title 卡若AI · 远程环境一键部署

echo.
echo   ========================================
echo     卡若AI · 远程环境一键部署
echo     Clash Verge Rev + Cursor
echo   ========================================
echo.

:: 检查管理员权限
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo   需要管理员权限，正在请求提升...
    echo.
    powershell -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)

:: 执行 PowerShell 部署脚本
powershell -ExecutionPolicy Bypass -NoProfile -File "%~dp0deploy_windows.ps1"

if %errorLevel% neq 0 (
    echo.
    echo   [!] 脚本执行出现错误，错误码: %errorLevel%
    echo.
)

pause

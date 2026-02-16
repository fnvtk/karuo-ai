@echo off
REM Moncter MCP Server 安装脚本 (Windows)

echo 正在安装 Moncter MCP Server...

REM 检查 Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo 错误: 未找到 Node.js，请先安装 Node.js (^>= 18^)
    exit /b 1
)

REM 安装依赖
echo 安装依赖...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo 错误: npm install 失败
    exit /b 1
)

REM 编译 TypeScript
echo 编译 TypeScript...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo 错误: 编译失败
    exit /b 1
)

echo.
echo ✅ Moncter MCP Server 安装成功！
echo.
echo 使用说明：
echo 1. 确保后端服务运行在 http://127.0.0.1:8787
echo 2. 配置 MCP 客户端，添加 Moncter MCP 服务器
echo 3. 查看 MCP/MCP服务器使用说明.md 了解详细用法
echo.

pause


<#
.SYNOPSIS
    卡若AI · 远程环境一键部署脚本 (Windows)
.DESCRIPTION
    自动安装 Clash Verge Rev (代理) + Cursor (AI编辑器) + Docker Desktop (容器)
    并配置代理订阅、Cursor 账号、Docker 国内镜像和 Linux 容器环境
.NOTES
    版本: 1.0
    日期: 2026-02-14
    所属: 金盾 · 远程环境一键部署
#>

#Requires -Version 5.1

$ErrorActionPreference = "Continue"
$ProgressPreference = "SilentlyContinue"

# ==================== 配置 ====================
$SUBSCRIPTION_URL = "https://api.v6v.eu/api/v1/client/subscribe?token=371fe0545c77e4d9efdf2906a865e403"
$CURSOR_EMAIL     = "WilliamAtkins4153@outlook.com"
$CURSOR_PASSWORD  = "?056uXrtaWKQ"
$TEMP_DIR         = "$env:TEMP\karuo_deploy"
$CLASH_PROXY_PORT = 7897
$CLASH_API_PORT   = 9090

# ==================== 工具函数 ====================
function Write-Banner {
    Write-Host ""
    Write-Host "  ╔══════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "  ║                                          ║" -ForegroundColor Cyan
    Write-Host "  ║    卡若AI · 远程环境一键部署 v1.0        ║" -ForegroundColor Cyan
    Write-Host "  ║                                          ║" -ForegroundColor Cyan
    Write-Host "  ║    [1] Clash Verge Rev  代理客户端       ║" -ForegroundColor Cyan
    Write-Host "  ║    [2] Cursor           AI 编辑器        ║" -ForegroundColor Cyan
    Write-Host "  ║    [3] Docker Desktop   容器平台         ║" -ForegroundColor Cyan
    Write-Host "  ║    [4] Ubuntu Linux     开发环境         ║" -ForegroundColor Cyan
    Write-Host "  ║                                          ║" -ForegroundColor Cyan
    Write-Host "  ╚══════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
}

function Write-Step {
    param([string]$Step, [string]$Message)
    Write-Host "`n  [$Step] $Message" -ForegroundColor Yellow
}

function Write-Ok {
    param([string]$Message)
    Write-Host "    [OK] $Message" -ForegroundColor Green
}

function Write-Err {
    param([string]$Message)
    Write-Host "    [ERR] $Message" -ForegroundColor Red
}

function Write-Info {
    param([string]$Message)
    Write-Host "    -> $Message" -ForegroundColor Gray
}

function Test-AdminPrivilege {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($identity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Download-File {
    param(
        [string]$Url,
        [string]$OutFile,
        [string]$Description,
        [string]$ProxyUrl = $null
    )
    Write-Info "正在下载 $Description ..."
    try {
        $params = @{
            Uri = $Url
            OutFile = $OutFile
            UseBasicParsing = $true
            TimeoutSec = 600
        }
        if ($ProxyUrl) {
            $params.Proxy = $ProxyUrl
        }
        Invoke-WebRequest @params
        Write-Ok "下载完成"
        return $true
    } catch {
        Write-Err "下载失败: $($_.Exception.Message)"
        return $false
    }
}

function Find-ClashExe {
    $paths = @(
        "$env:LOCALAPPDATA\Clash Verge\Clash Verge.exe",
        "C:\Program Files\Clash Verge\Clash Verge.exe",
        "$env:LOCALAPPDATA\Programs\clash-verge\Clash Verge.exe",
        "$env:PROGRAMFILES\Clash Verge\Clash Verge.exe"
    )
    foreach ($p in $paths) {
        if (Test-Path $p) { return $p }
    }
    # 搜索桌面快捷方式
    $shortcut = Get-ChildItem "$env:APPDATA\Microsoft\Windows\Start Menu\Programs" -Filter "*Clash Verge*" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($shortcut) {
        $shell = New-Object -ComObject WScript.Shell
        $target = $shell.CreateShortcut($shortcut.FullName).TargetPath
        if (Test-Path $target) { return $target }
    }
    return $null
}

function Find-CursorExe {
    $paths = @(
        "$env:LOCALAPPDATA\Programs\cursor\Cursor.exe",
        "C:\Program Files\Cursor\Cursor.exe",
        "$env:LOCALAPPDATA\cursor\Cursor.exe"
    )
    foreach ($p in $paths) {
        if (Test-Path $p) { return $p }
    }
    return $null
}

# ==================== 主流程 ====================
Write-Banner

# 检查管理员权限
if (-not (Test-AdminPrivilege)) {
    Write-Host "  [!] 建议以管理员身份运行以获得最佳体验" -ForegroundColor Yellow
    Write-Host "      当前以普通用户运行，部分操作可能受限" -ForegroundColor Gray
    Write-Host ""
}

# 创建临时目录
New-Item -ItemType Directory -Force -Path $TEMP_DIR | Out-Null
Write-Info "临时目录: $TEMP_DIR"

$startTime = Get-Date

# ============================================================
# Step 1: 下载 Clash Verge Rev
# ============================================================
Write-Step "1/8" "下载 Clash Verge Rev (代理客户端)"

$clashExe = Find-ClashExe

if ($clashExe) {
    Write-Ok "Clash Verge Rev 已安装: $clashExe"
} else {
    Write-Info "从 GitHub 获取最新版本..."

    $clashInstaller = $null
    try {
        $headers = @{ "User-Agent" = "karuo-deploy/1.0" }
        $release = Invoke-RestMethod -Uri "https://api.github.com/repos/clash-verge-rev/clash-verge-rev/releases/latest" -Headers $headers -TimeoutSec 30

        $asset = $release.assets | Where-Object {
            $_.name -match "Clash\.Verge.*x64.*setup\.exe$" -or
            $_.name -match "Clash\.Verge.*x64-setup\.exe$"
        } | Select-Object -First 1

        if (-not $asset) {
            $asset = $release.assets | Where-Object {
                $_.name -match "x64" -and $_.name -match "\.exe$"
            } | Select-Object -First 1
        }

        if ($asset) {
            Write-Info "版本: $($release.tag_name) | 文件: $($asset.name)"
            $clashInstaller = "$TEMP_DIR\$($asset.name)"

            if (-not (Test-Path $clashInstaller)) {
                $downloaded = Download-File -Url $asset.browser_download_url -OutFile $clashInstaller -Description "Clash Verge Rev"
                if (-not $downloaded) {
                    # 尝试镜像
                    Write-Info "尝试镜像下载..."
                    $mirrorUrl = "https://mirror.ghproxy.com/$($asset.browser_download_url)"
                    Download-File -Url $mirrorUrl -OutFile $clashInstaller -Description "Clash Verge Rev (镜像)" | Out-Null
                }
            } else {
                Write-Ok "安装包已存在，跳过下载"
            }
        }
    } catch {
        Write-Err "GitHub API 请求失败: $($_.Exception.Message)"
    }

    # 如果还是没下到，给手动链接
    if (-not $clashInstaller -or -not (Test-Path $clashInstaller)) {
        Write-Err "自动下载失败"
        Write-Info "请手动下载: https://github.com/clash-verge-rev/clash-verge-rev/releases"
        Write-Info "下载 x64-setup.exe 文件，放入 $TEMP_DIR 后重新运行本脚本"
        Write-Host ""
        Write-Host "  按任意键跳过 Clash 安装继续..." -ForegroundColor Gray
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    }
}

# ============================================================
# Step 2: 安装 Clash Verge Rev
# ============================================================
Write-Step "2/8" "安装 Clash Verge Rev"

if (Find-ClashExe) {
    Write-Ok "已安装，跳过"
} elseif ($clashInstaller -and (Test-Path $clashInstaller)) {
    Write-Info "静默安装中（约30秒）..."
    try {
        $proc = Start-Process -FilePath $clashInstaller -ArgumentList "/S" -PassThru -Wait -ErrorAction Stop
        Start-Sleep -Seconds 5

        $clashExe = Find-ClashExe
        if ($clashExe) {
            Write-Ok "安装成功: $clashExe"
        } else {
            Write-Err "安装完成但未找到可执行文件，尝试非静默安装..."
            Start-Process -FilePath $clashInstaller -Wait
            $clashExe = Find-ClashExe
            if ($clashExe) { Write-Ok "安装成功" }
        }
    } catch {
        Write-Err "安装失败: $($_.Exception.Message)"
    }
} else {
    Write-Info "跳过安装（未下载到安装包）"
}

# ============================================================
# Step 3: 配置代理订阅
# ============================================================
Write-Step "3/8" "配置代理订阅"

# Clash Verge Rev 配置目录
$configDirCandidates = @(
    "$env:APPDATA\io.github.clash-verge-rev.clash-verge-rev",
    "$env:APPDATA\clash-verge",
    "$env:LOCALAPPDATA\clash-verge"
)

$clashConfigDir = $null
foreach ($dir in $configDirCandidates) {
    if (Test-Path $dir) {
        $clashConfigDir = $dir
        break
    }
}

if (-not $clashConfigDir) {
    # 默认创建在标准位置
    $clashConfigDir = "$env:APPDATA\io.github.clash-verge-rev.clash-verge-rev"
}

New-Item -ItemType Directory -Force -Path $clashConfigDir | Out-Null
New-Item -ItemType Directory -Force -Path "$clashConfigDir\profiles" | Out-Null

Write-Info "配置目录: $clashConfigDir"

# 写入 profiles.yaml
$profileUid = [long](Get-Date -UFormat %s) * 1000
$profilesContent = @"
current: $profileUid
chain: []
valid:
  - $profileUid
items:
  - uid: $profileUid
    type: remote
    name: "KaruoAI Proxy"
    desc: "Auto Deploy"
    url: "$SUBSCRIPTION_URL"
    option:
      update_interval: 86400
      with_proxy: false
    updated: 0
"@

Set-Content -Path "$clashConfigDir\profiles.yaml" -Value $profilesContent -Encoding UTF8 -Force
Write-Ok "订阅配置已写入 profiles.yaml"

# 写入 verge.yaml（启用系统代理 + 自启动）
$vergeContent = @"
enable_system_proxy: true
enable_auto_launch: true
system_proxy_bypass: localhost;127.*;192.168.*;10.*;172.16.*;<local>
clash_core: mihomo
theme_mode: system
"@

$vergePath = "$clashConfigDir\verge.yaml"
if (-not (Test-Path $vergePath)) {
    Set-Content -Path $vergePath -Value $vergeContent -Encoding UTF8 -Force
    Write-Ok "代理设置已写入 verge.yaml"
} else {
    Write-Info "verge.yaml 已存在，保留原配置"
}

# ============================================================
# Step 4: 启动 Clash 并验证网络
# ============================================================
Write-Step "4/8" "启动代理并验证网络"

$clashExe = Find-ClashExe
if ($clashExe) {
    # 先关闭已有的进程
    Get-Process -Name "Clash Verge" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2

    Write-Info "启动 Clash Verge Rev..."
    Start-Process -FilePath $clashExe
    Write-Info "等待代理初始化..."

    $proxyReady = $false
    $proxyUrl = "http://127.0.0.1:$CLASH_PROXY_PORT"

    for ($i = 1; $i -le 12; $i++) {
        Start-Sleep -Seconds 5
        try {
            $response = Invoke-WebRequest -Uri "https://www.google.com" -TimeoutSec 5 -UseBasicParsing -Proxy $proxyUrl -ErrorAction Stop
            if ($response.StatusCode -eq 200) {
                $proxyReady = $true
                break
            }
        } catch {
            Write-Host "    ." -NoNewline -ForegroundColor Gray
        }
    }
    Write-Host ""

    if ($proxyReady) {
        Write-Ok "代理已就绪，Google 访问正常"
    } else {
        Write-Err "代理初始化超时（60秒）"
        Write-Info "请手动操作："
        Write-Info "  1. 打开 Clash Verge Rev"
        Write-Info "  2. 点击 Profiles → 更新订阅"
        Write-Info "  3. 选择一个节点"
        Write-Info "  4. 开启 System Proxy"
        Write-Host ""
        Write-Host "  代理就绪后按任意键继续..." -ForegroundColor Gray
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    }
} else {
    Write-Err "未找到 Clash Verge Rev"
    Write-Info "跳过代理启动，后续步骤可能因网络问题失败"
}

# ============================================================
# Step 5: 下载并安装 Cursor
# ============================================================
Write-Step "5/8" "下载并安装 Cursor (AI 编辑器)"

$cursorExe = Find-CursorExe

if ($cursorExe) {
    Write-Ok "Cursor 已安装: $cursorExe"
} else {
    $cursorUrl = "https://downloader.cursor.sh/windows/nsis/x64"
    $cursorInstaller = "$TEMP_DIR\CursorSetup.exe"

    $downloadParams = @{
        Url = $cursorUrl
        OutFile = $cursorInstaller
        Description = "Cursor"
    }

    # 如果代理可用，通过代理下载
    if ($proxyReady) {
        $downloadParams.ProxyUrl = "http://127.0.0.1:$CLASH_PROXY_PORT"
    }

    $downloaded = Download-File @downloadParams

    if ($downloaded) {
        Write-Info "正在安装 Cursor..."
        try {
            Start-Process -FilePath $cursorInstaller -Wait
            Start-Sleep -Seconds 5

            $cursorExe = Find-CursorExe
            if ($cursorExe) {
                Write-Ok "Cursor 安装成功"
            } else {
                Write-Info "请在安装向导中完成安装"
            }
        } catch {
            Write-Err "安装异常: $($_.Exception.Message)"
        }
    } else {
        Write-Err "Cursor 下载失败"
        Write-Info "请手动下载: https://www.cursor.com/downloads"
    }
}

# ============================================================
# Step 6: 保存 Cursor 登录信息
# ============================================================
Write-Step "6/8" "保存 Cursor 登录信息"

$desktopPath = [Environment]::GetFolderPath("Desktop")
$credFile = "$desktopPath\Cursor登录信息.txt"

$credContent = @"
================================================
  Cursor 登录信息
  由 卡若AI 自动部署生成
  $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
================================================

  邮箱:  $CURSOR_EMAIL
  密码:  $CURSOR_PASSWORD

  使用方法:
  1. 打开 Cursor
  2. 点击左下角齿轮 → Sign In
  3. 选择 Email 登录
  4. 输入上述邮箱和密码
  5. 登录成功后请立即删除此文件

================================================
  !! 安全提示: 登录完成后请立即删除此文件 !!
================================================
"@

Set-Content -Path $credFile -Value $credContent -Encoding UTF8 -Force
Write-Ok "登录信息已保存到桌面: Cursor登录信息.txt"

# ============================================================
# Step 7: 安装 Docker Desktop + 配置国内镜像
# ============================================================
Write-Step "7/8" "安装 Docker Desktop + 配置国内镜像"

$dockerInstalled = $false
if (Get-Command "docker" -ErrorAction SilentlyContinue) {
    $dockerInstalled = $true
    Write-Ok "Docker 已安装: $(docker --version 2>$null)"
} elseif (Test-Path "C:\Program Files\Docker\Docker\Docker Desktop.exe") {
    $dockerInstalled = $true
    Write-Ok "Docker Desktop 已安装"
}

if (-not $dockerInstalled) {
    # 检查并启用 WSL2
    Write-Info "检查 WSL2..."
    $wslStatus = wsl --status 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Info "启用 WSL2（可能需要重启）..."
        try {
            wsl --install --no-distribution 2>$null
            Write-Ok "WSL2 已启用"
        } catch {
            Write-Info "WSL2 启用可能需要手动重启后完成"
        }
    } else {
        Write-Ok "WSL2 已就绪"
    }

    # 下载 Docker Desktop
    $dockerUrl = "https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe"
    $dockerInstaller = "$TEMP_DIR\DockerDesktopInstaller.exe"

    $downloadParams = @{
        Url = $dockerUrl
        OutFile = $dockerInstaller
        Description = "Docker Desktop"
    }
    if ($proxyReady) {
        $downloadParams.ProxyUrl = "http://127.0.0.1:$CLASH_PROXY_PORT"
    }

    $downloaded = Download-File @downloadParams

    if ($downloaded) {
        Write-Info "静默安装 Docker Desktop（约2-3分钟）..."
        try {
            Start-Process -FilePath $dockerInstaller -ArgumentList "install", "--quiet", "--accept-license" -Wait
            Start-Sleep -Seconds 10
            Write-Ok "Docker Desktop 安装完成"
            $dockerInstalled = $true
        } catch {
            Write-Err "Docker Desktop 安装失败: $($_.Exception.Message)"
            Write-Info "请手动安装: https://www.docker.com/products/docker-desktop/"
        }
    }
}

# 配置国内镜像加速
Write-Info "配置 Docker 国内镜像加速..."
$dockerConfigDir = "$env:USERPROFILE\.docker"
New-Item -ItemType Directory -Force -Path $dockerConfigDir | Out-Null

$daemonJsonPath = "$dockerConfigDir\daemon.json"
$mirrorConfig = @{
    "registry-mirrors" = @(
        "https://mirror.ccs.tencentyun.com",
        "https://docker.mirrors.ustc.edu.cn",
        "https://hub-mirror.c.163.com",
        "https://registry.docker-cn.com"
    )
} | ConvertTo-Json -Depth 3

# 如果已有 daemon.json，合并 registry-mirrors
if (Test-Path $daemonJsonPath) {
    try {
        $existing = Get-Content $daemonJsonPath -Raw | ConvertFrom-Json
        if (-not $existing."registry-mirrors") {
            $existing | Add-Member -NotePropertyName "registry-mirrors" -NotePropertyValue @(
                "https://mirror.ccs.tencentyun.com",
                "https://docker.mirrors.ustc.edu.cn",
                "https://hub-mirror.c.163.com",
                "https://registry.docker-cn.com"
            )
            $existing | ConvertTo-Json -Depth 3 | Set-Content $daemonJsonPath -Encoding UTF8 -Force
            Write-Ok "已合并国内镜像到现有 daemon.json"
        } else {
            Write-Info "daemon.json 已有镜像配置，保留原设置"
        }
    } catch {
        Set-Content -Path $daemonJsonPath -Value $mirrorConfig -Encoding UTF8 -Force
        Write-Ok "国内镜像配置已写入 daemon.json"
    }
} else {
    Set-Content -Path $daemonJsonPath -Value $mirrorConfig -Encoding UTF8 -Force
    Write-Ok "国内镜像配置已写入 daemon.json"
}

# 启动 Docker Desktop
if ($dockerInstalled) {
    $dockerDesktopExe = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    if (Test-Path $dockerDesktopExe) {
        Write-Info "启动 Docker Desktop..."
        Start-Process -FilePath $dockerDesktopExe

        Write-Info "等待 Docker 引擎就绪（最多120秒）..."
        $dockerReady = $false
        for ($i = 1; $i -le 24; $i++) {
            Start-Sleep -Seconds 5
            try {
                $dockerInfo = docker info 2>&1
                if ($LASTEXITCODE -eq 0) {
                    $dockerReady = $true
                    break
                }
            } catch {}
            Write-Host "    ." -NoNewline -ForegroundColor Gray
        }
        Write-Host ""

        if ($dockerReady) {
            Write-Ok "Docker 引擎已就绪"
        } else {
            Write-Err "Docker 引擎启动超时"
            Write-Info "请手动启动 Docker Desktop，启动后重新运行本脚本即可继续"
        }
    }
}

# ============================================================
# Step 8: 部署 Linux 开发容器
# ============================================================
Write-Step "8/8" "部署 Linux 开发容器"

$dockerReady = $false
try {
    docker info 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) { $dockerReady = $true }
} catch {}

if ($dockerReady) {
    # --- Ubuntu Linux 容器 ---
    Write-Info "拉取 Ubuntu 22.04 镜像..."
    docker pull ubuntu:22.04 2>&1 | ForEach-Object { Write-Host "    $_" -ForegroundColor Gray }

    # 检查容器是否已存在
    $existingContainer = docker ps -a --filter "name=karuo-linux" --format "{{.Names}}" 2>$null
    if ($existingContainer -eq "karuo-linux") {
        Write-Info "容器 karuo-linux 已存在，重新创建..."
        docker rm -f karuo-linux 2>$null | Out-Null
    }

    Write-Info "创建 Ubuntu 开发容器..."
    docker run -d `
        --name karuo-linux `
        --hostname karuo-dev `
        -v karuo-workspace:/workspace `
        --restart unless-stopped `
        ubuntu:22.04 `
        tail -f /dev/null

    Write-Info "安装开发工具（git/curl/python3/node/vim）..."
    # 配置国内 apt 源 + 安装工具
    docker exec karuo-linux bash -c @'
        # 替换为清华 apt 源（国内加速）
        cat > /etc/apt/sources.list << 'APTEOF'
deb https://mirrors.tuna.tsinghua.edu.cn/ubuntu/ jammy main restricted universe multiverse
deb https://mirrors.tuna.tsinghua.edu.cn/ubuntu/ jammy-updates main restricted universe multiverse
deb https://mirrors.tuna.tsinghua.edu.cn/ubuntu/ jammy-security main restricted universe multiverse
APTEOF
        apt-get update -qq && \
        DEBIAN_FRONTEND=noninteractive apt-get install -y -qq \
            curl wget git vim nano \
            python3 python3-pip \
            nodejs npm \
            build-essential \
            openssh-server \
            htop net-tools iputils-ping \
            locales && \
        locale-gen en_US.UTF-8 && \
        echo "alias ll='ls -la'" >> /root/.bashrc && \
        echo "export LANG=en_US.UTF-8" >> /root/.bashrc && \
        echo "开发环境初始化完成"
'@

    if ($LASTEXITCODE -eq 0) {
        Write-Ok "Ubuntu Linux 容器已就绪"
    } else {
        Write-Err "容器初始化部分失败，但容器已创建"
    }

    # --- macOS 容器（仅提供说明）---
    Write-Host ""
    Write-Info "关于 macOS 容器："
    Write-Info "  macOS Docker 容器需要 KVM 虚拟化支持（仅 Linux 宿主机）"
    Write-Info "  Windows 上推荐使用 VMware/UTM 运行 macOS 虚拟机"
    Write-Info "  如需在 Linux 服务器上运行 macOS 容器："
    Write-Info "    docker pull sickcodes/docker-osx:auto"
    Write-Info "    docker run -it --device /dev/kvm sickcodes/docker-osx:auto"

    # 输出容器使用说明
    Write-Host ""
    Write-Info "=== 容器使用方法 ==="
    Write-Info "进入 Linux:  docker exec -it karuo-linux bash"
    Write-Info "停止容器:    docker stop karuo-linux"
    Write-Info "启动容器:    docker start karuo-linux"
    Write-Info "工作目录:    容器内 /workspace（持久化存储）"

} else {
    Write-Err "Docker 未就绪，跳过容器部署"
    Write-Info "请先启动 Docker Desktop，然后运行以下命令手动部署："
    Write-Info "  docker pull ubuntu:22.04"
    Write-Info "  docker run -d --name karuo-linux --hostname karuo-dev -v karuo-workspace:/workspace --restart unless-stopped ubuntu:22.04 tail -f /dev/null"
}

# ============================================================
# 完成总结
# ============================================================
$elapsed = [math]::Round(((Get-Date) - $startTime).TotalMinutes, 1)

Write-Host ""
Write-Host "  ╔══════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "  ║         部 署 完 成 !                    ║" -ForegroundColor Green
Write-Host "  ╚══════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "  已安装软件:" -ForegroundColor Cyan
Write-Host "    [1] Clash Verge Rev - 代理客户端（订阅已配置）"
Write-Host "    [2] Cursor          - AI 编辑器"
Write-Host "    [3] Docker Desktop  - 容器平台（国内镜像已配置）"
Write-Host "    [4] Ubuntu Linux    - 开发容器 (karuo-linux)"
Write-Host ""
Write-Host "  Cursor 登录信息:" -ForegroundColor Cyan
Write-Host "    邮箱: $CURSOR_EMAIL"
Write-Host "    密码: $CURSOR_PASSWORD"
Write-Host ""
Write-Host "  Docker 容器:" -ForegroundColor Cyan
Write-Host "    进入 Linux:  docker exec -it karuo-linux bash"
Write-Host "    工作目录:    /workspace（持久化）"
Write-Host ""
Write-Host "  [!] 请登录 Cursor 后删除桌面上的 Cursor登录信息.txt" -ForegroundColor Yellow
Write-Host "  耗时: $elapsed 分钟" -ForegroundColor Gray
Write-Host ""

# 清理提示
$cleanup = Read-Host "  是否清理临时下载文件？(Y/N)"
if ($cleanup -eq "Y" -or $cleanup -eq "y") {
    Remove-Item -Path $TEMP_DIR -Recurse -Force -ErrorAction SilentlyContinue
    Write-Ok "临时文件已清理"
}

Write-Host ""
Write-Host "  按任意键退出..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

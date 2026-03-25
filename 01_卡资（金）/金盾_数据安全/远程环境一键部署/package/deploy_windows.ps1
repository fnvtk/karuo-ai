<# 
Windows 一键部署：安装 Feishu + OpenClaw，并写入龙猫配置。
要求：先设置环境变量
  FEISHU_APP_ID, FEISHU_APP_SECRET, OPENCLAW_BASE_URL, OPENCLAW_API_KEY
可选：
  OPENCLAW_MODEL_PROVIDER, OPENCLAW_MODEL_ID, FEISHU_TARGET_CHAT_ID
#>

#Requires -Version 5.1
$ErrorActionPreference = "Stop"

function Require-Env($name) {
  if (-not $env:$name) { throw "缺少环境变量: $name" }
}

Write-Host "== 卡若AI Feishu+龙虾 一键部署 (Windows) =="
Require-Env "FEISHU_APP_ID"
Require-Env "FEISHU_APP_SECRET"
Require-Env "OPENCLAW_BASE_URL"
Require-Env "OPENCLAW_API_KEY"

if (-not $env:OPENCLAW_MODEL_PROVIDER) { $env:OPENCLAW_MODEL_PROVIDER = "api123-icu" }
if (-not $env:OPENCLAW_MODEL_ID) { $env:OPENCLAW_MODEL_ID = "claude-sonnet-4-5-20250929" }

if (Get-Command winget -ErrorAction SilentlyContinue) {
  winget install --id ByteDance.Lark -e --accept-package-agreements --accept-source-agreements | Out-Null
} else {
  Write-Warning "未检测到 winget，请手动安装飞书(Lark)"
}

npm config set prefix "$env:USERPROFILE\.local\share\npm-global"
npm install -g openclaw@latest | Out-Null
$openclaw = "$env:USERPROFILE\.local\share\npm-global\openclaw.cmd"
if (-not (Test-Path $openclaw)) { throw "OpenClaw 安装失败：$openclaw 不存在" }

$cfgDir = Join-Path $env:USERPROFILE ".openclaw"
New-Item -ItemType Directory -Force -Path $cfgDir | Out-Null
$cfgPath = Join-Path $cfgDir "openclaw.json"
if (-not (Test-Path $cfgPath)) { "{}" | Set-Content -Path $cfgPath -Encoding UTF8 }

$raw = Get-Content $cfgPath -Raw
if (-not $raw.Trim()) { $raw = "{}" }
$cfg = $raw | ConvertFrom-Json -Depth 30
if (-not $cfg) { $cfg = @{} }

if (-not $cfg.channels) { $cfg | Add-Member -Name channels -MemberType NoteProperty -Value @{} }
if (-not $cfg.channels.feishu) { $cfg.channels.feishu = @{} }

$acc = @{
  enabled = $true
  appId = $env:FEISHU_APP_ID
  appSecret = $env:FEISHU_APP_SECRET
  botName = "龙猫"
  domain = "feishu"
  dmPolicy = "open"
  groupPolicy = "open"
  allowFrom = @("*")
  groupAllowFrom = @("*")
  groups = @{ "*" = @{ requireMention = $false } }
}

$cfg.channels.feishu.enabled = $true
$cfg.channels.feishu.accountId = "longmao"
$cfg.channels.feishu.accounts = @{ longmao = $acc }

$provider = $env:OPENCLAW_MODEL_PROVIDER
$modelId = $env:OPENCLAW_MODEL_ID
$cfg.models = @{
  providers = @{
    $provider = @{
      api = "anthropic-messages"
      baseUrl = $env:OPENCLAW_BASE_URL
      apiKey = $env:OPENCLAW_API_KEY
      models = @(@{ id = $modelId; name = "$modelId ($provider)" })
    }
  }
}
$cfg.agents = @{
  defaults = @{
    model = @{ primary = "$provider/$modelId"; fallbacks = @() }
    models = @(@{ alias = "default"; provider = $provider; model = $modelId })
  }
}
$cfg.plugins = @{ allow = @("feishu") }

$backup = Join-Path $cfgDir ("openclaw.json.bak.deploy_" + (Get-Date -Format "yyyyMMdd_HHmmss"))
Copy-Item $cfgPath $backup -Force
($cfg | ConvertTo-Json -Depth 30) | Set-Content -Path $cfgPath -Encoding UTF8
Write-Host "[OK] 配置已写入: $cfgPath"

& $openclaw gateway restart
Start-Sleep -Seconds 2
& $openclaw channels status --probe --json

if ($env:FEISHU_TARGET_CHAT_ID) {
  & $openclaw message send `
    --channel feishu `
    --account longmao `
    --target $env:FEISHU_TARGET_CHAT_ID `
    --message "【龙猫】Windows 一键部署完成，当前机器已上线。"
}

Write-Host "[OK] 部署完成（Windows）"

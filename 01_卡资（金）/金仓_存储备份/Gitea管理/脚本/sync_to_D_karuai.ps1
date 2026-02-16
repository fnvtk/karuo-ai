$SourcePath = "Z:\Documents\个人\卡若AI"
$DestPath = "D:\卡若ai"
$MaxFileSizeMB = 1
$MaxFileSizeBytes = $MaxFileSizeMB * 1MB

$excludeDirs = @("_大文件外置", ".git", "__pycache__", ".venv", "node_modules", ".browser_state")

if (-not (Test-Path $DestPath)) {
    New-Item -ItemType Directory -Path $DestPath -Force | Out-Null
}

$stats = @{ Copied = 0; Skipped = 0; Errors = 0 }

Get-ChildItem -Path $SourcePath -Recurse -File | ForEach-Object {
    $relativePath = $_.FullName.Substring($SourcePath.Length)
    $destFile = Join-Path $DestPath $relativePath
    
    $skip = $false
    foreach ($dir in $excludeDirs) {
        if ($relativePath -like "*\$dir\*" -or $relativePath -like "*$dir*") {
            $skip = $true
            break
        }
    }
    
    if ($skip) {
        $stats.Skipped++
        return
    }
    
    if ($_.Length -gt $MaxFileSizeBytes) {
        $sizeMB = [math]::Round($_.Length/1MB, 2)
        Write-Host "[SKIP BIG FILE] $relativePath ($sizeMB MB)" -ForegroundColor Yellow
        $stats.Skipped++
        return
    }
    
    $destDir = Split-Path $destFile -Parent
    if (-not (Test-Path $destDir)) {
        New-Item -ItemType Directory -Path $destDir -Force | Out-Null
    }
    
    try {
        Copy-Item -Path $_.FullName -Destination $destFile -Force
        $stats.Copied++
    }
    catch {
        Write-Host "[ERROR] $relativePath" -ForegroundColor Red
        $stats.Errors++
    }
}

Write-Host ""
Write-Host "===== SYNC COMPLETE =====" -ForegroundColor Green
Write-Host "Copied: $($stats.Copied) files"
Write-Host "Skipped: $($stats.Skipped) files/dirs"
Write-Host "Errors: $($stats.Errors)"
误: $($stats.Errors) 个"

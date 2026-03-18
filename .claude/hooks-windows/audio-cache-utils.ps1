#
# File: .claude/hooks-windows/audio-cache-utils.ps1
#
# AgentVibes Audio Cache Utilities for Windows
#

param(
    [Parameter(Position = 0)]
    [ValidateSet('cleanup', 'stats', 'clear')]
    [string]$Command
)

# Detect project-local audio dir (same logic as TTS scripts)
$ScriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectClaudeDir = Join-Path (Split-Path -Parent (Split-Path -Parent $ScriptPath)) ".claude"
if (Test-Path $ProjectClaudeDir) {
    $AudioDir = "$ProjectClaudeDir\audio"
} else {
    $AudioDir = "$env:USERPROFILE\.claude\audio"
}

function Ensure-AudioDir {
    if (-not (Test-Path $AudioDir)) {
        New-Item -ItemType Directory -Path $AudioDir -Force | Out-Null
    }
}

function Get-AudioCacheSize {
    Ensure-AudioDir

    if (-not (Test-Path $AudioDir)) {
        return 0
    }

    $files = Get-ChildItem -Path $AudioDir -Filter "*.wav" -ErrorAction SilentlyContinue
    $totalSize = 0

    foreach ($file in $files) {
        $totalSize += $file.Length
    }

    return $totalSize
}

function Format-FileSize {
    param([long]$Size)

    if ($Size -lt 1KB) { return "$Size B" }
    if ($Size -lt 1MB) { return "{0:N2} KB" -f ($Size / 1KB) }
    if ($Size -lt 1GB) { return "{0:N2} MB" -f ($Size / 1MB) }
    return "{0:N2} GB" -f ($Size / 1GB)
}

function Get-CacheStats {
    Ensure-AudioDir

    $files = Get-ChildItem -Path $AudioDir -Filter "*.wav" -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum

    $count = if ($files.Count -eq $null) { 0 } else { $files.Count }
    $totalSize = if ($files.Sum -eq $null) { 0 } else { $files.Sum }

    return @{
        FileCount = $count
        TotalSize = $totalSize
        FormattedSize = Format-FileSize $totalSize
    }
}

function Clear-Cache {
    Ensure-AudioDir

    $files = Get-ChildItem -Path $AudioDir -Filter "*.wav" -ErrorAction SilentlyContinue

    if ($files.Count -eq 0) {
        Write-Host "[OK] Cache already empty" -ForegroundColor Green
        return
    }

    $stats = Get-CacheStats
    Write-Host "[CLEANUP] Clearing $($stats.FileCount) audio files ($($stats.FormattedSize))" -ForegroundColor Yellow

    foreach ($file in $files) {
        Remove-Item $file.FullName -Force -ErrorAction SilentlyContinue
    }

    Write-Host "[OK] Cache cleared" -ForegroundColor Green
}

function Show-CacheStats {
    Ensure-AudioDir

    $stats = Get-CacheStats

    Write-Host ""
    Write-Host "[STATS] Audio Cache Statistics" -ForegroundColor Cyan
    Write-Host "   Location: $AudioDir"
    Write-Host "   Files: $($stats.FileCount)"
    Write-Host "   Total Size: $($stats.FormattedSize)"
    Write-Host ""
}

# Main command routing
switch ($Command) {
    'stats' {
        Show-CacheStats
    }

    'cleanup' {
        Clear-Cache
    }

    'clear' {
        Clear-Cache
    }

    default {
        Show-CacheStats
    }
}

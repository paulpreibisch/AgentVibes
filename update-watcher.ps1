#
# update-watcher.ps1 - Updates the AgentVibes TTS queue watcher (no admin required)
#
# Run from the AgentVibes repo root:
#   powershell -ExecutionPolicy Bypass -File update-watcher.ps1
#

Write-Host "`n=== AgentVibes Watcher Update ===" -ForegroundColor Cyan

# Kill existing watcher
$existing = Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like "*tts-watcher*" -and $_.Name -like "powershell*" }
if ($existing) {
    $existing | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
    Start-Sleep -Milliseconds 300
    Write-Host "  Stopped $($existing.Count) existing watcher(s)" -ForegroundColor DarkYellow
}

# Copy watcher from repo source (single source of truth — no more embedded heredoc)
$sourceWatcher = Join-Path $PSScriptRoot ".claude\hooks-windows\tts-watcher.ps1"
if (-not (Test-Path $sourceWatcher)) {
    Write-Host "  ERROR: $sourceWatcher not found — run from the AgentVibes repo root" -ForegroundColor Red
    exit 1
}

$watcherDir  = "$env:USERPROFILE\.agentvibes"
$watcherPath = "$watcherDir\tts-watcher.ps1"
if (-not (Test-Path $watcherDir)) { New-Item -ItemType Directory -Path $watcherDir -Force | Out-Null }
Copy-Item -Path $sourceWatcher -Destination $watcherPath -Force
Write-Host "  Watcher installed: $watcherPath" -ForegroundColor Green

# Start it via the VBS launcher (hidden window, no console flash)
$vbs = "$env:USERPROFILE\.agentvibes\start-watcher.vbs"
if (Test-Path $vbs) {
    Start-Process wscript.exe -ArgumentList $vbs -WindowStyle Hidden
    Write-Host "  Watcher started via start-watcher.vbs" -ForegroundColor Green
} else {
    # No VBS launcher yet — start directly (visible for first-run debugging)
    Start-Process powershell.exe -ArgumentList "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$watcherPath`"" -WindowStyle Hidden
    Write-Host "  Watcher started directly (run setup-ssh-receiver.ps1 to install the VBS launcher)" -ForegroundColor Yellow
}

Write-Host "`nDone. Watcher log: $env:USERPROFILE\.agentvibes\watcher.log" -ForegroundColor Cyan
Write-Host "Trigger a voice preview in AgentVibes, then check the log to confirm." -ForegroundColor Gray

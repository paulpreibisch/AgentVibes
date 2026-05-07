#
# update-receiver.ps1 - Updates the AgentVibes SSH receiver script (no admin required)
#
# Run from the AgentVibes repo root after pulling the latest version:
#   powershell -ExecutionPolicy Bypass -File update-receiver.ps1
#
# The receiver is the SSH ForceCommand that decodes TTS payloads sent by the
# Linux sender and queues them for the watcher.  This script updates it to the
# latest template without touching sshd_config (which requires admin).
#

Write-Host "`n=== AgentVibes Receiver Update ===" -ForegroundColor Cyan

$AgentVibesDir = "$env:USERPROFILE\.agentvibes"
$ReceiverDest  = "$AgentVibesDir\play-remote.ps1"
$ReceiverSrc   = Join-Path $PSScriptRoot "templates\agentvibes-receiver.ps1"

if (-not (Test-Path $ReceiverSrc)) {
    Write-Host "  ERROR: $ReceiverSrc not found - run from the AgentVibes repo root" -ForegroundColor Red
    exit 1
}

# Stamp the owner home so sshd's ForceCommand (running as agentvibes-receiver
# user in a different home directory) can still find the right config paths.
$content = Get-Content $ReceiverSrc -Raw
$content = $content -replace '__OWNER_HOME__', $env:USERPROFILE

if (-not (Test-Path $AgentVibesDir)) {
    New-Item -ItemType Directory -Path $AgentVibesDir -Force | Out-Null
}
Set-Content -Path $ReceiverDest -Value $content -Encoding UTF8
Write-Host "  Receiver updated: $ReceiverDest" -ForegroundColor Green

Write-Host "`nDone. The next SSH payload will use the updated receiver." -ForegroundColor Cyan
Write-Host "Trigger a voice preview in AgentVibes to test." -ForegroundColor Gray

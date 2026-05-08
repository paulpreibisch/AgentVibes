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
# Use explicit UTF-8 read + literal .Replace() (not -replace regex) so that
# backslashes in the Windows path are never treated as escape sequences.
$content = [System.IO.File]::ReadAllText($ReceiverSrc, [System.Text.Encoding]::UTF8)
$content = $content.Replace('__OWNER_HOME__', $env:USERPROFILE)

Write-Host "  Owner home: $env:USERPROFILE" -ForegroundColor Gray
if ($content -like '*__OWNER_HOME__*') {
    Write-Host "  ERROR: __OWNER_HOME__ placeholder was not replaced!" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $AgentVibesDir)) {
    New-Item -ItemType Directory -Path $AgentVibesDir -Force | Out-Null
}
[System.IO.File]::WriteAllText($ReceiverDest, $content, [System.Text.UTF8Encoding]::new($false))
Write-Host "  Receiver updated: $ReceiverDest" -ForegroundColor Green

Write-Host "`nDone. The next SSH payload will use the updated receiver." -ForegroundColor Cyan
Write-Host "Trigger a voice preview in AgentVibes to test." -ForegroundColor Gray

#
# update-hooks.ps1 - Updates the AgentVibes Windows TTS hook scripts (no admin required)
#
# Run from the AgentVibes repo root after pulling the latest version:
#   powershell -ExecutionPolicy Bypass -File update-hooks.ps1
#
# Copies the hook scripts from .claude\hooks-windows\ in the repo to
# %USERPROFILE%\.claude\hooks-windows\ so the watcher picks up the latest versions.
#

Write-Host "`n=== AgentVibes Hooks Update ===" -ForegroundColor Cyan

$ScriptDir  = $PSScriptRoot
$SourceDir  = Join-Path $ScriptDir ".claude\hooks-windows"
$DestDir    = "$env:USERPROFILE\.claude\hooks-windows"

if (-not (Test-Path $SourceDir)) {
    Write-Host "  ERROR: $SourceDir not found - run from the AgentVibes repo root" -ForegroundColor Red
    exit 1
}

# Security: ensure source is within the repo
$ResolvedSource = (Resolve-Path $SourceDir).Path
$ResolvedScript = (Resolve-Path $ScriptDir).Path
if (-not $ResolvedSource.StartsWith($ResolvedScript)) {
    Write-Host "  ERROR: Source path is outside the repo directory" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $DestDir)) {
    New-Item -ItemType Directory -Path $DestDir -Force | Out-Null
}

$Scripts = @(
    "play-tts.ps1",
    "play-tts-windows-piper.ps1",
    "play-tts-windows-sapi.ps1",
    "play-tts-soprano.ps1",
    "provider-manager.ps1",
    "voice-manager-windows.ps1",
    "audio-cache-utils.ps1",
    "session-start-tts.ps1"
)

$Updated = 0
foreach ($script in $Scripts) {
    $src = Join-Path $SourceDir $script
    $dst = Join-Path $DestDir  $script
    if (Test-Path $src) {
        Copy-Item -Path $src -Destination $dst -Force
        Write-Host "  Updated: $script" -ForegroundColor Green
        $Updated++
    } else {
        Write-Host "  Skipped (not found): $script" -ForegroundColor DarkGray
    }
}

Write-Host "`nDone. $Updated hook script(s) updated in: $DestDir" -ForegroundColor Cyan
Write-Host "Trigger a voice preview in AgentVibes to test." -ForegroundColor Gray

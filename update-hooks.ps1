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

# Copy EVERY hook script in the source dir, not a hand-maintained whitelist.
# A stale whitelist produced mixed-generation installs (new router + stale
# providers, e.g. play-tts-kokoro.ps1 / audio-processor.ps1 / tts-watcher.ps1
# were never updated). Globbing keeps every provider/manager/watcher in lockstep.
$SourceScripts = Get-ChildItem -Path $SourceDir -Filter *.ps1 -File

# One timestamp per run so this run's backups group together and never collide
# with a previous run's — every update stays recoverable, not just the first.
$BackupStamp = (Get-Date -Format 'yyyyMMdd-HHmmss')

$Updated = 0
$Current = 0
foreach ($item in $SourceScripts) {
    $script = $item.Name
    $src = $item.FullName
    $dst = Join-Path $DestDir $script

    if (Test-Path $dst) {
        # Non-Destructive rule: never lose a user edit. Only back up + overwrite
        # when the installed file actually differs from what we ship; a matching
        # file needs neither a copy nor a backup.
        $srcHash = (Get-FileHash -Path $src -Algorithm SHA256).Hash
        $dstHash = (Get-FileHash -Path $dst -Algorithm SHA256).Hash
        if ($srcHash -eq $dstHash) {
            $Current++
            continue
        }
        Copy-Item -Path $dst -Destination "$dst.user.bak.$BackupStamp" -ErrorAction SilentlyContinue
    }
    Copy-Item -Path $src -Destination $dst -Force
    Write-Host "  Updated: $script" -ForegroundColor Green
    $Updated++
}

Write-Host "`nDone. $Updated hook script(s) updated, $Current already current in: $DestDir" -ForegroundColor Cyan
Write-Host "Trigger a voice preview in AgentVibes to test." -ForegroundColor Gray

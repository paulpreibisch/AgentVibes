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

# Install updated watcher with SAPI fallback + error logging
$watcherScript = @'
# AgentVibes TTS Queue Watcher - runs in user session for audio access
# Single-instance guard: exit immediately if another watcher is already running.
$mutex = New-Object System.Threading.Mutex($false, 'Global\AgentVibesTtsWatcher')
if (-not $mutex.WaitOne(0)) { $mutex.Dispose(); exit 0 }

$QueueDir = "$env:USERPROFILE\.agentvibes\tts-queue"
$LogFile  = "$env:USERPROFILE\.agentvibes\watcher.log"
$PlayTts  = "$env:USERPROFILE\.claude\hooks-windows\play-tts.ps1"
if (-not (Test-Path $QueueDir)) { New-Item -ItemType Directory -Path $QueueDir -Force | Out-Null }

function Write-WatcherLog {
    param([string]$Level, [string]$Msg)
    $ts = Get-Date -Format 'HH:mm:ss'
    Add-Content -Path $LogFile -Value "$ts [$Level] $Msg" -ErrorAction SilentlyContinue
}

Write-WatcherLog "INFO" "Watcher started. PlayTts exists: $(Test-Path $PlayTts)"

try {
while ($true) {
    $files = Get-ChildItem "$QueueDir\req-*.json" -ErrorAction SilentlyContinue | Sort-Object CreationTime
    foreach ($f in $files) {
        # Rename to proc-* before processing — crash recovery on restart
        $procFile = $f.FullName -replace '\\req-', '\proc-'
        try { Rename-Item $f.FullName $procFile -ErrorAction Stop } catch { continue }
        try {
            $req = Get-Content $procFile -Raw | ConvertFrom-Json
            # Validate voice before passing to command line
            $safeVoice = if ($req.voice -and $req.voice -match '^[a-zA-Z0-9_\-\. :]+$') { $req.voice } else { "" }
            $env:CLAUDE_PROJECT_DIR = $env:USERPROFILE
            $env:AGENTVIBES_NO_PRETEXT = "1"
            # Use SetEnvironmentVariable to truly unset (assignment to $null leaves empty string)
            if ($req.music)   { $env:AGENTVIBES_OVERRIDE_MUSIC   = $req.music }
            else { [System.Environment]::SetEnvironmentVariable("AGENTVIBES_OVERRIDE_MUSIC",   $null, "Process") }
            if ($req.volume)  { $env:AGENTVIBES_OVERRIDE_VOLUME  = $req.volume }
            else { [System.Environment]::SetEnvironmentVariable("AGENTVIBES_OVERRIDE_VOLUME",  $null, "Process") }
            if ($req.effects) { $env:AGENTVIBES_OVERRIDE_EFFECTS = $req.effects }
            else { [System.Environment]::SetEnvironmentVariable("AGENTVIBES_OVERRIDE_EFFECTS", $null, "Process") }

            if (Test-Path $PlayTts) {
                # Play remote arrival prefix sound if configured
                $prefixSoundFile = "$env:USERPROFILE\.agentvibes\remote-prefix-sound.txt"
                if (Test-Path $prefixSoundFile) {
                    $prefixSound = (Get-Content $prefixSoundFile -Raw).Trim()
                    if ($prefixSound -and (Test-Path $prefixSound)) {
                        $ffplay = Get-Command ffplay -ErrorAction SilentlyContinue
                        if ($ffplay) {
                            & $ffplay.Source -autoexit -nodisp -loglevel quiet $prefixSound 2>$null
                        }
                    }
                }

                # Full AgentVibes pipeline: piper / SAPI / etc.
                $tempText = Join-Path $env:TEMP "agentvibes-tts-$($req.id).txt"
                try {
                    [System.IO.File]::WriteAllText($tempText, $req.text, [System.Text.UTF8Encoding]::new($false))
                    $env:AGENTVIBES_TEXT_FILE = $tempText
                    $llmArg = @()
                    if ($req.llm) {
                        if ($req.llm -match '^[a-zA-Z0-9][a-zA-Z0-9_-]*$') {
                            $llmArg = @('-llm', $req.llm)
                        } else {
                            Write-WatcherLog "WARN" "Invalid LLM name '$($req.llm)' - using default"
                        }
                    }
                    Write-WatcherLog "INFO" "play-tts id=$($req.id) voice=$safeVoice llm=$($req.llm)"
                    $playOutput = & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $PlayTts "__from_file__" $safeVoice @llmArg 2>&1
                    if ($LASTEXITCODE -ne 0) {
                        Write-WatcherLog "ERROR" "play-tts exit=$LASTEXITCODE id=$($req.id) output=$($playOutput -join ' | ')"
                    } else {
                        Write-WatcherLog "INFO" "play-tts ok exit=0 id=$($req.id)"
                    }
                } finally {
                    [System.Environment]::SetEnvironmentVariable("AGENTVIBES_TEXT_FILE", $null, "Process")
                    Remove-Item $tempText -Force -ErrorAction SilentlyContinue
                }
            } else {
                # Fallback: Windows SAPI (built-in, no installation required)
                Write-WatcherLog "WARN" "play-tts.ps1 not found - using SAPI fallback for id=$($req.id)"
                Add-Type -AssemblyName System.Speech
                $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
                $synth.Speak($req.text)
                $synth.Dispose()
            }
            Remove-Item $procFile -Force -ErrorAction SilentlyContinue
        } catch {
            Write-WatcherLog "ERROR" "id=$($req.id) err=$_"
            Remove-Item $procFile -Force -ErrorAction SilentlyContinue
        }
    }
    # Crash recovery: any proc-* files left from a previous watcher crash → re-queue
    $stale = Get-ChildItem "$QueueDir\proc-*.json" -ErrorAction SilentlyContinue
    foreach ($s in $stale) {
        $recovered = $s.FullName -replace '\\proc-', '\req-'
        try { Rename-Item $s.FullName $recovered -ErrorAction SilentlyContinue } catch {}
    }
    Start-Sleep -Milliseconds 200
}
} finally {
    $mutex.ReleaseMutex()
    $mutex.Dispose()
}
'@

$watcherPath = "$env:USERPROFILE\.agentvibes\tts-watcher.ps1"
Set-Content -Path $watcherPath -Value $watcherScript -Encoding UTF8
Write-Host "  Watcher installed: $watcherPath" -ForegroundColor Green

# Start it via the VBS launcher (hidden window)
$vbs = "$env:USERPROFILE\.agentvibes\start-watcher.vbs"
if (Test-Path $vbs) {
    Start-Process wscript.exe -ArgumentList $vbs -WindowStyle Hidden
    Write-Host "  Watcher started via start-watcher.vbs" -ForegroundColor Green
} else {
    # No VBS launcher yet - start directly (visible window for debugging)
    Start-Process powershell.exe -ArgumentList "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$watcherPath`"" -WindowStyle Hidden
    Write-Host "  Watcher started directly (no VBS launcher found)" -ForegroundColor Yellow
}

Write-Host "`nDone. Watcher log: $env:USERPROFILE\.agentvibes\watcher.log" -ForegroundColor Cyan
Write-Host "Trigger a voice preview in AgentVibes, then check the log to confirm." -ForegroundColor Gray

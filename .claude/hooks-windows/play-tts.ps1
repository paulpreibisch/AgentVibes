#
# File: .claude/hooks-windows/play-tts.ps1
#
# AgentVibes - Windows TTS Router
# Delegates to active provider (windows-sapi or windows-piper)
#

param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$Text,

    [Parameter(Mandatory = $false, Position = 1)]
    [string]$VoiceOverride,

    [Parameter(Mandatory = $false)]
    [string]$llm = ""
)

# Security: Validate LLM provider name (alphanumeric, hyphens, underscores
# only) -- mirrors play-tts.sh line 92.  This prevents weird values from
# poisoning the audio-effects.cfg lookup or the AGENTVIBES_LLM_KEY env var
# we export to child scripts.  An invalid value is treated as unset rather
# than aborting, so the script falls back to the default config and the
# rest of TTS still works.
if ($llm -and $llm -notmatch '^[a-zA-Z0-9_-]+$') {
    Write-Error ("Invalid LLM provider name: '{0}' - must match {1}. Falling back to default config." -f $llm, '^[a-zA-Z0-9_-]+$')
    $llm = ""
}

# When no -llm is supplied, route through the "default" pseudo-LLM so the
# user-managed `llm:default` row in audio-effects.cfg becomes the global
# fallback for voice / pretext / music / effects.  This is configured via
# Setup -> Default -> Configure in the TUI.  If `llm:default` doesn't exist,
# the lookup will return empty and the script falls through to the
# legacy global config chain (project / user .agentvibes/config.json).
if (-not $llm) {
    $llm = "default"
}

# --- Cross-process playback serialization ---
# Without this, any two callers of play-tts.ps1 (Claude Code PostToolUse hook,
# Codex MCP text_to_speech, Copilot MCP text_to_speech, direct CLI) race each
# other and produce overlapping / interleaved audio.  Party mode already has
# its own mutex (AgentVibesPartyModeTTSQueue) at the bmad-party-speak.ps1
# level, but MCP-initiated calls bypass it entirely.
#
# We use a DIFFERENT mutex name ("AgentVibesPlaybackLock") so there's no
# deadlock risk with the party-mode mutex -- they can be held independently
# by nested processes.
#
# The mutex is acquired immediately before PlaySync() and released right
# after, so CPU-bound synthesis/ffmpeg work can overlap with another
# process's playback.
$_PlaybackMutex = New-Object System.Threading.Mutex($false, "AgentVibesPlaybackLock")

# --- Script-level watchdog ---
# If anything in this script hangs (SoundPlayer deadlock, audio device
# locked, ffmpeg stuck, etc.), a sibling PowerShell job waits 25 seconds
# and force-kills this process.  Without this, a stuck play-tts.ps1 holds
# the playback mutex forever and silently blocks every subsequent TTS
# call across all LLMs.  The watchdog guarantees forward progress.
#
# 25s is chosen to be LONGER than the mutex timeout (15s) but SHORT
# enough that a stuck process clears before the user's next turn.  If
# you fire two calls per turn and the first is stuck, the watchdog kills
# it before the second turn arrives so the audio subsystem recovers
# without manual intervention.  Long legitimate messages (>25s of speech)
# are rare at default verbosity levels; when they do occur the watchdog
# kills playback mid-sentence, which is acceptable degradation vs. a
# deadlocked queue.
$_WatchdogJob = $null
try {
    $_WatchdogJob = Start-Job -ArgumentList $PID -ScriptBlock {
        param($parentPid)
        Start-Sleep -Seconds 25
        try {
            # Only kill if still alive -- harmless if already exited
            $p = Get-Process -Id $parentPid -ErrorAction SilentlyContinue
            if ($p) {
                [Console]::Error.WriteLine("[AgentVibes] play-tts.ps1 watchdog fired -- force-killing pid $parentPid after 25s")
                Stop-Process -Id $parentPid -Force -ErrorAction SilentlyContinue
            }
        } catch { }
    }
} catch {
    # If Start-Job fails (rare), just continue without the watchdog -- no
    # regression from pre-watchdog behavior.
    $_WatchdogJob = $null
}

function Invoke-SerializedPlay {
    param([Parameter(Mandatory)][string]$WavPath)
    $acquired = $false
    try {
        try {
            # 15s timeout to acquire the playback mutex.  If we can't get
            # it in 15s, the holder is almost certainly a stuck/crashed
            # prior run.  AbandonedMutexException means the holder's
            # process actually died -- we inherit ownership.
            $acquired = $_PlaybackMutex.WaitOne(15000)
        } catch [System.Threading.AbandonedMutexException] {
            $acquired = $true
        }
        if (-not $acquired) {
            # Self-heal: kill any stuck play-tts.ps1 processes (other than
            # ourselves) that have been alive longer than 20 seconds.  This
            # frees the mutex so the NEXT call can succeed without the user
            # running taskkill manually.  We still exit with code 2 because
            # this call's audio is lost, but the queue recovers immediately.
            try {
                $myPid = $PID
                $cutoff = (Get-Date).AddSeconds(-20)
                $stuck = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
                    Where-Object {
                        $_.Name -eq 'powershell.exe' -and
                        $_.ProcessId -ne $myPid -and
                        $_.CommandLine -like '*play-tts.ps1*' -and
                        $_.CreationDate -lt $cutoff
                    }
                foreach ($p in $stuck) {
                    [Console]::Error.WriteLine("[AgentVibes] Self-heal: killing stuck play-tts.ps1 pid $($p.ProcessId) (alive since $($p.CreationDate))")
                    Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue
                }
            } catch { }
            [Console]::Error.WriteLine("[AgentVibes] ERROR: play-tts.ps1 could not acquire playback mutex within 15s. A prior play-tts.ps1 process was stuck holding it and has been killed; the next TTS call should succeed.")
            exit 2
        }
        $player = $null
        try {
            $player = New-Object System.Media.SoundPlayer $WavPath
            $player.PlaySync()
        } finally {
            if ($player) { $player.Dispose() }
        }
    } finally {
        if ($acquired) {
            try { $_PlaybackMutex.ReleaseMutex() } catch { }
        }
    }
}

# Register an exit handler that stops the watchdog job on normal exit so
# it doesn't fire on successful short runs.
Register-EngineEvent -SourceIdentifier PowerShell.Exiting -Action {
    try {
        if ($_WatchdogJob) {
            Stop-Job -Job $_WatchdogJob -ErrorAction SilentlyContinue
            Remove-Job -Job $_WatchdogJob -Force -ErrorAction SilentlyContinue
        }
    } catch { }
} | Out-Null

# Configuration paths
# Priority: CLAUDE_PROJECT_DIR env var -> script's parent project -> user profile
# Local project settings ALWAYS override global (~/.claude)
$ScriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path

if ($env:CLAUDE_PROJECT_DIR -and (Test-Path "$env:CLAUDE_PROJECT_DIR\.claude")) {
    $ClaudeDir = "$env:CLAUDE_PROJECT_DIR\.claude"
} else {
    $PackageClaudeDir = Join-Path (Split-Path -Parent (Split-Path -Parent $ScriptPath)) ".claude"
    if (Test-Path $PackageClaudeDir) {
        $ClaudeDir = $PackageClaudeDir
    } elseif (Test-Path "$env:USERPROFILE\.claude\tts-provider.txt") {
        $ClaudeDir = "$env:USERPROFILE\.claude"
    } else {
        $ClaudeDir = "$env:USERPROFILE\.claude"
    }
}

$HooksDir = "$ClaudeDir\hooks-windows"
$ProviderFile = "$ClaudeDir\tts-provider.txt"
$MuteFile = "$ClaudeDir\tts-muted.txt"

# Check if TTS is muted
if (Test-Path $MuteFile) {
    $muteStatus = Get-Content $MuteFile -Raw
    if ($muteStatus.Trim() -eq "true") {
        exit 0
    }
}

# Per-LLM config lookup: if --llm is passed, look up llm:<name> in audio-effects.cfg
# Format: llm:<name>|REVERB|BG_FILE|BG_VOLUME|VOICE|PRETEXT|ENGINE
$LlmVoice = ""
$LlmPretext = ""
$LlmReverb = ""
$LlmEngine = ""
$LlmBgTrack = ""
$LlmBgVolume = ""
$ProjectRoot = Split-Path -Parent $ClaudeDir
$ConfigDir = "$ClaudeDir\config"

if ($llm) {
    $llmKey = "llm:$llm"
    $llmKeyPattern = '^' + [regex]::Escape($llmKey) + '\|'
    # Check project-local audio-effects.cfg first, then global
    $cfgPaths = @(
        "$ConfigDir\audio-effects.cfg",
        "$env:USERPROFILE\.claude\config\audio-effects.cfg"
    )
    foreach ($cfgPath in $cfgPaths) {
        if (-not $LlmVoice -and -not $LlmPretext -and (Test-Path $cfgPath)) {
            foreach ($line in (Get-Content $cfgPath)) {
                if ($line -match $llmKeyPattern) {
                    $parts = $line -split '\|'
                    # parts: [0]=key [1]=reverb [2]=bg_file [3]=bg_vol [4]=voice [5]=pretext [6]=engine
                    if ($parts.Length -ge 2 -and $parts[1].Trim()) {
                        $LlmReverb = $parts[1].Trim()
                    }
                    if ($parts.Length -ge 3 -and $parts[2].Trim()) {
                        $LlmBgTrack = $parts[2].Trim()
                    }
                    if ($parts.Length -ge 4 -and $parts[3].Trim()) {
                        $LlmBgVolume = $parts[3].Trim()
                    }
                    if ($parts.Length -ge 5 -and $parts[4].Trim()) {
                        $LlmVoice = $parts[4].Trim()
                    }
                    if ($parts.Length -ge 6 -and $parts[5].Trim()) {
                        $LlmPretext = $parts[5].Trim()
                    }
                    if ($parts.Length -ge 7 -and $parts[6].Trim()) {
                        $LlmEngine = $parts[6].Trim()
                    }
                    break
                }
            }
        }
    }
    # LLM per-LLM voice routing.
    #
    # PRIORITY CHANGE: when -llm is passed AND the llm row has a voice,
    # the per-LLM voice always wins — even over an explicit VoiceOverride
    # parameter passed by the MCP caller.  Rationale: Codex / Copilot /
    # Claude Code all call `get_config` at session start and then echo
    # the global voice back on every `text_to_speech` call.  With the
    # old "explicit wins" priority, that global voice overrode our
    # per-LLM routing and broke the entire point of having llm:<key>
    # rows in audio-effects.cfg.
    #
    # To request a specific voice for a specific call that bypasses the
    # LLM routing, the caller should NOT pass -llm, or should use the
    # `llm:default` row (which has no voice column to override).
    if ($LlmVoice) {
        $VoiceOverride = $LlmVoice
    }
    # Export LLM key for child scripts (process-local, not system-wide)
    $env:AGENTVIBES_LLM_KEY = "llm:$llm"
}

# Prepend pretext if configured
# Priority: LLM-specific pretext -> project .agentvibes/config.json -> project .claude/config/tts-pretext.txt
#           -> global ~/.agentvibes/config.json -> global ~/.claude/config/tts-pretext.txt
$Pretext = $LlmPretext
if (-not $Pretext) {
    $PretextSources = @(
        (Join-Path $ProjectRoot ".agentvibes\config.json"),
        "$ClaudeDir\config\tts-pretext.txt",
        "$env:USERPROFILE\.agentvibes\config.json",
        "$env:USERPROFILE\.claude\config\tts-pretext.txt"
    )
    foreach ($src in $PretextSources) {
        if (-not $Pretext -and (Test-Path $src)) {
            if ($src -match '\.json$') {
                try {
                    $avCfg = Get-Content $src -Raw | ConvertFrom-Json
                    if ($avCfg.pretext) { $Pretext = $avCfg.pretext.Trim() }
                } catch { }
            } else {
                $val = (Get-Content $src -Raw).Trim()
                if ($val) { $Pretext = $val }
            }
        }
    }
}
if ($Pretext) {
    $Text = "$Pretext, $Text"
}
# Determine active provider
# LLM-specific engine overrides global provider
$ActiveProvider = "sapi"
if ($LlmEngine) {
    $ActiveProvider = $LlmEngine
} elseif (Test-Path $ProviderFile) {
    $ActiveProvider = (Get-Content $ProviderFile -Raw).Trim()
}

# Validate and get provider script
$ProviderScript = ""

switch ($ActiveProvider) {
    { $_ -in "sapi", "windows-sapi" } {
        $ProviderScript = "$HooksDir\play-tts-sapi.ps1"
    }
    { $_ -in "piper", "windows-piper" } {
        $ProviderScript = "$HooksDir\play-tts-piper.ps1"
    }
    "soprano" {
        $ProviderScript = "$HooksDir\play-tts-soprano.ps1"
    }
    "termux-ssh" {
        $ProviderScript = "$HooksDir\play-tts-termux-ssh.ps1"
    }
    default {
        Write-Host "[ERROR] Unknown provider: $ActiveProvider" -ForegroundColor Red
        Write-Host "Use: .\provider-manager.ps1 list" -ForegroundColor Yellow
        exit 1
    }
}

# Check if provider script exists
if (-not (Test-Path $ProviderScript)) {
    Write-Host "[ERROR] Provider script not found: $ProviderScript" -ForegroundColor Red
    exit 1
}

# Check if background music is enabled
# Primary source of truth: .agentvibes/config.json (used by TUI console)
# Fallback: .claude/config/background-music-enabled.txt (legacy PowerShell config)
$ConfigDir = "$ClaudeDir\config"
$BgEnabled = $false
$AgentVibesConfig = Join-Path (Split-Path -Parent $ClaudeDir) ".agentvibes\config.json"
if (Test-Path $AgentVibesConfig) {
    try {
        $json = Get-Content $AgentVibesConfig -Raw | ConvertFrom-Json
        if ($json.backgroundMusic -and $null -ne $json.backgroundMusic.enabled) {
            $BgEnabled = [bool]$json.backgroundMusic.enabled
        }
    } catch {
        $BgEnabled = $false
    }
} else {
    # Fallback to legacy txt config
    $BgEnabledFile = "$ConfigDir\background-music-enabled.txt"
    if (Test-Path $BgEnabledFile) {
        $BgEnabled = (Get-Content $BgEnabledFile -Raw).Trim() -eq "true"
    }
}

# When a per-LLM row in audio-effects.cfg has a background track configured,
# that's an implicit "bg music enabled for this LLM" — force it on regardless
# of the global backgroundMusic.enabled flag.  Without this, setting a per-LLM
# track in the TUI's Configure modal would have no effect unless the user
# ALSO toggled global bg music on.
if ($LlmBgTrack) {
    $BgEnabled = $true
}

# Check if reverb is enabled (allowlist validation)
# LLM-specific reverb overrides global setting
$ReverbLevel = "off"
if ($LlmReverb -and $LlmReverb -in @("off", "light", "medium", "heavy", "cathedral")) {
    $ReverbLevel = $LlmReverb
} else {
    $ReverbFile = "$ConfigDir\reverb-level.txt"
    if (Test-Path $ReverbFile) {
        $reverbVal = (Get-Content $ReverbFile -Raw).Trim()
        if ($reverbVal -in @("off", "light", "medium", "heavy", "cathedral")) {
            $ReverbLevel = $reverbVal
        }
    }
}
$HasReverb = $ReverbLevel -ne "off"

# Check ffmpeg availability for background music mixing or reverb
# Refresh PATH from registry so newly-installed tools are found without shell restart
$HasFfmpeg = $false
if ($BgEnabled -or $HasReverb) {
    try {
        $null = Get-Command ffmpeg -ErrorAction Stop
        $HasFfmpeg = $true
    } catch {
        # PATH may be stale (common after winget install); refresh from registry
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
        try {
            $null = Get-Command ffmpeg -ErrorAction Stop
            $HasFfmpeg = $true
        } catch {}
    }
}

# Check for pre-synthesized WAV (party mode optimization -- synthesis done before mutex acquisition)
$PreSynthWav = $env:AGENTVIBES_PRESYNTHESIZED_WAV
$UsePreSynth = $PreSynthWav -and (Test-Path $PreSynthWav) -and
    (Get-Item $PreSynthWav -ErrorAction SilentlyContinue).Length -gt 0

# If background music or reverb enabled and ffmpeg available, tell provider to skip playback
if (($BgEnabled -or $HasReverb) -and $HasFfmpeg) {
    $env:AGENTVIBES_NO_PLAY = "1"
}

# Call the provider script (skip if using pre-synthesized audio)
# When post-processing (reverb/music), capture output preserving InformationRecord colors.
# Otherwise call directly so Write-Host colors pass through to the terminal.
$NeedsPostProcess = ($BgEnabled -or $HasReverb) -and $HasFfmpeg
if ($UsePreSynth) {
    Write-Host "[SYNTH] Using pre-synthesized audio..." -ForegroundColor Cyan
    # If no post-processing needed, play the pre-synth file directly and exit
    if (-not $NeedsPostProcess) {
        try {
            Invoke-SerializedPlay -WavPath $PreSynthWav
        } catch {
            Write-Host "[WARNING] Pre-synth playback failed: $_" -ForegroundColor Yellow
        }
        Remove-Item env:AGENTVIBES_NO_PLAY -ErrorAction SilentlyContinue
        exit 0
    }
} else {
    try {
        if ($NeedsPostProcess) {
            if ($VoiceOverride) {
                $providerOutput = & $ProviderScript $Text $VoiceOverride 6>&1 2>&1
            } else {
                $providerOutput = & $ProviderScript $Text 6>&1 2>&1
            }
            # Re-emit preserving colors from InformationRecords (Write-Host output)
            foreach ($item in $providerOutput) {
                if ($item -is [System.Management.Automation.InformationRecord]) {
                    $msg = $item.MessageData
                    if ($msg -is [System.Management.Automation.HostInformationMessage]) {
                        Write-Host $msg.Message -ForegroundColor $msg.ForegroundColor -NoNewline:$msg.NoNewLine
                        if (-not $msg.NoNewLine) { Write-Host }
                    } else {
                        Write-Host "$item"
                    }
                } else {
                    Write-Host "$item"
                }
            }
            # Parse the provider output for "[OK] Saved to: <path>" so we can
            # use the EXACT file the provider just wrote.  This replaces the
            # old "pick most recent tts-XXXXXXXX.wav" heuristic which would
            # silently replay stale audio whenever synthesis failed.
            $FreshSynthFile = $null
            foreach ($item in $providerOutput) {
                $line = if ($item -is [System.Management.Automation.InformationRecord]) {
                    $m = $item.MessageData
                    if ($m -is [System.Management.Automation.HostInformationMessage]) { $m.Message } else { "$item" }
                } else { "$item" }
                if ($line -match '^\[OK\] Saved to:\s*(.+\.wav)\s*$') {
                    $FreshSynthFile = $Matches[1].Trim()
                }
            }
            if (-not $FreshSynthFile -or -not (Test-Path $FreshSynthFile)) {
                [Console]::Error.WriteLine("[AgentVibes] ERROR: Provider synthesis did not produce an output file. NOT falling back to stale audio.  Check provider logs above.")
                Remove-Item env:AGENTVIBES_NO_PLAY -ErrorAction SilentlyContinue
                exit 3
            }
        } else {
            if ($VoiceOverride) {
                & $ProviderScript $Text $VoiceOverride
            } else {
                & $ProviderScript $Text
            }
        }
    }
    catch {
        Write-Host "[ERROR] TTS Error: $_" -ForegroundColor Red
        Remove-Item env:AGENTVIBES_NO_PLAY -ErrorAction SilentlyContinue
        exit 1
    }
}

# Apply reverb and/or mix with background music
if (($BgEnabled -or $HasReverb) -and $HasFfmpeg) {
    Remove-Item env:AGENTVIBES_NO_PLAY -ErrorAction SilentlyContinue

    # Use the EXACT file the provider script just wrote (captured from its
    # "[OK] Saved to: <path>" output line above).  The old "pick most recent
    # tts-XXXXXXXX.wav" heuristic silently replayed stale audio whenever
    # synthesis failed — there is no safe way to guess which file is fresh.
    $AudioDir = "$ClaudeDir\audio"
    $RecentWav = if ($UsePreSynth) {
        Get-Item $PreSynthWav -ErrorAction SilentlyContinue
    } elseif ($FreshSynthFile -and (Test-Path $FreshSynthFile)) {
        Get-Item $FreshSynthFile -ErrorAction SilentlyContinue
    } else {
        $null
    }

    if ($RecentWav -and $RecentWav.Length -gt 0) {
        $voicePath = $RecentWav.FullName

        # Apply reverb if configured
        if ($HasReverb) {
            $reverbFilter = switch ($ReverbLevel) {
                "light"     { "aecho=0.8:0.88:60:0.4" }
                "medium"    { "aecho=0.8:0.88:60|120:0.4|0.3" }
                "heavy"     { "aecho=0.8:0.88:60|120|180:0.4|0.3|0.2" }
                "cathedral" { "aecho=0.8:0.88:100|200|300|400:0.3|0.25|0.2|0.15" }
                default     { "" }
            }
            if ($reverbFilter) {
                # Use a fixed name OUTSIDE the `tts-XXXXXXXX` random-name
                # namespace so the "pick most recent tts-*.wav" logic can't
                # accidentally pick this post-processed file as a synth input.
                $reverbedFile = "$AudioDir\av-reverbed-scratch.wav"
                $reverbArgs = "-y -i `"$voicePath`" -af `"$reverbFilter`" `"$reverbedFile`""
                $proc = Start-Process -FilePath "ffmpeg" -ArgumentList $reverbArgs -NoNewWindow -Wait -PassThru -RedirectStandardError "$env:TEMP\agentvibes-ffmpeg-stderr.txt"
                if ($proc.ExitCode -eq 0 -and (Test-Path $reverbedFile)) {
                    $voicePath = $reverbedFile
                }
            }
        }

        # Mix with background music if enabled
        if ($BgEnabled) {
            # Read background track and volume from audio-effects.cfg (matches Linux behavior)
            $TracksDir = "$ClaudeDir\audio\tracks"
            $DefaultTrack = ""
            $BgVolume = "0.25"
            $AudioEffectsCfg = "$ConfigDir\audio-effects.cfg"

            if (Test-Path $AudioEffectsCfg) {
                # Try agent-specific config first, then fall back to default
                # Format: AGENT_NAME|SOX_EFFECTS|BACKGROUND_FILE|BACKGROUND_VOLUME
                # Lookup order: agent name -> llm:<name> -> default
                $agentName = $env:AGENTVIBES_AGENT_NAME
                $configLine = $null

                $cfgLines = Get-Content $AudioEffectsCfg
                if ($agentName) {
                    foreach ($line in $cfgLines) {
                        if ($line -match "^$([regex]::Escape($agentName))\|") {
                            $configLine = $line
                            break
                        }
                    }
                }
                # Try LLM-specific config (--llm parameter)
                if (-not $configLine -and $llm) {
                    $llmBgKey = "llm:$llm"
                    foreach ($line in $cfgLines) {
                        if ($line -match "^$([regex]::Escape($llmBgKey))\|") {
                            $configLine = $line
                            break
                        }
                    }
                }
                # Fall back to default
                if (-not $configLine) {
                    foreach ($line in $cfgLines) {
                        if ($line -match '^default\|') {
                            $configLine = $line
                            break
                        }
                    }
                }

                if ($configLine) {
                    $parts = $configLine -split '\|'
                    if ($parts.Length -ge 3 -and $parts[2]) {
                        $trackName = $parts[2].Trim()
                        # Validate: filename only, no path separators or traversal
                        if ($trackName -match '^[a-zA-Z0-9_\-\.]+$') {
                            $DefaultTrack = $trackName
                        }
                    }
                    if ($parts.Length -ge 4 -and $parts[3]) {
                        $volVal = $parts[3].Trim()
                        if ($volVal -match '^\d+\.?\d*$') { $BgVolume = $volVal }
                    }
                }
            }

            # Fallback if no track found in config
            if (-not $DefaultTrack) {
                $DefaultTrack = "agent_vibes_celtic_harp_v1_loop.mp3"
            }

            $BgTrackPath = Join-Path $TracksDir $DefaultTrack
            # Path containment: verify resolved path stays within tracks directory
            $ResolvedBgTrack = [System.IO.Path]::GetFullPath($BgTrackPath)
            $ResolvedTracksDir = [System.IO.Path]::GetFullPath($TracksDir)
            if (-not $ResolvedBgTrack.StartsWith($ResolvedTracksDir + [System.IO.Path]::DirectorySeparatorChar)) {
                $BgTrackPath = Join-Path $TracksDir "agent_vibes_celtic_harp_v1_loop.mp3"
            }

            if (Test-Path $BgTrackPath) {
                # Mixed output goes to a fixed name OUTSIDE the tts-XXXXXXXX
                # random-name namespace so the "pick most recent tts-*.wav"
                # logic can't accidentally pick this as a synth input in the
                # next invocation.  (Previously we'd name this as
                # "$voicePath-mixed.wav" which generated files like
                # tts-xxx.wav.effected-mixed.wav that kept re-matching and
                # compounding on every run.)
                $MixedFile = "$AudioDir\av-mixed-scratch.wav"

                try {
                    # Get voice duration to calculate total length
                    $probArgs = "-v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 `"$voicePath`""
                    $durationProc = Start-Process -FilePath "ffprobe" -ArgumentList $probArgs -NoNewWindow -Wait -PassThru -RedirectStandardError "$env:TEMP\agentvibes-ffmpeg-stderr.txt" -RedirectStandardOutput "$env:TEMP\agentvibes-duration.txt"
                    $voiceDuration = 5  # default fallback
                    if (Test-Path "$env:TEMP\agentvibes-duration.txt") {
                        $durStr = (Get-Content "$env:TEMP\agentvibes-duration.txt" -Raw).Trim()
                        if ($durStr -match '^\d+\.?\d*$') { $voiceDuration = [double]$durStr }
                        Remove-Item "$env:TEMP\agentvibes-duration.txt" -Force -ErrorAction SilentlyContinue
                    }
                    $totalDuration = $voiceDuration + 4  # 2s intro + voice + 2s outro
                    $fadeOutStart = $totalDuration - 2

                    # Filter: music fades in 0.5s, voice delayed 2s, music fades out last 2s
                    $filter = "[0:a]volume=${BgVolume},afade=t=in:d=0.5,afade=t=out:st=${fadeOutStart}:d=2[bg];[1:a]adelay=1000|1000,volume=1.5,apad=pad_dur=2[voice];[bg][voice]amix=inputs=2:duration=longest:dropout_transition=2:normalize=0[out]"

                    # Run ffmpeg - use Start-Process to avoid stderr issues with $ErrorActionPreference
                    $ffmpegArgs = "-y -stream_loop -1 -i `"$BgTrackPath`" -i `"$voicePath`" -filter_complex `"$filter`" -map `"[out]`" -t $totalDuration `"$MixedFile`""
                    $proc = Start-Process -FilePath "ffmpeg" -ArgumentList $ffmpegArgs -NoNewWindow -Wait -PassThru -RedirectStandardError "$env:TEMP\agentvibes-ffmpeg-stderr.txt"

                    if ($proc.ExitCode -eq 0 -and (Test-Path $MixedFile) -and (Get-Item $MixedFile).Length -gt 0) {
                        # Play the mixed audio (via serialized mutex)
                        try {
                            Invoke-SerializedPlay -WavPath $MixedFile
                        } catch {
                            Write-Host "[WARNING] Mixed playback failed, playing voice only" -ForegroundColor Yellow
                            Invoke-SerializedPlay -WavPath $voicePath
                        }
                    } else {
                        # Mixing failed, play voice only
                        Invoke-SerializedPlay -WavPath $voicePath
                    }
                } catch {
                    # ffmpeg failed, play voice only
                    Invoke-SerializedPlay -WavPath $voicePath
                }
            } else {
                # No background track found, play voice only
                Invoke-SerializedPlay -WavPath $voicePath
            }
        } else {
            # No background music, play the (possibly reverbed) voice
            Invoke-SerializedPlay -WavPath $voicePath
        }
    }
} else {
    Remove-Item env:AGENTVIBES_NO_PLAY -ErrorAction SilentlyContinue
}

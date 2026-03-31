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
    [string]$VoiceOverride
)

# Configuration paths
# Priority: CLAUDE_PROJECT_DIR env var → script's parent project → user profile
$ScriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path

if ($env:CLAUDE_PROJECT_DIR -and (Test-Path "$env:CLAUDE_PROJECT_DIR\.claude")) {
    $ClaudeDir = "$env:CLAUDE_PROJECT_DIR\.claude"
} else {
    $PackageClaudeDir = Join-Path (Split-Path -Parent (Split-Path -Parent $ScriptPath)) ".claude"
    if (Test-Path "$env:USERPROFILE\.claude\tts-provider.txt") {
        $ClaudeDir = "$env:USERPROFILE\.claude"
    } elseif (Test-Path $PackageClaudeDir) {
        $ClaudeDir = $PackageClaudeDir
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

# Determine active provider
$ActiveProvider = "sapi"
if (Test-Path $ProviderFile) {
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

# Check if reverb is enabled (allowlist validation)
$ReverbLevel = "off"
$ReverbFile = "$ConfigDir\reverb-level.txt"
if (Test-Path $ReverbFile) {
    $reverbVal = (Get-Content $ReverbFile -Raw).Trim()
    if ($reverbVal -in @("off", "light", "medium", "heavy", "cathedral")) {
        $ReverbLevel = $reverbVal
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

# If background music or reverb enabled and ffmpeg available, tell provider to skip playback
if (($BgEnabled -or $HasReverb) -and $HasFfmpeg) {
    $env:AGENTVIBES_NO_PLAY = "1"
}

# Call the provider script
# When post-processing (reverb/music), capture output preserving InformationRecord colors.
# Otherwise call directly so Write-Host colors pass through to the terminal.
$NeedsPostProcess = ($BgEnabled -or $HasReverb) -and $HasFfmpeg
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

# Apply reverb and/or mix with background music
if (($BgEnabled -or $HasReverb) -and $HasFfmpeg) {
    Remove-Item env:AGENTVIBES_NO_PLAY -ErrorAction SilentlyContinue

    # Find the most recent TTS wav file
    $AudioDir = "$ClaudeDir\audio"
    $RecentWav = Get-ChildItem -Path $AudioDir -Filter "tts-*.wav" -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending | Select-Object -First 1

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
                $reverbedFile = "$AudioDir\tts-reverbed.wav"
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
                $MixedFile = $RecentWav.FullName -replace '\.wav$', '-mixed.wav'

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
                    $filter = "[0:a]volume=${BgVolume},afade=t=in:d=0.5,afade=t=out:st=${fadeOutStart}:d=2[bg];[1:a]adelay=2000|2000,apad=pad_dur=2[voice];[bg][voice]amix=inputs=2:duration=longest:dropout_transition=2[out]"

                    # Run ffmpeg - use Start-Process to avoid stderr issues with $ErrorActionPreference
                    $ffmpegArgs = "-y -stream_loop -1 -i `"$BgTrackPath`" -i `"$voicePath`" -filter_complex `"$filter`" -map `"[out]`" -t $totalDuration `"$MixedFile`""
                    $proc = Start-Process -FilePath "ffmpeg" -ArgumentList $ffmpegArgs -NoNewWindow -Wait -PassThru -RedirectStandardError "$env:TEMP\agentvibes-ffmpeg-stderr.txt"

                    if ($proc.ExitCode -eq 0 -and (Test-Path $MixedFile) -and (Get-Item $MixedFile).Length -gt 0) {
                        # Play the mixed audio
                        $player = $null
                        try {
                            $player = New-Object System.Media.SoundPlayer $MixedFile
                            $player.PlaySync()
                        } catch {
                            Write-Host "[WARNING] Mixed playback failed, playing voice only" -ForegroundColor Yellow
                            $player2 = $null
                            try {
                                $player2 = New-Object System.Media.SoundPlayer $voicePath
                                $player2.PlaySync()
                            } finally {
                                if ($player2) { $player2.Dispose() }
                            }
                        } finally {
                            if ($player) { $player.Dispose() }
                        }
                    } else {
                        # Mixing failed, play voice only
                        $player = $null
                        try {
                            $player = New-Object System.Media.SoundPlayer $voicePath
                            $player.PlaySync()
                        } finally {
                            if ($player) { $player.Dispose() }
                        }
                    }
                } catch {
                    # ffmpeg failed, play voice only
                    $player = $null
                    try {
                        $player = New-Object System.Media.SoundPlayer $voicePath
                        $player.PlaySync()
                    } finally {
                        if ($player) { $player.Dispose() }
                    }
                }
            } else {
                # No background track found, play voice only
                $player = $null
                try {
                    $player = New-Object System.Media.SoundPlayer $voicePath
                    $player.PlaySync()
                } finally {
                    if ($player) { $player.Dispose() }
                }
            }
        } else {
            # No background music, play the (possibly reverbed) voice
            $player = $null
            try {
                $player = New-Object System.Media.SoundPlayer $voicePath
                $player.PlaySync()
            } finally {
                if ($player) { $player.Dispose() }
            }
        }
    }
} else {
    Remove-Item env:AGENTVIBES_NO_PLAY -ErrorAction SilentlyContinue
}

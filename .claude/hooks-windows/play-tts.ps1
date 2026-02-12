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
# First check if we're running from a project directory with .claude
$ScriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectClaudeDir = Join-Path (Split-Path -Parent (Split-Path -Parent $ScriptPath)) ".claude"

# Use project .claude if running from there, otherwise use user profile
if (Test-Path $ProjectClaudeDir) {
    $ClaudeDir = $ProjectClaudeDir
} else {
    $ClaudeDir = "$env:USERPROFILE\.claude"
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
$ActiveProvider = "windows-sapi"
if (Test-Path $ProviderFile) {
    $ActiveProvider = (Get-Content $ProviderFile -Raw).Trim()
}

# Validate and get provider script
$ProviderScript = ""

switch ($ActiveProvider) {
    "windows-sapi" {
        $ProviderScript = "$HooksDir\play-tts-windows-sapi.ps1"
    }
    "windows-piper" {
        $ProviderScript = "$HooksDir\play-tts-windows-piper.ps1"
    }
    "soprano" {
        $ProviderScript = "$HooksDir\play-tts-soprano.ps1"
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
$ConfigDir = "$ClaudeDir\config"
$BgEnabled = $false
$BgEnabledFile = "$ConfigDir\background-music-enabled.txt"
if (Test-Path $BgEnabledFile) {
    $BgEnabled = (Get-Content $BgEnabledFile -Raw).Trim() -eq "true"
}

# Check ffmpeg availability for background music mixing
$HasFfmpeg = $false
if ($BgEnabled) {
    try {
        $null = Get-Command ffmpeg -ErrorAction Stop
        $HasFfmpeg = $true
    } catch {}
}

# If background music enabled and ffmpeg available, tell provider to skip playback
if ($BgEnabled -and $HasFfmpeg) {
    $env:AGENTVIBES_NO_PLAY = "1"
}

# Call the provider script
try {
    if ($VoiceOverride) {
        $providerOutput = & $ProviderScript $Text $VoiceOverride 2>&1
    }
    else {
        $providerOutput = & $ProviderScript $Text 2>&1
    }
    # Show provider output
    $providerOutput | ForEach-Object { Write-Host $_ }
}
catch {
    Write-Host "[ERROR] TTS Error: $_" -ForegroundColor Red
    $env:AGENTVIBES_NO_PLAY = $null
    exit 1
}

# Mix with background music if enabled
if ($BgEnabled -and $HasFfmpeg) {
    $env:AGENTVIBES_NO_PLAY = $null

    # Find the most recent TTS wav file
    $AudioDir = "$ClaudeDir\audio"
    $RecentWav = Get-ChildItem -Path $AudioDir -Filter "tts-*.wav" -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending | Select-Object -First 1

    if ($RecentWav -and $RecentWav.Length -gt 0) {
        # Get background track - default to bachata, or read from config
        $TracksDir = "$ClaudeDir\audio\tracks"
        $DefaultTrack = "agent_vibes_bachata_v1_loop.mp3"
        $DefaultTrackFile = "$ConfigDir\background-music-default.txt"
        if (Test-Path $DefaultTrackFile) {
            $configTrack = (Get-Content $DefaultTrackFile -Raw).Trim()
            if ($configTrack) { $DefaultTrack = $configTrack }
        }
        $BgTrackPath = Join-Path $TracksDir $DefaultTrack

        # Get volume (default 0.25)
        $BgVolume = "0.25"
        $VolumeFile = "$ConfigDir\background-music-volume.txt"
        if (Test-Path $VolumeFile) {
            $vol = (Get-Content $VolumeFile -Raw).Trim()
            if ($vol -match '^\d+\.?\d*$') { $BgVolume = $vol }
        }

        if (Test-Path $BgTrackPath) {
            $MixedFile = $RecentWav.FullName -replace '\.wav$', '-mixed.wav'

            try {
                # Use ffmpeg to mix: 2s music intro -> voice over music -> 2s music outro
                $voicePath = $RecentWav.FullName

                # Get voice duration to calculate total length
                $probArgs = "-v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 `"$voicePath`""
                $durationProc = Start-Process -FilePath "ffprobe" -ArgumentList $probArgs -NoNewWindow -Wait -PassThru -RedirectStandardError "NUL" -RedirectStandardOutput "$env:TEMP\agentvibes-duration.txt"
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
                $proc = Start-Process -FilePath "ffmpeg" -ArgumentList $ffmpegArgs -NoNewWindow -Wait -PassThru -RedirectStandardError "NUL"

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
                    $player = New-Object System.Media.SoundPlayer $RecentWav.FullName
                    $player.PlaySync()
                } finally {
                    if ($player) { $player.Dispose() }
                }
            }
        } else {
            # No background track found, play voice only
            $player = $null
            try {
                $player = New-Object System.Media.SoundPlayer $RecentWav.FullName
                $player.PlaySync()
            } finally {
                if ($player) { $player.Dispose() }
            }
        }
    }
} else {
    $env:AGENTVIBES_NO_PLAY = $null
}

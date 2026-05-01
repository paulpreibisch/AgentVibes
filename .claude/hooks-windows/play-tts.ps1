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

    # LLM identity for per-LLM audio routing (e.g. "claude-code", "copilot", "codex").
    # When provided, the router looks up an `llm:<name>` row in audio-effects.cfg
    # to apply LLM-specific voice, pretext, reverb, and engine settings.
    [Parameter(Mandatory = $false)]
    [string]$llm = ""
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
$HasFfmpeg = $false
if ($BgEnabled -or $HasReverb) {
    try {
        $null = Get-Command ffmpeg -ErrorAction Stop
        $HasFfmpeg = $true
    } catch {}
}

# ===========================================================================
# Per-LLM Audio Routing
# ===========================================================================
# When mcp-server/server.py invokes play-tts.ps1 on Windows it passes the
# -llm flag with the active LLM identity (e.g. "claude-code", "copilot",
# "codex").  The router reads audio-effects.cfg and looks up the row whose
# key is `llm:<name>`, allowing each LLM to have its own voice, pretext,
# reverb, and engine without requiring global settings to be reconfigured.
#
# Expected audio-effects.cfg row format (pipe-delimited):
#   llm:<name>|REVERB_PRESET|BACKGROUND_FILE|BACKGROUND_VOLUME|VOICE|PRETEXT|ENGINE
#
# Column descriptions:
#   1. Key           - Must start with "llm:" followed by the LLM name
#   2. REVERB_PRESET - One of: off, light, medium, heavy, cathedral (or blank)
#   3. BACKGROUND_FILE - Filename relative to .claude/audio/tracks/ (or blank)
#   4. BACKGROUND_VOLUME - Float 0.0-1.0 (or blank for default 0.25)
#   5. VOICE         - Provider voice name to use (or blank for global default)
#   6. PRETEXT       - Text prepended to all TTS utterances (or blank)
#   7. ENGINE        - Windows engine: windows-sapi, windows-piper, soprano (or blank)
#
# Example rows:
#   llm:claude-code|off|||en_US-amy-medium|Agent Vibes Here|windows-piper
#   llm:copilot|light|||en_US-ryan-low||windows-sapi
#   llm:codex|off||||Code complete|windows-piper
#   llm:default|off|||||
#
# The "default" key is always looked up when no explicit -llm flag is
# provided.  Configure it via Setup → Default → Configure in the TUI to
# apply consistent audio settings across all LLM sessions.
#
# Security: The -llm value is validated against an allowlist regex so that
# injected values like "-rf" or path-traversal strings are rejected before
# they can appear in lookup keys, environment variables, or file paths.

# --- Validate -llm parameter format ------------------------------------------
if ($llm -and $llm -notmatch '^[a-zA-Z0-9][a-zA-Z0-9_-]*$') {
    Write-Host "[WARNING] play-tts.ps1: Invalid -llm value '$llm' ignored" `
        "(must match ^[a-zA-Z0-9][a-zA-Z0-9_-]*`$)" -ForegroundColor Yellow
    $llm = ""
}

# --- Default fallback --------------------------------------------------------
# An empty $llm routes through the "default" pseudo-LLM.  Users who configure
# an `llm:default` row in audio-effects.cfg get consistent audio settings for
# every LLM that doesn't pass its own -llm flag — a convenient global override
# that doesn't require per-LLM configuration.
if (-not $llm) {
    $llm = "default"
}

# --- Export LLM key for child scripts ----------------------------------------
# Provider scripts (play-tts-windows-*.ps1) and any other downstream tooling
# can inspect AGENTVIBES_LLM_KEY to identify which LLM is currently speaking.
# This mirrors the `export AGENTVIBES_LLM_KEY="llm:${LLM_PROVIDER}"` line in
# the POSIX play-tts.sh so the cross-platform contract is symmetric.
$env:AGENTVIBES_LLM_KEY = "llm:$llm"

# --- Lookup per-LLM config in audio-effects.cfg ------------------------------
# Scan project config first, then user-profile config.  Stop at first match.
# Variables are intentionally prefixed with _ to distinguish LLM-local state
# from the global session state set earlier in this script.
$_LlmVoice    = ""
$_LlmPretext  = ""
$_LlmReverb   = ""
$_LlmEngine   = ""
$_LlmBgFile   = ""
$_LlmBgVol    = ""
$_LlmKey      = "llm:$llm"

$_AudioEffectsCfgPaths = @(
    (Join-Path $ClaudeDir "config\audio-effects.cfg"),
    (Join-Path $env:USERPROFILE ".claude\config\audio-effects.cfg")
)

:llmCfgSearch foreach ($_cfgFile in $_AudioEffectsCfgPaths) {
    if ((-not $_LlmVoice) -and (-not $_LlmPretext) -and (Test-Path $_cfgFile)) {
        $cfgContent = Get-Content $_cfgFile -ErrorAction SilentlyContinue
        if ($null -ne $cfgContent) {
            foreach ($_cfgLine in $cfgContent) {
                # Skip blank lines and comment / separator lines
                $stripped = $_cfgLine.Trim()
                if ($stripped.Length -eq 0 -or $stripped.StartsWith('#')) { continue }

                # Split on pipe; expect at least the key column
                $_cols = $_cfgLine -split '\|'
                if ($_cols.Count -ge 1 -and $_cols[0].Trim() -eq $_LlmKey) {
                    # Unpack columns defensively — missing columns stay empty
                    if ($_cols.Count -ge 2) { $_LlmReverb  = $_cols[1].Trim() }
                    if ($_cols.Count -ge 3) { $_LlmBgFile  = $_cols[2].Trim() }
                    if ($_cols.Count -ge 4) { $_LlmBgVol   = $_cols[3].Trim() }
                    if ($_cols.Count -ge 5) { $_LlmVoice   = $_cols[4].Trim() }
                    if ($_cols.Count -ge 6) { $_LlmPretext = $_cols[5].Trim() }
                    if ($_cols.Count -ge 7) { $_LlmEngine  = $_cols[6].Trim() }
                    break llmCfgSearch
                }
            }
        }
    }
}

# --- Voice priority order (highest wins) -------------------------------------
# 1. Explicit -VoiceOverride parameter (caller always wins)
# 2. LLM-specific voice from audio-effects.cfg llm:<key> row
# 3. BMAD agent voice from bmad-voice-map.json (resolved in provider scripts)
# 4. Global active voice from tts-provider.txt / active-voice.txt

# Apply LLM-specific voice only when no explicit -VoiceOverride was passed
if ($_LlmVoice -and -not $VoiceOverride) {
    $VoiceOverride = $_LlmVoice
}

# --- Apply LLM-specific pretext ----------------------------------------------
# Prepend the configured pretext (e.g. "Agent Vibes Here") to the speech
# text.  Guard against double-prefixing on re-entrant or looped calls by
# checking whether the text already starts with the pretext string.
if ($_LlmPretext -and -not $Text.StartsWith($_LlmPretext)) {
    $Text = "$_LlmPretext, $Text"
}

# --- Reverb override from per-LLM config -------------------------------------
# If the llm:<key> row specifies a reverb preset, override the file-based
# $ReverbLevel that was set from reverb-level.txt earlier.  The allowlist
# check is repeated here so a malformed config row can't inject arbitrary
# strings into the ffmpeg filter chain.
if ($_LlmReverb) {
    $validReverbLevels = @("off", "light", "medium", "heavy", "cathedral")
    if ($validReverbLevels -contains $_LlmReverb) {
        $ReverbLevel = $_LlmReverb
        $HasReverb = $ReverbLevel -ne "off"
        # If the LLM config enables reverb and ffmpeg wasn't found yet, retry
        if ($HasReverb -and -not $HasFfmpeg) {
            try { $null = Get-Command ffmpeg -ErrorAction Stop; $HasFfmpeg = $true } catch {}
        }
    }
}

# --- Apply LLM-specific engine override --------------------------------------
# Allowed local Windows engines: windows-sapi, windows-piper, soprano.
# Transport providers (ssh-remote etc.) are not listed because they forward
# TTS to a remote host — overriding with a local engine would synthesize on
# the wrong machine.
if ($_LlmEngine) {
    $allowedLocalEngines = @("windows-sapi", "windows-piper", "soprano")
    if ($allowedLocalEngines -contains $_LlmEngine) {
        switch ($_LlmEngine) {
            "windows-sapi"  { $ProviderScript = "$HooksDir\play-tts-windows-sapi.ps1"  }
            "windows-piper" { $ProviderScript = "$HooksDir\play-tts-windows-piper.ps1" }
            "soprano"       { $ProviderScript = "$HooksDir\play-tts-soprano.ps1"        }
        }
    } else {
        Write-Host "[INFO] play-tts.ps1: Unrecognised engine '$_LlmEngine' in audio-effects.cfg — keeping default provider" -ForegroundColor DarkGray
    }
}

# --- BMAD Party Mode note ----------------------------------------------------
# When BMAD party mode is active, multiple agents speak in rapid succession.
# Each agent's voice is resolved from bmad-voice-map.json inside the provider
# scripts — that BMAD-level routing is independent of this per-LLM system.
# The -llm flag is still used to set AGENTVIBES_LLM_KEY and can supply a
# background music track and reverb preset that stays consistent throughout
# the entire party mode session regardless of which agent is speaking.

# --- Diagnostic output -------------------------------------------------------
# Set AGENTVIBES_VERBOSE=1 in the shell environment to print routing state.
if ($env:AGENTVIBES_VERBOSE -eq "1") {
    Write-Host "[DEBUG] play-tts.ps1 LLM routing: llm=$llm | voice=$VoiceOverride | engine=$_LlmEngine | pretext=$_LlmPretext" -ForegroundColor DarkCyan
    Write-Host "[DEBUG] play-tts.ps1 LLM routing: reverb=$ReverbLevel | HasFfmpeg=$HasFfmpeg | BgEnabled=$BgEnabled | script=$ProviderScript" -ForegroundColor DarkCyan
}

# ===========================================================================
# End of Per-LLM Audio Routing
# ===========================================================================

# Helper: play a WAV file preferring ffplay over SoundPlayer.
# SoundPlayer uses WinMM's low-quality resampler (22050 Hz → 48000 Hz is choppy);
# ffplay uses libswresample with sinc resampling — no artefacts.
function Invoke-AudioPlay {
    param([string]$FilePath)
    $ffplayCmd = Get-Command ffplay -ErrorAction SilentlyContinue
    $fp = if ($ffplayCmd) { $ffplayCmd.Source } else { $null }
    if (-not $fp) {
        # Watcher sessions may inherit a minimal PATH — refresh from registry
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" +
                    [System.Environment]::GetEnvironmentVariable("Path","User")
        $ffplayCmd = Get-Command ffplay -ErrorAction SilentlyContinue
        $fp = if ($ffplayCmd) { $ffplayCmd.Source } else { $null }
    }
    if ($fp) {
        & $fp -autoexit -nodisp -loglevel quiet $FilePath 2>$null
    } else {
        $p = $null
        try   { $p = New-Object System.Media.SoundPlayer $FilePath; $p.PlaySync() }
        finally { if ($p) { $p.Dispose() } }
    }
}

# If background music or reverb enabled and ffmpeg available, tell provider to skip playback
if (($BgEnabled -or $HasReverb) -and $HasFfmpeg) {
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

# Apply reverb and/or mix with background music
if (($BgEnabled -or $HasReverb) -and $HasFfmpeg) {
    $env:AGENTVIBES_NO_PLAY = $null

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
                $proc = Start-Process -FilePath "ffmpeg" -ArgumentList $reverbArgs -NoNewWindow -Wait -PassThru -RedirectStandardError "NUL"
                if ($proc.ExitCode -eq 0 -and (Test-Path $reverbedFile)) {
                    $voicePath = $reverbedFile
                }
            }
        }

        # Mix with background music if enabled
        if ($BgEnabled) {
            # Get background track - default to bachata, or read from config
            $TracksDir = "$ClaudeDir\audio\tracks"
            $DefaultTrack = "agent_vibes_bachata_v1_loop.mp3"
            $DefaultTrackFile = "$ConfigDir\background-music-default.txt"
            if (Test-Path $DefaultTrackFile) {
                $configTrack = (Get-Content $DefaultTrackFile -Raw).Trim()
                # Validate: filename only, no path separators or traversal
                if ($configTrack -and $configTrack -match '^[a-zA-Z0-9_\-\.]+$') {
                    $DefaultTrack = $configTrack
                }
            }
            $BgTrackPath = Join-Path $TracksDir $DefaultTrack
            # Path containment: verify resolved path stays within tracks directory
            $ResolvedBgTrack = [System.IO.Path]::GetFullPath($BgTrackPath)
            $ResolvedTracksDir = [System.IO.Path]::GetFullPath($TracksDir)
            if (-not $ResolvedBgTrack.StartsWith($ResolvedTracksDir + [System.IO.Path]::DirectorySeparatorChar)) {
                $BgTrackPath = Join-Path $TracksDir "agent_vibes_bachata_v1_loop.mp3"
            }

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
                        try {
                            Invoke-AudioPlay $MixedFile
                        } catch {
                            Write-Host "[WARNING] Mixed playback failed, playing voice only" -ForegroundColor Yellow
                            Invoke-AudioPlay $voicePath
                        }
                    } else {
                        # Mixing failed, play voice only
                        Invoke-AudioPlay $voicePath
                    }
                } catch {
                    # ffmpeg failed, play voice only
                    Invoke-AudioPlay $voicePath
                }
            } else {
                # No background track found, play voice only
                Invoke-AudioPlay $voicePath
            }
        } else {
            # No background music, play the (possibly reverbed) voice
            Invoke-AudioPlay $voicePath
        }
    }
} else {
    $env:AGENTVIBES_NO_PLAY = $null
}

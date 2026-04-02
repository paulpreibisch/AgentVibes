#
# File: .claude/hooks-windows/bmad-speak.ps1
#
# AgentVibes BMAD Voice Integration - Windows
# Maps BMAD agent display names or agent IDs to voices and triggers TTS.
# Windows port of .claude/hooks/bmad-speak.sh
#
# Usage: bmad-speak.ps1 "Agent Name" "dialogue text"
#        bmad-speak.ps1 "agent-id" "dialogue text"
#

param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$AgentNameOrId,

    [Parameter(Mandatory = $true, Position = 1)]
    [string]$Dialogue
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ClaudeDir = Split-Path -Parent $ScriptDir
$ProjectRoot = Split-Path -Parent $ClaudeDir

# When running as global script, prefer CLAUDE_PROJECT_DIR for project root
if ($env:CLAUDE_PROJECT_DIR -and (Test-Path "$env:CLAUDE_PROJECT_DIR\_bmad")) {
    $ProjectRoot = $env:CLAUDE_PROJECT_DIR
}

# Strip markdown formatting — prevent SAPI/Piper from speaking asterisks literally
$Dialogue = $Dialogue -replace '\*\*', '' -replace '\*', '' -replace '`', ''
$Dialogue = $Dialogue -replace '\\!', '!' -replace '\\\$', '$'

# Check if party mode is disabled
$PartyModeDisabledFlag = Join-Path $ProjectRoot ".agentvibes\bmad\bmad-party-mode-disabled.flag"
if (Test-Path $PartyModeDisabledFlag) {
    exit 0
}

# Check if BMAD is installed
$ManifestFile = Join-Path $ProjectRoot "_bmad\_config\agent-manifest.csv"
if (-not (Test-Path $ManifestFile)) {
    exit 0
}

# ---------------------------------------------------------------------------
# Read bmad-voice-map.json for per-agent profile
# Prefer project-local voice map, fall back to global
$VoiceMapLocal  = Join-Path $ProjectRoot ".agentvibes\bmad-voice-map.json"
$VoiceMapGlobal = Join-Path $env:USERPROFILE ".agentvibes\bmad-voice-map.json"
$VoiceMapFile   = if (Test-Path $VoiceMapLocal) { $VoiceMapLocal } else { $VoiceMapGlobal }

$AgentVoice     = ""
$AgentPersonality = ""
$AgentBgEnabled = $false
$AgentBgTrack   = ""
$AgentId        = $null

# Read global background music volume (stored as 0.0-1.0 float)
$_BgVolFile = Join-Path $ProjectRoot ".claude\config\background-music-volume.txt"
if (-not (Test-Path $_BgVolFile)) {
    $_BgVolFile = Join-Path $env:USERPROFILE ".claude\config\background-music-volume.txt"
}
if (Test-Path $_BgVolFile) {
    $_BgVolRaw = (Get-Content $_BgVolFile -Raw -ErrorAction SilentlyContinue).Trim()
    $_BgVolParsed = 0.0
    if ([double]::TryParse($_BgVolRaw, [System.Globalization.NumberStyles]::Float, [System.Globalization.CultureInfo]::InvariantCulture, [ref]$_BgVolParsed)) {
        $AgentBgVolume = "{0:F2}" -f $_BgVolParsed
    } else {
        $AgentBgVolume = "0.20"
    }
} else {
    $AgentBgVolume = "0.20"
}

if (Test-Path $VoiceMapFile) {
    try {
        $VoiceMap = Get-Content $VoiceMapFile -Raw | ConvertFrom-Json

        # Resolve agent ID: match canonical ID or display name prefix
        $ManifestRows = Import-Csv $ManifestFile -Encoding UTF8
        foreach ($row in $ManifestRows) {
            $id      = ($row.PSObject.Properties | Select-Object -First 1).Value -replace '^"|"$', ''
            $display = ($row.PSObject.Properties | Select-Object -Skip 1 -First 1).Value -replace '^"|"$', ''
            if ($id -ieq $AgentNameOrId -or $display -like "$AgentNameOrId*") {
                $AgentId = $id
                break
            }
        }

        if ($AgentId -and $VoiceMap.agents.$AgentId) {
            $Profile = $VoiceMap.agents.$AgentId
            if ($Profile.voice)       { $AgentVoice       = $Profile.voice }
            if ($Profile.personality) { $AgentPersonality = $Profile.personality }
            if ($Profile.backgroundMusic) {
                $AgentBgEnabled = [bool]$Profile.backgroundMusic.enabled
                if ($Profile.backgroundMusic.track) { $AgentBgTrack = $Profile.backgroundMusic.track }
                if ($null -ne $Profile.backgroundMusic.volume) {
                    # Voice map stores 0-100; audio-effects.cfg uses 0.0-1.0
                    $AgentBgVolume = "{0:F2}" -f ([double]$Profile.backgroundMusic.volume / 100.0)
                }
            }
        }
    } catch {
        # Silently degrade — TTS will still play with global settings
    }
}

# ---------------------------------------------------------------------------
# Locate play-tts.ps1 — prefer project-local, fall back to global
$PlayTtsLocal  = Join-Path $ProjectRoot ".claude\hooks-windows\play-tts.ps1"
$PlayTtsGlobal = Join-Path $env:USERPROFILE ".claude\hooks-windows\play-tts.ps1"
$PlayTtsScript = if (Test-Path $PlayTtsLocal) { $PlayTtsLocal } else { $PlayTtsGlobal }

if (-not (Test-Path $PlayTtsScript)) {
    exit 0
}

# ---------------------------------------------------------------------------
# Determine which .claude config dir play-tts.ps1 will read.
# play-tts.ps1 checks CLAUDE_PROJECT_DIR first — match that logic exactly.
$TtsClaudeDir = if ($env:CLAUDE_PROJECT_DIR -and (Test-Path "$env:CLAUDE_PROJECT_DIR\.claude")) {
    "$env:CLAUDE_PROJECT_DIR\.claude"
} else {
    $ClaudeDir  # ~/.claude (this script's own ClaudeDir)
}
$TtsConfigDir = Join-Path $TtsClaudeDir "config"

# ---------------------------------------------------------------------------
# Apply per-agent personality override if set
$OldPersonality  = ""
$PersonalityFile = Join-Path $TtsClaudeDir "config\personality.txt"
if ($AgentPersonality -and (Test-Path (Split-Path $PersonalityFile -Parent))) {
    if (Test-Path $PersonalityFile) {
        $OldPersonality = (Get-Content $PersonalityFile -Raw).Trim()
    }
    Set-Content $PersonalityFile $AgentPersonality -NoNewline
}

# ---------------------------------------------------------------------------
# Temporarily patch background music config for this agent.
# The caller (bmad-party-speak.ps1) holds a named mutex so only one speak
# call runs at a time — these file patches are safe from concurrent clobber.
$BgEnabledFile   = Join-Path $TtsConfigDir "background-music-enabled.txt"
$AudioEffectsCfg = Join-Path $TtsConfigDir "audio-effects.cfg"
$OldBgEnabled    = $null
$TempCfgLine     = ""

if ($AgentBgEnabled -and $AgentBgTrack) {
    # Save + enable background music
    if (Test-Path $BgEnabledFile) {
        $OldBgEnabled = (Get-Content $BgEnabledFile -Raw -ErrorAction SilentlyContinue).Trim()
    }
    Set-Content $BgEnabledFile "true" -NoNewline

    # Prepend agent line to audio-effects.cfg so play-tts.ps1 finds it first
    # Format: AGENT_NAME|SOX_EFFECTS|BACKGROUND_FILE|BACKGROUND_VOLUME
    $TempCfgLine = "${AgentId}||${AgentBgTrack}|${AgentBgVolume}"
    $env:AGENTVIBES_AGENT_NAME = $AgentId
    $existingCfg = if (Test-Path $AudioEffectsCfg) {
        Get-Content $AudioEffectsCfg -Raw -ErrorAction SilentlyContinue
    } else { "" }
    Set-Content $AudioEffectsCfg "${TempCfgLine}`n${existingCfg}" -NoNewline
}

try {
    # Speak with agent's voice (or global voice if none configured)
    if ($AgentVoice) {
        & powershell -NoProfile -ExecutionPolicy Bypass -File $PlayTtsScript $Dialogue $AgentVoice
    } else {
        & powershell -NoProfile -ExecutionPolicy Bypass -File $PlayTtsScript $Dialogue
    }
} finally {
    # Restore personality
    if ($AgentPersonality -and $PersonalityFile) {
        if ($OldPersonality) {
            Set-Content $PersonalityFile $OldPersonality -NoNewline
        } elseif (Test-Path $PersonalityFile) {
            Remove-Item $PersonalityFile -Force -ErrorAction SilentlyContinue
        }
    }

    # Restore background music config
    if ($AgentBgEnabled -and $AgentBgTrack) {
        if ($null -ne $OldBgEnabled) {
            Set-Content $BgEnabledFile $OldBgEnabled -NoNewline
        } elseif (Test-Path $BgEnabledFile) {
            Remove-Item $BgEnabledFile -Force -ErrorAction SilentlyContinue
        }

        # Remove the prepended agent line from audio-effects.cfg
        if (Test-Path $AudioEffectsCfg) {
            $cfgRaw = Get-Content $AudioEffectsCfg -Raw -ErrorAction SilentlyContinue
            $escaped = [regex]::Escape($TempCfgLine)
            $cfgRaw  = $cfgRaw -replace "^${escaped}\r?\n?", ""
            Set-Content $AudioEffectsCfg $cfgRaw -NoNewline
        }

        $env:AGENTVIBES_AGENT_NAME = ""
    }
}

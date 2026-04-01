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
$VoiceMapFile = Join-Path $env:USERPROFILE ".agentvibes\bmad-voice-map.json"

$AgentVoice = ""
$AgentPersonality = ""

if (Test-Path $VoiceMapFile) {
    try {
        $VoiceMap = Get-Content $VoiceMapFile -Raw | ConvertFrom-Json

        # Resolve agent ID from display name or direct ID
        $AgentId = $null

        # Check direct match against manifest column 1
        $ManifestRows = Import-Csv $ManifestFile
        foreach ($row in $ManifestRows) {
            $id = ($row.PSObject.Properties | Select-Object -First 1).Value -replace '^"|"$', ''
            $display = ($row.PSObject.Properties | Select-Object -Skip 1 -First 1).Value -replace '^"|"$', ''
            if ($id -ieq $AgentNameOrId -or $display -like "$AgentNameOrId*") {
                $AgentId = $id
                break
            }
        }

        if ($AgentId -and $VoiceMap.agents.$AgentId) {
            $Profile = $VoiceMap.agents.$AgentId
            if ($Profile.voice) { $AgentVoice = $Profile.voice }
            if ($Profile.personality) { $AgentPersonality = $Profile.personality }
        }
    } catch {
        # Silently degrade — TTS will still play with global settings
    }
}

# ---------------------------------------------------------------------------
# Locate play-tts.ps1 — prefer project-local, fall back to global
$PlayTtsLocal = Join-Path $ProjectRoot ".claude\hooks-windows\play-tts.ps1"
$PlayTtsGlobal = Join-Path $env:USERPROFILE ".claude\hooks-windows\play-tts.ps1"
$PlayTtsScript = if (Test-Path $PlayTtsLocal) { $PlayTtsLocal } else { $PlayTtsGlobal }

if (-not (Test-Path $PlayTtsScript)) {
    exit 0
}

# ---------------------------------------------------------------------------
# Apply per-agent personality override if set
$OldPersonality = ""
$PersonalityFile = Join-Path $ClaudeDir "config\personality.txt"
if ($AgentPersonality -and (Test-Path (Split-Path $PersonalityFile -Parent))) {
    if (Test-Path $PersonalityFile) {
        $OldPersonality = (Get-Content $PersonalityFile -Raw).Trim()
    }
    Set-Content $PersonalityFile $AgentPersonality -NoNewline
}

try {
    # Speak with agent's voice (or global voice if none configured)
    if ($AgentVoice) {
        & powershell -NoProfile -ExecutionPolicy Bypass -File $PlayTtsScript $Dialogue $AgentVoice
    } else {
        & powershell -NoProfile -ExecutionPolicy Bypass -File $PlayTtsScript $Dialogue
    }
} finally {
    # Restore original personality
    if ($AgentPersonality -and $PersonalityFile) {
        if ($OldPersonality) {
            Set-Content $PersonalityFile $OldPersonality -NoNewline
        } elseif (Test-Path $PersonalityFile) {
            Remove-Item $PersonalityFile -Force -ErrorAction SilentlyContinue
        }
    }
}

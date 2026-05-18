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
$Dialogue = $Dialogue -replace '\*{1,3}', ''                              # bold, italic, bold-italic
$Dialogue = $Dialogue -replace '`{1,3}[^`]*`{1,3}', ''                    # inline code / code blocks
$Dialogue = $Dialogue -replace '#{1,6}\s*', ''                             # headings
$Dialogue = $Dialogue -replace '_{1,2}', ''                                # underline/italic alt
$Dialogue = $Dialogue -replace '\[([^\]]+)\]\([^)]+\)', '$1'               # links → label only
$Dialogue = $Dialogue -replace '!\[[^\]]*\]\([^)]+\)', ''                  # images
$Dialogue = $Dialogue -replace '(?m)^\s*[-*+]\s+', ''                      # bullet list markers (multiline)
$Dialogue = $Dialogue -replace '(?m)^\s*\d+\.\s+', ''                      # numbered list markers
$Dialogue = $Dialogue -replace '\\([!$*_`\\])', '$1'                       # escaped markdown chars

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
$AgentPretext   = ""
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

# Resolve agent ID and display name/title from manifest (needed for default pretext)
$AgentDisplayName = ""
$AgentTitle       = ""

if (Test-Path $ManifestFile) {
    try {
        $ManifestRows = Import-Csv $ManifestFile -Encoding UTF8
        foreach ($row in $ManifestRows) {
            $id      = ($row.PSObject.Properties | Select-Object -First 1).Value -replace '^"|"$', ''
            $display = ($row.PSObject.Properties | Select-Object -Skip 1 -First 1).Value -replace '^"|"$', ''
            $title   = ($row.PSObject.Properties | Select-Object -Skip 2 -First 1).Value -replace '^"|"$', ''
            if ($id -ieq $AgentNameOrId -or $display -like "$AgentNameOrId*") {
                $AgentId          = $id
                $AgentDisplayName = $display
                $AgentTitle       = $title
                break
            }
        }
    } catch { }
}

if (Test-Path $VoiceMapFile) {
    try {
        $VoiceMap = Get-Content $VoiceMapFile -Raw | ConvertFrom-Json

        if ($AgentId -and $VoiceMap.agents.$AgentId) {
            $Profile = $VoiceMap.agents.$AgentId
            if ($Profile.voice)       { $AgentVoice       = $Profile.voice }
            if ($Profile.pretext)     { $AgentPretext     = $Profile.pretext }
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

# Fallback: parse bmad-voices.md markdown table if JSON voice map had no data
if ((-not $AgentPretext -or -not $AgentVoice) -and $AgentId) {
    $VoicesMdPaths = @(
        (Join-Path $ProjectRoot ".agentvibes\bmad\bmad-voices.md"),
        (Join-Path $env:USERPROFILE ".agentvibes\bmad\bmad-voices.md")
    )
    $shortId = $AgentId -replace '^bmad-agent-', ''
    foreach ($mdPath in $VoicesMdPaths) {
        if (-not (Test-Path $mdPath)) { continue }
        $mdLines = Get-Content $mdPath -Encoding UTF8
        foreach ($mdLine in $mdLines) {
            if ($mdLine -notmatch '^\|') { continue }
            if ($mdLine -match '^\|-') { continue }
            if ($mdLine -match 'Agent ID') { continue }
            $cols = $mdLine -split '\|' | ForEach-Object { $_.Trim() }
            if ($cols.Count -lt 6) { continue }
            $tableId = $cols[1]
            if ($tableId -ieq $shortId -or $tableId -ieq $AgentId -or $tableId -ieq $AgentNameOrId) {
                if (-not $AgentPretext -and $cols[3]) { $AgentPretext = $cols[3] }
                if (-not $AgentVoice -and $cols[5]) { $AgentVoice = $cols[5] }
                if (-not $AgentPersonality -and $cols.Count -ge 7 -and $cols[6] -and $cols[6] -ine 'normal') {
                    $AgentPersonality = $cols[6]
                }
                break
            }
        }
        if ($AgentPretext) { break }
    }
}

# Fall back to default pretext if none stored: "DisplayName, Title here."
# Matches AgentVoiceStore.getDefaultPretext() in agent-voice-store.js
if (-not $AgentPretext) {
    if ($AgentDisplayName -and $AgentTitle) {
        $AgentPretext = "$AgentDisplayName, $AgentTitle here."
    } elseif ($AgentDisplayName) {
        $AgentPretext = "$AgentDisplayName here."
    } elseif ($AgentNameOrId) {
        $AgentPretext = "$AgentNameOrId here."
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
# Apply per-agent background music via AGENTVIBES_OVERRIDE_* env vars.
# play-tts.ps1 reads these directly and forces BgEnabled=true when OVERRIDE_MUSIC
# is set — no config file patching needed, and cleanup is automatic (env vars
# are scoped to the child process spawned by & powershell below).
if ($AgentBgEnabled -and $AgentBgTrack) {
    $env:AGENTVIBES_OVERRIDE_MUSIC  = $AgentBgTrack
    $env:AGENTVIBES_OVERRIDE_VOLUME = $AgentBgVolume
}

try {
    # Prepend pretext if configured (e.g. "As your UX designer")
    $SpeakText = if ($AgentPretext) { "$AgentPretext. $Dialogue" } else { $Dialogue }

    # Speak with agent's voice (or global voice if none configured)
    if ($AgentVoice) {
        & powershell -NoProfile -ExecutionPolicy Bypass -File $PlayTtsScript $SpeakText $AgentVoice
    } else {
        & powershell -NoProfile -ExecutionPolicy Bypass -File $PlayTtsScript $SpeakText
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

    # Clear music override env vars (use SetEnvironmentVariable to fully remove, not just empty)
    if ($AgentBgEnabled -and $AgentBgTrack) {
        [System.Environment]::SetEnvironmentVariable("AGENTVIBES_OVERRIDE_MUSIC",  $null, "Process")
        [System.Environment]::SetEnvironmentVariable("AGENTVIBES_OVERRIDE_VOLUME", $null, "Process")
    }
}

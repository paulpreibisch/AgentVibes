#
# File: agentvibes-receiver.ps1
# Location: Install to $env:USERPROFILE\.agentvibes\play-remote.ps1
#
# AgentVibes Windows TTS Receiver
# Receives base64 JSON payload via stdin (from SSH ForceCommand),
# decodes it, configures voice/music, and delegates to play-tts.ps1.
#
# Payload format (same as Linux receiver):
#   Base64-encoded JSON: { text, voice, effects, music, volume, project, pretext, speed, provider }
#
# Usage (SSH ForceCommand in sshd_config):
#   ForceCommand powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\Paul\.agentvibes\play-remote.ps1
#

param(
    [Parameter(Position = 0)]
    [string]$EncodedPayload = ""
)

# Paths
$AgentVibesDir = "$env:USERPROFILE\.agentvibes"
$ClaudeDir = "$env:USERPROFILE\.claude"
$HooksDir = "$ClaudeDir\hooks-windows"
$ConfigDir = "$ClaudeDir\config"
$LogFile = "$AgentVibesDir\receiver.log"
$PlayTtsScript = "$HooksDir\play-tts.ps1"

# Ensure directories exist
foreach ($dir in @($AgentVibesDir, $ConfigDir)) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
}

# Generate log ID
$LogId = '{0:x4}' -f (Get-Random -Maximum 65536)

function Write-Log {
    param([string]$Status, [string]$Detail = "")
    $timestamp = Get-Date -Format 'yyyy-MM-ddTHH:mm:ss'
    $senderIp = if ($env:SSH_CLIENT) { ($env:SSH_CLIENT -split ' ')[0] } else { "local" }
    $preview = if ($script:Text.Length -gt 200) { $script:Text.Substring(0, 200) } else { $script:Text }
    $logLine = "$timestamp|$Status|$($script:Project)|$($script:Voice)|$preview|$Detail|$senderIp|$LogId"
    Add-Content -Path $LogFile -Value $logLine -ErrorAction SilentlyContinue
}

# ---------------------------------------------------------------------------
# Read payload from stdin or argument
# ---------------------------------------------------------------------------

if (-not $EncodedPayload) {
    # Read from stdin (SSH ForceCommand pipes input)
    $EncodedPayload = [Console]::In.ReadToEnd().Trim()
}

if (-not $EncodedPayload) {
    Write-Output "Error: No payload provided"
    exit 1
}

# Validate base64 format
if ($EncodedPayload -notmatch '^[A-Za-z0-9+/=]+$') {
    Write-Output "Error: Payload must be base64-encoded"
    exit 1
}

# Decode base64
try {
    $decoded = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($EncodedPayload))
} catch {
    Write-Output "Error: Failed to decode base64 payload"
    exit 1
}

# ---------------------------------------------------------------------------
# Parse JSON payload
# ---------------------------------------------------------------------------

$script:Text = ""
$script:Voice = "en_US-lessac-medium"
$SoxEffects = ""
$BgFile = ""
$BgVolume = "0.10"
$script:Project = "unknown"
$Pretext = ""
$Speed = ""
$Provider = "piper"

if ($decoded.TrimStart().StartsWith('{')) {
    # JSON payload
    try {
        $json = $decoded | ConvertFrom-Json
        if ($json.text)     { $script:Text = $json.text }
        if ($json.voice)    { $script:Voice = $json.voice }
        if ($json.effects)  { $SoxEffects = $json.effects }
        if ($json.music)    { $BgFile = $json.music }
        if ($json.volume)   { $BgVolume = $json.volume }
        if ($json.project)  { $script:Project = $json.project }
        if ($json.pretext)  { $Pretext = $json.pretext }
        if ($json.speed)    { $Speed = $json.speed }
        if ($json.provider) { $Provider = $json.provider }
    } catch {
        Write-Output "Error: Failed to parse JSON payload"
        exit 1
    }
} else {
    # Legacy plain text
    $script:Text = $decoded
}

# Validate text
if (-not $script:Text) {
    Write-Output "Error: No text in payload"
    exit 1
}

# Validate voice format
if ($script:Voice -notmatch '^[a-zA-Z0-9_\-\.]+$' -and $script:Voice -notmatch '^[a-zA-Z0-9_\-\.]+::[a-zA-Z0-9_\-\.]+$') {
    $script:Voice = "en_US-lessac-medium"
}

# Validate provider
if ($Provider -notin @("piper", "soprano", "windows-sapi", "windows-piper", "macos")) {
    $Provider = "piper"
}

# Validate volume is numeric
if ($BgVolume -notmatch '^\d+\.?\d*$') {
    $BgVolume = "0.10"
}

# Prepend pretext
if ($Pretext) {
    $script:Text = "$Pretext. $($script:Text)"
}

Write-Log "RECEIVED" "provider=$Provider effects=$SoxEffects music=$BgFile"

# ---------------------------------------------------------------------------
# Configure voice for play-tts.ps1
# ---------------------------------------------------------------------------

# Write voice to tts-voice.txt so play-tts-windows-piper.ps1 picks it up
# Format: "voiceId" or "voiceId::SpeakerName-ID"
$voiceFile = "$ClaudeDir\tts-voice.txt"
Set-Content -Path $voiceFile -Value $script:Voice -NoNewline -ErrorAction SilentlyContinue

# Configure background music if specified
if ($BgFile) {
    # Validate music filename (no path separators)
    if ($BgFile -match '^[a-zA-Z0-9_\-\.]+$') {
        # Update the default line in audio-effects.cfg
        $cfgFile = "$ConfigDir\audio-effects.cfg"
        if (Test-Path $cfgFile) {
            $lines = Get-Content $cfgFile
            $newLines = @()
            $found = $false
            foreach ($line in $lines) {
                if ($line -match '^default\|') {
                    $parts = $line -split '\|'
                    if ($parts.Length -ge 4) {
                        $newLines += "$($parts[0])|$($parts[1])|$BgFile|$BgVolume"
                    } else {
                        $newLines += "default||$BgFile|$BgVolume"
                    }
                    $found = $true
                } else {
                    $newLines += $line
                }
            }
            if (-not $found) {
                $newLines += "default||$BgFile|$BgVolume"
            }
            Set-Content -Path $cfgFile -Value ($newLines -join "`n") -ErrorAction SilentlyContinue
        }
        # Ensure background music is enabled
        Set-Content -Path "$ConfigDir\background-music-enabled.txt" -Value "true" -NoNewline -ErrorAction SilentlyContinue
    }
}

# Set speed if specified
if ($Speed -and $Speed -match '^\d+\.?\d*$') {
    Set-Content -Path "$ConfigDir\tts-speed.txt" -Value $Speed -NoNewline -ErrorAction SilentlyContinue
}

# ---------------------------------------------------------------------------
# Delegate to play-tts.ps1
# ---------------------------------------------------------------------------

if (-not (Test-Path $PlayTtsScript)) {
    Write-Output "Error: play-tts.ps1 not found at $PlayTtsScript"
    Write-Log "ERROR" "play-tts.ps1 not found"
    exit 1
}

Write-Log "PLAYING" "voice=$($script:Voice)"

try {
    & $PlayTtsScript $script:Text $script:Voice
    Write-Log "DONE" "success"
} catch {
    Write-Log "ERROR" "$_"
    Write-Output "Error: TTS playback failed: $_"
    exit 1
}

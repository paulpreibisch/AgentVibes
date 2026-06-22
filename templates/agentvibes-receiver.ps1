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

# Paths - __OWNER_HOME__ is replaced at install time by setup-ssh-receiver.ps1
# with the installing user's home directory (e.g. C:\Users\Paul).
# This is necessary because sshd runs the ForceCommand as the SSH user
# (e.g. agentvibes-receiver), whose $env:USERPROFILE is a different directory.
$OwnerHome = "__OWNER_HOME__"
if (-not (Test-Path "$OwnerHome\.agentvibes")) {
    Write-Output "Error: Receiver not installed properly - run setup-ssh-receiver.ps1"
    exit 1
}
$AgentVibesDir = "$OwnerHome\.agentvibes"
$ClaudeDir = "$OwnerHome\.claude"
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
    # SSH ForceCommand stores the client's requested command in SSH_ORIGINAL_COMMAND
    $EncodedPayload = if ($env:SSH_ORIGINAL_COMMAND) { $env:SSH_ORIGINAL_COMMAND.Trim() } else { "" }
}
if (-not $EncodedPayload) {
    # Fallback: read from stdin (direct invocation or piped input)
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
$Llm = "default"

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
        if ($json.llm)      { $Llm = $json.llm }
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
if ($script:Voice -notmatch '^[a-zA-Z0-9_\-\. ]+$' -and $script:Voice -notmatch '^[a-zA-Z0-9_\-\. ]+::[a-zA-Z0-9_\-\. ]+$') {
    $script:Voice = "en_US-lessac-medium"
}

# Validate provider
if ($Provider -notin @("piper", "soprano", "kokoro", "windows-sapi", "windows-piper", "macos")) {
    $Provider = "piper"
}

# Validate LLM name - only safe identifier chars (mirrors play-tts.ps1 check)
if ($Llm -and $Llm -notmatch '^[a-zA-Z0-9][a-zA-Z0-9_-]*$') {
    $Llm = "default"
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

# Write voice to tts-voice.txt so play-tts-piper.ps1 picks it up
# Format: "voiceId" or "voiceId::SpeakerName-ID"
$voiceFile = "$ClaudeDir\tts-voice.txt"
Set-Content -Path $voiceFile -Value $script:Voice -NoNewline -ErrorAction SilentlyContinue

# Background music and effects are now forwarded through the queue JSON
# (music/volume/effects fields) and applied via AGENTVIBES_OVERRIDE_*
# env vars in the watcher.  No need to mutate audio-effects.cfg here.

# Set speed if specified
if ($Speed -and $Speed -match '^\d+\.?\d*$') {
    Set-Content -Path "$ConfigDir\tts-speed.txt" -Value $Speed -NoNewline -ErrorAction SilentlyContinue
}

# ---------------------------------------------------------------------------
# Drop into queue for the user-session watcher to play
# ---------------------------------------------------------------------------
#
# CRITICAL: SSH receiver runs in Windows session 0 (sshd service), which has
# NO access to audio devices.  Calling play-tts.ps1 directly here would run
# silently - synthesis succeeds, but PlaySync writes to a null audio sink.
#
# Instead, write a JSON request to ~/.agentvibes/tts-queue/.  The watcher
# (tts-watcher.ps1, started by start-watcher.vbs in the user session via the
# Startup folder shortcut) polls this dir and runs play-tts.ps1 with audio
# device access.

$QueueDir = "$OwnerHome\.agentvibes\tts-queue"
if (-not (Test-Path $QueueDir)) {
    New-Item -ItemType Directory -Path $QueueDir -Force | Out-Null
}

$ReqId = [Guid]::NewGuid().ToString().Substring(0, 8)
$ReqFile = "$QueueDir\req-$ReqId.json"
# Pass ALL per-call overrides through the queue so the watcher applies
# them without mutating audio-effects.cfg (avoids race conditions).
$ReqJson = @{
    id       = $ReqId
    text     = $script:Text
    voice    = $script:Voice
    music    = $BgFile
    volume   = $BgVolume
    effects  = $SoxEffects
    speed    = $Speed
    provider = $Provider
    llm      = $Llm
} | ConvertTo-Json -Compress

try {
    [System.IO.File]::WriteAllText($ReqFile, $ReqJson, [System.Text.UTF8Encoding]::new($false))
    Write-Log "QUEUED" "id=$ReqId voice=$($script:Voice)"
    Write-Output "Queued for playback: $ReqId"
} catch {
    Write-Log "ERROR" "Queue write failed: $_"
    Write-Output "Error: failed to queue TTS request: $_"
    exit 1
}

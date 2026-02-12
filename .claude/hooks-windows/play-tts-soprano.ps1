#
# File: .claude/hooks-windows/play-tts-soprano.ps1
#
# AgentVibes - Soprano TTS Provider for Windows
# Ultra-fast neural TTS via Soprano (80M params)
#
# Supports three modes (auto-detected in priority order):
#   1. WebUI mode: Gradio WebUI running (soprano-webui), uses Python helper
#   2. API mode: OpenAI-compatible server, uses Invoke-RestMethod
#   3. CLI mode: Direct soprano command (reloads model each call, slowest)
#

param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$Text,

    [Parameter(Mandatory = $false, Position = 1)]
    [string]$VoiceOverride  # Ignored - Soprano has a single voice
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
# Validate port is numeric to prevent injection
$SopranoPort = "7860"
if ($env:SOPRANO_PORT -and $env:SOPRANO_PORT -match '^\d+$') {
    $portNum = [int]$env:SOPRANO_PORT
    if ($portNum -gt 0 -and $portNum -le 65535) {
        $SopranoPort = $env:SOPRANO_PORT
    }
}
$SopranoDevice = if ($env:SOPRANO_DEVICE) { $env:SOPRANO_DEVICE } else { "auto" }

# Sanitize text for TTS - strip shell metacharacters and PS special chars
$Text = $Text -replace '[\\`"{}$<>|~^;''()]', '' -replace '\s+', ' '
$Text = $Text.Trim()

if (-not $Text) {
    Write-Host "Usage: play-tts-soprano.ps1 'text to speak' [voice_override]"
    exit 1
}

# Determine audio directory
$ProjectClaudeDir = Join-Path (Split-Path -Parent (Split-Path -Parent $ScriptDir)) ".claude"
if (Test-Path $ProjectClaudeDir) {
    $AudioDir = Join-Path $ProjectClaudeDir "audio"
} else {
    $AudioDir = "$env:USERPROFILE\.claude\audio"
}

if (-not (Test-Path $AudioDir)) {
    New-Item -ItemType Directory -Path $AudioDir -Force | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$random = Get-Random -Maximum 9999
$TempFile = Join-Path $AudioDir "tts-$timestamp-$random.wav"

# Check WebUI server
function Test-WebUI {
    try {
        $null = Invoke-WebRequest -Uri "http://127.0.0.1:${SopranoPort}/gradio_api/info" -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
        return $true
    } catch {
        try {
            $null = Invoke-WebRequest -Uri "http://127.0.0.1:${SopranoPort}/info" -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
            return $true
        } catch {
            return $false
        }
    }
}

# Check API server
function Test-APIServer {
    try {
        $body = '{"input":"test"}'
        $null = Invoke-RestMethod -Uri "http://127.0.0.1:${SopranoPort}/v1/audio/speech" `
            -Method POST -ContentType "application/json" -Body $body -TimeoutSec 2 -ErrorAction Stop
        return $true
    } catch {
        return $false
    }
}

# Check CLI availability
function Test-SopranoCLI {
    try {
        $null = Get-Command soprano -ErrorAction Stop
        return $true
    } catch {
        return $false
    }
}

# Synthesize speech
$SynthMode = ""

if (Test-WebUI) {
    # Gradio WebUI mode - use Python helper for SSE protocol
    $SynthMode = "webui"
    $pythonHelper = Join-Path $ScriptDir "soprano-gradio-synth.py"
    if (Test-Path $pythonHelper) {
        & python $pythonHelper $Text $TempFile $SopranoPort 2>$null
    } else {
        Write-Host "[ERROR] soprano-gradio-synth.py not found" -ForegroundColor Red
        exit 1
    }
} elseif (Test-APIServer) {
    # OpenAI-compatible API mode
    $SynthMode = "api"
    # Build JSON safely using ConvertTo-Json to avoid injection
    $bodyObj = @{ input = $Text }
    $body = $bodyObj | ConvertTo-Json -Compress
    try {
        Invoke-RestMethod -Uri "http://127.0.0.1:${SopranoPort}/v1/audio/speech" `
            -Method POST -ContentType "application/json" -Body $body `
            -OutFile $TempFile -ErrorAction Stop
    } catch {
        Write-Host "[ERROR] API synthesis failed: $_" -ForegroundColor Red
        exit 4
    }
} elseif (Test-SopranoCLI) {
    # CLI fallback - reloads model each call (slowest)
    $SynthMode = "cli"
    & soprano $Text -o $TempFile -d $SopranoDevice 2>$null
} else {
    Write-Host "[ERROR] Soprano TTS not installed and no server running on port $SopranoPort" -ForegroundColor Red
    Write-Host ""
    Write-Host "Install:  pip install soprano-tts" -ForegroundColor Yellow
    Write-Host "  (GPU):  pip install soprano-tts[lmdeploy]" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Start WebUI:  soprano-webui" -ForegroundColor Yellow
    Write-Host "Start API:    uvicorn soprano.server:app --host 127.0.0.1 --port $SopranoPort" -ForegroundColor Yellow
    exit 2
}

# Verify output
if (-not (Test-Path $TempFile) -or (Get-Item $TempFile).Length -eq 0) {
    Write-Host "[ERROR] Failed to synthesize speech with Soprano ($SynthMode mode)" -ForegroundColor Red
    exit 4
}

# Play audio with proper resource cleanup (skip if AGENTVIBES_NO_PLAY is set)
if (-not $env:AGENTVIBES_NO_PLAY) {
    $player = $null
    try {
        $player = New-Object System.Media.SoundPlayer $TempFile
        $player.PlaySync()
    } catch {
        Write-Host "[ERROR] Audio playback failed: $_" -ForegroundColor Red
    } finally {
        if ($player) { $player.Dispose() }
    }
}

Write-Host "Saved to: $TempFile"
Write-Host "Voice: Soprano-1.1-80M (Soprano TTS, $SynthMode mode)"

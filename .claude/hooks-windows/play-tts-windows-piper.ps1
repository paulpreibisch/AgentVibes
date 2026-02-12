#
# File: .claude/hooks-windows/play-tts-windows-piper.ps1
#
# AgentVibes - Windows Piper TTS Provider
# High-quality neural TTS using Piper.exe
#

param(
    [Parameter(Mandatory = $true)]
    [string]$Text,

    [Parameter(Mandatory = $false)]
    [string]$VoiceOverride
)

# Configuration paths
$ScriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectClaudeDir = Join-Path (Split-Path -Parent (Split-Path -Parent $ScriptPath)) ".claude"

if (Test-Path $ProjectClaudeDir) {
    $ClaudeDir = $ProjectClaudeDir
} else {
    $ClaudeDir = "$env:USERPROFILE\.claude"
}

# Audio cache and voice config use project-local .claude
$AudioDir = "$ClaudeDir\audio"
$VoiceFile = "$ClaudeDir\tts-voice-piper.txt"

# Voices and Piper binary are global (shared across projects, ~100MB+)
$UserClaudeDir = "$env:USERPROFILE\.claude"
$VoicesDir = "$UserClaudeDir\piper-voices"
$PiperExe = "$env:LOCALAPPDATA\Programs\Piper\piper.exe"

# Ensure directories exist
foreach ($dir in @($AudioDir, $VoicesDir)) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
}

# Check if Piper is installed
if (-not (Test-Path $PiperExe)) {
    Write-Host "[ERROR] Piper not found at: $PiperExe" -ForegroundColor Red
    Write-Host "Run: .\setup-windows.ps1 to install Piper" -ForegroundColor Yellow
    exit 1
}

# Determine voice to use
$VoiceName = ""

if ($VoiceOverride) {
    $VoiceName = $VoiceOverride
}
elseif (Test-Path $VoiceFile) {
    $VoiceName = (Get-Content $VoiceFile -Raw).Trim()
}

# Default voice if not specified
if (-not $VoiceName) {
    $VoiceName = "en_US-ryan-high"
}

# Security: Validate voice name to prevent path traversal
# Only allow alphanumeric, underscore, hyphen, and period
if ($VoiceName -notmatch '^[a-zA-Z0-9_\-\.]+$') {
    Write-Host "[ERROR] Invalid voice name: $VoiceName" -ForegroundColor Red
    exit 1
}

# Resolve voice model path and validate it stays within VoicesDir
$VoiceModelFile = [System.IO.Path]::GetFullPath("$VoicesDir\$VoiceName.onnx")
$VoiceJsonFile = [System.IO.Path]::GetFullPath("$VoicesDir\$VoiceName.onnx.json")
$ResolvedVoicesDir = [System.IO.Path]::GetFullPath($VoicesDir)
if (-not $VoiceModelFile.StartsWith($ResolvedVoicesDir)) {
    Write-Host "[ERROR] Voice path outside voices directory" -ForegroundColor Red
    exit 1
}

# Check if voice model exists, download if missing
if (-not (Test-Path $VoiceModelFile)) {
    Write-Host "[DOWNLOAD] Voice model: $VoiceName" -ForegroundColor Yellow

    # Try to download from Hugging Face
    # Voice name format: {lang}_{region}-{speaker}-{quality}
    # HF path format:    {lang}/{lang}_{region}/{speaker}/{quality}/{voicename}.onnx
    try {
        # Parse voice name to build correct HF path
        # e.g. en_US-ryan-high -> en/en_US/ryan/high/en_US-ryan-high.onnx
        if ($VoiceName -match '^([a-z]{2})_([A-Z]{2})-([a-zA-Z0-9_]+)-([a-z]+)$') {
            $Lang = $Matches[1]
            $LangRegion = "$($Matches[1])_$($Matches[2])"
            $Speaker = $Matches[3]
            $Quality = $Matches[4]
            $HFBase = "https://huggingface.co/rhasspy/piper-voices/resolve/main/$Lang/$LangRegion/$Speaker/$Quality"
        } else {
            # Fallback for non-standard voice names
            $HFBase = "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/ryan/high"
        }
        $ModelUrl = "$HFBase/$VoiceName.onnx"
        $JsonUrl = "$HFBase/$VoiceName.onnx.json"

        Write-Host "   Downloading model..." -ForegroundColor Cyan
        Invoke-WebRequest -Uri $ModelUrl -OutFile $VoiceModelFile -ErrorAction Stop
        Write-Host "   Downloading config..." -ForegroundColor Cyan
        Invoke-WebRequest -Uri $JsonUrl -OutFile $VoiceJsonFile -ErrorAction Stop
        Write-Host "[OK] Voice model downloaded" -ForegroundColor Green
    }
    catch {
        Write-Host "[ERROR] Failed to download voice model: $_" -ForegroundColor Red
        Write-Host "Make sure you have internet connection" -ForegroundColor Yellow
        exit 1
    }
}

# Sanitize text for speech - strip shell metacharacters and PS special chars
$Text = $Text -replace '\\', ' '
$Text = $Text -replace '[{}<>|`~^$;"''()]', ''
$Text = $Text -replace '\s+', ' '
$Text = $Text.Trim()

# Create audio file path
$Timestamp = Get-Date -Format 'yyyyMMdd-HHmmss-ffff'
$AudioFile = "$AudioDir\tts-$Timestamp.wav"

# Synthesize with Piper
try {
    Write-Host "[SYNTH] Synthesizing with Piper..." -ForegroundColor Cyan

    # Run Piper with text input
    $Text | & $PiperExe `
        --model $VoiceModelFile `
        --output-file $AudioFile `
        2>$null

    if (-not (Test-Path $AudioFile)) {
        Write-Host "[ERROR] Piper synthesis failed" -ForegroundColor Red
        exit 1
    }

    # Display results
    Write-Host "[OK] Saved to: $AudioFile" -ForegroundColor Green
    Write-Host "[VOICE] Voice used: $VoiceName (Piper)" -ForegroundColor Green

    # Play the audio using built-in Windows audio player (skip if AGENTVIBES_NO_PLAY is set)
    if (-not $env:AGENTVIBES_NO_PLAY) {
        $player = $null
        try {
            $player = New-Object System.Media.SoundPlayer $AudioFile
            $player.PlaySync()
        }
        catch {
            Write-Host "[WARNING] Could not play audio (SoundPlayer unavailable)" -ForegroundColor Yellow
            Write-Host "Audio saved to: $AudioFile" -ForegroundColor Gray
        }
        finally {
            if ($player) { $player.Dispose() }
        }
    }
}
catch {
    Write-Host "[ERROR] Error running Piper: $_" -ForegroundColor Red
    exit 1
}

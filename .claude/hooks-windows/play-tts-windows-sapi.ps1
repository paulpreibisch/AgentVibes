#
# File: .claude/hooks-windows/play-tts-windows-sapi.ps1
#
# AgentVibes - Windows SAPI TTS Provider (Zero Dependencies)
# Uses built-in Windows System.Speech API
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

$AudioDir = "$ClaudeDir\audio"
$VoiceFile = "$ClaudeDir\tts-voice-sapi.txt"

# Ensure directories exist
if (-not (Test-Path $AudioDir)) {
    New-Item -ItemType Directory -Path $AudioDir -Force | Out-Null
}

# Load System.Speech assembly
try {
    Add-Type -AssemblyName System.Speech
}
catch {
    Write-Host "[ERROR] System.Speech assembly not available" -ForegroundColor Red
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

# Initialize speech synthesizer
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer

# Set voice if specified
if ($VoiceName) {
    try {
        $synth.SelectVoice($VoiceName)
    }
    catch {
        Write-Host "[WARNING] Voice '$VoiceName' not found, using default" -ForegroundColor Yellow
    }
}

# Sanitize text for speech - strip shell metacharacters, PS special chars, and SSML tags
$Text = $Text -replace '\\', ' '
$Text = $Text -replace '[{}<>|`~^$;"''()]', ''
$Text = $Text -replace '&[a-zA-Z]+;', ''
$Text = $Text -replace '\s+', ' '
$Text = $Text.Trim()

# Get actual voice name (after selection or default)
$ActualVoice = $synth.Voice.Name

# Create audio file path
$Timestamp = Get-Date -Format 'yyyyMMdd-HHmmss-ffff'
$AudioFile = "$AudioDir\tts-$Timestamp.wav"

# Save to WAV file with proper resource cleanup
$player = $null
try {
    $synth.SetOutputToWaveFile($AudioFile)
    $synth.Speak($Text)

    # Display results
    Write-Host "[OK] Saved to: $AudioFile" -ForegroundColor Green
    Write-Host "[VOICE] Voice used: $ActualVoice (Windows SAPI)" -ForegroundColor Green

    # Play the audio using built-in Windows audio player (skip if AGENTVIBES_NO_PLAY is set)
    if (-not $env:AGENTVIBES_NO_PLAY) {
        try {
            $player = New-Object System.Media.SoundPlayer $AudioFile
            $player.PlaySync()
        }
        catch {
            Write-Host "[WARNING] Could not play audio (SoundPlayer unavailable)" -ForegroundColor Yellow
        }
    }
}
catch {
    Write-Host "[ERROR] Error synthesizing speech: $_" -ForegroundColor Red
    exit 1
}
finally {
    if ($synth) { $synth.Dispose() }
    if ($player) { $player.Dispose() }
}

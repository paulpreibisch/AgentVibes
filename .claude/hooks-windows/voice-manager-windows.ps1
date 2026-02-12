#
# File: .claude/hooks-windows/voice-manager-windows.ps1
#
# AgentVibes - Windows Voice Management
#

param(
    [Parameter(Position = 0)]
    [ValidateSet('list', 'switch', 'get')]
    [string]$Command = 'list',

    [Parameter(Position = 1)]
    [string]$VoiceName
)

$ClaudeDir = "$env:USERPROFILE\.claude"
$ProviderFile = "$ClaudeDir\tts-provider.txt"
$VoiceSapiFile = "$ClaudeDir\tts-voice-sapi.txt"
$VoicePiperFile = "$ClaudeDir\tts-voice-piper.txt"

# Get active provider
$ActiveProvider = "windows-sapi"
if (Test-Path $ProviderFile) {
    $ActiveProvider = (Get-Content $ProviderFile -Raw).Trim()
}

# Get SAPI voices
function Get-SAPIVoices {
    Add-Type -AssemblyName System.Speech

    $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
    $voices = @()

    foreach ($voice in $synth.GetInstalledVoices()) {
        $voices += $voice.VoiceInfo.Name
    }

    return $voices
}

# Get Piper voices
function Get-PiperVoices {
    $VoicesDir = "$ClaudeDir\piper-voices"

    if (-not (Test-Path $VoicesDir)) {
        return @()
    }

    $voices = @()
    $onnxFiles = Get-ChildItem -Path $VoicesDir -Filter "*.onnx" -ErrorAction SilentlyContinue

    foreach ($file in $onnxFiles) {
        $name = $file.BaseName
        $voices += $name
    }

    return $voices
}

# List available voices
function List-Voices {
    Write-Host ""
    Write-Host "[VOICES] Available Voices by Provider" -ForegroundColor Cyan
    Write-Host ""

    # SAPI voices
    Write-Host "[SAPI] Windows SAPI (Built-in):" -ForegroundColor Green
    $sapiVoices = Get-SAPIVoices

    if ($sapiVoices.Count -eq 0) {
        Write-Host "   (No voices installed)" -ForegroundColor Gray
    }
    else {
        $sapiVoices | ForEach-Object {
            $marker = if ($_ -eq (Get-CurrentVoice $VoiceSapiFile)) { "*" } else { " " }
            Write-Host "   [$marker] $_" -ForegroundColor White
        }
    }

    Write-Host ""

    # Piper voices
    Write-Host "[PIPER] Piper (High Quality):" -ForegroundColor Green
    $piperVoices = Get-PiperVoices

    if ($piperVoices.Count -eq 0) {
        Write-Host "   (No voices downloaded - run setup-windows.ps1)" -ForegroundColor Gray
    }
    else {
        $piperVoices | ForEach-Object {
            $marker = if ($_ -eq (Get-CurrentVoice $VoicePiperFile)) { "*" } else { " " }
            Write-Host "   [$marker] $_" -ForegroundColor White
        }
    }

    Write-Host ""
    Write-Host "[ACTIVE] Active Provider: $ActiveProvider" -ForegroundColor Cyan
    Write-Host ""
}

# Get current voice for provider
function Get-CurrentVoice {
    param([string]$VoiceFile)

    if (Test-Path $VoiceFile) {
        return (Get-Content $VoiceFile -Raw).Trim()
    }

    return $null
}

# Switch voice
function Switch-Voice {
    param([string]$NewVoice)

    # Determine which provider's voice file to update
    $VoiceFile = ""
    $ValidVoices = @()

    if ($ActiveProvider -eq "windows-sapi") {
        $VoiceFile = $VoiceSapiFile
        $ValidVoices = Get-SAPIVoices
    }
    elseif ($ActiveProvider -eq "windows-piper") {
        $VoiceFile = $VoicePiperFile
        $ValidVoices = Get-PiperVoices
    }
    elseif ($ActiveProvider -eq "soprano") {
        Write-Host "[INFO] Soprano uses a single fixed voice (Soprano-1.1-80M)" -ForegroundColor Cyan
        return $true
    }

    if ($ValidVoices -notcontains $NewVoice) {
        Write-Host "[ERROR] Voice not found: $NewVoice" -ForegroundColor Red
        Write-Host "Available voices for ${ActiveProvider}:" -ForegroundColor Yellow
        $ValidVoices | ForEach-Object { Write-Host "   - $_" }
        return $false
    }

    Set-Content -Path $VoiceFile -Value $NewVoice
    Write-Host "[OK] Voice set to: $NewVoice" -ForegroundColor Green
    return $true
}

# Show current voice
function Show-CurrentVoice {
    $VoiceFile = if ($ActiveProvider -eq "windows-sapi") { $VoiceSapiFile } else { $VoicePiperFile }
    $CurrentVoice = Get-CurrentVoice $VoiceFile

    if ($CurrentVoice) {
        Write-Host "[VOICE] Current voice: $CurrentVoice ($ActiveProvider)" -ForegroundColor Cyan
    }
    else {
        Write-Host "[VOICE] Using default voice ($ActiveProvider)" -ForegroundColor Cyan
    }
}

# Main command routing
switch ($Command) {
    'list' {
        List-Voices
    }

    'switch' {
        if (-not $VoiceName) {
            Write-Host "[ERROR] Voice name required" -ForegroundColor Red
            List-Voices
            exit 1
        }
        Switch-Voice $VoiceName | Out-Null
    }

    'get' {
        Show-CurrentVoice
    }
}

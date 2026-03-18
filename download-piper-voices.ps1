#
# File: download-piper-voices.ps1
#
# AgentVibes - Download Piper Voice Models
# Downloads voice models from HuggingFace for offline TTS
#

Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "     Piper Voice Model Downloader" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$VoiceDir = "$env:USERPROFILE\.claude\piper-voices"

# Create directory if it doesn't exist
if (-not (Test-Path $VoiceDir)) {
    Write-Host "Creating directory: $VoiceDir" -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $VoiceDir -Force | Out-Null
}

Write-Host "Voice directory: $VoiceDir" -ForegroundColor Gray
Write-Host ""

# Voice models to download
$Voices = @(
    @{
        name = "en_US-ryan-high"
        description = "Male voice (high quality) - DEFAULT"
        modelUrl = "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/ryan/high/en_US-ryan-high.onnx"
        configUrl = "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/ryan/high/en_US-ryan-high.onnx.json"
    }
)

# Download voices
foreach ($voice in $Voices) {
    Write-Host "Downloading: $($voice.name)" -ForegroundColor Cyan
    Write-Host "   Description: $($voice.description)" -ForegroundColor Gray

    $modelFile = "$VoiceDir\$($voice.name).onnx"
    $configFile = "$VoiceDir\$($voice.name).onnx.json"

    # Check if already exists
    if ((Test-Path $modelFile) -and (Test-Path $configFile)) {
        Write-Host "   [OK] Already downloaded" -ForegroundColor Green
        continue
    }

    try {
        Write-Host "   Downloading model file..." -ForegroundColor Yellow
        Invoke-WebRequest -Uri $voice.modelUrl -OutFile $modelFile -ErrorAction Stop

        Write-Host "   Downloading config file..." -ForegroundColor Yellow
        Invoke-WebRequest -Uri $voice.configUrl -OutFile $configFile -ErrorAction Stop

        $modelSize = (Get-Item $modelFile).Length / 1MB
        Write-Host "   [OK] Downloaded ($([math]::Round($modelSize, 2)) MB)" -ForegroundColor Green
    }
    catch {
        Write-Host "   [ERROR] Failed to download: $_" -ForegroundColor Red
        Write-Host "   Check your internet connection and try again" -ForegroundColor Yellow
    }

    Write-Host ""
}

# Summary
Write-Host "======================================================" -ForegroundColor Green
Write-Host "              Download Complete!" -ForegroundColor Green
Write-Host "======================================================" -ForegroundColor Green
Write-Host ""

Write-Host "Voice models are ready. You can now test Piper:" -ForegroundColor Cyan
Write-Host "   .\.claude\hooks-windows\play-tts.ps1 `"Hello from Piper`"" -ForegroundColor Gray
Write-Host ""

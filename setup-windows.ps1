#
# File: setup-windows.ps1
#
# AgentVibes Windows Native Setup Script
# Installs and configures AgentVibes for Windows
#

param(
    [Parameter(Mandatory = $false)]
    [ValidateSet('piper', 'sapi')]
    [string]$Provider
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "      AgentVibes - Windows Native Setup" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""

# PowerShell version check
$PSVersionRequired = [Version]"5.1"
if ($PSVersionTable.PSVersion -lt $PSVersionRequired) {
    Write-Host "[ERROR] PowerShell 5.1+ required" -ForegroundColor Red
    Write-Host "Current: $($PSVersionTable.PSVersion)" -ForegroundColor Yellow
    exit 1
}

Write-Host "[OK] PowerShell version: $($PSVersionTable.PSVersion)" -ForegroundColor Green

# Detect project root: if running from node_modules\agentvibes, project root is two levels up
$ScriptDir = $PSScriptRoot
if ($ScriptDir -match '[\\/]node_modules[\\/]agentvibes$') {
    $ProjectRoot = (Resolve-Path (Join-Path $ScriptDir "..\..")).Path
    Write-Host "[OK] Detected npm install in: $ProjectRoot" -ForegroundColor Green
} else {
    $ProjectRoot = $ScriptDir
}

# Setup paths - hooks go to the PROJECT, system-wide tools go to user profile
$ProjectClaudeDir = "$ProjectRoot\.claude"
$HooksDir = "$ProjectClaudeDir\hooks-windows"
$UserClaudeDir = "$env:USERPROFILE\.claude"
$AudioDir = "$UserClaudeDir\audio"
$VoicesDir = "$UserClaudeDir\piper-voices"
$PiperDir = "$env:LOCALAPPDATA\Programs\Piper"
$PiperExe = "$PiperDir\piper.exe"

Write-Host ""
Write-Host "Setting up directories..." -ForegroundColor Cyan

foreach ($dir in @($ProjectClaudeDir, $UserClaudeDir, $AudioDir, $VoicesDir, $PiperDir)) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "   [OK] Created: $dir" -ForegroundColor Green
    }
    else {
        Write-Host "   [OK] Exists: $dir" -ForegroundColor Green
    }
}

# Copy hook scripts to the project directory
Write-Host ""
Write-Host "Installing hook scripts to project..." -ForegroundColor Cyan

$SourceHooksDir = Join-Path $ScriptDir ".claude\hooks-windows"

# Validate source path is within the script directory (path traversal prevention)
$ResolvedSource = (Resolve-Path -Path $SourceHooksDir -ErrorAction SilentlyContinue).Path
$ResolvedScript = (Resolve-Path -Path $ScriptDir).Path

if (-not $ResolvedSource -or -not $ResolvedSource.StartsWith($ResolvedScript)) {
    Write-Host "[ERROR] Hook scripts source path is outside the project directory" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $SourceHooksDir)) {
    Write-Host "[ERROR] Hook scripts not found at: $SourceHooksDir" -ForegroundColor Red
    Write-Host "   Make sure you're running this from the AgentVibes project directory" -ForegroundColor Yellow
    exit 1
}

# Ensure destination hooks directory exists
if (-not (Test-Path $HooksDir)) {
    New-Item -ItemType Directory -Path $HooksDir -Force | Out-Null
}

$HookScripts = @(
    "play-tts.ps1",
    "play-tts-windows-piper.ps1",
    "play-tts-windows-sapi.ps1",
    "play-tts-soprano.ps1",
    "provider-manager.ps1",
    "voice-manager-windows.ps1",
    "audio-cache-utils.ps1",
    "session-start-tts.ps1"
)

$CopiedCount = 0
foreach ($script in $HookScripts) {
    $SourceFile = Join-Path $SourceHooksDir $script
    $DestFile = Join-Path $HooksDir $script

    if (Test-Path $SourceFile) {
        # Skip if source and destination are the same file (running from project root)
        $resolvedSrc = (Resolve-Path $SourceFile).Path
        $resolvedDst = if (Test-Path $DestFile) { (Resolve-Path $DestFile).Path } else { "" }
        if ($resolvedSrc -eq $resolvedDst) {
            Write-Host "   [OK] Already in place: $script" -ForegroundColor Green
        } else {
            Copy-Item -Path $SourceFile -Destination $DestFile -Force
            Write-Host "   [OK] Copied: $script" -ForegroundColor Green
        }
        $CopiedCount++
    }
    else {
        Write-Host "   [WARNING] Missing: $script" -ForegroundColor Yellow
    }
}

if ($CopiedCount -eq 0) {
    Write-Host "[ERROR] No hook scripts were copied" -ForegroundColor Red
    exit 1
}

Write-Host "[OK] Installed $CopiedCount hook scripts to: $HooksDir" -ForegroundColor Green

# Provider selection
if (-not $Provider) {
    Write-Host ""
    Write-Host "Choose TTS Provider:" -ForegroundColor Cyan
    Write-Host "   [1] Piper (High Quality, ~100MB download)" -ForegroundColor White
    Write-Host "   [2] Windows SAPI (Built-in, Basic Quality)" -ForegroundColor White
    Write-Host ""
    $choice = Read-Host "Enter your choice (1 or 2, default: 1)"

    $Provider = if ([string]::IsNullOrWhiteSpace($choice) -or $choice -eq "1") { "piper" } else { "sapi" }
}

Write-Host ""
Write-Host "Provider: $Provider" -ForegroundColor Green

# Install Piper if selected
if ($Provider -eq "piper") {
    Write-Host ""
    Write-Host "Installing Piper..." -ForegroundColor Cyan

    if (Test-Path $PiperExe) {
        Write-Host "[OK] Piper already installed" -ForegroundColor Green
    }
    else {
        Write-Host "   Downloading Piper from GitHub..." -ForegroundColor Yellow

        # Download Piper from GitHub releases
        $DownloadUrl = "https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_windows_amd64.zip"
        $DownloadFile = "$env:TEMP\piper-windows.zip"

        try {
            Write-Host "   URL: $DownloadUrl" -ForegroundColor Gray

            [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
            Invoke-WebRequest -Uri $DownloadUrl -OutFile $DownloadFile -ErrorAction Stop

            Write-Host "[OK] Downloaded ($('{0:N2}' -f ((Get-Item $DownloadFile).Length / 1MB)) MB)" -ForegroundColor Green

            # Extract to temp location first
            Write-Host "   Extracting..." -ForegroundColor Yellow
            $TempExtractDir = "$env:TEMP\piper-extract"
            Remove-Item -Path $TempExtractDir -Recurse -Force -ErrorAction SilentlyContinue
            Expand-Archive -Path $DownloadFile -DestinationPath $TempExtractDir -Force

            # Find piper.exe recursively
            $PiperFound = Get-ChildItem -Path $TempExtractDir -Name "piper.exe" -Recurse

            if ($PiperFound) {
                # Get the full path to piper.exe
                $PiperExePath = (Get-ChildItem -Path $TempExtractDir -Filter "piper.exe" -Recurse).FullName | Select-Object -First 1
                $PiperSourceDir = Split-Path -Parent $PiperExePath

                # Copy entire piper directory to destination
                Write-Host "   Copying Piper to: $PiperDir" -ForegroundColor Yellow
                Copy-Item -Path "$PiperSourceDir\*" -Destination $PiperDir -Recurse -Force

                # Verify
                if (Test-Path $PiperExe) {
                    Write-Host "[OK] Piper installed to: $PiperDir" -ForegroundColor Green
                }
                else {
                    throw "Failed to copy Piper executable"
                }
            }
            else {
                throw "piper.exe not found in extracted files"
            }

            # Cleanup temp extract directory
            Remove-Item -Path $TempExtractDir -Recurse -Force -ErrorAction SilentlyContinue

            # Cleanup
            Remove-Item $DownloadFile -Force -ErrorAction SilentlyContinue
        }
        catch {
            Write-Host "[ERROR] Failed to install Piper: $_" -ForegroundColor Red
            Write-Host "   Please check your internet connection and try again" -ForegroundColor Yellow
            exit 1
        }
    }

    # Download a default voice
    Write-Host ""
    Write-Host "Setting up default voice..." -ForegroundColor Cyan

    $DefaultVoice = "en_US-ryan-high"
    $VoiceDir = $VoicesDir

    # Check if voice already exists
    if ((Test-Path "$VoiceDir\$DefaultVoice.onnx") -and (Test-Path "$VoiceDir\$DefaultVoice.onnx.json")) {
        Write-Host "[OK] Default voice already downloaded" -ForegroundColor Green
    }
    else {
        Write-Host "   Downloading $DefaultVoice..." -ForegroundColor Yellow

        try {
            $HFBase = "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/ryan/high"

            [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

            Write-Host "   Model file..." -ForegroundColor Gray
            Invoke-WebRequest -Uri "$HFBase/$DefaultVoice.onnx" `
                -OutFile "$VoiceDir\$DefaultVoice.onnx" `
                -ErrorAction Stop

            Write-Host "   Config file..." -ForegroundColor Gray
            Invoke-WebRequest -Uri "$HFBase/$DefaultVoice.onnx.json" `
                -OutFile "$VoiceDir\$DefaultVoice.onnx.json" `
                -ErrorAction Stop

            Write-Host "[OK] Voice downloaded" -ForegroundColor Green
        }
        catch {
            Write-Host "[WARNING] Could not download voice: $_" -ForegroundColor Yellow
            Write-Host "   You can download voices manually later" -ForegroundColor Gray
        }
    }
}

# Set active provider
Write-Host ""
Write-Host "Configuring provider..." -ForegroundColor Cyan

$ProviderFile = "$ProjectClaudeDir\tts-provider.txt"
$ProviderName = if ($Provider -eq "piper") { "windows-piper" } else { "windows-sapi" }

Set-Content -Path $ProviderFile -Value $ProviderName
Write-Host "[OK] Active provider: $ProviderName" -ForegroundColor Green

# Test TTS
Write-Host ""
Write-Host "Testing TTS..." -ForegroundColor Cyan

try {
    if ($Provider -eq "piper") {
        Write-Host "   Testing Piper provider..." -ForegroundColor Gray
        & "$HooksDir\play-tts-windows-piper.ps1" "AgentVibes is ready to speak on Windows" | Out-Null
    }
    else {
        Write-Host "   Testing SAPI provider..." -ForegroundColor Gray
        & "$HooksDir\play-tts-windows-sapi.ps1" "AgentVibes is ready to speak on Windows" | Out-Null
    }

    Write-Host "[OK] TTS working!" -ForegroundColor Green
}
catch {
    Write-Host "[WARNING] TTS test failed: $_" -ForegroundColor Yellow
    Write-Host "   But AgentVibes should still work" -ForegroundColor Gray
}

# Summary
Write-Host ""
Write-Host "======================================================" -ForegroundColor Green
Write-Host "              SETUP COMPLETE!" -ForegroundColor Green
Write-Host "======================================================" -ForegroundColor Green
Write-Host ""

Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Install AgentVibes: npm install" -ForegroundColor White
Write-Host "   2. Try it out: npm run dev" -ForegroundColor White
Write-Host ""

Write-Host "Useful Commands:" -ForegroundColor Cyan
Write-Host "   Test TTS:        .\.claude\hooks-windows\play-tts.ps1 'Hello'" -ForegroundColor Gray
Write-Host "   List voices:     .\.claude\hooks-windows\voice-manager-windows.ps1 list" -ForegroundColor Gray
Write-Host "   Switch voice:    .\.claude\hooks-windows\voice-manager-windows.ps1 switch <voice>" -ForegroundColor Gray
Write-Host "   Switch provider: .\.claude\hooks-windows\provider-manager.ps1 switch windows-sapi" -ForegroundColor Gray
Write-Host ""

Write-Host "Documentation: https://agentvibes.org" -ForegroundColor Cyan
Write-Host ""

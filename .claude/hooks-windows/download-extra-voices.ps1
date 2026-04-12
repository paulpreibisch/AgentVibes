#
# File: .claude/hooks-windows/download-extra-voices.ps1
#
# AgentVibes - Download Extra Piper Voice Models (Windows)
# Downloads custom high-quality voices from HuggingFace
#

param(
    [switch]$yes
)

$AUTO_YES = $yes -or ($args -contains "--yes") -or ($args -contains "-y")

# Configuration
$VoiceDir = "$env:USERPROFILE\.claude\piper-voices"
$PiperExe = "$env:LOCALAPPDATA\Programs\Piper\piper.exe"

# HuggingFace repository for custom voices
$HuggingFaceRepo = "agentvibes/piper-custom-voices"
$HuggingFaceBaseUrl = "https://huggingface.co/$HuggingFaceRepo/resolve/main"

# Extra custom voices to download
$ExtraVoices = @(
    @{
        name = "kristin"
        description = "Kristin (US English female, Public Domain, 64MB)"
        sizeMB = 64
    },
    @{
        name = "jenny"
        description = "Jenny (UK English female with Irish accent, CC BY, 64MB)"
        sizeMB = 64
    },
    @{
        name = "16Speakers"
        description = "Tracy/16Speakers (Multi-speaker: 12 US + 4 UK voices, Public Domain, 77MB)"
        sizeMB = 77
    }
)

Write-Host ""
Write-Host "AgentVibes Extra Voice Downloader" -ForegroundColor Cyan
Write-Host ("=" * 40) -ForegroundColor Cyan
Write-Host ""
Write-Host "This will download high-quality custom Piper voices from HuggingFace."
Write-Host ""

# Check if Piper is installed
if (-not (Test-Path $PiperExe)) {
    Write-Host "[ERROR] Piper not found at: $PiperExe" -ForegroundColor Red
    Write-Host "Run: .\setup-windows.ps1 to install Piper" -ForegroundColor Yellow
    exit 1
}

# Create voice directory
if (-not (Test-Path $VoiceDir)) {
    New-Item -ItemType Directory -Path $VoiceDir -Force | Out-Null
}

Write-Host "Voice directory: $VoiceDir" -ForegroundColor Gray
Write-Host ""

# Check status of each voice
$alreadyDownloaded = @()
$needDownload = @()

foreach ($voice in $ExtraVoices) {
    $modelFile = "$VoiceDir\$($voice.name).onnx"
    $configFile = "$VoiceDir\$($voice.name).onnx.json"

    if ((Test-Path $modelFile) -and (Test-Path $configFile)) {
        $alreadyDownloaded += $voice
    } else {
        $needDownload += $voice
    }
}

Write-Host "Status:" -ForegroundColor Cyan
Write-Host "   Already downloaded: $($alreadyDownloaded.Count) voice(s)"
Write-Host "   Need to download: $($needDownload.Count) voice(s)"
Write-Host ""

if ($alreadyDownloaded.Count -gt 0) {
    Write-Host "Already downloaded (skipped):" -ForegroundColor Green
    foreach ($voice in $alreadyDownloaded) {
        Write-Host "   [OK] $($voice.description)" -ForegroundColor Green
    }
    Write-Host ""
}

if ($needDownload.Count -eq 0) {
    Write-Host "All extra voices already downloaded!" -ForegroundColor Green
    exit 0
}

# Calculate total size
$totalSizeMB = ($needDownload | Measure-Object -Property sizeMB -Sum).Sum

Write-Host "Voices to download:" -ForegroundColor Yellow
foreach ($voice in $needDownload) {
    Write-Host "   - $($voice.description)"
}
Write-Host ""
Write-Host "Total download size: ~${totalSizeMB}MB" -ForegroundColor Yellow
Write-Host ""

# Confirm download
if (-not $AUTO_YES) {
    $reply = Read-Host "Download $($needDownload.Count) extra voice(s)? [Y/n]"
    if ($reply -and $reply -notmatch '^[Yy]') {
        Write-Host "Download cancelled" -ForegroundColor Red
        exit 0
    }
} else {
    Write-Host "Auto-downloading $($needDownload.Count) extra voice(s)..." -ForegroundColor Cyan
    Write-Host ""
}

# Download each voice
$downloaded = 0
$failed = 0

foreach ($voice in $needDownload) {
    $voiceName = $voice.name
    Write-Host ""
    Write-Host "Downloading: $($voice.description)..." -ForegroundColor Cyan

    $modelUrl = "$HuggingFaceBaseUrl/$voiceName.onnx"
    $jsonUrl = "$HuggingFaceBaseUrl/$voiceName.onnx.json"
    $modelFile = "$VoiceDir\$voiceName.onnx"
    $jsonFile = "$VoiceDir\$voiceName.onnx.json"

    $success = $true

    try {
        Write-Host "   Downloading model file..." -ForegroundColor Yellow
        Invoke-WebRequest -Uri $modelUrl -OutFile $modelFile -ErrorAction Stop

        Write-Host "   Downloading config file..." -ForegroundColor Yellow
        Invoke-WebRequest -Uri $jsonUrl -OutFile $jsonFile -ErrorAction Stop

        $modelSize = [math]::Round((Get-Item $modelFile).Length / 1MB, 2)
        Write-Host "   [OK] Downloaded ($modelSize MB)" -ForegroundColor Green
    }
    catch {
        Write-Host "   [ERROR] Failed to download: $_" -ForegroundColor Red
        $success = $false
        # Clean up partial downloads
        Remove-Item -Path $modelFile -ErrorAction SilentlyContinue
        Remove-Item -Path $jsonFile -ErrorAction SilentlyContinue
    }

    if ($success) {
        $downloaded++
        Write-Host "   Successfully downloaded: $voiceName" -ForegroundColor Green
    } else {
        $failed++
    }
}

# Patch LibriTTS speaker names for any libritts models (existing or just downloaded)
foreach ($voice in $ExtraVoices) {
    $voiceName = $voice.name
    $jsonFile = "$VoiceDir\$voiceName.onnx.json"
    if ((Test-Path $jsonFile)) {
        try {
            $data = Get-Content $jsonFile -Raw | ConvertFrom-Json
            $sidMap = $data.speaker_id_map
            if ($sidMap -and ($data.num_speakers -gt 1)) {
                # Check if already patched (first key doesn't start with 'p' + digits)
                $firstKey = ($sidMap.PSObject.Properties | Select-Object -First 1).Name
                if ($firstKey -match '^p\d+$') {
                    # Find voice-assignments.json
                    $ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
                    $ProjectRoot = Split-Path -Parent (Split-Path -Parent $ScriptDir)
                    $CatalogPath = Join-Path $ProjectRoot "voice-assignments.json"
                    if (-not (Test-Path $CatalogPath)) {
                        # Try npm global install location
                        $npmRoot = & npm root -g 2>$null
                        if ($npmRoot) {
                            $CatalogPath = Join-Path $npmRoot "agentvibes\voice-assignments.json"
                        }
                    }
                    if (Test-Path $CatalogPath) {
                        $catalog = Get-Content $CatalogPath -Raw | ConvertFrom-Json
                        $speakers = $catalog.libritts_speakers

                        # Build reverse map: index -> p-name
                        $indexToP = @{}
                        foreach ($prop in $sidMap.PSObject.Properties) {
                            $indexToP[$prop.Value] = $prop.Name
                        }

                        # Rebuild with friendly names
                        $newMap = [ordered]@{}
                        foreach ($entry in $indexToP.GetEnumerator() | Sort-Object Key) {
                            $idx = [string]$entry.Key
                            $pname = $entry.Value
                            $friendly = $speakers.$idx.voice_name
                            if ($friendly) {
                                $newMap[$friendly] = [int]$idx
                            } else {
                                $newMap[$pname] = [int]$idx
                            }
                        }

                        $data.speaker_id_map = $newMap
                        $data | ConvertTo-Json -Depth 10 | Set-Content $jsonFile -Encoding UTF8
                        Write-Host "   Patched LibriTTS speaker names to friendly names: $voiceName" -ForegroundColor Green
                    }
                }
            }
        } catch {
            # Non-fatal — patching is best-effort
        }
    }
}

Write-Host ""
Write-Host ("=" * 40) -ForegroundColor Cyan
Write-Host "Download Summary:" -ForegroundColor Cyan
Write-Host "   Successfully downloaded: $downloaded" -ForegroundColor Green
if ($failed -gt 0) {
    Write-Host "   Failed: $failed" -ForegroundColor Red
}
Write-Host "   Total extra voices available: $($alreadyDownloaded.Count + $downloaded)"
Write-Host ""

if ($downloaded -gt 0) {
    Write-Host "Extra voices ready to use!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Try them:"
    Write-Host "   /agent-vibes:provider switch piper"
    Write-Host "   /agent-vibes:switch kristin"
    Write-Host "   /agent-vibes:switch jenny"
    Write-Host "   /agent-vibes:switch 16Speakers"
}

if ($downloaded -gt 0 -or $alreadyDownloaded.Count -gt 0) {
    exit 0
} else {
    exit 1
}

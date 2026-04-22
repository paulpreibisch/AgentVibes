# Test audio processor with a recent TTS file
# Usage: powershell -File test/manual/test-audio-processor.ps1

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = (Resolve-Path (Join-Path $ScriptDir "..\..")).Path

# Get the most recent TTS file
$AudioDir = Join-Path $env:USERPROFILE ".claude\audio"
$RecentFile = Get-ChildItem -Path "$AudioDir\tts-*.wav" -ErrorAction SilentlyContinue |
              Sort-Object LastWriteTime -Descending |
              Select-Object -First 1

if (-not $RecentFile) {
    Write-Host "No TTS WAV files found!" -ForegroundColor Red
    exit 1
}

Write-Host "Testing with: $($RecentFile.FullName)" -ForegroundColor Cyan

# Test the audio processor
$ProcessorScript = Join-Path $ProjectRoot ".claude\hooks-windows\audio-processor.ps1"
$OutputFile = Join-Path $AudioDir "test-processed-$(Get-Random).wav"

Write-Host "Running audio processor..." -ForegroundColor Yellow
Write-Host "Command: powershell -File '$ProcessorScript' '$($RecentFile.FullName)' 'default' '$OutputFile'" -ForegroundColor Gray

& powershell -NoProfile -ExecutionPolicy Bypass -File $ProcessorScript $RecentFile.FullName "default" $OutputFile

if ($LASTEXITCODE -eq 0) {
    Write-Host "OK Processor succeeded" -ForegroundColor Green
    Write-Host "Output file: $OutputFile" -ForegroundColor Green

    if (Test-Path $OutputFile) {
        $OrigSize = $RecentFile.Length
        $ProcSize = (Get-Item $OutputFile).Length
        Write-Host "Original size: $OrigSize bytes" -ForegroundColor Gray
        Write-Host "Processed size: $ProcSize bytes" -ForegroundColor Gray

        if ($ProcSize -gt $OrigSize * 1.5) {
            Write-Host "OK Background music likely mixed (file grew significantly)" -ForegroundColor Green
        } else {
            Write-Host "WARN Background music may NOT have been applied (file size similar)" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "FAIL Processor failed with exit code: $LASTEXITCODE" -ForegroundColor Red
}

# Check if FFmpeg is available
Write-Host "`nChecking dependencies..." -ForegroundColor Cyan
$FfmpegAvail = $null -ne (Get-Command ffmpeg -ErrorAction SilentlyContinue)
$SoxAvail = $null -ne (Get-Command sox -ErrorAction SilentlyContinue)

Write-Host "FFmpeg available: $FfmpegAvail" -ForegroundColor $(if ($FfmpegAvail) { "Green" } else { "Yellow" })
Write-Host "Sox available: $SoxAvail" -ForegroundColor $(if ($SoxAvail) { "Green" } else { "Yellow" })

# Check background music config
$ConfigFile = Join-Path $ProjectRoot ".claude\config\audio-effects.cfg"
if (Test-Path $ConfigFile) {
    Write-Host "`nBackground music configuration:" -ForegroundColor Cyan
    Get-Content $ConfigFile | Select-String "^default" | Write-Host
} else {
    Write-Host "FAIL Audio effects config not found!" -ForegroundColor Red
}

# Check background music enabled
$EnabledFile = Join-Path $env:USERPROFILE ".claude\config\background-music-enabled.txt"
if (Test-Path $EnabledFile) {
    $Enabled = Get-Content $EnabledFile
    Write-Host "Background music enabled: $Enabled" -ForegroundColor Cyan
} else {
    Write-Host "WARN Background music enabled file not found" -ForegroundColor Yellow
}

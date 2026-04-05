# Test audio processor with a recent TTS file

# Get the most recent TTS file
$AudioDir = "C:\Users\Paul\.claude\audio"
$RecentFile = Get-ChildItem -Path "$AudioDir\tts-*.wav" -ErrorAction SilentlyContinue | 
              Sort-Object LastWriteTime -Descending | 
              Select-Object -First 1

if (-not $RecentFile) {
    Write-Host "No TTS WAV files found!" -ForegroundColor Red
    exit 1
}

Write-Host "Testing with: $($RecentFile.FullName)" -ForegroundColor Cyan

# Test the audio processor
$ProcessorScript = "C:\Users\Paul\AgentVibes\.claude\hooks-windows\audio-processor.ps1"
$OutputFile = "$AudioDir\test-processed-$(Get-Random).wav"

Write-Host "Running audio processor..." -ForegroundColor Yellow
Write-Host "Command: powershell -File '$ProcessorScript' '$($RecentFile.FullName)' 'default' '$OutputFile'" -ForegroundColor Gray

& powershell -NoProfile -ExecutionPolicy Bypass -File $ProcessorScript $RecentFile.FullName "default" $OutputFile

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Processor succeeded" -ForegroundColor Green
    Write-Host "Output file: $OutputFile" -ForegroundColor Green
    
    if (Test-Path $OutputFile) {
        $OrigSize = $RecentFile.Length
        $ProcSize = (Get-Item $OutputFile).Length
        Write-Host "Original size: $OrigSize bytes" -ForegroundColor Gray
        Write-Host "Processed size: $ProcSize bytes" -ForegroundColor Gray
        
        if ($ProcSize -gt $OrigSize * 1.5) {
            Write-Host "✅ Background music likely mixed (file grew significantly)" -ForegroundColor Green
        } else {
            Write-Host "⚠️  Background music may NOT have been applied (file size similar)" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "❌ Processor failed with exit code: $LASTEXITCODE" -ForegroundColor Red
}

# Check if FFmpeg is available
Write-Host "`nChecking dependencies..." -ForegroundColor Cyan
$FfmpegAvail = $null -ne (Get-Command ffmpeg -ErrorAction SilentlyContinue)
$SoxAvail = $null -ne (Get-Command sox -ErrorAction SilentlyContinue)

Write-Host "FFmpeg available: $FfmpegAvail" -ForegroundColor $(if ($FfmpegAvail) { "Green" } else { "Yellow" })
Write-Host "Sox available: $SoxAvail" -ForegroundColor $(if ($SoxAvail) { "Green" } else { "Yellow" })

# Check background music config
$ConfigFile = "C:\Users\Paul\AgentVibes\.claude\config\audio-effects.cfg"
if (Test-Path $ConfigFile) {
    Write-Host "`nBackground music configuration:" -ForegroundColor Cyan
    Get-Content $ConfigFile | Select-String "^default" | Write-Host
} else {
    Write-Host "❌ Audio effects config not found!" -ForegroundColor Red
}

# Check background music enabled
$EnabledFile = "C:\Users\Paul\.claude\config\background-music-enabled.txt"
if (Test-Path $EnabledFile) {
    $Enabled = Get-Content $EnabledFile
    Write-Host "Background music enabled: $Enabled" -ForegroundColor Cyan
} else {
    Write-Host "⚠️  Background music enabled file not found" -ForegroundColor Yellow
}

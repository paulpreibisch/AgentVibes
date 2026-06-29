#
# patch-volume-v2.ps1  — comprehensive Kokoro volume fix
#
# Fixes two separate paths:
#   1. play-tts-kokoro.ps1: refresh PATH before ffmpeg check; fall back to
#      Python soundfile peak normalization if ffmpeg is still missing.
#   2. play-tts.ps1: add volume=4.0 to the voice stream in the amix filter
#      so the voice is loud even after amix's 50%-normalization.
#
# Run on Windows:
#   powershell -ExecutionPolicy Bypass -File patch-volume-v2.ps1
#

Set-StrictMode -Off
$ErrorActionPreference = "Stop"

$KokoroFile = "$env:USERPROFILE\.claude\hooks-windows\play-tts-kokoro.ps1"
$PlayFile   = "$env:USERPROFILE\.claude\hooks-windows\play-tts.ps1"

foreach ($f in @($KokoroFile, $PlayFile)) {
    if (-not (Test-Path $f)) {
        Write-Host "ERROR: File not found: $f" -ForegroundColor Red
        exit 1
    }
}

# ---------------------------------------------------------------------------
# Patch 1: play-tts-kokoro.ps1
# Replace whatever boost block exists (v1 or nothing) with the robust v2 block.
# ---------------------------------------------------------------------------
Write-Host "`n[1/2] Patching play-tts-kokoro.ps1..." -ForegroundColor Cyan
$kContent = [System.IO.File]::ReadAllText($KokoroFile, [System.Text.UTF8Encoding]::new($false))

# Remove any previous v1 boost block (identified by its first line)
$v1Start = "    # Kokoro outputs at a lower level"
$v1End   = "    # Apply per-agent audio effects via audio-processor.ps1"
if ($kContent.Contains($v1Start)) {
    $startIdx = $kContent.IndexOf($v1Start)
    $endIdx   = $kContent.IndexOf($v1End)
    if ($endIdx -gt $startIdx) {
        $kContent = $kContent.Substring(0, $startIdx) + "    " + $kContent.Substring($endIdx)
        Write-Host "  Removed v1 boost block" -ForegroundColor Gray
    }
}

# Check if v2 is already applied
if ($kContent -match 'soundfile_norm') {
    Write-Host "  play-tts-kokoro.ps1 already has v2 patch — skipping" -ForegroundColor Green
} else {
    # Insert v2 boost block before the audio-processor section
    $insertMarker = "    # Apply per-agent audio effects via audio-processor.ps1"
    $v2Block = @'
    # Volume boost: Kokoro output is quiet; normalize with peak-based leveling.
    # Try ffmpeg first (fastest), fall back to Python soundfile (always available).
    # soundfile_norm marker — v2
    $ffmpegBoost = Get-Command ffmpeg -ErrorAction SilentlyContinue
    if (-not $ffmpegBoost) {
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" +
                    [System.Environment]::GetEnvironmentVariable("Path","User")
        $ffmpegBoost = Get-Command ffmpeg -ErrorAction SilentlyContinue
    }
    $boostedFile = "$AudioDir\tts-boosted-$([System.IO.Path]::GetRandomFileName() -replace '\..*').wav"
    $boostOk = $false
    if ($ffmpegBoost) {
        $bArgs = "-y -i `"$AudioFile`" -af `"volume=4.0`" `"$boostedFile`""
        $bp = Start-Process -FilePath "ffmpeg" -ArgumentList $bArgs -NoNewWindow -Wait -PassThru -RedirectStandardError "NUL"
        $boostOk = ($bp.ExitCode -eq 0 -and (Test-Path $boostedFile) -and (Get-Item $boostedFile).Length -gt 0)
    }
    if (-not $boostOk -and $PythonExe) {
        # soundfile peak normalization — works even if ffmpeg is not in PATH
        $normPy = "$env:TEMP\agentvibes-norm-$([System.IO.Path]::GetRandomFileName() -replace '\..*').py"
        @"
import soundfile as sf, numpy as np, sys
data, rate = sf.read(sys.argv[1])
peak = float(np.abs(data).max())
gain = min(4.0, 0.92 / peak) if peak > 0.001 else 1.0
sf.write(sys.argv[2], np.clip(data * gain, -1.0, 1.0).astype('float32'), rate, subtype='PCM_16')
"@ | Set-Content -Path $normPy -Encoding UTF8
        & $PythonExe $normPy $AudioFile $boostedFile 2>$null
        Remove-Item $normPy -Force -ErrorAction SilentlyContinue
        $boostOk = ((Test-Path $boostedFile) -and (Get-Item $boostedFile).Length -gt 0)
    }
    if ($boostOk) {
        Remove-Item $AudioFile -Force -ErrorAction SilentlyContinue
        $AudioFile = $boostedFile
    }

    # Apply per-agent audio effects via audio-processor.ps1
'@

    if (-not $kContent.Contains($insertMarker)) {
        Write-Host "  ERROR: Marker not found in play-tts-kokoro.ps1 — file may be a different version" -ForegroundColor Red
        exit 1
    }
    $kContent = $kContent.Replace($insertMarker, $v2Block)
    [System.IO.File]::WriteAllText($KokoroFile, $kContent, [System.Text.UTF8Encoding]::new($false))
    Write-Host "  Boost block inserted (ffmpeg 4x + Python soundfile fallback)" -ForegroundColor Green
}

# ---------------------------------------------------------------------------
# Patch 2: play-tts.ps1 — add volume=4.0 to voice stream in amix filter
# ---------------------------------------------------------------------------
Write-Host "`n[2/2] Patching play-tts.ps1 amix filter..." -ForegroundColor Cyan
$pContent = [System.IO.File]::ReadAllText($PlayFile, [System.Text.UTF8Encoding]::new($false))

$oldFilter = '[1:a]adelay=2000|2000,apad=pad_dur=2[voice]'
$newFilter = '[1:a]volume=4.0,adelay=2000|2000,apad=pad_dur=2[voice]'

if ($pContent.Contains($newFilter)) {
    Write-Host "  play-tts.ps1 amix already patched — skipping" -ForegroundColor Green
} elseif (-not $pContent.Contains($oldFilter)) {
    Write-Host "  WARNING: Expected filter string not found — play-tts.ps1 may be a different version" -ForegroundColor Yellow
    Write-Host "  Skipping amix patch (Kokoro boost from patch 1 will still apply)" -ForegroundColor Yellow
} else {
    $pContent = $pContent.Replace($oldFilter, $newFilter)
    [System.IO.File]::WriteAllText($PlayFile, $pContent, [System.Text.UTF8Encoding]::new($false))
    Write-Host "  Voice volume boosted 4x in amix filter" -ForegroundColor Green
}

Write-Host "`nDone. Send a Kokoro TTS message to test." -ForegroundColor Cyan

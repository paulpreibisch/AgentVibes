#
# patch-kokoro-volume.ps1
# Run this on Windows to apply the Kokoro volume boost fix.
# It patches play-tts-kokoro.ps1 in place — no repo access required.
#
# Usage:  powershell -ExecutionPolicy Bypass -File patch-kokoro-volume.ps1
#

$file = "$env:USERPROFILE\.claude\hooks-windows\play-tts-kokoro.ps1"

if (-not (Test-Path $file)) {
    Write-Host "ERROR: File not found: $file" -ForegroundColor Red
    exit 1
}

$content = [System.IO.File]::ReadAllText($file, [System.Text.UTF8Encoding]::new($false))

# Guard: don't double-patch
if ($content -match 'volume=2\.5') {
    Write-Host "Already patched — nothing to do." -ForegroundColor Green
    exit 0
}

$marker = '    Write-Host "[VOICE] Voice used: $VoiceName (Kokoro TTS)" -ForegroundColor Green'

$boost = @'

    # Kokoro output is quiet; 2.5x (~8 dB) compensates for amix normalization + native low level
    $ffcheck = Get-Command ffmpeg -ErrorAction SilentlyContinue
    if ($ffcheck) {
        $boostedFile = "$AudioDir\tts-boosted-$([System.IO.Path]::GetRandomFileName() -replace '\..*').wav"
        $boostArgs = "-y -i `"$AudioFile`" -af `"volume=2.5`" `"$boostedFile`""
        $bp = Start-Process -FilePath "ffmpeg" -ArgumentList $boostArgs -NoNewWindow -Wait -PassThru -RedirectStandardError "NUL"
        if ($bp.ExitCode -eq 0 -and (Test-Path $boostedFile) -and (Get-Item $boostedFile).Length -gt 0) {
            Remove-Item $AudioFile -Force -ErrorAction SilentlyContinue
            $AudioFile = $boostedFile
        }
    }
'@

if (-not $content.Contains($marker)) {
    Write-Host "ERROR: Expected marker not found in $file" -ForegroundColor Red
    Write-Host "The file may already be patched or have a different version." -ForegroundColor Yellow
    exit 1
}

$patched = $content.Replace($marker, $marker + $boost)
[System.IO.File]::WriteAllText($file, $patched, [System.Text.UTF8Encoding]::new($false))
Write-Host "Done — Kokoro volume boost (2.5x) applied to $file" -ForegroundColor Green
Write-Host "Trigger a Kokoro TTS message to test." -ForegroundColor Gray

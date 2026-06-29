#
# fix-audio-v3.ps1 — definitive audio restoration
#
# Removes ALL previous boost patches (v1, v2, or Linux-source boost) from
# play-tts-kokoro.ps1 and replaces them with a single clean Python-based
# normalization that works even when ffmpeg is not in PATH.
#
# Also removes the volume=4.0 voice boost from play-tts.ps1 if patch-volume-v2
# added it, which can cause silence when the amix filter misbehaves.
#
# Safe to run multiple times. Run on Windows:
#   powershell -ExecutionPolicy Bypass -File fix-audio-v3.ps1
#

$ErrorActionPreference = "Stop"
$HooksDir   = "$env:USERPROFILE\.claude\hooks-windows"
$KokoroFile = "$HooksDir\play-tts-kokoro.ps1"
$PlayFile   = "$HooksDir\play-tts.ps1"

foreach ($f in @($KokoroFile, $PlayFile)) {
    if (-not (Test-Path $f)) {
        Write-Host "NOT FOUND: $f" -ForegroundColor Red; exit 1
    }
}

# ─── 1. play-tts-kokoro.ps1 ─────────────────────────────────────────────────
Write-Host "`n[1/2] Patching play-tts-kokoro.ps1..." -ForegroundColor Cyan

$k = [System.IO.File]::ReadAllText($KokoroFile, [System.Text.UTF8Encoding]::new($false))

if ($k.Contains('# av-boost-v3')) {
    Write-Host "  Already has v3 boost — skipping" -ForegroundColor Green
} else {
    # Two stable code anchors that exist in every version of this file
    $voiceAnchor = 'Write-Host "[VOICE] Voice used: $VoiceName (Kokoro TTS)" -ForegroundColor Green'
    $procAnchor  = '$ProcessorScript = Join-Path $ScriptPath "audio-processor.ps1"'

    $voicePos = $k.IndexOf($voiceAnchor)
    $procPos  = $k.IndexOf($procAnchor)

    if ($voicePos -lt 0) { Write-Host "  ERROR: VOICE anchor not found" -ForegroundColor Red; exit 1 }
    if ($procPos  -lt 0) { Write-Host "  ERROR: ProcessorScript anchor not found" -ForegroundColor Red; exit 1 }

    # Find the newline that ends the VOICE line so we can splice cleanly
    $voiceLineEnd = $k.IndexOf("`n", $voicePos)
    if ($voiceLineEnd -lt 0) { Write-Host "  ERROR: No newline after VOICE anchor" -ForegroundColor Red; exit 1 }
    $voiceLineEnd += 1   # include the newline character itself

    # Detect CRLF vs LF so inserted code matches the file's style
    $nl = if ($k.Contains("`r`n")) { "`r`n" } else { "`n" }

    # Build the boost block (uses Python -c to avoid here-string/quoting issues)
    $boost  = $nl
    $boost += "    # av-boost-v3: peak-normalize Kokoro output (quiet by design)" + $nl
    $boost += "    # Python soundfile is always available since Kokoro depends on it." + $nl
    $boost += "    if (`$PythonExe) {" + $nl
    $boost += "        `$avNormOut = `"`$AudioDir\tts-norm-`$([System.IO.Path]::GetRandomFileName() -replace '\..*').wav`"" + $nl
    $boost += "        `$avPyCode  = `"import soundfile as sf,numpy as np,sys;d,r=sf.read(sys.argv[1]);p=float(np.abs(d).max());g=min(4.0,0.92/p) if p>0.001 else 1.0;sf.write(sys.argv[2],np.clip(d*g,-1,1).astype('float32'),r,subtype='PCM_16')`"" + $nl
    $boost += "        & `$PythonExe -c `$avPyCode `$AudioFile `$avNormOut 2>`$null" + $nl
    $boost += "        if ((Test-Path `$avNormOut) -and (Get-Item `$avNormOut).Length -gt 0) {" + $nl
    $boost += "            Remove-Item `$AudioFile -Force -ErrorAction SilentlyContinue" + $nl
    $boost += "            `$AudioFile = `$avNormOut" + $nl
    $boost += "        }" + $nl
    $boost += "    }" + $nl
    $boost += $nl

    # Rebuild: keep up to and including VOICE line, insert boost, jump to ProcessorScript
    $k = $k.Substring(0, $voiceLineEnd) + $boost + $k.Substring($procPos)

    [System.IO.File]::WriteAllText($KokoroFile, $k, [System.Text.UTF8Encoding]::new($false))
    Write-Host "  v3 Python normalization block inserted" -ForegroundColor Green
}

# ─── 2. play-tts.ps1 — remove volume=4.0 from amix voice filter ─────────────
Write-Host "[2/2] Checking play-tts.ps1 amix filter..." -ForegroundColor Cyan

$p = [System.IO.File]::ReadAllText($PlayFile, [System.Text.UTF8Encoding]::new($false))

if ($p.Contains('[1:a]volume=4.0,adelay=')) {
    $p = $p.Replace('[1:a]volume=4.0,adelay=', '[1:a]adelay=')
    [System.IO.File]::WriteAllText($PlayFile, $p, [System.Text.UTF8Encoding]::new($false))
    Write-Host "  Removed volume=4.0 from amix voice filter" -ForegroundColor Green
} else {
    Write-Host "  amix filter OK — no change needed" -ForegroundColor Green
}

Write-Host "`nDone. Send a Kokoro TTS message to test." -ForegroundColor Cyan

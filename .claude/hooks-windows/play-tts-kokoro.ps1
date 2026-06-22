#
# File: .claude/hooks-windows/play-tts-kokoro.ps1
#
# AgentVibes - Windows Kokoro TTS Provider
# High-quality local neural TTS via the `kokoro` Python package (KPipeline).
# Synthesizes text to a WAV file with kokoro-tts.py and emits the path so the
# parent play-tts.ps1 router coordinates playback / effects / background music.
#
# Contract (mirrors play-tts-piper.ps1):
#   - Receives $Text and optional $VoiceOverride (a Kokoro voice id, e.g. af_heart)
#   - Synthesizes a WAV, optionally applies per-agent effects via audio-processor.ps1
#   - Does NOT play audio; emits the final WAV path via Write-Output for the parent
#
# Install deps:  pip install kokoro soundfile numpy
#

param(
    [Parameter(Mandatory = $true)]
    [string]$Text,

    [Parameter(Mandatory = $false)]
    [string]$VoiceOverride
)

# --- Configuration paths (mirror play-tts-piper.ps1) -------------------------
$ScriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectClaudeDir = Join-Path (Split-Path -Parent (Split-Path -Parent $ScriptPath)) ".claude"
if (Test-Path $ProjectClaudeDir) { $ClaudeDir = $ProjectClaudeDir } else { $ClaudeDir = "$env:USERPROFILE\.claude" }

$AudioDir  = "$ClaudeDir\audio"
$ConfigDir = "$ClaudeDir\config"
if (-not (Test-Path $AudioDir)) { New-Item -ItemType Directory -Path $AudioDir -Force | Out-Null }

# --- Locate the kokoro synth helper (lives next to this script) --------------
$KokoroPy = Join-Path $ScriptPath "kokoro-tts.py"
if (-not (Test-Path $KokoroPy)) {
    Write-Host "[ERROR] kokoro-tts.py not found at: $KokoroPy" -ForegroundColor Red
    exit 1
}

# --- Resolve the Python executable -------------------------------------------
# SSH-receiver watcher sessions can inherit a minimal PATH; refresh from the
# registry if the first lookup fails (same pattern as play-tts-piper.ps1).
function Find-Python {
    foreach ($cand in @("python", "python3", "py")) {
        $c = Get-Command $cand -ErrorAction SilentlyContinue
        if ($c) { return $c.Source }
    }
    return $null
}
$PythonExe = Find-Python
if (-not $PythonExe) {
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" +
                [System.Environment]::GetEnvironmentVariable("Path", "User")
    $PythonExe = Find-Python
}
if (-not $PythonExe) {
    Write-Host "[ERROR] Python not found. Install Python 3, then: pip install kokoro soundfile numpy" -ForegroundColor Red
    exit 1
}

# --- Determine the Kokoro voice ----------------------------------------------
$VoiceName = ""
if ($VoiceOverride) {
    $VoiceName = $VoiceOverride.Trim()
} else {
    $VoiceFile = "$ClaudeDir\tts-voice-kokoro.txt"
    if (-not (Test-Path $VoiceFile)) { $VoiceFile = "$ClaudeDir\tts-voice.txt" }
    if (Test-Path $VoiceFile) { $VoiceName = (Get-Content $VoiceFile -Raw).Trim() }
}
# Kokoro voice ids look like af_heart, am_michael, bf_emma. Strip any ::display suffix.
if ($VoiceName -match '::') { $VoiceName = ($VoiceName -split '::')[0] }
if (-not $VoiceName) { $VoiceName = "af_heart" }

# Security: validate voice id (lowercase prefix + underscore + name).
# Rejects path-traversal / injection before it reaches the command line.
if ($VoiceName -notmatch '^[a-z]{2}_[a-z]+$') {
    Write-Host "[WARNING] Invalid Kokoro voice '$VoiceName' - falling back to af_heart" -ForegroundColor Yellow
    $VoiceName = "af_heart"
}

# --- Optional speed ----------------------------------------------------------
$Speed = "1.0"
$SpeedFile = "$ConfigDir\tts-speed.txt"
if (Test-Path $SpeedFile) {
    $s = (Get-Content $SpeedFile -Raw).Trim()
    if ($s -match '^\d+(\.\d+)?$') { $Speed = $s }
}

# --- Sanitize text -----------------------------------------------------------
$Text = $Text -replace '\\', ' '
$Text = $Text -replace '[{}<>|`~^;]', ''
$Text = $Text -replace '\s+', ' '
$Text = $Text.Trim()
if (-not $Text) { Write-Host "[ERROR] No text to synthesize" -ForegroundColor Red; exit 1 }

# --- Output path (random name, no predictable timestamp; issue #130) ----------
$AudioFile = "$AudioDir\tts-$([System.IO.Path]::GetRandomFileName() -replace '\..*').wav"

# --- Persistent daemon configuration -----------------------------------------
# A resident kokoro-server keeps the model loaded on the GPU so each request is
# ~2-3s (just synthesis) instead of ~31s (fresh model load + CUDA init per call).
# Fast path: POST to the daemon. Fallback: auto-start the daemon for next time,
# and synthesize this one message directly so nothing is dropped while it warms.
$KokoroPort = 7855
$KokoroServerPy = Join-Path $ScriptPath "kokoro-server.py"

function Test-KokoroServer {
    try {
        $r = Invoke-WebRequest -Uri "http://127.0.0.1:$KokoroPort/health" -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
        return $r.StatusCode -eq 200
    } catch { return $false }
}

function Start-KokoroServer {
    if (-not (Test-Path $KokoroServerPy)) { return }
    # Prefer pythonw.exe (no console window); fall back to python.exe hidden.
    $pythonw = $PythonExe -replace 'python\.exe$', 'pythonw.exe'
    $exe = if (Test-Path $pythonw) { $pythonw } else { $PythonExe }
    try {
        Start-Process -FilePath $exe -ArgumentList @($KokoroServerPy, "$KokoroPort") `
            -WindowStyle Hidden -ErrorAction Stop | Out-Null
    } catch {
        Write-Host "[WARNING] Could not auto-start kokoro-server: $_" -ForegroundColor Yellow
    }
}

# --- Synthesize --------------------------------------------------------------
try {
    $usedServer = $false
    if (Test-KokoroServer) {
        Write-Host "[SYNTH] Synthesizing with Kokoro daemon (voice=$VoiceName speed=$Speed)..." -ForegroundColor Cyan
        try {
            $payload = @{ text = $Text; voice = $VoiceName; speed = [double]$Speed; output = $AudioFile } | ConvertTo-Json -Compress
            $resp = Invoke-WebRequest -Uri "http://127.0.0.1:$KokoroPort/synth" -Method POST `
                -Body $payload -ContentType 'application/json' -TimeoutSec 120 -UseBasicParsing -ErrorAction Stop
            if ($resp.StatusCode -eq 200 -and (Test-Path $AudioFile) -and (Get-Item $AudioFile).Length -gt 0) {
                $usedServer = $true
            } else {
                Write-Host "[WARNING] Kokoro daemon returned no audio; falling back to direct synth" -ForegroundColor Yellow
            }
        } catch {
            Write-Host "[WARNING] Kokoro daemon request failed ($_); falling back to direct synth" -ForegroundColor Yellow
        }
    }

    if (-not $usedServer) {
        # Daemon not up (or failed): start it for subsequent messages, then
        # synthesize this one directly so the current message is never dropped.
        Start-KokoroServer
        Write-Host "[SYNTH] Synthesizing with Kokoro direct (voice=$VoiceName speed=$Speed)..." -ForegroundColor Cyan
        $synthOut = & $PythonExe $KokoroPy $Text $VoiceName $AudioFile $Speed 2>&1
        if (-not (Test-Path $AudioFile) -or (Get-Item $AudioFile).Length -eq 0) {
            Write-Host "[ERROR] Kokoro synthesis failed" -ForegroundColor Red
            if ($synthOut) { $synthOut | ForEach-Object { Write-Host "        $_" -ForegroundColor DarkGray } }
            exit 1
        }
    }

    Write-Host "[OK] Saved to: $AudioFile" -ForegroundColor Green
    Write-Host "[VOICE] Voice used: $VoiceName (Kokoro TTS)" -ForegroundColor Green

    # Apply per-agent audio effects via audio-processor.ps1, but SKIP when
    # AGENTVIBES_NO_PLAY is set - that means the parent play-tts.ps1 will do its
    # own reverb / background-music post-processing and running effects here too
    # would double-process the audio.
    $ProcessorScript = Join-Path $ScriptPath "audio-processor.ps1"
    $ProcessedFile = $AudioFile
    if (-not $env:AGENTVIBES_NO_PLAY -and (Test-Path $ProcessorScript)) {
        $AgentName = if ($env:AGENTVIBES_AGENT_NAME) { $env:AGENTVIBES_AGENT_NAME } elseif ($env:AGENTVIBES_LLM_KEY) { $env:AGENTVIBES_LLM_KEY } else { "default" }
        $EffectedFile = "$AudioFile.effected.wav"
        try {
            & $ProcessorScript $AudioFile $AgentName $EffectedFile
            if ((Test-Path $EffectedFile) -and (Get-Item $EffectedFile).Length -gt 0) {
                $ProcessedFile = $EffectedFile
                Write-Host "[EFFECTS] Audio effects applied" -ForegroundColor Cyan
            }
        } catch {
            Write-Host "[WARNING] Audio effects processing skipped: $_" -ForegroundColor Yellow
        }
    }

    # Emit the final path for the parent router to coordinate playback.
    # DO NOT play here - play-tts.ps1 owns all audio playback.
    Write-Host "[OUTPUT] Processed audio: $ProcessedFile" -ForegroundColor Gray
    Write-Output $ProcessedFile
}
catch {
    Write-Host "[ERROR] Error running Kokoro: $_" -ForegroundColor Red
    exit 1
}

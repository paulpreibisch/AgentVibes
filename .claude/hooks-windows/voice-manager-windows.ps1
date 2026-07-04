#
# File: .claude/hooks-windows/voice-manager-windows.ps1
#
# AgentVibes - Windows Voice Management
#

param(
    [Parameter(Position = 0)]
    [ValidateSet('list', 'switch', 'get', 'replay')]
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

# Play an audio file without blocking the caller (mirrors voice-manager.sh's
# `afplay "$AUDIO_FILE" &` / `paplay ... &` background playback). Prefers
# ffplay (handles wav/mp3/aiff); falls back to System.Media.SoundPlayer
# (.Play(), which is inherently async — wav only).
function Start-ReplayPlayback {
    param([string]$FilePath)

    # Stay silent while the automated test suite is running (same convention
    # as play-tts.ps1's Invoke-AudioPlay).
    if (Test-Path (Join-Path $env:USERPROFILE ".agentvibes-tests-running")) { return }

    $ffplayCmd = Get-Command ffplay -ErrorAction SilentlyContinue
    if ($ffplayCmd) {
        Start-Process -FilePath $ffplayCmd.Source `
            -ArgumentList @("-autoexit", "-nodisp", "-loglevel", "quiet", $FilePath) `
            -WindowStyle Hidden | Out-Null
        return
    }

    try {
        $player = New-Object System.Media.SoundPlayer $FilePath
        $player.Play()
    }
    catch {
        Write-Host "[WARN] Could not start playback: $_" -ForegroundColor Yellow
    }
}

# Replay the Nth most recent TTS audio file (mirrors voice-manager.sh's
# `replay` case: resolve the audio dir, validate N (1-10), pick the file by
# most-recent-mtime, and play it in the background).
function Replay-Audio {
    param([string]$NArg)

    $AudioDir = $null
    if ($env:CLAUDE_PROJECT_DIR -and (Test-Path (Join-Path $env:CLAUDE_PROJECT_DIR ".claude"))) {
        $AudioDir = Join-Path $env:CLAUDE_PROJECT_DIR ".claude\audio"
    }
    else {
        # Walk up from cwd looking for a .claude directory (same fallback as voice-manager.sh).
        # Use a plain string path throughout: Get-Location returns a PathInfo (.Path),
        # but Get-Item returns a DirectoryInfo (no .Path) — mixing them made the second
        # iteration do Join-Path $null and throw a terminating error.
        $dirPath = (Get-Location).Path
        while ($dirPath) {
            $candidate = Join-Path $dirPath ".claude"
            if (Test-Path $candidate) {
                $AudioDir = Join-Path $candidate "audio"
                break
            }
            $parent = Split-Path $dirPath -Parent
            if (-not $parent -or $parent -eq $dirPath) { break }
            $dirPath = $parent
        }
        if (-not $AudioDir) {
            $AudioDir = Join-Path $ClaudeDir "audio"
        }
    }

    $N = 1
    if ($NArg) {
        if ($NArg -notmatch '^\d+$') {
            Write-Host "[ERROR] Invalid argument. Please use a number (1-10)" -ForegroundColor Red
            exit 1
        }
        $N = [int]$NArg
    }
    if ($N -lt 1 -or $N -gt 10) {
        Write-Host "[ERROR] Number out of range. Please choose 1-10" -ForegroundColor Red
        exit 1
    }

    if (-not (Test-Path $AudioDir)) {
        Write-Host "[ERROR] No audio history found" -ForegroundColor Red
        Write-Host "Audio files are stored in: $AudioDir"
        exit 1
    }

    $files = @(Get-ChildItem -Path $AudioDir -File -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -match '^tts-.*\.(wav|mp3|aiff)$' } |
        Sort-Object LastWriteTime -Descending)

    if ($files.Count -lt $N) {
        Write-Host "[ERROR] Audio #$N not found in history" -ForegroundColor Red
        Write-Host "Total audio files available: $($files.Count)"
        exit 1
    }

    $target = $files[$N - 1]
    Write-Host "[REPLAY] Replaying audio #${N}:" -ForegroundColor Cyan
    Write-Host "   File: $($target.Name)"
    Write-Host "   Path: $($target.FullName)"

    Start-ReplayPlayback $target.FullName
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

    'replay' {
        Replay-Audio $VoiceName
    }
}

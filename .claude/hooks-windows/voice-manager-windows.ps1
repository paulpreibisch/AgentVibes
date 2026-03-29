#
# File: .claude/hooks-windows/voice-manager-windows.ps1
#
# AgentVibes - Windows Voice Management
#

param(
    [Parameter(Position = 0)]
    [ValidateSet('list', 'list-simple', 'switch', 'get', 'replay')]
    [string]$Command = 'list',

    [Parameter(Position = 1)]
    [string]$VoiceName
)

$ClaudeDir = "$env:USERPROFILE\.claude"
$ProviderFile = "$ClaudeDir\tts-provider.txt"
$VoiceSapiFile = "$ClaudeDir\tts-voice-sapi.txt"
$VoicePiperFile = "$ClaudeDir\tts-voice-piper.txt"

# Get active provider
$ActiveProvider = "sapi"
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

# Get Piper voices (checks both global and project-local directories)
function Get-PiperVoices {
    $GlobalVoicesDir = "$env:USERPROFILE\.claude\piper-voices"
    # Also check project-local .claude/piper-voices
    $ScriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
    $ProjectDir = Split-Path -Parent (Split-Path -Parent $ScriptPath)
    $ProjectVoicesDir = Join-Path $ProjectDir ".claude\piper-voices"

    $allVoices = @()

    foreach ($VoicesDir in @($GlobalVoicesDir, $ProjectVoicesDir)) {
        if (-not (Test-Path $VoicesDir)) {
            continue
        }

        $onnxFiles = Get-ChildItem -Path $VoicesDir -Filter "*.onnx" -ErrorAction SilentlyContinue
        foreach ($file in $onnxFiles) {
            $name = $file.BaseName
            if ($allVoices -notcontains $name) {
                $allVoices += $name
            }
        }
    }

    return $allVoices
}

# Legacy wrapper for single-dir callers
function Get-PiperVoicesLegacy {
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
    $PiperExe = "$env:LOCALAPPDATA\Programs\Piper\piper.exe"
    $piperInstalled = Test-Path $PiperExe
    $piperLabel = if ($piperInstalled) { "[PIPER] Piper (High Quality):" } else { "[PIPER] Piper (NOT INSTALLED - run setup-windows.ps1):" }
    Write-Host $piperLabel -ForegroundColor $(if ($piperInstalled) { "Green" } else { "Yellow" })
    $piperVoices = Get-PiperVoices

    if ($piperVoices.Count -eq 0) {
        Write-Host "   (No voices downloaded - run download-piper-voices.ps1)" -ForegroundColor Gray
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

    if ($ActiveProvider -eq "sapi" -or $ActiveProvider -eq "windows-sapi") {
        $VoiceFile = $VoiceSapiFile
        $ValidVoices = Get-SAPIVoices
    }
    elseif ($ActiveProvider -eq "piper" -or $ActiveProvider -eq "windows-piper") {
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
    $VoiceFile = if ($ActiveProvider -eq "sapi" -or $ActiveProvider -eq "windows-sapi") { $VoiceSapiFile } else { $VoicePiperFile }
    $CurrentVoice = Get-CurrentVoice $VoiceFile

    if ($CurrentVoice) {
        Write-Host "[VOICE] Current voice: $CurrentVoice ($ActiveProvider)" -ForegroundColor Cyan
    }
    else {
        Write-Host "[VOICE] Using default voice ($ActiveProvider)" -ForegroundColor Cyan
    }
}

# Main command routing
switch ($Command) {
    'list' {
        List-Voices
    }

    'list-simple' {
        # Machine-parseable list for MCP server - one voice name per line
        if ($ActiveProvider -eq "windows-sapi" -or $ActiveProvider -eq "sapi") {
            $voices = Get-SAPIVoices
            foreach ($v in $voices) { Write-Output $v }
        }
        elseif ($ActiveProvider -eq "windows-piper" -or $ActiveProvider -eq "piper") {
            $voices = Get-PiperVoices
            foreach ($v in ($voices | Sort-Object)) { Write-Output $v }
        }
        elseif ($ActiveProvider -eq "soprano") {
            Write-Output "Soprano-1.1-80M"
        }
        else {
            # Fallback: try Piper voices
            $voices = Get-PiperVoices
            foreach ($v in ($voices | Sort-Object)) { Write-Output $v }
        }
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
        $n = if ($VoiceName) { [int]$VoiceName } else { 1 }
        $AudioDir = Join-Path (Split-Path -Parent $ClaudeDir) ".claude\audio"
        if (-not (Test-Path $AudioDir)) {
            $AudioDir = Join-Path $ClaudeDir "audio"
        }
        # Find project-local audio dir first
        $ScriptClaudeDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
        $ProjectAudioDir = Join-Path $ScriptClaudeDir "audio"
        if (Test-Path $ProjectAudioDir) { $AudioDir = $ProjectAudioDir }

        $recentFiles = Get-ChildItem -Path $AudioDir -Filter "tts-*.wav" -ErrorAction SilentlyContinue |
            Sort-Object LastWriteTime -Descending | Select-Object -First 10

        if (-not $recentFiles -or $recentFiles.Count -eq 0) {
            Write-Output "No recent audio files found"
            exit 1
        }

        if ($n -gt $recentFiles.Count) {
            Write-Output "Only $($recentFiles.Count) recent files available (requested #$n)"
            exit 1
        }

        $targetFile = $recentFiles[$n - 1]
        Write-Output "Replaying: $($targetFile.Name)"

        # Play using SoundPlayer
        Add-Type -AssemblyName System.Media
        $player = New-Object System.Media.SoundPlayer $targetFile.FullName
        $player.PlaySync()
        $player.Dispose()
    }
}

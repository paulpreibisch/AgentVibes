#
# File: .claude/hooks-windows/play-tts-piper.ps1
#
# AgentVibes - Windows Piper TTS Provider
# High-quality neural TTS using Piper.exe
#

param(
    [Parameter(Mandatory = $true)]
    [string]$Text,

    [Parameter(Mandatory = $false)]
    [string]$VoiceOverride
)

# Configuration paths
$ScriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectClaudeDir = Join-Path (Split-Path -Parent (Split-Path -Parent $ScriptPath)) ".claude"

if (Test-Path $ProjectClaudeDir) {
    $ClaudeDir = $ProjectClaudeDir
} else {
    $ClaudeDir = "$env:USERPROFILE\.claude"
}

# Audio cache and voice config use project-local .claude
$AudioDir = "$ClaudeDir\audio"
# Try provider-specific file first, then generic tts-voice.txt (set by TUI)
$VoiceFile = "$ClaudeDir\tts-voice-piper.txt"
if (-not (Test-Path $VoiceFile)) {
    $VoiceFile = "$ClaudeDir\tts-voice.txt"
}

# Voices and Piper binary are global (shared across projects, ~100MB+)
$UserClaudeDir = "$env:USERPROFILE\.claude"
$VoicesDir = "$UserClaudeDir\piper-voices"
# Try standard install location first, then fall back to PATH
$PiperExe = "$env:LOCALAPPDATA\Programs\Piper\piper.exe"
if (-not (Test-Path $PiperExe)) {
    $found = Get-Command piper.exe -ErrorAction SilentlyContinue
    if (-not $found) {
        # PATH may be stale (SSH sessions inherit minimal PATH); refresh from registry
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
        $found = Get-Command piper.exe -ErrorAction SilentlyContinue
    }
    if ($found) { $PiperExe = $found.Source }
}

# Ensure directories exist
foreach ($dir in @($AudioDir, $VoicesDir)) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
}

# Check if Piper is installed
if (-not (Test-Path $PiperExe)) {
    Write-Host "[ERROR] Piper not found at: $PiperExe" -ForegroundColor Red
    Write-Host "Run: .\setup-windows.ps1 to install Piper" -ForegroundColor Yellow
    exit 1
}

# Determine voice to use
$VoiceName = ""

if ($VoiceOverride) {
    $VoiceName = $VoiceOverride
}
elseif (Test-Path $VoiceFile) {
    $VoiceName = (Get-Content $VoiceFile -Raw).Trim()
}

# Strip display name suffix (e.g. "en_US-libritts-high::Holly-7" -> "en_US-libritts-high")
# and resolve the real Piper speaker index.
# IMPORTANT: The trailing number in a speaker name (e.g. "Holly-7") is a disambiguation
# suffix, NOT the speaker index. Real index must be looked up from voice-assignments.json.
$SpeakerId = $null

if ($VoiceName -match '::') {
    $parts = $VoiceName -split '::'
    $VoiceName = $parts[0]
    $SpeakerName = if ($parts.Length -ge 2) { $parts[1] } else { "" }

    if ($SpeakerName) {
        # Primary: look up in voice-assignments.json catalog (libritts_speakers keyed by speaker index)
        # Derive project root from this script's location: .claude/hooks-windows/ -> project root
        $PiperScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
        $PiperProjectRoot = Split-Path -Parent (Split-Path -Parent $PiperScriptRoot)
        $VoiceAssignmentsPath = Join-Path $PiperProjectRoot "voice-assignments.json"
        # Fallback: global AgentVibes install if not found in project
        if (-not (Test-Path $VoiceAssignmentsPath)) {
            $VoiceAssignmentsPath = Join-Path $env:USERPROFILE "AgentVibes\voice-assignments.json"
        }
        if (Test-Path $VoiceAssignmentsPath) {
            try {
                $vaData = Get-Content $VoiceAssignmentsPath -Raw | ConvertFrom-Json
                # First pass: try exact match
                foreach ($prop in $vaData.libritts_speakers.PSObject.Properties) {
                    if ($prop.Value.voice_name -eq $SpeakerName) {
                        $SpeakerId = $prop.Name
                        break
                    }
                }
                # If no exact match, try substring match as fallback
                if (-not $SpeakerId) {
                    foreach ($prop in $vaData.libritts_speakers.PSObject.Properties) {
                        if ($prop.Value.voice_name -like "$SpeakerName*") {
                            $SpeakerId = $prop.Name
                            break
                        }
                    }
                }
            } catch { }
        }
        # Fallback: check patched speaker_id_map in the .onnx.json
        if (-not $SpeakerId) {
            $OnnxJsonPath = "$VoicesDir\$VoiceName.onnx.json"
            if (Test-Path $OnnxJsonPath) {
                try {
                    $onnxData = Get-Content $OnnxJsonPath -Raw | ConvertFrom-Json
                    $speakerIdMap = $onnxData.speaker_id_map
                    if ($speakerIdMap -and $speakerIdMap.PSObject.Properties[$SpeakerName]) {
                        $SpeakerId = [string]$speakerIdMap.PSObject.Properties[$SpeakerName].Value
                    }
                } catch { }
            }
        }
    }
}

# Default voice if not specified
# Prefer en_US-lessac-medium (bundled/commonly installed) over en_US-ryan-high
if (-not $VoiceName) {
    $UserClaudePiperDir = "$env:USERPROFILE\.claude\piper-voices"
    if (Test-Path "$UserClaudePiperDir\en_US-lessac-medium.onnx") {
        $VoiceName = "en_US-lessac-medium"
    } elseif (Test-Path "$UserClaudePiperDir\en_US-ryan-high.onnx") {
        $VoiceName = "en_US-ryan-high"
    } else {
        # Fallback: use first available .onnx file, or default name for auto-download
        $firstVoice = Get-ChildItem -Path $UserClaudePiperDir -Filter "*.onnx" -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($firstVoice) {
            $VoiceName = $firstVoice.BaseName
        } else {
            $VoiceName = "en_US-lessac-medium"
        }
    }
}

# Security: Validate voice name to prevent path traversal
# Only allow alphanumeric, underscore, hyphen, and period
if ($VoiceName -notmatch '^[a-zA-Z0-9_\-\.]+$') {
    Write-Host "[ERROR] Invalid voice name: $VoiceName" -ForegroundColor Red
    exit 1
}

# Resolve voice model path and validate it stays within VoicesDir
$VoiceModelFile = [System.IO.Path]::GetFullPath("$VoicesDir\$VoiceName.onnx")
$VoiceJsonFile = [System.IO.Path]::GetFullPath("$VoicesDir\$VoiceName.onnx.json")
$ResolvedVoicesDir = [System.IO.Path]::GetFullPath($VoicesDir)
if (-not $VoiceModelFile.StartsWith($ResolvedVoicesDir)) {
    Write-Host "[ERROR] Voice path outside voices directory" -ForegroundColor Red
    exit 1
}

# Check if voice model exists, download if missing
if (-not (Test-Path $VoiceModelFile)) {
    Write-Host "[DOWNLOAD] Voice model: $VoiceName" -ForegroundColor Yellow

    # Try to download from Hugging Face
    # Voice name format: {lang}_{region}-{speaker}-{quality}
    # HF path format:    {lang}/{lang}_{region}/{speaker}/{quality}/{voicename}.onnx
    try {
        # Parse voice name to build correct HF path
        # e.g. en_US-ryan-high -> en/en_US/ryan/high/en_US-ryan-high.onnx
        if ($VoiceName -match '^([a-z]{2})_([A-Z]{2})-([a-zA-Z0-9_]+)-([a-z]+)$') {
            $Lang = $Matches[1]
            $LangRegion = "$($Matches[1])_$($Matches[2])"
            $Speaker = $Matches[3]
            $Quality = $Matches[4]
            $HFBase = "https://huggingface.co/rhasspy/piper-voices/resolve/main/$Lang/$LangRegion/$Speaker/$Quality"
        } else {
            # Fallback for non-standard voice names
            $HFBase = "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/ryan/high"
        }
        $ModelUrl = "$HFBase/$VoiceName.onnx"
        $JsonUrl = "$HFBase/$VoiceName.onnx.json"

        Write-Host "   Downloading model..." -ForegroundColor Cyan
        Invoke-WebRequest -Uri $ModelUrl -OutFile $VoiceModelFile -ErrorAction Stop
        Write-Host "   Downloading config..." -ForegroundColor Cyan
        Invoke-WebRequest -Uri $JsonUrl -OutFile $VoiceJsonFile -ErrorAction Stop
        Write-Host "[OK] Voice model downloaded" -ForegroundColor Green
    }
    catch {
        Write-Host "[ERROR] Failed to download voice model: $_" -ForegroundColor Red
        Write-Host "Make sure you have internet connection" -ForegroundColor Yellow
        exit 1
    }
}

# Sanitize text for speech - strip only dangerous shell metacharacters
$Text = $Text -replace '\\', ' '
$Text = $Text -replace '[{}<>|`~^;]', ''
$Text = $Text -replace '\s+', ' '
$Text = $Text.Trim()

# Create audio file path — SECURITY: use random name instead of predictable timestamp (#130)
$AudioFile = "$AudioDir\tts-$([System.IO.Path]::GetRandomFileName() -replace '\..*').wav"

# Synthesize with Piper
try {
    Write-Host "[SYNTH] Synthesizing with Piper..." -ForegroundColor Cyan

    # Run Piper with text input
    # Add --speaker for multi-speaker models (e.g. libritts-high with speaker 66 for Derek)
    $piperArgs = @("--model", $VoiceModelFile, "--output-file", $AudioFile)
    if ($SpeakerId) {
        $piperArgs += @("--speaker", $SpeakerId)
    }
    $Text | & $PiperExe @piperArgs 2>$null

    if (-not (Test-Path $AudioFile)) {
        Write-Host "[ERROR] Piper synthesis failed" -ForegroundColor Red
        exit 1
    }

    # Display results
    Write-Host "[OK] Saved to: $AudioFile" -ForegroundColor Green
    Write-Host "[VOICE] Voice used: $VoiceName (Piper)" -ForegroundColor Green

    # Apply audio effects (reverb, background music) if processor script exists.
    # SKIP when AGENTVIBES_NO_PLAY is set — that means the parent play-tts.ps1
    # will handle reverb/bg-music post-processing itself.  Running audio-processor
    # here AND letting the parent do its own effects causes double-processing:
    # this creates .effected.wav which the parent ignores, then the parent applies
    # effects to the original wav again.
    $ProcessorScript = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "audio-processor.ps1"
    $ProcessedFile = $AudioFile
    if (-not $env:AGENTVIBES_NO_PLAY -and (Test-Path $ProcessorScript)) {
        # Lookup order: agent name → LLM key (from --llm) → default
        $AgentName = if ($env:AGENTVIBES_AGENT_NAME) { $env:AGENTVIBES_AGENT_NAME } elseif ($env:AGENTVIBES_LLM_KEY) { $env:AGENTVIBES_LLM_KEY } else { "default" }
        $EffectedFile = "$AudioFile.effected.wav"
        try {
            & $ProcessorScript $AudioFile $AgentName $EffectedFile
            if ((Test-Path $EffectedFile) -and (Get-Item $EffectedFile).Length -gt 0) {
                $ProcessedFile = $EffectedFile
                Write-Host "[EFFECTS] Audio effects applied" -ForegroundColor Cyan
            }
        }
        catch {
            Write-Host "[WARNING] Audio effects processing skipped: $_" -ForegroundColor Yellow
        }
    }

    # Return path to processed audio file for parent (play-tts.ps1) to handle playback
    # This allows play-tts.ps1 to apply additional post-processing (reverb, background music)
    # DO NOT play here - let play-tts.ps1 coordinate all audio playback
    Write-Host "[OUTPUT] Processed audio: $ProcessedFile" -ForegroundColor Gray
}
catch {
    Write-Host "[ERROR] Error running Piper: $_" -ForegroundColor Red
    exit 1
}

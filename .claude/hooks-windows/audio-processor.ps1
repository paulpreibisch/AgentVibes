#
# File: .claude/hooks-windows/audio-processor.ps1
#
# AgentVibes - Windows Audio Effects Processor
# Applies reverb and background music effects to TTS audio
#

param(
    [Parameter(Position = 0)]
    [string]$InputFile = "",

    [Parameter(Position = 1)]
    [string]$AgentName = "default",

    [Parameter(Position = 2)]
    [string]$OutputFile = ""
)

$ErrorActionPreference = "Continue"

# Validate inputs
if (-not $InputFile -or -not (Test-Path $InputFile)) {
    Write-Host "[ERROR] Input file required and must exist" -ForegroundColor Red
    exit 1
}

# Set default output file
if (-not $OutputFile) {
    $OutputFile = $InputFile -replace '\.wav$', '-processed.wav'
}

# Configuration paths - prefer local project over global
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $ScriptDir)

# Resolve project-local config (if project-based)
$ProjectConfigDir = Join-Path $ProjectRoot ".claude\config"
$ProjectConfigFile = Join-Path $ProjectConfigDir "audio-effects.cfg"

# Global fallback
$GlobalConfigDir = Join-Path (Split-Path -Parent $ScriptDir) "config"
$GlobalConfigFile = Join-Path $GlobalConfigDir "audio-effects.cfg"

# Use project config if it exists, else fall back to global
$ConfigFile = if (Test-Path $ProjectConfigFile) { $ProjectConfigFile } else { $GlobalConfigFile }
$ConfigDir = Split-Path -Parent $ConfigFile

$EnabledFile = Join-Path $ConfigDir "background-music-enabled.txt"
$GlobalEnabledFile = "$env:USERPROFILE\.claude\config\background-music-enabled.txt"
$BackgroundDir = Join-Path (Split-Path -Parent $ScriptDir) "audio\tracks"

# Get effects configuration for agent
function Get-AgentEffects {
    param([string]$Agent)

    if (-not (Test-Path $ConfigFile)) {
        return @{reverb = ""; bgFile = ""; bgVol = 0.0}
    }

    $lines = Get-Content $ConfigFile -ErrorAction SilentlyContinue
    $configLine = $null

    foreach ($line in $lines) {
        if ($line -match "^$([regex]::Escape($Agent))\|") {
            $configLine = $line
            break
        }
    }

    if (-not $configLine) {
        foreach ($line in $lines) {
            if ($line -match "^default\|") {
                $configLine = $line
                break
            }
        }
    }

    if ($configLine) {
        $parts = $configLine -split '\|'
        if ($parts.Count -ge 2) {
            return @{
                reverb = $parts[1].Trim()
                bgFile = if ($parts.Count -ge 3) { $parts[2].Trim() } else { "" }
                bgVol = if ($parts.Count -ge 4) { [float]$parts[3] } else { 0.0 }
            }
        }
    }

    return @{reverb = ""; bgFile = ""; bgVol = 0.0}
}

# Check if sox and ffmpeg are available
$SoxAvailable = $null -ne (Get-Command sox -ErrorAction SilentlyContinue)
$FfmpegAvailable = $null -ne (Get-Command ffmpeg -ErrorAction SilentlyContinue)

# Get effects for this agent
$effects = Get-AgentEffects $AgentName

# Check if background music is enabled
$BgMusicEnabled = $false
if (Test-Path $EnabledFile) {
    $BgMusicEnabled = (Get-Content $EnabledFile).Trim() -eq "true"
} elseif (Test-Path $GlobalEnabledFile) {
    $BgMusicEnabled = (Get-Content $GlobalEnabledFile).Trim() -eq "true"
}

# Start with the input file
$CurrentFile = $InputFile
$NeedsCleanup = $false

# Apply reverb using sox if available and configured
if ($SoxAvailable -and $effects.reverb) {
    $TempFile = "$InputFile.tmp.wav"
    try {
        # Validate reverb params: only allow known sox reverb tokens (numbers, "reverb", "gain", etc.)
        $reverbTokens = $effects.reverb -split ' ' | Where-Object {
            $_ -match '^-?[0-9]+(\.[0-9]+)?$' -or $_ -match '^(reverb|gain|vol|norm|pad|trim|rate|channels)$'
        }
        $soxArgs = @($InputFile) + $reverbTokens + @($TempFile)
        & sox @soxArgs 2>$null
        if (Test-Path $TempFile) {
            $CurrentFile = $TempFile
            $NeedsCleanup = $true
        }
    }
    catch {
        Write-Host "[WARNING] Sox reverb failed" -ForegroundColor Yellow
    }
}

# Apply background music mixing if enabled and file specified
if ($BgMusicEnabled -and $FfmpegAvailable -and $effects.bgFile) {
    $BgFile = Join-Path $BackgroundDir $effects.bgFile
    if (Test-Path $BgFile) {
        $MixedFile = "$InputFile.mixed.wav"
        $BgVolume = [math]::Round($effects.bgVol, 2)
        $TTSVolume = 1.0  # Keep TTS at full volume
        
        try {
            # Use ffmpeg to mix audio: TTS voice + background music
            # -y to overwrite output file
            $ffArgs = @(
                "-y",
                "-i", $CurrentFile,
                "-i", $BgFile,
                "-filter_complex", "[0]volume=$TTSVolume[a];[1]volume=$BgVolume[b];[a][b]amix=inputs=2:duration=first[out]",
                "-map", "[out]",
                $MixedFile
            )
            & ffmpeg @ffArgs 2>$null
            if ((Test-Path $MixedFile) -and (Get-Item $MixedFile).Length -gt 0) {
                if ($NeedsCleanup -and (Test-Path $CurrentFile) -and $CurrentFile -ne $InputFile) {
                    Remove-Item -Path $CurrentFile -Force -ErrorAction SilentlyContinue
                }
                $CurrentFile = $MixedFile
                $NeedsCleanup = $true
            }
        }
        catch {
            Write-Host "[WARNING] FFmpeg mixing failed for $($effects.bgFile)" -ForegroundColor Yellow
        }
    }
}

# Copy to final output location
if ($CurrentFile -ne $InputFile -or $CurrentFile -ne $OutputFile) {
    Copy-Item -Path $CurrentFile -Destination $OutputFile -Force -ErrorAction SilentlyContinue
}

# Cleanup temp files
if ($NeedsCleanup -and (Test-Path $CurrentFile) -and $CurrentFile -ne $OutputFile) {
    Remove-Item -Path $CurrentFile -Force -ErrorAction SilentlyContinue
}

# Ensure output file exists
if (-not (Test-Path $OutputFile)) {
    Copy-Item -Path $InputFile -Destination $OutputFile -Force
}

Write-Output $OutputFile

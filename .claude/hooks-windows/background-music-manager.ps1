#
# File: .claude/hooks-windows/background-music-manager.ps1
#
# AgentVibes - Background Music Manager (Windows)
# Manages background music settings for TTS
#

param(
    [Parameter(Position = 0)]
    [string]$Command = "status",

    [Parameter(Position = 1)]
    [string]$Arg1 = "",

    [Parameter(Position = 2)]
    [string]$Arg2 = ""
)

# Resolve paths relative to this script
$ScriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$ClaudeDir = Split-Path -Parent $ScriptPath
$ConfigDir = Join-Path $ClaudeDir "config"
$TracksDir = Join-Path (Join-Path $ClaudeDir "audio") "tracks"
$EnabledFile = Join-Path $ConfigDir "background-music-enabled.txt"
$VolumeFile = Join-Path $ConfigDir "background-music-volume.txt"
$AudioEffectsCfg = Join-Path $ConfigDir "audio-effects.cfg"

$DefaultVolume = "0.34"

# Ensure config directory exists
if (-not (Test-Path $ConfigDir)) {
    New-Item -ItemType Directory -Path $ConfigDir -Force | Out-Null
}

function Test-Enabled {
    if (Test-Path $EnabledFile) {
        $status = (Get-Content $EnabledFile -Raw).Trim()
        return ($status -eq "true" -or $status -eq "on" -or $status -eq "1")
    }
    return $false
}

function Get-MusicVolume {
    if (Test-Path $VolumeFile) {
        return (Get-Content $VolumeFile -Raw).Trim()
    }
    return $DefaultVolume
}

function Set-Enabled {
    param([string]$Value)
    Set-Content -Path $EnabledFile -Value $Value -NoNewline
}

function Set-MusicVolume {
    param([string]$Value)

    if ($Value -notmatch '^\d*\.?\d+$') {
        Write-Output "Error: Volume must be a number between 0.0 and 1.0"
        exit 1
    }

    $num = [double]$Value
    if ($num -lt 0 -or $num -gt 1) {
        Write-Output "Error: Volume must be between 0.0 and 1.0"
        exit 1
    }

    Set-Content -Path $VolumeFile -Value $Value -NoNewline
}

function Get-DefaultTrack {
    if (-not (Test-Path $AudioEffectsCfg)) { return "" }

    $lines = Get-Content $AudioEffectsCfg
    foreach ($line in $lines) {
        if ($line -match '^default\|') {
            $parts = $line -split '\|'
            if ($parts.Length -ge 3) { return $parts[2] }
        }
    }
    return ""
}

function Show-TrackList {
    if (-not (Test-Path $TracksDir)) {
        Write-Output "No tracks folder found at $TracksDir"
        return
    }

    Write-Output "Available Background Music Tracks"
    Write-Output "===================================="
    Write-Output ""

    $files = Get-ChildItem -Path $TracksDir -File -Include "*.mp3", "*.wav", "*.ogg" -Recurse | Sort-Object Name
    $count = 0

    foreach ($file in $files) {
        $count++
        Write-Output ("{0,2}. {1}" -f $count, $file.Name)
    }

    if ($count -eq 0) {
        Write-Output "No audio files found in tracks folder"
    } else {
        Write-Output ""
        Write-Output "Total: $count track(s)"
    }
}

function Set-DefaultTrack {
    param([string]$Track)

    if (-not $Track) {
        Write-Output "Error: No track name provided"
        Write-Output "Usage: background-music-manager.ps1 set-default TRACK_NAME"
        exit 1
    }

    $trackPath = Join-Path $TracksDir $Track
    if (-not (Test-Path $trackPath)) {
        Write-Output "Error: Track '$Track' not found in tracks folder"
        Write-Output "Run 'background-music-manager.ps1 list' to see available tracks"
        exit 1
    }

    if (-not (Test-Path $AudioEffectsCfg)) {
        Write-Output "Error: audio-effects.cfg not found at $AudioEffectsCfg"
        exit 1
    }

    $lines = Get-Content $AudioEffectsCfg
    $found = $false
    $newLines = @()

    foreach ($line in $lines) {
        if ($line -match '^default\|') {
            $parts = $line -split '\|'
            if ($parts.Length -ge 4) {
                $newLines += "$($parts[0])|$($parts[1])|$Track|$($parts[3])"
            } else {
                $newLines += "default||$Track|0.30"
            }
            $found = $true
        } else {
            $newLines += $line
        }
    }

    if (-not $found) {
        Write-Output "Error: No default entry found in audio-effects.cfg"
        exit 1
    }

    Set-Content -Path $AudioEffectsCfg -Value ($newLines -join "`n")

    if (-not (Test-Enabled)) {
        Set-Enabled "true"
        Write-Output "[OK] Default background music set to: $Track"
        Write-Output "[OK] Background music enabled automatically"
    } else {
        Write-Output "[OK] Default background music set to: $Track"
    }
}

function Set-AgentTrack {
    param([string]$Agent, [string]$Track)

    if (-not $Agent -or -not $Track) {
        Write-Output "Error: Agent name and track required"
        Write-Output "Usage: background-music-manager.ps1 set-agent AGENT_NAME TRACK_NAME"
        exit 1
    }

    $trackPath = Join-Path $TracksDir $Track
    if (-not (Test-Path $trackPath)) {
        Write-Output "Error: Track not found: $Track"
        Write-Output "Run 'background-music-manager.ps1 list' to see available tracks"
        exit 1
    }

    if (-not (Test-Path $AudioEffectsCfg)) {
        Write-Output "Error: audio-effects.cfg not found"
        exit 1
    }

    $lines = Get-Content $AudioEffectsCfg
    $found = $false
    $newLines = @()

    foreach ($line in $lines) {
        if ($line -match "^${Agent}\|") {
            $parts = $line -split '\|'
            if ($parts.Length -ge 4) {
                $newLines += "$($parts[0])|$($parts[1])|$Track|$($parts[3])"
            } else {
                $newLines += "${Agent}||${Track}|0.30"
            }
            $found = $true
        } else {
            $newLines += $line
        }
    }

    if (-not $found) {
        $newLines += "${Agent}||${Track}|0.30"
        Write-Output "[OK] Added background music for ${Agent}: $Track"
    } else {
        Write-Output "[OK] Updated background music for ${Agent}: $Track"
    }

    Set-Content -Path $AudioEffectsCfg -Value ($newLines -join "`n")

    if (-not (Test-Enabled)) {
        Set-Enabled "true"
        Write-Output "[OK] Background music enabled automatically"
    }
}

function Set-AllAgentsTrack {
    param([string]$Track)

    if (-not $Track) {
        Write-Output "Error: Track name required"
        Write-Output "Usage: background-music-manager.ps1 set-all TRACK_NAME"
        exit 1
    }

    $trackPath = Join-Path $TracksDir $Track
    if (-not (Test-Path $trackPath)) {
        Write-Output "Error: Track not found: $Track"
        Write-Output "Run 'background-music-manager.ps1 list' to see available tracks"
        exit 1
    }

    if (-not (Test-Path $AudioEffectsCfg)) {
        Write-Output "Error: audio-effects.cfg not found"
        exit 1
    }

    $lines = Get-Content $AudioEffectsCfg
    $newLines = @()
    $count = 0

    foreach ($line in $lines) {
        if ($line -match '^\s*#' -or $line -match '^\s*$') {
            $newLines += $line
            continue
        }
        if ($line -match '^_party_mode\|') {
            $newLines += $line
            continue
        }
        $parts = $line -split '\|'
        if ($parts.Length -ge 4) {
            $newLines += "$($parts[0])|$($parts[1])|$Track|$($parts[3])"
            $count++
        } else {
            $newLines += $line
        }
    }

    Set-Content -Path $AudioEffectsCfg -Value ($newLines -join "`n")
    Write-Output "[OK] Updated background music for $count agents: $Track"

    if (-not (Test-Enabled)) {
        Set-Enabled "true"
        Write-Output "[OK] Background music enabled automatically"
    }
}

function Show-Status {
    Write-Output "Background Music Status"
    Write-Output "=========================="

    if (Test-Enabled) {
        Write-Output "Status: ENABLED"
    } else {
        Write-Output "Status: DISABLED"
    }

    $vol = Get-MusicVolume
    $pct = [math]::Round([double]$vol * 100)
    Write-Output ('Volume: {0} ({1}%)' -f $vol, $pct)

    $defaultTrack = Get-DefaultTrack
    if ($defaultTrack) {
        Write-Output "Default Track: $defaultTrack"
    } else {
        Write-Output "Default Track: none"
    }

    if (Test-Path $TracksDir) {
        $count = (Get-ChildItem -Path $TracksDir -File -Include "*.mp3", "*.wav", "*.ogg" -Recurse).Count
        Write-Output "Tracks: $count audio file(s) in tracks folder"
    } else {
        Write-Output "Tracks: No tracks folder found"
    }

    Write-Output ""
    Write-Output "Dependencies:"
    if (Get-Command sox -ErrorAction SilentlyContinue) {
        Write-Output "  sox: installed"
    } else {
        Write-Output "  sox: not installed (needed for effects)"
    }
    if (Get-Command ffmpeg -ErrorAction SilentlyContinue) {
        Write-Output "  ffmpeg: installed"
    } else {
        Write-Output "  ffmpeg: not installed (needed for mixing)"
    }
}

# Main command handler
if ($Command -in "status", "") {
    Show-Status
} elseif ($Command -in "on", "enable", "true") {
    Set-Enabled "true"
    $vol = Get-MusicVolume
    Write-Output "[OK] Background music ENABLED at $vol volume"
} elseif ($Command -in "off", "disable", "false") {
    Set-Enabled "false"
    Write-Output "[OK] Background music DISABLED"
} elseif ($Command -eq "volume") {
    if (-not $Arg1) {
        $vol = Get-MusicVolume
        Write-Output "Current volume: $vol"
    } else {
        Set-MusicVolume $Arg1
        Write-Output "[OK] Background music volume set to $Arg1"
    }
} elseif ($Command -eq "list") {
    Show-TrackList
} elseif ($Command -eq "set-default") {
    Set-DefaultTrack $Arg1
} elseif ($Command -eq "set-agent") {
    Set-AgentTrack $Arg1 $Arg2
} elseif ($Command -eq "set-all") {
    Set-AllAgentsTrack $Arg1
} elseif ($Command -eq "get-enabled") {
    if (Test-Enabled) { Write-Output "true" } else { Write-Output "false" }
} elseif ($Command -eq "get-volume") {
    $vol = Get-MusicVolume
    Write-Output $vol
} else {
    Write-Output "Usage: background-music-manager.ps1 {status|on|off|volume [X]|list|set-default TRACK|set-agent AGENT TRACK|set-all TRACK|get-enabled|get-volume}"
    exit 1
}

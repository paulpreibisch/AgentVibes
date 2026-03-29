#
# File: .claude/hooks-windows/speed-manager.ps1
#
# AgentVibes - Finally, your AI Agents can Talk Back!
# Website: https://agentvibes.org
# Copyright (c) 2025 Paul Preibisch
# Licensed under the Apache License, Version 2.0

param(
    [Parameter(Position=0)]
    [string]$Command = "help",
    [Parameter(Position=1)]
    [string]$Arg1 = ""
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ClaudeDir = Split-Path -Parent $ScriptDir

# Determine config directory
if ($env:CLAUDE_PROJECT_DIR -and (Test-Path "$env:CLAUDE_PROJECT_DIR\.claude")) {
    $ConfigDir = Join-Path $env:CLAUDE_PROJECT_DIR ".claude" "config"
} else {
    $ConfigDir = Join-Path $ClaudeDir "config"
}

if (-not (Test-Path $ConfigDir)) { New-Item -ItemType Directory -Path $ConfigDir -Force | Out-Null }

$MainSpeedFile = Join-Path $ConfigDir "tts-speech-rate.txt"
$TargetSpeedFile = Join-Path $ConfigDir "tts-target-speech-rate.txt"

# Legacy migration
$LegacyMain = Join-Path $ConfigDir "piper-speech-rate.txt"
$LegacyTarget = Join-Path $ConfigDir "piper-target-speech-rate.txt"
if ((Test-Path $LegacyMain) -and -not (Test-Path $MainSpeedFile)) {
    Copy-Item $LegacyMain $MainSpeedFile
}
if ((Test-Path $LegacyTarget) -and -not (Test-Path $TargetSpeedFile)) {
    Copy-Item $LegacyTarget $TargetSpeedFile
}

function Parse-SpeedValue {
    param([string]$Input)

    switch -Regex ($Input) {
        '^(normal|1x|1\.0)$' { return "1.0" }
        '^(slow|slower|0\.5x)$' { return "0.5" }
        '^(fast|2x|2\.0)$' { return "2.0" }
        '^(faster|3x|3\.0)$' { return "3.0" }
    }

    $val = $Input -replace '^[+-]', '' -replace 'x$', ''
    if ($val -match '^\d+\.?\d*$') { return $val }
    return "ERROR"
}

function Set-Speed {
    param([bool]$IsTarget = $false, [string]$SpeedInput)

    if (-not $SpeedInput) {
        Write-Output "Error: Speed value required"
        Write-Output "Usage: speed-manager.ps1 [target] <speed>"
        exit 1
    }

    $speedValue = Parse-SpeedValue $SpeedInput
    if ($speedValue -eq "ERROR") {
        Write-Output "Invalid speed value: $SpeedInput"
        Write-Output "Valid values: normal, 0.5x, 1x, 2x, 3x"
        exit 1
    }

    if ($IsTarget) {
        $configFile = $TargetSpeedFile
        $voiceType = "target language"
    } else {
        $configFile = $MainSpeedFile
        $voiceType = "main voice"
    }

    Set-Content -Path $configFile -Value $speedValue -NoNewline

    Write-Output "Speech speed set for $voiceType"
    Write-Output ""
    Write-Output "Speed: ${speedValue}x"

    switch ($speedValue) {
        "0.5" { Write-Output "Effect: Half speed (slower)" }
        "1.0" { Write-Output "Effect: Normal speed" }
        "2.0" { Write-Output "Effect: Double speed (faster)" }
        "3.0" { Write-Output "Effect: Triple speed (very fast)" }
        default {
            if ([double]$speedValue -gt 1.0) {
                Write-Output "Effect: Faster speech"
            } else {
                Write-Output "Effect: Slower speech"
            }
        }
    }
}

function Get-Speed {
    Write-Output "---------------------------------------"
    Write-Output "   Current Speech Speed Settings"
    Write-Output "---------------------------------------"
    Write-Output ""

    if (Test-Path $MainSpeedFile) {
        $mainSpeed = (Get-Content $MainSpeedFile | Where-Object { $_ -notmatch '^\s*#' -and $_.Trim() -ne '' } | Select-Object -Last 1).Trim()
        Write-Output "Main voice: ${mainSpeed}x"
    } else {
        Write-Output "Main voice: 1.0x (default, normal speed)"
    }

    if (Test-Path $TargetSpeedFile) {
        $targetSpeed = (Get-Content $TargetSpeedFile | Where-Object { $_ -notmatch '^\s*#' -and $_.Trim() -ne '' } | Select-Object -Last 1).Trim()
        Write-Output "Target language: ${targetSpeed}x"
    } else {
        Write-Output "Target language: 0.5x (default, slower for learning)"
    }

    Write-Output ""
    Write-Output "Scale: 0.5x=slower, 1.0x=normal, 2.0x=faster, 3.0x=very fast"
    Write-Output "---------------------------------------"
}

switch -Regex ($Command) {
    "^target$" {
        Set-Speed -IsTarget $true -SpeedInput $Arg1
    }
    "^(get|status)$" {
        Get-Speed
    }
    "^(normal|fast|slow|slower)$" {
        Set-Speed -SpeedInput $Command
    }
    "^.*x$" {
        Set-Speed -SpeedInput $Command
    }
    "^\d+\.?\d*$" {
        Set-Speed -SpeedInput $Command
    }
    "^[+-]" {
        Set-Speed -SpeedInput $Command
    }
    "^help$" {
        Write-Output "Speech Speed Manager"
        Write-Output ""
        Write-Output "Usage:"
        Write-Output "  speed-manager.ps1 <speed>          Set main voice speed"
        Write-Output "  speed-manager.ps1 target <speed>   Set target language speed"
        Write-Output "  speed-manager.ps1 get              Show current speeds"
        Write-Output ""
        Write-Output "Speed values: 0.5x, 1x, 2x, 3x, normal, slow, fast, faster"
    }
    default {
        # Try as speed value
        $parsed = Parse-SpeedValue $Command
        if ($parsed -ne "ERROR") {
            Set-Speed -SpeedInput $Command
        } else {
            Write-Output "Unknown command: $Command"
            Write-Output "Usage: speed-manager.ps1 {get|target|<speed>}"
            exit 1
        }
    }
}

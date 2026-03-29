#
# File: .claude/hooks-windows/effects-manager.ps1
#
# AgentVibes - Finally, your AI Agents can Talk Back! Text-to-Speech WITH personality for AI Assistants!
# Website: https://agentvibes.org
# Repository: https://github.com/paulpreibisch/AgentVibes
#
# Co-created by Paul Preibisch with Claude AI
# Copyright (c) 2025 Paul Preibisch
#
# Licensed under the Apache License, Version 2.0

param(
    [Parameter(Position=0)]
    [string]$Command = "help",
    [Parameter(Position=1)]
    [string]$Arg1 = "",
    [Parameter(Position=2)]
    [string]$Arg2 = "default",
    [Parameter(Position=3)]
    [string]$Arg3 = ""
)

$ErrorActionPreference = "Continue"

# Get script directory and config file path
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ConfigDir = Join-Path (Split-Path -Parent $ScriptDir) "config"
$ConfigFile = Join-Path $ConfigDir "audio-effects.cfg"
$ReverbLevelFile = Join-Path $ConfigDir "reverb-level.txt"

# Reverb level mappings (sox format: reverberance HF-damping room-scale)
$ReverbLevels = @{
    "off"        = ""
    "light"      = "reverb 20 50 50"
    "medium"     = "reverb 40 50 70"
    "heavy"      = "reverb 70 50 100"
    "cathedral"  = "reverb 90 30 100"
}

function Get-AgentEffects {
    param([string]$AgentName)

    if (-not (Test-Path $ConfigFile)) {
        Write-Output ""
        return
    }

    $lines = Get-Content $ConfigFile
    $configLine = $null

    foreach ($line in $lines) {
        if ($line -match "^$([regex]::Escape($AgentName))\|") {
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
            Write-Output $parts[1]
        } else {
            Write-Output ""
        }
    } else {
        Write-Output ""
    }
}

function Set-Reverb {
    param(
        [string]$Level,
        [string]$AgentName = "default",
        [string]$ApplyAll = ""
    )

    if (-not $ReverbLevels.ContainsKey($Level)) {
        Write-Output "Invalid reverb level: $Level"
        Write-Output "Valid levels: off, light, medium, heavy, cathedral"
        exit 1
    }

    $reverbEffect = $ReverbLevels[$Level]

    # Always update reverb-level.txt for play-tts.ps1 compatibility
    if ($ApplyAll -eq "--all" -or $AgentName -eq "default") {
        Set-Content -Path $ReverbLevelFile -Value $Level -NoNewline
    }

    if (-not (Test-Path $ConfigFile)) {
        Write-Output "Config file not found: $ConfigFile"
        exit 1
    }

    $lines = Get-Content $ConfigFile
    $newLines = @()

    if ($ApplyAll -eq "--all") {
        Write-Host "Setting reverb to '$Level' for all agents..."

        foreach ($line in $lines) {
            if ($line -match "^#" -or $line.Trim() -eq "" -or $line -match "^\|") {
                $newLines += $line
                continue
            }

            $parts = $line -split '\|', 4
            if ($parts.Count -ge 4) {
                $agent = $parts[0]
                $soxEffects = $parts[1]
                $bgFile = $parts[2]
                $bgVol = $parts[3]

                # Remove existing reverb from sox effects
                $newEffects = $soxEffects -replace 'reverb\s+\d+\s+\d+\s+\d+', ''
                $newEffects = ($newEffects -replace '\s+', ' ').Trim()

                # Add new reverb if not off
                if ($reverbEffect) {
                    if ($newEffects) {
                        $newEffects = "$reverbEffect $newEffects"
                    } else {
                        $newEffects = $reverbEffect
                    }
                }

                $newLines += "$agent|$newEffects|$bgFile|$bgVol"
            } else {
                $newLines += $line
            }
        }

        Set-Content -Path $ConfigFile -Value ($newLines -join "`n") -NoNewline
        Write-Output "Reverb set to '$Level' for all agents"
    } else {
        Write-Host "Setting reverb to '$Level' for '$AgentName'..."

        # Check if agent exists in config
        $agentExists = $false
        foreach ($line in $lines) {
            if ($line -match "^$([regex]::Escape($AgentName))\|") {
                $agentExists = $true
                break
            }
        }

        if (-not $agentExists) {
            Add-Content -Path $ConfigFile -Value "${AgentName}|${reverbEffect}|agentvibes_soft_flamenco_loop.mp3|0.30"
            Write-Output "Created new config for '$AgentName' with reverb '$Level'"
            return
        }

        foreach ($line in $lines) {
            if ($line -match "^#" -or $line.Trim() -eq "" -or $line -match "^\|") {
                $newLines += $line
                continue
            }

            $parts = $line -split '\|', 4
            if ($parts.Count -ge 4 -and $parts[0] -eq $AgentName) {
                $soxEffects = $parts[1]
                $bgFile = $parts[2]
                $bgVol = $parts[3]

                # Remove existing reverb
                $newEffects = $soxEffects -replace 'reverb\s+\d+\s+\d+\s+\d+', ''
                $newEffects = ($newEffects -replace '\s+', ' ').Trim()

                if ($reverbEffect) {
                    if ($newEffects) {
                        $newEffects = "$reverbEffect $newEffects"
                    } else {
                        $newEffects = $reverbEffect
                    }
                }

                $newLines += "$($parts[0])|$newEffects|$bgFile|$bgVol"
            } else {
                $newLines += $line
            }
        }

        Set-Content -Path $ConfigFile -Value ($newLines -join "`n") -NoNewline
        Write-Output "Reverb set to '$Level' for '$AgentName'"
    }
}

function Get-ReverbLevel {
    param([string]$AgentName = "default")

    $effects = Get-AgentEffects -AgentName $AgentName

    if (-not $effects -or $effects -notmatch 'reverb') {
        Write-Output "off"
        return
    }

    if ($effects -match 'reverb\s+(\d+)\s+(\d+)\s+(\d+)') {
        $reverbVal = [int]$Matches[1]
        if ($reverbVal -le 20) {
            Write-Output "light"
        } elseif ($reverbVal -le 40) {
            Write-Output "medium"
        } elseif ($reverbVal -le 70) {
            Write-Output "heavy"
        } else {
            Write-Output "cathedral"
        }
    } else {
        Write-Output "off"
    }
}

function Show-Effects {
    if (-not (Test-Path $ConfigFile)) {
        Write-Output "Config file not found: $ConfigFile"
        exit 1
    }

    Write-Output "Current Audio Effects Configuration:"
    Write-Output ""

    $lines = Get-Content $ConfigFile
    foreach ($line in $lines) {
        if ($line -match "^#" -or $line.Trim() -eq "" -or $line -match "^\|") {
            continue
        }

        $parts = $line -split '\|', 4
        if ($parts.Count -ge 2) {
            $agent = $parts[0]
            $soxEffects = $parts[1]

            $reverbLevel = "off"
            if ($soxEffects -match 'reverb\s+(\d+)\s+(\d+)\s+(\d+)') {
                $reverbVal = [int]$Matches[1]
                if ($reverbVal -le 20) { $reverbLevel = "light" }
                elseif ($reverbVal -le 40) { $reverbLevel = "medium" }
                elseif ($reverbVal -le 70) { $reverbLevel = "heavy" }
                else { $reverbLevel = "cathedral" }
            }

            Write-Output "   ${agent}: reverb=$reverbLevel"
            if ($soxEffects) {
                Write-Output "      Effects: $soxEffects"
            }
        }
    }
}

# Main command dispatcher
switch ($Command) {
    "set-reverb" {
        if (-not $Arg1) {
            Write-Output "Usage: effects-manager.ps1 set-reverb <level> [agent-name] [--all]"
            Write-Output "Levels: off, light, medium, heavy, cathedral"
            exit 1
        }
        Set-Reverb -Level $Arg1 -AgentName $Arg2 -ApplyAll $Arg3
    }
    "get-reverb" {
        $agent = if ($Arg1) { $Arg1 } else { "default" }
        Get-ReverbLevel -AgentName $agent
    }
    "get-effects" {
        $agent = if ($Arg1) { $Arg1 } else { "default" }
        Get-AgentEffects -AgentName $agent
    }
    "list" {
        Show-Effects
    }
    default {
        Write-Output "Usage: effects-manager.ps1 {set-reverb|get-reverb|get-effects|list}"
        Write-Output ""
        Write-Output "Commands:"
        Write-Output "  set-reverb <level> [agent] [--all]  Set reverb level"
        Write-Output "  get-reverb [agent]                  Get current reverb level"
        Write-Output "  get-effects [agent]                 Get all effects for agent"
        Write-Output "  list                                List all agent effects"
        Write-Output ""
        Write-Output "Reverb Levels: off, light, medium, heavy, cathedral"
        exit 1
    }
}

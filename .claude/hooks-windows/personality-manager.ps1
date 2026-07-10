#
# File: .claude/hooks-windows/personality-manager.ps1
#
# AgentVibes - Finally, your AI Agents can Talk Back!
# Website: https://agentvibes.org
# Copyright (c) 2025 Paul Preibisch
# Licensed under the Apache License, Version 2.0

param(
    [Parameter(Position=0)]
    [string]$Command = "help",
    [Parameter(Position=1)]
    [string]$Arg1 = "",
    [Parameter(Position=2)]
    [string]$Arg2 = ""
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ClaudeDir = Split-Path -Parent $ScriptDir
$PersonalitiesDir = Join-Path $ClaudeDir "personalities"
$ProjectRoot = Split-Path -Parent $ClaudeDir

# Determine config directory (project-local, then global)
if ($env:CLAUDE_PROJECT_DIR -and (Test-Path "$env:CLAUDE_PROJECT_DIR\.claude")) {
    $ConfigClaudeDir = Join-Path $env:CLAUDE_PROJECT_DIR ".claude"
} else {
    $ConfigClaudeDir = $ClaudeDir
}

$PersonalityFile = Join-Path $ConfigClaudeDir "tts-personality.txt"

# Load the generated Provider Catalog (SSOT) for the Piper default voice.
# FAIL-SAFE: consumers probe `Get-Command Get-CatalogDefaultVoice` and fall back
# to the legacy literal when the artifact is missing (installed-tree skew) —
# mirrors voice-manager-windows.ps1 / play-tts-kokoro.ps1 (AVI-S9.3/9.4).
$CatalogPs1 = Join-Path $ScriptDir 'provider-catalog.ps1'
if (Test-Path $CatalogPs1) { . $CatalogPs1 }

function Get-PersonalityData {
    param([string]$Personality, [string]$Field)
    $file = Join-Path $PersonalitiesDir "$Personality.md"
    if (-not (Test-Path $file)) { return "" }
    $content = Get-Content $file -Raw

    switch ($Field) {
        "description" {
            if ($content -match '(?m)^description:\s*(.+)$') { return $Matches[1].Trim() }
        }
        "piper_voice" {
            if ($content -match '(?m)^piper_voice:\s*(.+)$') { return $Matches[1].Trim() }
        }
        "voice" {
            if ($content -match '(?m)^piper_voice:\s*(.+)$') { return $Matches[1].Trim() }
        }
    }
    return ""
}

function Get-Personalities {
    if (-not (Test-Path $PersonalitiesDir)) { return @() }
    Get-ChildItem -Path $PersonalitiesDir -Filter "*.md" -File |
        ForEach-Object { $_.BaseName } | Sort-Object
}

switch ($Command) {
    "list" {
        $current = "normal"
        if (Test-Path $PersonalityFile) {
            $current = (Get-Content $PersonalityFile -Raw).Trim()
        }

        # Try Node.js formatter
        $formatter = Join-Path $ProjectRoot "src\cli\list-personalities.js"
        if ((Test-Path $formatter) -and (Get-Command node -ErrorAction SilentlyContinue)) {
            & node $formatter $PersonalitiesDir $current
        } else {
            Write-Output "Available Personalities:"
            Write-Output "---------------------------------------"
            foreach ($p in (Get-Personalities)) {
                $desc = Get-PersonalityData $p "description"
                if ($p -eq $current) {
                    Write-Output "  > $p - $desc (current)"
                } else {
                    Write-Output "  - $p - $desc"
                }
            }
            if ($current -eq "random") {
                Write-Output "  > random - Picks randomly each time (current)"
            } else {
                Write-Output "  - random - Picks randomly each time"
            }
            Write-Output "---------------------------------------"
            Write-Output ""
            Write-Output "Usage: /agent-vibes:personality <name>"
        }
    }

    { $_ -in "set", "switch" } {
        if (-not $Arg1) {
            Write-Output "Please specify a personality name"
            Write-Output "Usage: personality-manager.ps1 set <personality>"
            exit 1
        }

        $personality = $Arg1

        if ($personality -ne "random") {
            $pFile = Join-Path $PersonalitiesDir "$personality.md"
            if (-not (Test-Path $pFile)) {
                Write-Output "Personality not found: $personality"
                Write-Output ""
                Write-Output "Available personalities:"
                foreach ($p in (Get-Personalities)) {
                    Write-Output "  - $p"
                }
                exit 1
            }
        }

        # Save personality
        Set-Content -Path $PersonalityFile -Value $personality -NoNewline
        Write-Output "Personality set to: $personality"

        # Get assigned voice
        $assignedVoice = Get-PersonalityData $personality "piper_voice"
        if (-not $assignedVoice) {
            # Fallback to default Piper voice — sourced from the generated Provider
            # Catalog SSOT (AVI-S9.4). FAIL-SAFE: legacy literal if artifact missing.
            $assignedVoice = $null
            if (Get-Command Get-CatalogDefaultVoice -ErrorAction SilentlyContinue) {
                $assignedVoice = Get-CatalogDefaultVoice -Provider 'piper'
            }
            if (-not $assignedVoice) { $assignedVoice = "en_US-lessac-medium" }
        }

        if ($assignedVoice) {
            Write-Output "Switching to assigned voice: $assignedVoice"
            $voiceManager = Join-Path $ScriptDir "voice-manager-windows.ps1"
            if (Test-Path $voiceManager) {
                & powershell -NoProfile -ExecutionPolicy Bypass -File $voiceManager switch $assignedVoice 2>$null
            }
        }

        if ($personality -ne "random") {
            $remark = "Personality set to ${personality}!"

            # Try to get example from personality file
            $pFile = Join-Path $PersonalitiesDir "$personality.md"
            if (Test-Path $pFile) {
                $examples = Get-Content $pFile | Where-Object { $_ -match '^- "(.+)"$' } |
                    ForEach-Object { if ($_ -match '^- "(.+)"$') { $Matches[1] } }
                if ($examples -and $examples.Count -gt 0) {
                    $remark = $examples | Get-Random
                }
            }

            Write-Output "$remark"
        }
    }

    "get" {
        if (Test-Path $PersonalityFile) {
            $current = (Get-Content $PersonalityFile -Raw).Trim()
            Write-Output "Current personality: $current"
            if ($current -ne "random") {
                $desc = Get-PersonalityData $current "description"
                if ($desc) { Write-Output "Description: $desc" }
            }
        } else {
            Write-Output "Current personality: normal (default)"
        }
    }

    "add" {
        if (-not $Arg1) {
            Write-Output "Please specify a personality name"
            exit 1
        }
        $name = $Arg1
        $file = Join-Path $PersonalitiesDir "$name.md"
        if (Test-Path $file) {
            Write-Output "Personality '$name' already exists. Use 'edit' to modify it."
            exit 1
        }

        if (-not (Test-Path $PersonalitiesDir)) { New-Item -ItemType Directory -Path $PersonalitiesDir -Force | Out-Null }

        $template = @"
---
name: $name
description: Custom personality
---

# $name Personality

## Prefix


## Suffix


## AI Instructions
Describe how the AI should generate messages for this personality.

## Example Responses
- "Example response 1"
- "Example response 2"
"@
        Set-Content -Path $file -Value $template
        Write-Output "Created new personality: $name"
        Write-Output "Edit the file: $file"
    }

    "edit" {
        if (-not $Arg1) {
            Write-Output "Please specify a personality name"
            exit 1
        }
        $file = Join-Path $PersonalitiesDir "$Arg1.md"
        if (-not (Test-Path $file)) {
            Write-Output "Personality '$Arg1' not found. Use 'add' to create it first."
            exit 1
        }
        Write-Output "Edit this file to customize the personality:"
        Write-Output $file
    }

    "reset" {
        Set-Content -Path $PersonalityFile -Value "normal" -NoNewline
        Write-Output "Personality reset to: normal"
    }

    "set-favorite-voice" {
        $personality = $Arg1
        $newVoice = $Arg2

        if (-not $personality -or -not $newVoice) {
            Write-Output "Usage: personality-manager.ps1 set-favorite-voice <personality> <voice>"
            exit 1
        }

        $file = Join-Path $PersonalitiesDir "$personality.md"
        if (-not (Test-Path $file)) {
            Write-Output "Personality '$personality' not found"
            exit 1
        }

        $content = Get-Content $file -Raw
        if ($content -match '(?m)^piper_voice:\s*(.+)$') {
            $content = $content -replace '(?m)^piper_voice:\s*.+$', "piper_voice: $newVoice"
        } else {
            $content = $content -replace '(^---\s*$)', "`$1`npiper_voice: $newVoice"
        }
        Set-Content -Path $file -Value $content -NoNewline

        Write-Output "Favorite voice for '$personality' set to: $newVoice"
    }

    default {
        # If arg looks like a personality name, treat as "set"
        if ($Command -and (Test-Path (Join-Path $PersonalitiesDir "$Command.md"))) {
            & $MyInvocation.MyCommand.Path "set" $Command
            return
        }
        if ($Command -eq "random") {
            & $MyInvocation.MyCommand.Path "set" "random"
            return
        }

        Write-Output "AgentVibes Personality Manager"
        Write-Output ""
        Write-Output "Commands:"
        Write-Output "  list                              - List all personalities"
        Write-Output "  set/switch <name>                 - Set personality"
        Write-Output "  add <name>                        - Create new personality"
        Write-Output "  edit <name>                       - Show path to edit personality"
        Write-Output "  get                               - Show current personality"
        Write-Output "  set-favorite-voice <name> <voice> - Set favorite voice"
        Write-Output "  reset                             - Reset to normal"
    }
}

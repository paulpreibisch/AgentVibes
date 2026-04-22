#
# File: .claude/hooks-windows/verbosity-manager.ps1
#
# AgentVibes - Finally, your AI Agents can Talk Back!
# Website: https://agentvibes.org
# Copyright (c) 2025 Paul Preibisch
# Licensed under the Apache License, Version 2.0

param(
    [Parameter(Position=0)]
    [string]$Command = "info",
    [Parameter(Position=1)]
    [string]$Arg1 = ""
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ClaudeDir = Split-Path -Parent $ScriptDir

# Respect CLAUDE_PROJECT_DIR when set by MCP
if ($env:CLAUDE_PROJECT_DIR) {
    $ConfigClaudeDir = Join-Path $env:CLAUDE_PROJECT_DIR ".claude"
} else {
    $ConfigClaudeDir = $ClaudeDir
}

$VerbosityFile = Join-Path $ConfigClaudeDir "tts-verbosity.txt"
$GlobalVerbosityFile = Join-Path $env:USERPROFILE ".claude\tts-verbosity.txt"

function Get-Verbosity {
    if (Test-Path $VerbosityFile) {
        return (Get-Content $VerbosityFile -Raw).Trim()
    }
    if (Test-Path $GlobalVerbosityFile) {
        return (Get-Content $GlobalVerbosityFile -Raw).Trim()
    }
    return "high"
}

function Set-Verbosity {
    param([string]$Level)

    if ($Level -notmatch '^(low|medium|high|caveman)$') {
        Write-Output "Invalid verbosity level: $Level"
        Write-Output "Valid options: low, medium, high, caveman"
        exit 1
    }

    if (Test-Path $ConfigClaudeDir) {
        Set-Content -Path $VerbosityFile -Value $Level -NoNewline
        Write-Output "Verbosity set to: $Level (project-local)"
    } else {
        $globalDir = Split-Path -Parent $GlobalVerbosityFile
        if (-not (Test-Path $globalDir)) { New-Item -ItemType Directory -Path $globalDir -Force | Out-Null }
        Set-Content -Path $GlobalVerbosityFile -Value $Level -NoNewline
        Write-Output "Verbosity set to: $Level (global)"
    }

    Write-Output ""
    Write-Output "Verbosity levels:"
    Write-Output "   LOW: Acknowledgments + Completions only"
    Write-Output "   MEDIUM: + Major decisions and findings"
    Write-Output "   HIGH: All reasoning (maximum transparency)"
    Write-Output "   CAVEMAN: Ultra-terse fragments, max token savings"
    Write-Output ""
    Write-Output "Restart Claude Code for changes to take effect"
}

function Show-Info {
    $currentLevel = Get-Verbosity

    Write-Output "AgentVibes Verbosity Control"
    Write-Output "------------------------------------"
    Write-Output "Current level: $currentLevel"
    Write-Output ""
    Write-Output "Available levels:"
    Write-Output ""
    Write-Output "LOW (Minimal)"
    Write-Output "  Acknowledgments only"
    Write-Output "  Completions only"
    Write-Output "  No reasoning spoken"
    Write-Output ""
    Write-Output "MEDIUM (Balanced)"
    Write-Output "  Acknowledgments"
    Write-Output "  Major decisions"
    Write-Output "  Key findings"
    Write-Output "  Completions"
    Write-Output ""
    Write-Output "HIGH (Maximum Transparency)"
    Write-Output "  Acknowledgments"
    Write-Output "  All reasoning"
    Write-Output "  All decisions"
    Write-Output "  All findings"
    Write-Output "  Completions"
    Write-Output ""
    Write-Output "CAVEMAN (Ultra-Terse)"
    Write-Output "  Fragments only, no filler"
    Write-Output "  65-75% fewer output tokens"
    Write-Output "  Abbreviations (DB/auth/config/fn/impl)"
    Write-Output "  Arrows instead of prose (X -> Y)"
    Write-Output ""
    Write-Output "Usage:"
    Write-Output "  verbosity-manager.ps1 get              Show current level"
    Write-Output "  verbosity-manager.ps1 set low|medium|high|caveman  Change level"
}

switch ($Command) {
    "get" {
        Write-Output (Get-Verbosity)
    }
    "set" {
        if (-not $Arg1) {
            Write-Output "Error: Missing verbosity level"
            Write-Output "Usage: verbosity-manager.ps1 set low|medium|high|caveman"
            exit 1
        }
        Set-Verbosity $Arg1
    }
    { $_ -in "info", "" } {
        Show-Info
    }
    default {
        Write-Output "Unknown command: $Command"
        Write-Output "Usage: verbosity-manager.ps1 {get|set|info} [level]"
        exit 1
    }
}

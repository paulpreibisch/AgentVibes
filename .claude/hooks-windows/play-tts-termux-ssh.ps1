#
# File: .claude/hooks-windows/play-tts-termux-ssh.ps1
#
# AgentVibes - Finally, your AI Agents can Talk Back! Text-to-Speech WITH personality for AI Assistants!
# Website: https://agentvibes.org
# Repository: https://github.com/paulpreibisch/AgentVibes
#
# Co-created by Paul Preibisch with Claude AI
# Copyright (c) 2025 Paul Preibisch
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# ---
#
# @fileoverview Termux SSH TTS Provider (Windows) - Android TTS via SSH tunnel
# @context Enables TTS output on Android devices when connected via SSH from Windows
# @architecture SSH-based remote TTS invocation using termux-tts-speak on Android
# @dependencies ssh.exe (OpenSSH for Windows), termux-tts-speak (on Android), termux-api (on Android)
# @entrypoints Called by play-tts.ps1 router when provider=termux-ssh
# @patterns Remote TTS invocation, SSH host alias configuration, graceful fallback
# @related play-tts.ps1, provider-manager.ps1
#
# SETUP INSTRUCTIONS:
# ===================
# 1. On Android device (Termux):
#    - Install: pkg install termux-api openssh
#    - Install Termux:API app from F-Droid or Google Play
#    - Start SSH server: sshd
#
# 2. On Windows:
#    - Add to %USERPROFILE%\.ssh\config:
#      Host android
#          HostName <your-android-ip>
#          User <your-termux-username>
#          Port 8022
#          IdentityFile ~/.ssh/id_rsa
#
# 3. Configure AgentVibes:
#    - echo android > %USERPROFILE%\.claude\termux-ssh-host.txt
#    OR
#    - echo android > .claude\termux-ssh-host.txt  (project-local)
#
# 4. Set provider:
#    - echo termux-ssh > %USERPROFILE%\.claude\tts-provider.txt
#

param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$Text,

    [Parameter(Mandatory = $false, Position = 1)]
    [string]$VoiceOverride  # Not used for termux-ssh, kept for interface compatibility
)

# Resolve ClaudeDir (project-local preferred, fallback to global)
$ScriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectClaudeDir = Split-Path -Parent $ScriptPath
if (Test-Path (Join-Path $ProjectClaudeDir "config")) {
    $ClaudeDir = $ProjectClaudeDir
} else {
    $ClaudeDir = "$env:USERPROFILE\.claude"
}

# @function Get-SshHost
# @intent Determine SSH host alias for Android device
# @why Allows users to configure their own SSH connection without hardcoded values
# Priority: env var > project config > script-dir config > global config
function Get-SshHost {
    if ($env:TERMUX_SSH_HOST) { return $env:TERMUX_SSH_HOST }

    $projectFile = Join-Path $ClaudeDir "termux-ssh-host.txt"
    if (Test-Path $projectFile) {
        $val = (Get-Content $projectFile -Raw).Trim()
        if ($val) { return $val }
    }

    $globalFile = "$env:USERPROFILE\.claude\termux-ssh-host.txt"
    if (Test-Path $globalFile) {
        $val = (Get-Content $globalFile -Raw).Trim()
        if ($val) { return $val }
    }

    return ""
}

# @function Test-SshConnection
# @intent Quick reachability check before sending TTS
# @why Prevents long hangs if Android is offline
function Test-SshConnection {
    param([string]$SshTarget)
    try {
        $null = ssh -o ConnectTimeout=2 -o BatchMode=yes $SshTarget "echo ok" 2>&1
        return $LASTEXITCODE -eq 0
    } catch {
        return $false
    }
}

# --- Main ---

if (-not $Text) {
    Write-Host "[ERROR] No text provided for TTS" -ForegroundColor Red
    exit 1
}

$SshAlias = Get-SshHost

if (-not $SshAlias) {
    Write-Host "[ERROR] Termux SSH provider not configured" -ForegroundColor Red
    Write-Host "  Set SSH host alias in one of:" -ForegroundColor Yellow
    Write-Host "    Environment:  `$env:TERMUX_SSH_HOST = 'android'" -ForegroundColor Yellow
    Write-Host "    Global:       echo android > `"$env:USERPROFILE\.claude\termux-ssh-host.txt`"" -ForegroundColor Yellow
    Write-Host "    Project:      echo android > .claude\termux-ssh-host.txt" -ForegroundColor Yellow
    exit 1
}

if (-not (Test-SshConnection -SshTarget $SshAlias)) {
    Write-Host "[WARNING] Cannot connect to SSH host '$SshAlias' - Android offline?" -ForegroundColor Yellow
    exit 1
}

# Escape single quotes for safe shell transmission
$SafeText = $Text -replace "'", "'\'''"

# Send TTS to Android asynchronously (audio plays on device)
$job = Start-Job -ScriptBlock {
    param($alias, $text)
    ssh -o ConnectTimeout=5 $alias "termux-tts-speak '$text'" 2>&1
} -ArgumentList $SshAlias, $SafeText

Write-Host "[OK] TTS sent to Android ($SshAlias) via SSH" -ForegroundColor Green

# Output empty string — audio plays on Android, not locally
Write-Output ""

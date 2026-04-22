#
# File: .claude/hooks-windows/clean-audio-cache.ps1
#
# AgentVibes - Finally, your AI Agents can Talk Back!
# Website: https://agentvibes.org
# Copyright (c) 2025 Paul Preibisch
# Licensed under the Apache License, Version 2.0
#
# Non-Interactive TTS Audio Cache Cleanup
# Used by /agent-vibes:clean skill and MCP clean_audio_cache tool

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ClaudeDir = Split-Path -Parent $ScriptDir
$AudioDir = Join-Path $ClaudeDir "audio"

Write-Output "AgentVibes Cache Cleanup (Non-Interactive)"
Write-Output ""

if (-not (Test-Path $AudioDir)) {
    Write-Output "Audio directory not found: $AudioDir"
    Write-Output "Nothing to clean."
    exit 0
}

# Count and measure TTS files (preserve tracks/ subdirectory)
$ttsFiles = Get-ChildItem -Path $AudioDir -File -Include "*.wav", "*.mp3", "*.aiff" -Recurse -ErrorAction SilentlyContinue |
    Where-Object { $_.DirectoryName -notmatch '\\tracks$' -and $_.DirectoryName -notmatch '\\tracks\\' }

if (-not $ttsFiles -or $ttsFiles.Count -eq 0) {
    Write-Output "No TTS cache files found."
    Write-Output "Audio directory is clean."
    exit 0
}

$fileCount = if ($ttsFiles -is [array]) { $ttsFiles.Count } else { 1 }
$totalSize = ($ttsFiles | Measure-Object -Property Length -Sum).Sum
$sizeMB = [math]::Round($totalSize / 1MB, 2)

# Delete files
$deleted = 0
foreach ($file in $ttsFiles) {
    try {
        Remove-Item $file.FullName -Force -ErrorAction Stop
        $deleted++
    } catch {
        Write-Output "Warning: Could not delete $($file.Name): $_"
    }
}

Write-Output "Cleaned $deleted TTS cache files"
Write-Output "Freed ${sizeMB} MB of disk space"
Write-Output ""
Write-Output "Background music tracks preserved."

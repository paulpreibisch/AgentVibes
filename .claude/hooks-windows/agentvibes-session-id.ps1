#
# File: .claude/hooks-windows/agentvibes-session-id.ps1
#
# AgentVibes - Text-to-Speech WITH personality for AI Assistants
# Website: https://agentvibes.org
# Repository: https://github.com/paulpreibisch/AgentVibes
#
# Licensed under the Apache License, Version 2.0
#
# @fileoverview Print a short spoken self-identifier for THIS session, e.g.
#   "Claude on AgentVibes in Windows Terminal"
# @why With several agent sessions open at once, every one saying the same thing
#   makes it impossible to tell which tab just spoke. Prefixing each session's
#   speech with who+where answers "which one is that?" (community request).
# @usage agentvibes-session-id.ps1 <llm-key> <project-dir>
#   Also used via the {{session}} token in a per-LLM PRETEXT (see play-tts.ps1).
#
# PowerShell mirror of .claude/hooks/agentvibes-session-id.sh — the LLM name map,
# the project-name fallback, and the terminal-detection ORDER must stay identical
# so a given session announces itself the same way on either runtime.
#
param(
    [string]$LlmKey     = "claude-code",
    [string]$ProjectDir = ""
)

$ErrorActionPreference = "SilentlyContinue"

if (-not $ProjectDir) { $ProjectDir = (Get-Location).Path }

# LLM display name (same mapping as the bash version)
$LlmName = switch -Regex ($LlmKey) {
    '^claude'            { "Claude"; break }
    '^gemini'            { "Gemini"; break }
    '^(codex|openai|gpt)' { "Codex";  break }
    '^cursor'            { "Cursor"; break }
    '^default$'          { "Agent";  break }
    default              { $LlmKey }
}

# Project name = leaf of the project dir. Split-Path is used rather than
# Get-Item so a path that no longer exists still yields a usable name.
$ProjName = ""
try { $ProjName = Split-Path -Leaf ($ProjectDir.TrimEnd('\', '/')) } catch { }
if (-not $ProjName -or $ProjName -in @('/', '.', '\')) { $ProjName = "this project" }

# Terminal detection — prefer the most specific signal available.
# Order mirrors the bash version exactly.
$TermName = ""
if ($env:WT_SESSION) {
    $TermName = "Windows Terminal"
} elseif ($env:TERM_PROGRAM) {
    $TermName = switch ($env:TERM_PROGRAM) {
        "vscode"         { "VS Code" }
        "iTerm.app"      { "iTerm" }
        "Apple_Terminal" { "Terminal" }
        # One entry only: PowerShell's switch is case-insensitive by default, so
        # separate "ghostty"/"Ghostty" arms BOTH match and both emit, yielding
        # "Ghostty Ghostty". Bash needs the two arms; PowerShell must not have them.
        "ghostty"        { "Ghostty" }
        "WezTerm"        { "WezTerm" }
        "Hyper"          { "Hyper" }
        "tmux"           { "tmux" }
        "Tabby"          { "Tabby" }
        default          { $env:TERM_PROGRAM }
    }
} elseif ($env:TERMINAL_EMULATOR) {
    $TermName = $env:TERMINAL_EMULATOR
} elseif ($env:KITTY_WINDOW_ID) {
    $TermName = "kitty"
} elseif ($env:ALACRITTY_WINDOW_ID) {
    $TermName = "Alacritty"
} elseif ($env:TMUX) {
    $TermName = "tmux"
}

# -NoNewline so the caller can embed the result directly in a pretext, matching
# the bash version's printf (which also emits no trailing newline).
if ($TermName) {
    Write-Host -NoNewline "$LlmName on $ProjName in $TermName"
} else {
    Write-Host -NoNewline "$LlmName on $ProjName"
}

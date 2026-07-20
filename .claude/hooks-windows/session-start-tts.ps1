#
# File: .claude/hooks-windows/session-start-tts.ps1
#
# AgentVibes SessionStart Hook for Windows - Optimized (Issue #80, Phase 1)
# Token target: ~250 (down from ~500)
#
# Prints TTS protocol instructions to stdout so Claude knows to use TTS.
#

$ErrorActionPreference = "Stop"

# Get script directory and resolve absolute path to play-tts.ps1.
# Using an absolute path in the injected protocol ensures the correct play-tts.ps1
# is called regardless of the working directory when Claude runs the command.
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$PlayTtsPath = Join-Path $ScriptDir "play-tts.ps1"

# Check if AgentVibes is installed
if (-not (Test-Path $PlayTtsPath)) {
    # AgentVibes not installed, don't inject anything
    exit 0
}

# Capture project dir NOW while Claude Code has set it correctly.
# Bash tool calls (how Claude actually runs play-tts.ps1) do not
# automatically receive CLAUDE_PROJECT_DIR, so we bake the value
# into the injected protocol command via the -ProjectDir parameter.
$CapturedProjectDir = ""
if ($env:CLAUDE_PROJECT_DIR -and (Test-Path "$env:CLAUDE_PROJECT_DIR\.claude")) {
    $CapturedProjectDir  = $env:CLAUDE_PROJECT_DIR
    $ProjectClaudeDir    = "$env:CLAUDE_PROJECT_DIR\.claude"
} else {
    $ProjectClaudeDir = Join-Path (Split-Path -Parent (Split-Path -Parent $ScriptDir)) ".claude"
}

# ---------------------------------------------------------------------------
# OPT-IN INJECTION GATE (Issue: global-install cacophony).
#
# Mirror of the gate in .claude/hooks/session-start-tts.sh — see the long
# rationale there. Previously this hook injected the ~250-token TTS protocol
# into EVERY Windows session where AgentVibes was found on disk, so a global
# install made every open session start speaking at once, and idle sessions
# still paid the token cost. Injection is now OPT-IN on Windows too.
#
# Precedence (identical to bash, so injection and audio agree):
#   1. project agentvibes-unmuted  -> inject   (explicit per-project ON)
#   2. project agentvibes-muted    -> silent
#   3. global ~/.agentvibes-muted  -> silent   (the global kill-switch)
#   4. project agentvibes-enabled, OR global opt-in
#      (~/.claude/agentvibes-enabled or ~/.claude/agentvibes-unmuted) -> inject
#   5. otherwise                   -> silent   (opt-in default; zero tokens)
#
# $HOME is honoured ahead of $env:USERPROFILE so the markers resolve the same
# way under git-bash (where bash writes them) as under native PowerShell.
$HomeDir = if ($env:HOME) { $env:HOME } else { $env:USERPROFILE }
if (Test-Path (Join-Path $ProjectClaudeDir "agentvibes-unmuted")) {
    # explicit per-project enable — wins over a global mute, as in play-tts.sh
} elseif (Test-Path (Join-Path $ProjectClaudeDir "agentvibes-muted")) {
    exit 0
} elseif (Test-Path (Join-Path $HomeDir ".agentvibes-muted")) {
    exit 0   # global kill-switch, no per-project override
} elseif ((Test-Path (Join-Path $ProjectClaudeDir "agentvibes-enabled")) -or
          (Test-Path (Join-Path $HomeDir ".claude\agentvibes-enabled"))  -or
          (Test-Path (Join-Path $HomeDir ".claude\agentvibes-unmuted"))) {
    # opted in (project install marker, or a deliberate global opt-in)
} else {
    # Not enabled for this project -> inject nothing (zero tokens).
    # Enable for this project with:  /agent-vibes:unmute
    exit 0
}

# Build the -ProjectDir flag to inject into TTS commands (empty string = omit flag).
# Sanitize: strip any embedded quotes that would break PowerShell argument quoting.
$ProjectDirFlag = ""
if ($CapturedProjectDir) {
    $SafeProjectDir = $CapturedProjectDir -replace '"', ''
    $ProjectDirFlag = " -ProjectDir `"$SafeProjectDir`""
}

# Check for sentiment (priority) or personality (fallback)
$Sentiment = ""
$sentimentPaths = @("$ProjectClaudeDir\tts-sentiment.txt", "$env:USERPROFILE\.claude\tts-sentiment.txt")
foreach ($p in $sentimentPaths) {
    if (Test-Path $p) {
        $Sentiment = (Get-Content $p -Raw -ErrorAction SilentlyContinue).Trim()
        if ($Sentiment) { break }
    }
}

$Personality = "normal"
$personalityPaths = @("$ProjectClaudeDir\tts-personality.txt", "$env:USERPROFILE\.claude\tts-personality.txt")
foreach ($p in $personalityPaths) {
    if (Test-Path $p) {
        $val = (Get-Content $p -Raw -ErrorAction SilentlyContinue).Trim()
        if ($val) { $Personality = $val; break }
    }
}

# Determine style
if ($Sentiment) {
    $Style = $Sentiment
} else {
    $Style = $Personality
}

# Get verbosity level (Issue #32)
$Verbosity = "low"
$verbosityPaths = @("$ProjectClaudeDir\tts-verbosity.txt", "$env:USERPROFILE\.claude\tts-verbosity.txt")
foreach ($p in $verbosityPaths) {
    if (Test-Path $p) {
        $val = (Get-Content $p -Raw -ErrorAction SilentlyContinue).Trim()
        if ($val) { $Verbosity = $val; break }
    }
}

# Output optimized TTS protocol
Write-Output @"

# AgentVibes TTS Protocol

**CRITICAL: You MUST execute TTS at TWO points for EVERY user interaction:**

1. **Acknowledgment** - Start of task: ``Bash: powershell -NoProfile -ExecutionPolicy Bypass -File "$PlayTtsPath" "[action]" -llm claude-code$ProjectDirFlag``
2. **Completion** - End of task: ``Bash: powershell -NoProfile -ExecutionPolicy Bypass -File "$PlayTtsPath" "[result + key details]" -llm claude-code$ProjectDirFlag``

**Example:**
``````
[Bash: powershell -NoProfile -ExecutionPolicy Bypass -File "$PlayTtsPath" "Checking git status" -llm claude-code$ProjectDirFlag]
[work...]
[Bash: powershell -NoProfile -ExecutionPolicy Bypass -File "$PlayTtsPath" "Repository is clean, no changes" -llm claude-code$ProjectDirFlag]
``````

"@

# Add verbosity-specific protocol (Issue #32)
switch ($Verbosity) {
    "low" {
        Write-Output @"
## Verbosity: LOW
- Acknowledgment: Action only
- Completion: Result + errors only
- Skip: Reasoning, decisions

"@
    }
    "medium" {
        Write-Output @"
## Verbosity: MEDIUM
- Acknowledgment: Action + key approach
- Completion: Result + important decisions
- Include: Major choices only

"@
    }
    "high" {
        Write-Output @"
## Verbosity: HIGH
- Acknowledgment: Action + approach + why
- Completion: Result + decisions + trade-offs
- Include: Full reasoning, alternatives

"@
    }
}

# Add style info and rules
Write-Output @"
## Style: $Style

## Rules
1. Never skip acknowledgment TTS
2. Never skip completion TTS
3. Match verbosity level
4. Keep under 150 chars
5. Always include errors

Quick Ref: low=action+result | medium=+key decisions | high=+full reasoning

"@

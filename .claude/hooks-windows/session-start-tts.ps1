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

# Resolve project .claude dir: prefer CLAUDE_PROJECT_DIR (set by Claude Code to the
# session's project root) so per-project settings are read correctly even when this
# script runs from the global ~/.claude/hooks-windows/ location.
if ($env:CLAUDE_PROJECT_DIR -and (Test-Path "$env:CLAUDE_PROJECT_DIR\.claude")) {
    $ProjectClaudeDir = "$env:CLAUDE_PROJECT_DIR\.claude"
} else {
    $ProjectClaudeDir = Join-Path (Split-Path -Parent (Split-Path -Parent $ScriptDir)) ".claude"
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

1. **Acknowledgment** - Start of task: ``Bash: powershell -NoProfile -ExecutionPolicy Bypass -File "$PlayTtsPath" "[action]" -llm claude-code``
2. **Completion** - End of task: ``Bash: powershell -NoProfile -ExecutionPolicy Bypass -File "$PlayTtsPath" "[result + key details]" -llm claude-code``

**Example:**
``````
[Bash: powershell -NoProfile -ExecutionPolicy Bypass -File "$PlayTtsPath" "Checking git status" -llm claude-code]
[work...]
[Bash: powershell -NoProfile -ExecutionPolicy Bypass -File "$PlayTtsPath" "Repository is clean, no changes" -llm claude-code]
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

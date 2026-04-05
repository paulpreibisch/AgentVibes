#
# File: .claude/hooks-windows/session-start-tts.ps1
#
# AgentVibes SessionStart Hook for Windows
# Outputs JSON with hookSpecificOutput.additionalContext for reliable context injection.
# Mirrors session-start-tts.sh — keep both in sync.
#

$ErrorActionPreference = "Stop"

# Get script directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Check if AgentVibes is installed
if (-not (Test-Path (Join-Path $ScriptDir "play-tts.ps1"))) {
    exit 0
}

# Resolve project .claude dir from script location (avoids CWD-relative path issues)
$ProjectClaudeDir = Split-Path -Parent (Split-Path -Parent $ScriptDir)
$ProjectClaudeDir = Join-Path $ProjectClaudeDir ".claude"

# Check for sentiment (priority) or personality (fallback)
$Sentiment = ""
$sentimentPaths = @("$ProjectClaudeDir\tts-sentiment.txt", "$env:USERPROFILE\.claude\tts-sentiment.txt")
foreach ($p in $sentimentPaths) {
    if (Test-Path $p) {
        $val = (Get-Content $p -Raw -ErrorAction SilentlyContinue).Trim()
        if ($val) { $Sentiment = $val; break }
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

$Style = if ($Sentiment) { $Sentiment } else { $Personality }

# Get verbosity level
$Verbosity = "low"
$verbosityPaths = @("$ProjectClaudeDir\tts-verbosity.txt", "$env:USERPROFILE\.claude\tts-verbosity.txt")
foreach ($p in $verbosityPaths) {
    if (Test-Path $p) {
        $val = (Get-Content $p -Raw -ErrorAction SilentlyContinue).Trim()
        if ($val) { $Verbosity = $val; break }
    }
}

# Build verbosity section
$VerbositySection = switch ($Verbosity) {
    "low"    { "## Verbosity: LOW`n- Acknowledgment: Action only`n- Completion: Result + errors only`n- Skip: Reasoning, decisions" }
    "medium" { "## Verbosity: MEDIUM`n- Acknowledgment: Action + key approach`n- Completion: Result + important decisions`n- Include: Major choices only" }
    "high"   { "## Verbosity: HIGH`n- Acknowledgment: Action + approach + why`n- Completion: Result + decisions + trade-offs`n- Include: Full reasoning, alternatives" }
    default  { "## Verbosity: LOW`n- Acknowledgment: Action only`n- Completion: Result + errors only" }
}

# Build full context string
$Context = @"
# AgentVibes TTS Protocol

**CRITICAL: You MUST execute TTS at TWO points for EVERY user interaction:**

1. **Acknowledgment** - Start of task: ``Bash: powershell -NoProfile -ExecutionPolicy Bypass -File ".claude\hooks-windows\play-tts.ps1" "[action]" -llm claude-code``
2. **Completion** - End of task: ``Bash: powershell -NoProfile -ExecutionPolicy Bypass -File ".claude\hooks-windows\play-tts.ps1" "[result + key details]" -llm claude-code``

**Example:**
``````
[Bash: powershell -NoProfile -ExecutionPolicy Bypass -File ".claude\hooks-windows\play-tts.ps1" "Checking git status" -llm claude-code]
[work...]
[Bash: powershell -NoProfile -ExecutionPolicy Bypass -File ".claude\hooks-windows\play-tts.ps1" "Repository is clean, no changes" -llm claude-code]
``````

$VerbositySection

## Style: $Style

## Rules
1. Never skip acknowledgment TTS
2. Never skip completion TTS
3. Match verbosity level
4. Keep under 150 chars
5. Always include errors

Quick Ref: low=action+result | medium=+key decisions | high=+full reasoning

## BMAD Agent Voice Routing
If ``.bmad-agent-context`` exists, check its content:

**Single agent mode** (content is an agent ID like "analyst"):
Use ``bmad-speak.ps1`` instead of ``play-tts.ps1``:


**Party mode** (content is "party-mode"):
Each agent speaks via ``bmad-speak.ps1`` with their display name. The queue system ensures sequential playback — agents speak one at a time, not overlapping:

IMPORTANT: In party mode, do NOT use ``play-tts.ps1``. Always use ``bmad-speak.ps1`` with the agent's display name. Do NOT call multiple bmad-speak.ps1 in parallel — call them sequentially so the queue processes them in order.

If ``.bmad-agent-context`` does NOT exist, use ``play-tts.ps1`` as normal.
"@

# Build JSON via hashtable so ConvertTo-Json handles all escaping (Unicode, backslashes, quotes)
$Output = @{
    hookSpecificOutput = @{
        hookEventName   = "SessionStart"
        additionalContext = $Context
    }
}
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Write-Output ($Output | ConvertTo-Json -Compress -Depth 5)

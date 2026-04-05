#
# File: .github/hooks/init-agentvibes.ps1
#
# AgentVibes SessionStart Hook for GitHub Copilot CLI (Windows)
# Ensures AgentVibes config exists and logs session initialization.
# NOTE: Copilot hooks cannot inject context — TTS protocol is in
# .github/copilot-instructions.md and MCP tools handle speech.
#

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = (Resolve-Path (Join-Path $ScriptDir "..\..")).Path

# Ensure .agentvibes config directory exists
$AgentVibesDir = Join-Path $ProjectRoot ".agentvibes"
if (-not (Test-Path $AgentVibesDir)) {
    New-Item -ItemType Directory -Path $AgentVibesDir -Force | Out-Null
}

# Log session start
$LogFile = Join-Path $AgentVibesDir "copilot-sessions.log"
$Timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
Add-Content -Path $LogFile -Value "[AgentVibes] Copilot session initialized at $Timestamp"

# Check for BMAD party mode
$ContextFile = Join-Path $ProjectRoot ".bmad-agent-context"
if (Test-Path $ContextFile) {
    $Context = Get-Content $ContextFile -Raw
    Write-Output "[AgentVibes] BMAD context: $Context"
}

exit 0

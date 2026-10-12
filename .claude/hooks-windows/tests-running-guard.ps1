#
# File: .claude/hooks-windows/tests-running-guard.ps1
#
# AgentVibes - Text-to-Speech WITH personality for AI Assistants
# Website: https://agentvibes.org
# Repository: https://github.com/paulpreibisch/AgentVibes
#
# Licensed under the Apache License, Version 2.0
#
# Scoped "tests running" mute (dot-sourced). PowerShell twin of
# .claude/hooks/tests-running-guard.sh - keep the two in step.
#
# scripts/run-tests.sh appends the repo root it is testing to
# %USERPROFILE%\.agentvibes-tests-running (one root per line). Audio is muted only
# for callers whose context directory is inside a listed root. An EMPTY marker
# (older runner, or created by hand) still mutes everything.

function ConvertTo-AvTestsNormPath {
    param([string]$Path)
    $p = ($Path -replace '\\', '/')
    while ($p.Length -gt 1 -and $p.EndsWith('/')) { $p = $p.Substring(0, $p.Length - 1) }
    if ($p -match '^([A-Za-z]):(/.*)?$') { $p = '/' + $Matches[1] + $Matches[2] }
    return $p.ToLowerInvariant()
}

# Returns $true (mute) when a test run covers any of the given directories, or the
# marker exists but is empty (legacy global mute).
function Test-AvTestsRunningMute {
    param([string[]]$ContextDirs)
    $marker = Join-Path $env:USERPROFILE '.agentvibes-tests-running'
    if (-not (Test-Path -LiteralPath $marker)) { return $false }
    $roots = @(Get-Content -LiteralPath $marker -ErrorAction SilentlyContinue |
        ForEach-Object { $_.Trim() } | Where-Object { $_ })
    if ($roots.Count -eq 0) { return $true }
    foreach ($root in $roots) {
        $r = ConvertTo-AvTestsNormPath $root
        foreach ($ctx in $ContextDirs) {
            if (-not $ctx) { continue }
            $c = ConvertTo-AvTestsNormPath $ctx
            if ($c -eq $r -or $c.StartsWith("$r/")) { return $true }
        }
    }
    return $false
}

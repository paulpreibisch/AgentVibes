# Story AVI-S8.5 Stage 2 — Windows player resolver-port characterization test.
#
# The Windows twin of test/unit/player-characterization.bats. It invokes the
# REAL play-tts.ps1 (copied into an ISOLATED temp project — the real ~/.claude
# is never read or written) under AGENTVIBES_VERBOSE=1 and captures the DECISION
# it makes (resolved provider/voice, and whether the resolver plan or the legacy
# fallback drove it) WITHOUT producing real audio: the provider scripts are
# no-op stubs and USERPROFILE is redirected to an empty temp home so the
# resolver's home-config fallback is hermetic too.
#
# Proves the two cures the resolver brings to Windows:
#   R1  a kokoro-shaped voice (af_river) forces the kokoro engine even when the
#       per-LLM ENGINE column / provider file say piper (was the silence bug).
#   R2  a per-LLM voice wins over an LLM-echoed explicit voice.
# Plus: a normal piper voice is unchanged, and if the resolver bundle is
# unreachable the player FAILS SAFE to the legacy logic (plan=fallback).
#
# Run:  pwsh -NoProfile -File test/windows/play-tts-resolver.Tests.ps1
# Exits non-zero on any failure so it can gate CI.

$ErrorActionPreference = 'Stop'
$script:failures = 0
function Assert([bool]$cond, [string]$msg) {
    if ($cond) { Write-Host "  [PASS] $msg" -ForegroundColor Green }
    else       { Write-Host "  [FAIL] $msg" -ForegroundColor Red; $script:failures++ }
}

$RepoRoot   = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$SrcPlayTts = Join-Path $RepoRoot '.claude\hooks-windows\play-tts.ps1'
$ResolverCli = Join-Path $RepoRoot 'bin\resolve-utterance.js'
if (-not (Test-Path $SrcPlayTts))  { throw "play-tts.ps1 not found at $SrcPlayTts" }
if (-not (Test-Path $ResolverCli)) { throw "resolve-utterance.js not found at $ResolverCli" }

$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCmd) { throw "node not on PATH — this test needs node to exercise the resolver bridge" }

$tmp = Join-Path ([System.IO.Path]::GetTempPath()) ("avi-8-5-ps1port-" + [System.Guid]::NewGuid().ToString('N'))
$proj     = Join-Path $tmp 'proj'
$fakeHome = Join-Path $tmp 'home'
$hooksDir = Join-Path $proj '.claude\hooks-windows'
$cfgDir   = Join-Path $proj '.claude\config'

# Preserve env we mutate so the test process leaves no trace.
$savedUserProfile = $env:USERPROFILE
$savedProjectDir  = $env:CLAUDE_PROJECT_DIR
$savedResolver    = $env:AGENTVIBES_RESOLVER_CLI
$savedVerbose     = $env:AGENTVIBES_VERBOSE
$savedPreview     = $env:AGENTVIBES_EFFECTS_PREVIEW

# Copy the REAL play-tts.ps1 under test + no-op provider stubs (no synthesis).
function New-Fixture {
    New-Item -ItemType Directory -Path $hooksDir -Force | Out-Null
    New-Item -ItemType Directory -Path $cfgDir   -Force | Out-Null
    New-Item -ItemType Directory -Path $fakeHome -Force | Out-Null
    Copy-Item -Path $SrcPlayTts -Destination (Join-Path $hooksDir 'play-tts.ps1') -Force
    $stub = "param([string]`$Text, [string]`$Voice)`n# AVI-S8.5 test stub: no synthesis, no output, no playback.`n"
    foreach ($n in 'play-tts-piper.ps1','play-tts-kokoro.ps1','play-tts-sapi.ps1','play-tts-soprano.ps1') {
        Set-Content -Path (Join-Path $hooksDir $n) -Value $stub -NoNewline -Encoding UTF8
    }
    Set-Content -Path (Join-Path $proj '.claude\tts-provider.txt') -Value 'piper' -NoNewline -Encoding UTF8
}

# Write the per-LLM row (llm:<name>|REVERB|BGFILE|BGVOL|VOICE|PRETEXT|ENGINE).
function Set-LlmRow([string]$row) {
    Set-Content -Path (Join-Path $cfgDir 'audio-effects.cfg') -Value $row -Encoding UTF8
}

# Invoke the copied real play-tts.ps1 in verbose mode; return its stdout lines.
# $ResolverOverride lets a case point AGENTVIBES_RESOLVER_CLI at a bogus path to
# exercise the FAIL-SAFE (bundle-unreachable) branch.
function Invoke-Player([string]$Voice, [string]$ResolverOverride) {
    $env:USERPROFILE            = $fakeHome
    $env:CLAUDE_PROJECT_DIR     = $proj
    $env:AGENTVIBES_RESOLVER_CLI = if ($ResolverOverride) { $ResolverOverride } else { $ResolverCli }
    $env:AGENTVIBES_VERBOSE     = '1'
    $env:AGENTVIBES_EFFECTS_PREVIEW = $null
    $player = Join-Path $hooksDir 'play-tts.ps1'
    $args = @('-NoProfile', '-File', $player, '-Text', 'hello', '-llm', 'claude-code')
    if ($Voice) { $args += @('-VoiceOverride', $Voice) }
    return (& pwsh @args 2>&1 | ForEach-Object { "$_" })
}

function Get-Field($lines, [string]$name) {
    $m = $lines | Where-Object { $_ -match "^$name=" } | Select-Object -Last 1
    if ($m) { return ($m -replace "^$name=", '').Trim() }
    return '__ABSENT__'
}

try {
    New-Fixture

    Write-Host "AVI-S8.5 Stage 2 — Windows play-tts.ps1 resolver port" -ForegroundColor Cyan

    # R1 — kokoro-shaped per-LLM voice forces the kokoro engine, overriding a
    # piper ENGINE column + piper provider file (the Windows silence-bug cure).
    Set-LlmRow 'llm:claude-code|off|||af_river||piper'
    $o = Invoke-Player $null $null
    Assert ((Get-Field $o 'plan') -eq 'ok')       'R1: resolver plan drove the decision (plan=ok)'
    Assert ((Get-Field $o 'provider') -eq 'kokoro') 'R1: af_river forces engine=kokoro despite ENGINE=piper + provider=piper'
    Assert ((Get-Field $o 'voice') -eq 'af_river')  'R1: per-LLM voice af_river adopted'

    # R2 — per-LLM voice wins over an LLM-echoed explicit voice.
    Set-LlmRow 'llm:claude-code||||af_bella||'
    $o = Invoke-Player 'af_sarah' $null
    Assert ((Get-Field $o 'plan') -eq 'ok')       'R2: resolver plan drove the decision (plan=ok)'
    Assert ((Get-Field $o 'voice') -eq 'af_bella')  'R2: per-LLM af_bella beats echoed explicit af_sarah'

    # Normal piper voice is unchanged (engine stays piper, voice preserved).
    Set-LlmRow 'llm:claude-code||||en_US-amy-medium||'
    $o = Invoke-Player $null $null
    Assert ((Get-Field $o 'provider') -eq 'piper')           'normal: a piper-shaped voice keeps engine=piper'
    Assert ((Get-Field $o 'voice') -eq 'en_US-amy-medium')   'normal: piper voice preserved'

    # FAIL-SAFE — resolver bundle unreachable => legacy fallback path runs.
    $bogus = Join-Path $tmp 'does-not-exist\resolve-utterance.js'
    Set-LlmRow 'llm:claude-code|off|||af_river||piper'
    $o = Invoke-Player $null $bogus
    Assert ((Get-Field $o 'plan') -eq 'fallback')  'fail-safe: bad bundle path => plan=fallback (no crash)'
    Assert ((Get-Field $o 'provider') -eq 'kokoro') 'fail-safe: legacy kokoro guard still couples af_river->kokoro'

    # FAIL-SAFE contrast — on the legacy path the explicit voice wins (the OLD
    # behavior), proving the resolver is what flips R2 on the happy path.
    Set-LlmRow 'llm:claude-code||||af_bella||'
    $o = Invoke-Player 'af_sarah' $bogus
    Assert ((Get-Field $o 'plan') -eq 'fallback')  'fail-safe: plan=fallback with unreachable bundle'
    Assert ((Get-Field $o 'voice') -eq 'af_sarah') 'fail-safe: legacy explicit-wins (af_sarah) — the pre-resolver behavior'
}
finally {
    $env:USERPROFILE             = $savedUserProfile
    $env:CLAUDE_PROJECT_DIR      = $savedProjectDir
    $env:AGENTVIBES_RESOLVER_CLI = $savedResolver
    $env:AGENTVIBES_VERBOSE      = $savedVerbose
    $env:AGENTVIBES_EFFECTS_PREVIEW = $savedPreview
    Remove-Item -Path $tmp -Recurse -Force -ErrorAction SilentlyContinue
}

if ($script:failures -gt 0) { Write-Host "`n$script:failures failure(s)" -ForegroundColor Red; exit 1 }
Write-Host "`nAll play-tts.ps1 resolver-port characterization checks passed." -ForegroundColor Green
exit 0

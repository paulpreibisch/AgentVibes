# Story AVI-S8.1 — Bug #9 regression test.
#
# setup-windows.ps1 used to unconditionally Set-Content the user's config value
# files (background-music-*, reverb-level, tts-verbosity), clobbering choices the
# Node installer deliberately preserves. This test extracts the shipped
# Set-ConfigValueSafe function straight out of setup-windows.ps1 (via the PS AST,
# so we test the real code, not a copy) and asserts the non-destructive contract.
#
# Run:  pwsh -File test/windows/setup-config-idempotency.Tests.ps1
# Exits non-zero on any failure so it can gate CI.

$ErrorActionPreference = 'Stop'
$script:failures = 0
function Assert([bool]$cond, [string]$msg) {
    if ($cond) { Write-Host "  [PASS] $msg" -ForegroundColor Green }
    else       { Write-Host "  [FAIL] $msg" -ForegroundColor Red; $script:failures++ }
}

$setupScript = Join-Path $PSScriptRoot '..\..\setup-windows.ps1'
if (-not (Test-Path $setupScript)) { throw "setup-windows.ps1 not found at $setupScript" }

# Pull the Set-ConfigValueSafe function definition out of the real script and
# define it here, without executing the installer body.
$tokens = $null; $errs = $null
$ast = [System.Management.Automation.Language.Parser]::ParseFile($setupScript, [ref]$tokens, [ref]$errs)
if ($errs) { throw "setup-windows.ps1 has parse errors: $($errs -join '; ')" }
$fnAst = $ast.FindAll({
    param($n) $n -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $n.Name -eq 'Set-ConfigValueSafe'
}, $true) | Select-Object -First 1
if (-not $fnAst) { throw "Set-ConfigValueSafe not found in setup-windows.ps1" }

# Write-Info is referenced by the function; stub it, then define the real function.
function Write-Info([string]$text) { }
Invoke-Expression $fnAst.Extent.Text

# Also extract Set-ConfigFromChoice (the interactive-answer writer added by the
# code-review fix for the "silently discards freshly-typed answers" bug).
$fnChoiceAst = $ast.FindAll({
    param($n) $n -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $n.Name -eq 'Set-ConfigFromChoice'
}, $true) | Select-Object -First 1
if (-not $fnChoiceAst) { throw "Set-ConfigFromChoice not found in setup-windows.ps1" }
Invoke-Expression $fnChoiceAst.Extent.Text

$tmp = Join-Path ([System.IO.Path]::GetTempPath()) ("avi-8-1-ps-" + [System.Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $tmp -Force | Out-Null
try {
    Write-Host "Bug #9 — Set-ConfigValueSafe non-destructive contract" -ForegroundColor Cyan

    # 1. Absent file -> value is written.
    $f1 = Join-Path $tmp 'reverb-level.txt'
    Set-ConfigValueSafe -Path $f1 -Value 'light' -Label 'reverb'
    Assert ((Test-Path $f1) -and ((Get-Content $f1 -Raw) -eq 'light')) 'absent file is created with the value'

    # 2. Existing file -> preserved (the core non-destructive guarantee).
    Set-Content -Path $f1 -Value 'cathedral' -NoNewline   # simulate a prior user choice
    Set-ConfigValueSafe -Path $f1 -Value 'off' -Label 'reverb'
    Assert ((Get-Content $f1 -Raw) -eq 'cathedral') 'existing user value is preserved, not overwritten'

    # 3. -Force -> overwrite is still possible when explicitly intended.
    Set-ConfigValueSafe -Path $f1 -Value 'medium' -Label 'reverb' -Force
    Assert ((Get-Content $f1 -Raw) -eq 'medium') '-Force overwrites as intended'

    # 4. Empty-string value on an absent file is allowed (e.g. "off"/blank configs).
    $f2 = Join-Path $tmp 'tts-verbosity.txt'
    Set-ConfigValueSafe -Path $f2 -Value '' -Label 'verbosity'
    Assert (Test-Path $f2) 'empty-string value writes without error'

    Write-Host "`nCode-review fix — Set-ConfigFromChoice honors explicit answers" -ForegroundColor Cyan

    # 5. Explicit answer (non-empty RawInput) is written even when a file exists.
    $c1 = Join-Path $tmp 'verbosity-choice.txt'
    Set-Content -Path $c1 -Value 'high' -NoNewline               # prior value
    Set-ConfigFromChoice -Path $c1 -Value 'low' -RawInput '3' -Label 'verbosity'
    Assert ((Get-Content $c1 -Raw) -eq 'low') 'explicit user choice this run overwrites the old value'

    # 6. Blind Enter (empty RawInput) on an EXISTING file preserves it (the bug:
    #    default value must not silently replace the user's prior choice).
    Set-Content -Path $c1 -Value 'medium' -NoNewline
    Set-ConfigFromChoice -Path $c1 -Value 'high' -RawInput '' -Label 'verbosity'
    Assert ((Get-Content $c1 -Raw) -eq 'medium') 'accepted-default (empty input) preserves existing value'

    # 7. Skipped prompt (empty RawInput) on an ABSENT file writes the default.
    $c2 = Join-Path $tmp 'reverb-choice.txt'
    Set-ConfigFromChoice -Path $c2 -Value 'off' -RawInput '' -Label 'reverb'
    Assert ((Test-Path $c2) -and ((Get-Content $c2 -Raw) -eq 'off')) 'first run with no file writes the default'
}
finally {
    Remove-Item -Path $tmp -Recurse -Force -ErrorAction SilentlyContinue
}

if ($script:failures -gt 0) { Write-Host "`n$script:failures failure(s)" -ForegroundColor Red; exit 1 }
Write-Host "`nAll setup-windows config-write contract checks passed." -ForegroundColor Green
exit 0

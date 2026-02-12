#
# File: test-windows-tts.ps1
#
# AgentVibes - Windows TTS Interactive Test Suite
# Tests all providers with and without background music
#
# Usage:
#   .\test-windows-tts.ps1           # Run all tests interactively
#   .\test-windows-tts.ps1 -Quick    # Skip background music tests
#

param(
    [switch]$Quick
)

$ProjectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ClaudeDir = "$ProjectDir\.claude"
$HooksDir = "$ClaudeDir\hooks-windows"
$ProviderFile = "$ClaudeDir\tts-provider.txt"
$BgEnabledFile = "$ClaudeDir\config\background-music-enabled.txt"
$BgDefaultFile = "$ClaudeDir\config\background-music-default.txt"
$PlayTts = "$HooksDir\play-tts.ps1"

# Save original config to restore at the end
$OriginalProvider = if (Test-Path $ProviderFile) { (Get-Content $ProviderFile -Raw).Trim() } else { "windows-sapi" }
$OriginalBgEnabled = if (Test-Path $BgEnabledFile) { (Get-Content $BgEnabledFile -Raw).Trim() } else { "false" }
$OriginalBgTrack = if (Test-Path $BgDefaultFile) { (Get-Content $BgDefaultFile -Raw).Trim() } else { "" }

function Set-Provider([string]$name) {
    Set-Content -Path $ProviderFile -Value $name -NoNewline
}

function Set-BgMusic([string]$enabled, [string]$track) {
    if (-not (Test-Path "$ClaudeDir\config")) {
        New-Item -ItemType Directory -Path "$ClaudeDir\config" -Force | Out-Null
    }
    Set-Content -Path $BgEnabledFile -Value $enabled -NoNewline
    if ($track) {
        Set-Content -Path $BgDefaultFile -Value $track -NoNewline
    }
}

function Run-Test([string]$label, [string]$text) {
    Write-Host ""
    Write-Host "─────────────────────────────────────────────" -ForegroundColor DarkGray
    Write-Host "  TEST: $label" -ForegroundColor Cyan
    Write-Host "─────────────────────────────────────────────" -ForegroundColor DarkGray
    Write-Host ""

    try {
        & $PlayTts $text
        Write-Host ""
        Write-Host "  [PASS]" -ForegroundColor Green
    } catch {
        Write-Host "  [FAIL] $($_.Exception.Message)" -ForegroundColor Red
    }

    Write-Host ""
    Read-Host "  Press ENTER for next test"
}

# ── Header ──
Write-Host ""
Write-Host "╔══════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   AgentVibes Windows TTS Test Suite          ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Current provider: $OriginalProvider" -ForegroundColor Gray
Write-Host "  Background music: $OriginalBgEnabled" -ForegroundColor Gray
Write-Host ""

# ══════════════════════════════════════════════
# PART 1: Voice-only tests (no background music)
# ══════════════════════════════════════════════

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
Write-Host "  PART 1: Voice Only (no background music)" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow

Set-BgMusic "false" ""

# Test 1: SAPI
Set-Provider "windows-sapi"
Run-Test "SAPI - Voice Only" "Hello, I am Windows SAPI. This is the built-in voice with no background music."

# Test 2: Soprano
Set-Provider "soprano"
Run-Test "Soprano - Voice Only" "Hello, I am Soprano. Ultra-fast neural voice with no background music."

# Test 3: Piper
Set-Provider "windows-piper"
Run-Test "Piper - Voice Only" "Hello, I am Piper. High quality neural voice with no background music."

if (-not $Quick) {

    # ══════════════════════════════════════════════
    # PART 2: Voice + Background Music
    # ══════════════════════════════════════════════

    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
    Write-Host "  PART 2: Voice + Background Music" -ForegroundColor Yellow
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow

    Set-BgMusic "true" ""

    # Test 4: SAPI + Flamenco
    Set-Provider "windows-sapi"
    Set-BgMusic "true" "agentvibes_soft_flamenco_loop.mp3"
    Run-Test "SAPI + Flamenco" "Hello from SAPI with soft flamenco guitar in the background."

    # Test 5: SAPI + Bachata
    Set-BgMusic "true" "agent_vibes_bachata_v1_loop.mp3"
    Run-Test "SAPI + Bachata" "Hello from SAPI with bachata rhythm in the background."

    # Test 6: Soprano + Flamenco
    Set-Provider "soprano"
    Set-BgMusic "true" "agentvibes_soft_flamenco_loop.mp3"
    Run-Test "Soprano + Flamenco" "Hello from Soprano with soft flamenco guitar in the background."

    # Test 7: Soprano + Bachata
    Set-BgMusic "true" "agent_vibes_bachata_v1_loop.mp3"
    Run-Test "Soprano + Bachata" "Hello from Soprano with bachata rhythm in the background."

    # Test 8: Soprano + Bossa Nova
    Set-BgMusic "true" "agent_vibes_bossa_nova_v2_loop.mp3"
    Run-Test "Soprano + Bossa Nova" "Hello from Soprano with bossa nova in the background."

    # Test 9: Piper + Flamenco
    Set-Provider "windows-piper"
    Set-BgMusic "true" "agentvibes_soft_flamenco_loop.mp3"
    Run-Test "Piper + Flamenco" "Hello from Piper with soft flamenco guitar in the background."

    # Test 10: Piper + Bachata
    Set-BgMusic "true" "agent_vibes_bachata_v1_loop.mp3"
    Run-Test "Piper + Bachata" "Hello from Piper with bachata rhythm in the background."

    # Test 11: Piper + Dark Chill Step
    Set-BgMusic "true" "agent_vibes_dark_chill_step_loop.mp3"
    Run-Test "Piper + Dark Chill Step" "Hello from Piper with dark chill step ambient in the background."
}

# ══════════════════════════════════════════════
# Restore original config
# ══════════════════════════════════════════════

Set-Provider $OriginalProvider
if ($OriginalBgTrack) {
    Set-BgMusic $OriginalBgEnabled $OriginalBgTrack
} else {
    Set-BgMusic $OriginalBgEnabled "agent_vibes_bachata_v1_loop.mp3"
}

Write-Host ""
Write-Host "╔══════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║   ALL TESTS COMPLETE                         ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "  Restored provider: $OriginalProvider" -ForegroundColor Gray
Write-Host "  Restored bg music: $OriginalBgEnabled" -ForegroundColor Gray
Write-Host ""

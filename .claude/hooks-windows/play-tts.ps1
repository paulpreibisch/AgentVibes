#
# File: .claude/hooks-windows/play-tts.ps1
#
# AgentVibes - Windows TTS Router
# Delegates to active provider (windows-sapi or windows-piper)
#

param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$Text,

    [Parameter(Mandatory = $false, Position = 1)]
    [string]$VoiceOverride,

    # LLM identity for per-LLM audio routing (e.g. "claude-code", "copilot", "codex").
    # When provided, the router looks up an `llm:<name>` row in audio-effects.cfg
    # to apply LLM-specific voice, pretext, reverb, and engine settings.
    [Parameter(Mandatory = $false)]
    [string]$llm = "",

    # Project directory override. session-start-tts.ps1 bakes the session's
    # CLAUDE_PROJECT_DIR value here so per-project config is found even when
    # Bash tool calls do not propagate CLAUDE_PROJECT_DIR to child processes.
    [Parameter(Mandatory = $false)]
    [string]$ProjectDir = "",

    # Provider override from the remote sender (set by the watcher from the
    # JSON payload's "provider" field).  Overrides the local tts-provider.txt
    # default so the Linux-side config fully controls which engine the Windows
    # receiver uses — no Windows-side provider config needed.
    # Per-LLM engine rows in audio-effects.cfg still take final priority for
    # explicit Windows overrides (e.g. llm:copilot → windows-sapi).
    # Accepts cross-platform aliases: "piper" = windows-piper, "sapi" = windows-sapi.
    [Parameter(Mandatory = $false)]
    [string]$ProviderOverride = ""
)

# Text-file handoff: the SSH receiver watcher writes long/special-char text to
# a UTF-8 temp file and passes the sentinel "__from_file__" on the command line
# to avoid Windows CLI argument mangling. Load the real text here.
if ($Text -eq "__from_file__" -and $env:AGENTVIBES_TEXT_FILE) {
    if (Test-Path $env:AGENTVIBES_TEXT_FILE) {
        $Text = [System.IO.File]::ReadAllText($env:AGENTVIBES_TEXT_FILE, [System.Text.UTF8Encoding]::new($false))
    } else {
        Write-Error "AGENTVIBES_TEXT_FILE set to missing path: $($env:AGENTVIBES_TEXT_FILE)"
        exit 1
    }
}

# If -ProjectDir was passed (by session-start-tts.ps1), promote it to the
# CLAUDE_PROJECT_DIR env var so the per-LLM config lookup below finds it.
# This ensures per-project audio settings work even when Bash tool calls
# don't automatically inherit CLAUDE_PROJECT_DIR from Claude Code.
if ($ProjectDir -and (Test-Path $ProjectDir)) {
    # Always prefer the explicitly-injected project dir; validates path exists
    # before trusting it (fixes both the stale-env-var override bug and path injection).
    $env:CLAUDE_PROJECT_DIR = $ProjectDir
}

# Configuration paths
# First check if we're running from a project directory with .claude
$ScriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectClaudeDir = Join-Path (Split-Path -Parent (Split-Path -Parent $ScriptPath)) ".claude"

# Use project .claude if running from there, otherwise use user profile
if (Test-Path $ProjectClaudeDir) {
    $ClaudeDir = $ProjectClaudeDir
} else {
    $ClaudeDir = "$env:USERPROFILE\.claude"
}

$HooksDir = "$ClaudeDir\hooks-windows"
$ProviderFile = "$ClaudeDir\tts-provider.txt"
$MuteFile = "$ClaudeDir\tts-muted.txt"

# Check if TTS is muted
if (Test-Path $MuteFile) {
    $muteStatus = Get-Content $MuteFile -Raw
    if ($muteStatus.Trim() -eq "true") {
        exit 0
    }
}

# Determine active provider
$ActiveProvider = "windows-sapi"
if (Test-Path $ProviderFile) {
    $ActiveProvider = (Get-Content $ProviderFile -Raw).Trim()
}

# Validate and get provider script
$ProviderScript = ""

switch ($ActiveProvider) {
    { $_ -in "sapi", "windows-sapi" } {
        $ProviderScript = "$HooksDir\play-tts-sapi.ps1"
        if (-not (Test-Path $ProviderScript)) { $ProviderScript = "$HooksDir\play-tts-windows-sapi.ps1" }
    }
    { $_ -in "piper", "windows-piper" } {
        $ProviderScript = "$HooksDir\play-tts-piper.ps1"
        if (-not (Test-Path $ProviderScript)) { $ProviderScript = "$HooksDir\play-tts-windows-piper.ps1" }
    }
    "soprano" {
        $ProviderScript = "$HooksDir\play-tts-soprano.ps1"
    }
    "kokoro" {
        $ProviderScript = "$HooksDir\play-tts-kokoro.ps1"
    }
    default {
        Write-Host "[ERROR] Unknown provider: $ActiveProvider" -ForegroundColor Red
        Write-Host "Use: .\provider-manager.ps1 list" -ForegroundColor Yellow
        exit 1
    }
}

# Apply remote provider override (from the JSON payload's "provider" field, passed
# by the SSH-receiver watcher via -ProviderOverride).  This lets the Linux-side
# audio-effects.cfg row for llm:claude-code specify "piper" and have it honoured
# on Windows without requiring the Windows tts-provider.txt to be reconfigured.
# Priority: an explicit -ProviderOverride is AUTHORITATIVE — it wins over both the
# per-LLM $_LlmEngine column and the global tts-provider.txt default (see the
# $ProviderOverride guard in the engine-resolution block below).
if ($ProviderOverride) {
    switch ($ProviderOverride) {
        { $_ -in "windows-piper", "piper" } {
            $ProviderScript = "$HooksDir\play-tts-piper.ps1"
            if (-not (Test-Path $ProviderScript)) { $ProviderScript = "$HooksDir\play-tts-windows-piper.ps1" }
        }
        { $_ -in "windows-sapi", "sapi" } {
            $ProviderScript = "$HooksDir\play-tts-sapi.ps1"
            if (-not (Test-Path $ProviderScript)) { $ProviderScript = "$HooksDir\play-tts-windows-sapi.ps1" }
        }
        "soprano" { $ProviderScript = "$HooksDir\play-tts-soprano.ps1" }
        "kokoro" { $ProviderScript = "$HooksDir\play-tts-kokoro.ps1" }
        default {
            Write-Host "[WARNING] play-tts.ps1: Unknown ProviderOverride '$ProviderOverride' ignored" -ForegroundColor Yellow
        }
    }
}

# Check if provider script exists
if (-not (Test-Path $ProviderScript)) {
    Write-Host "[ERROR] Provider script not found: $ProviderScript" -ForegroundColor Red
    exit 1
}

# Check if background music is enabled.
# Search order: CLAUDE_PROJECT_DIR (set by TUI preview) → package config dir.
# This mirrors audio-processor.sh behaviour on Linux so preview writes to the
# project dir and play-tts.ps1 still finds the flag regardless of where the
# package is installed (global, npm link, etc.).
$ConfigDir = "$ClaudeDir\config"
$BgEnabled = $false
$BgEnabledFile = "$ConfigDir\background-music-enabled.txt"
if ($env:CLAUDE_PROJECT_DIR) {
    $_projBgFile = Join-Path $env:CLAUDE_PROJECT_DIR ".claude\config\background-music-enabled.txt"
    if (Test-Path $_projBgFile) {
        $BgEnabled = (Get-Content $_projBgFile -Raw).Trim() -eq "true"
    } elseif (Test-Path $BgEnabledFile) {
        $BgEnabled = (Get-Content $BgEnabledFile -Raw).Trim() -eq "true"
    }
} elseif (Test-Path $BgEnabledFile) {
    $BgEnabled = (Get-Content $BgEnabledFile -Raw).Trim() -eq "true"
}

# Per-message overrides from SSH/remote payload (set by the queue watcher).
# These allow remote senders (Hermes, SSH remote provider) to override music,
# volume, and effects for a single message without mutating persistent config.
$OverrideMusic   = if ($env:AGENTVIBES_OVERRIDE_MUSIC)   { $env:AGENTVIBES_OVERRIDE_MUSIC.Trim() }   else { "" }
$OverrideVolume  = if ($env:AGENTVIBES_OVERRIDE_VOLUME)  { $env:AGENTVIBES_OVERRIDE_VOLUME.Trim() }  else { "" }
$OverrideEffects = if ($env:AGENTVIBES_OVERRIDE_EFFECTS) { $env:AGENTVIBES_OVERRIDE_EFFECTS.Trim() } else { "" }

# If a music override is set, force background music on for this message
if ($OverrideMusic -ne "") { $BgEnabled = $true }

# Check if reverb is enabled (allowlist validation)
$ReverbLevel = "off"
$ReverbFile = "$ConfigDir\reverb-level.txt"
if (Test-Path $ReverbFile) {
    $reverbVal = (Get-Content $ReverbFile -Raw).Trim()
    if ($reverbVal -in @("off", "light", "medium", "heavy", "cathedral")) {
        $ReverbLevel = $reverbVal
    }
}
# Per-message reverb override: AGENTVIBES_OVERRIDE_EFFECTS accepts a preset name
# ("off", "light", "medium", "heavy", "cathedral") — Sox effect strings are Linux-only
# and are silently ignored on Windows.
if ($OverrideEffects -ne "" -and $OverrideEffects -in @("off", "light", "medium", "heavy", "cathedral")) {
    $ReverbLevel = $OverrideEffects
}
$HasReverb = $ReverbLevel -ne "off"

# Check ffmpeg availability for background music mixing or reverb
$HasFfmpeg = $false
if ($BgEnabled -or $HasReverb) {
    try {
        $null = Get-Command ffmpeg -ErrorAction Stop
        $HasFfmpeg = $true
    } catch {}
}

# ===========================================================================
# Per-LLM Audio Routing
# ===========================================================================
# When mcp-server/server.py invokes play-tts.ps1 on Windows it passes the
# -llm flag with the active LLM identity (e.g. "claude-code", "copilot",
# "codex").  The router reads audio-effects.cfg and looks up the row whose
# key is `llm:<name>`, allowing each LLM to have its own voice, pretext,
# reverb, and engine without requiring global settings to be reconfigured.
#
# Expected audio-effects.cfg row format (pipe-delimited):
#   llm:<name>|REVERB_PRESET|BACKGROUND_FILE|BACKGROUND_VOLUME|VOICE|PRETEXT|ENGINE
#
# Column descriptions:
#   1. Key           - Must start with "llm:" followed by the LLM name
#   2. REVERB_PRESET - One of: off, light, medium, heavy, cathedral (or blank)
#   3. BACKGROUND_FILE - Filename relative to .claude/audio/tracks/ (or blank)
#   4. BACKGROUND_VOLUME - Float 0.0-1.0 (or blank for default 0.20)
#   5. VOICE         - Provider voice name to use (or blank for global default)
#   6. PRETEXT       - Text prepended to all TTS utterances (or blank)
#   7. ENGINE        - Windows engine: windows-sapi, windows-piper, soprano (or blank)
#
# Example rows:
#   llm:claude-code|off|||en_US-amy-medium|Agent Vibes Here|windows-piper
#   llm:copilot|light|||en_US-ryan-low||windows-sapi
#   llm:codex|off||||Code complete|windows-piper
#   llm:default|off|||||
#
# The "default" key is always looked up when no explicit -llm flag is
# provided.  Configure it via Setup → Default → Configure in the TUI to
# apply consistent audio settings across all LLM sessions.
#
# Security: The -llm value is validated against an allowlist regex so that
# injected values like "-rf" or path-traversal strings are rejected before
# they can appear in lookup keys, environment variables, or file paths.

# --- Validate -llm parameter format ------------------------------------------
if ($llm -and $llm -notmatch '^[a-zA-Z0-9][a-zA-Z0-9_-]*$') {
    Write-Host "[WARNING] play-tts.ps1: Invalid -llm value '$llm' ignored" `
        "(must match ^[a-zA-Z0-9][a-zA-Z0-9_-]*`$)" -ForegroundColor Yellow
    $llm = ""
}

# --- Default fallback --------------------------------------------------------
# When no -llm flag is passed (e.g. hooks invoked by Claude Code without the
# flag), check AGENTVIBES_LLM_KEY first — it is set by the hook infrastructure
# as "llm:<name>" and carries the active LLM identity.  Strip the "llm:" prefix
# to get the bare key used for config lookup.
if (-not $llm -and $env:AGENTVIBES_LLM_KEY -match '^llm:([a-zA-Z0-9][a-zA-Z0-9_-]*)$') {
    $llm = $Matches[1]
}

# An empty $llm routes through the "default" pseudo-LLM.  Users who configure
# an `llm:default` row in audio-effects.cfg get consistent audio settings for
# every LLM that doesn't pass its own -llm flag — a convenient global override
# that doesn't require per-LLM configuration.
if (-not $llm) {
    $llm = "default"
}

# --- Export LLM key for child scripts ----------------------------------------
# Provider scripts (play-tts-windows-*.ps1) and any other downstream tooling
# can inspect AGENTVIBES_LLM_KEY to identify which LLM is currently speaking.
# This mirrors the `export AGENTVIBES_LLM_KEY="llm:${LLM_PROVIDER}"` line in
# the POSIX play-tts.sh so the cross-platform contract is symmetric.
$env:AGENTVIBES_LLM_KEY = "llm:$llm"

# ── Utterance Resolver (AVI-S8.5 Stage 2) ────────────────────────────────────
# Single source of truth for the voice + engine decision, mirroring the bash
# play-tts.sh port. Resolve the plan ONCE and adopt its voice (per-LLM voice
# wins over an LLM-echoed explicit override — R2) and, below, its local engine
# (a kokoro-shaped voice forces the kokoro engine and engine aliases normalize —
# R1/F5). FAIL-SAFE: if node or the resolver bundle isn't reachable (e.g. an
# installed ~/.claude that predates the bundle-shipping installer), $PlanOk
# stays $false and the legacy logic below runs unchanged — Windows TTS never
# breaks on a missing bridge. AGENTVIBES_RESOLVER_CLI lets the installer (or
# tests) point at the resolver bundle when it lives outside the hooks tree.

# Map a resolver engine name to its Windows provider script. Returns $null for
# engines with no local Windows script (e.g. elevenlabs/macos) so the caller
# keeps the current provider rather than breaking playback.
function Resolve-ProviderScriptForEngine {
    param([string]$Engine, [string]$HooksRoot)
    switch ($Engine) {
        { $_ -in "windows-sapi", "sapi" } {
            $s = "$HooksRoot\play-tts-sapi.ps1"
            if (-not (Test-Path $s)) { $s = "$HooksRoot\play-tts-windows-sapi.ps1" }
            return $s
        }
        { $_ -in "windows-piper", "piper" } {
            $s = "$HooksRoot\play-tts-piper.ps1"
            if (-not (Test-Path $s)) { $s = "$HooksRoot\play-tts-windows-piper.ps1" }
            return $s
        }
        "soprano" { return "$HooksRoot\play-tts-soprano.ps1" }
        "kokoro"  { return "$HooksRoot\play-tts-kokoro.ps1" }
        default   { return $null }
    }
}

$_OrigExplicitVoice = $VoiceOverride   # raw positional voice, before any per-LLM override
$PlanOk         = $false
$PlanVoice      = ""
$PlanEngine     = ""
$PlanVoiceIsOverride = $false
# F-3: the SSH-receiver watcher forwards the sender's engine via -ProviderOverride
# (a parameter the resolver can't see). Seed AGENTVIBES_FORCE_PROVIDER from it so
# the resolver honors the forwarded provider instead of defaulting the plan engine
# to piper (which dropped a forwarded windows-sapi/soprano voice → wrong/no audio).
if ($ProviderOverride) {
    # A fresh -ProviderOverride for THIS request must win over any stale/inherited
    # AGENTVIBES_FORCE_PROVIDER in the environment (a validated allowlist only).
    #
    # The allowlist DERIVES from the Provider Catalog (SSOT): the Windows platform
    # set PLUS the cross-platform forwarding aliases this script normalizes
    # (piper→windows-piper, sapi→windows-sapi, and macos forwarded verbatim for
    # SSH-relayed senders). FAIL-SAFE: the literal below is the legacy fallback
    # used when the generated provider-catalog.ps1 is missing (installed-tree skew).
    $ProviderOverrideAllowlist = @('piper','soprano','macos','windows-sapi','sapi','kokoro','windows-piper')
    $__CatalogPs1 = Join-Path $ScriptPath 'provider-catalog.ps1'
    if (Test-Path $__CatalogPs1) {
        try {
            . $__CatalogPs1
            if (Get-Command Get-CatalogProvidersForPlatform -ErrorAction SilentlyContinue) {
                $__WinSet = @(Get-CatalogProvidersForPlatform 'windows')
                if ($__WinSet.Count -gt 0) {
                    # Windows synth providers + the forwarding aliases play-tts.ps1 normalizes.
                    $ProviderOverrideAllowlist = @($__WinSet + @('piper','sapi','macos') | Select-Object -Unique)
                }
            }
        } catch {
            # Keep the legacy fallback allowlist on any catalog load error.
        }
    }
    switch ($ProviderOverride) {
        { $_ -in $ProviderOverrideAllowlist } {
            $env:AGENTVIBES_FORCE_PROVIDER = $ProviderOverride
        }
    }
}
$_ResolverCli = ""
foreach ($_cand in @(
        $env:AGENTVIBES_RESOLVER_CLI,
        (Join-Path $ScriptPath "..\agentvibes-resolver\bin\resolve-utterance.js"),
        (Join-Path $ScriptPath "..\..\bin\resolve-utterance.js"),
        (Join-Path $ScriptPath "resolve-utterance.js"))) {
    if ($_cand -and (Test-Path $_cand)) { $_ResolverCli = $_cand; break }
}
$_NodeCmd = Get-Command node -ErrorAction SilentlyContinue
if ($_ResolverCli -and $_NodeCmd) {
    # Voice provenance (F-1): AGENTVIBES_VOICE_SOURCE lets a caller declare it
    # (MCP/watcher → user-explicit/agent-profile); audition never demotes; else
    # llm-echo (parroted get_config voice, which the per-LLM row overrides — R2).
    $_VoiceSource = if ($env:AGENTVIBES_VOICE_SOURCE) { $env:AGENTVIBES_VOICE_SOURCE }
                    elseif ($env:AGENTVIBES_EFFECTS_PREVIEW) { "audition" }
                    else { "llm-echo" }
    $_ResolverPackageRoot = Split-Path -Parent $ClaudeDir
    $_ResolverProjectDir = if ($env:CLAUDE_PROJECT_DIR) { $env:CLAUDE_PROJECT_DIR } else { $_ResolverPackageRoot }
    $_ResolverArgs = @('--format', 'json', '--text', $Text, '--llm', $llm,
                       '--voice-source', $_VoiceSource, '--project-dir', $_ResolverProjectDir,
                       '--package-root', $_ResolverPackageRoot)
    # Only pass --voice when there IS an explicit voice; an absent flag tells the
    # resolver "no explicit override" (so per-LLM routing applies cleanly).
    if ($_OrigExplicitVoice) { $_ResolverArgs += @('--voice', $_OrigExplicitVoice) }
    try {
        $_PlanJson = & $_NodeCmd.Source $_ResolverCli @_ResolverArgs 2>$null
        if ($LASTEXITCODE -eq 0 -and $_PlanJson) {
            $_Plan = ($_PlanJson | Out-String).Trim() | ConvertFrom-Json
            if ($_Plan) {
                $PlanOk = $true
                if ($_Plan.voice)  { $PlanVoice  = [string]$_Plan.voice }
                if ($_Plan.engine) { $PlanEngine = [string]$_Plan.engine }
                $PlanVoiceIsOverride = [bool]$_Plan.voiceIsOverride
            }
        }
    } catch {
        # Any bridge failure (bad JSON, nonzero exit, missing bundle) fails safe
        # to the legacy logic below.
        $PlanOk = $false
    }
}

# --- Lookup per-LLM config in audio-effects.cfg ------------------------------
# Scan project config first, then user-profile config.  Stop at first match.
# Variables are intentionally prefixed with _ to distinguish LLM-local state
# from the global session state set earlier in this script.
$_LlmVoice    = ""
$_LlmPretext  = ""
$_LlmReverb   = ""
$_LlmEngine   = ""
$_LlmBgFile   = ""
$_LlmBgVol    = ""
$_LlmKey      = "llm:$llm"

# Search order: CLAUDE_PROJECT_DIR → package config → user profile.
# CLAUDE_PROJECT_DIR is set by the TUI preview (targetDir) and by Claude Code
# hooks (the project being coded in), so per-LLM config written there is found
# even in npm link / global install setups where the package dir is elsewhere.
$_AudioEffectsCfgPaths = [System.Collections.Generic.List[string]]::new()
if ($env:CLAUDE_PROJECT_DIR) {
    $_AudioEffectsCfgPaths.Add((Join-Path $env:CLAUDE_PROJECT_DIR ".claude\config\audio-effects.cfg"))
}
$_AudioEffectsCfgPaths.Add((Join-Path $ClaudeDir "config\audio-effects.cfg"))
$_AudioEffectsCfgPaths.Add((Join-Path $env:USERPROFILE ".claude\config\audio-effects.cfg"))

$_LlmFound = $false
:llmCfgSearch foreach ($_cfgFile in $_AudioEffectsCfgPaths) {
    if (-not $_LlmFound -and (Test-Path $_cfgFile)) {
        $cfgContent = Get-Content $_cfgFile -ErrorAction SilentlyContinue
        if ($null -ne $cfgContent) {
            foreach ($_cfgLine in $cfgContent) {
                # Skip blank lines and comment / separator lines
                $stripped = $_cfgLine.Trim()
                if ($stripped.Length -eq 0 -or $stripped.StartsWith('#')) { continue }

                # Split on pipe; expect at least the key column
                $_cols = $_cfgLine -split '\|'
                if ($_cols.Count -ge 1 -and $_cols[0].Trim() -eq $_LlmKey) {
                    # Unpack columns defensively — missing columns stay empty
                    if ($_cols.Count -ge 2) { $_LlmReverb  = $_cols[1].Trim() }
                    if ($_cols.Count -ge 3) { $_LlmBgFile  = $_cols[2].Trim() }
                    if ($_cols.Count -ge 4) { $_LlmBgVol   = $_cols[3].Trim() }
                    if ($_cols.Count -ge 5) { $_LlmVoice   = $_cols[4].Trim() }
                    if ($_cols.Count -ge 6) { $_LlmPretext = $_cols[5].Trim() }
                    if ($_cols.Count -ge 7) { $_LlmEngine  = $_cols[6].Trim() }
                    $_LlmFound = $true
                    break llmCfgSearch
                }
            }
        }
    }
}

# --- Voice priority order (highest wins) -------------------------------------
# 1. Explicit -VoiceOverride parameter (caller always wins)
# 2. LLM-specific voice from audio-effects.cfg llm:<key> row
# 3. BMAD agent voice from bmad-voice-map.json (resolved in provider scripts)
# 4. Global active voice from tts-provider.txt / active-voice.txt

# Adopt the resolver's voice when a plan resolved (AVI-S8.5 Stage 2). The plan
# already applied the R2 precedence (per-LLM voice wins over an LLM-echoed
# explicit override; genuine explicit/audition voices still win), so take it
# verbatim. FAIL-SAFE fallback: with no plan, use the legacy explicit-wins order
# (explicit -VoiceOverride > per-LLM voice).
# F-2: adopt the plan voice ONLY when it's a real override (explicit pick or
# per-LLM row) — not the provider's stored voice file. A plain provider-file
# voice is left empty here so the provider script does its own file+model+speaker
# resolution (adopting it as an explicit override skips piper's multi-speaker
# lookup and plays speaker 0). Engine coupling (R1) still applies regardless.
if ($PlanOk -and $PlanVoiceIsOverride -and $PlanVoice) {
    $VoiceOverride = $PlanVoice
}
elseif (-not $PlanOk -and $_LlmVoice -and -not $VoiceOverride) {
    $VoiceOverride = $_LlmVoice
}

# --- Apply LLM-specific pretext ----------------------------------------------
# Prepend the configured pretext (e.g. "Agent Vibes Here") to the speech
# text.  Guard against double-prefixing on re-entrant or looped calls by
# checking whether the text already starts with the pretext string.
# Skip when AGENTVIBES_NO_PRETEXT=1 — the watcher sets this so that the
# Linux-side pretext (already embedded in the text by the SSH receiver)
# is not overwritten by the Windows audio-effects.cfg default pretext.
if ($_LlmPretext -and -not $Text.StartsWith($_LlmPretext) -and $env:AGENTVIBES_NO_PRETEXT -ne "1") {
    $Text = "$_LlmPretext, $Text"
}

# --- Reverb override from per-LLM config -------------------------------------
# If the llm:<key> row specifies a reverb preset, override the file-based
# $ReverbLevel that was set from reverb-level.txt earlier.  The allowlist
# check is repeated here so a malformed config row can't inject arbitrary
# strings into the ffmpeg filter chain.
if ($_LlmReverb) {
    $validReverbLevels = @("off", "light", "medium", "heavy", "cathedral")
    if ($validReverbLevels -contains $_LlmReverb) {
        $ReverbLevel = $_LlmReverb
        $HasReverb = $ReverbLevel -ne "off"
        # If the LLM config enables reverb and ffmpeg wasn't found yet, retry
        if ($HasReverb -and -not $HasFfmpeg) {
            try { $null = Get-Command ffmpeg -ErrorAction Stop; $HasFfmpeg = $true } catch {}
        }
    }
}

# --- Background music from per-LLM config ------------------------------------
# Apply the LLM-specific music track/volume when no per-message override is
# set (AGENTVIBES_OVERRIDE_MUSIC takes priority — it comes from the remote
# sender and represents a more-specific per-message choice).
if ($_LlmBgFile -and $OverrideMusic -eq "") {
    $OverrideMusic = $_LlmBgFile
    $BgEnabled = $true
}
if ($_LlmBgVol -and $OverrideVolume -eq "" -and $_LlmBgVol -match '^\d+\.?\d*$') {
    $OverrideVolume = $_LlmBgVol
}
# Ensure ffmpeg check covers newly-enabled background music
if ($BgEnabled -and -not $HasFfmpeg) {
    try { $null = Get-Command ffmpeg -ErrorAction Stop; $HasFfmpeg = $true } catch {}
}

# --- AGENTVIBES_OVERRIDE_EFFECTS final-priority re-apply ---------------------
# The per-message override env var (set by the SSH-remote watcher) must win
# over the LLM config row above.  Re-apply it here so a Windows-side
# audio-effects.cfg llm: row cannot silently cancel a remote sender's choice.
if ($OverrideEffects -ne "" -and $OverrideEffects -in @("off", "light", "medium", "heavy", "cathedral")) {
    $ReverbLevel = $OverrideEffects
    $HasReverb = $ReverbLevel -ne "off"
    if ($HasReverb -and -not $HasFfmpeg) {
        try { $null = Get-Command ffmpeg -ErrorAction Stop; $HasFfmpeg = $true } catch {}
    }
}

# --- Apply LLM-specific engine override --------------------------------------
# Allowed local Windows engines: windows-sapi, windows-piper, soprano.
# Transport providers (ssh-remote etc.) are not listed because they forward
# TTS to a remote host — overriding with a local engine would synthesize on
# the wrong machine.
#
# Voice/engine coupling guard: Kokoro voice ids follow a strict
# "<2-letter prefix>_<name>" pattern where the 2nd char is the gender (f/m)
# — e.g. af_river, am_eric, bf_emma, jf_alpha.  They are all-lowercase with no
# locale, hyphen, digit, or "::" multi-speaker separator that Piper/LibriTTS
# voices always carry, so the pattern can never match a Piper voice.  Such a
# voice can ONLY be synthesised by the Kokoro engine.  When the active voice is
# a Kokoro voice (e.g. the Kokoro voice picker preview, which sends
# provider=kokoro + a Kokoro voice), the per-LLM ENGINE column — which may name
# piper/sapi for that LLM's normal text responses that use Piper voices — must
# NOT redirect it to an incompatible engine, or synthesis fails silently
# (Piper can't find the Kokoro voice model → no audio, exit 0).
if ($PlanOk -and $PlanEngine) {
    # Resolver plan is authoritative for the LOCAL engine (AVI-S8.5 Stage 2):
    # this cures the kokoro/piper voice->engine coupling (R1) and normalizes
    # engine aliases like windows-sapi->sapi (F5), replacing the legacy heuristic
    # below. An engine with no local Windows script (elevenlabs/macos) leaves the
    # current provider in place.
    $_PlanScript = Resolve-ProviderScriptForEngine -Engine $PlanEngine -HooksRoot $HooksDir
    if ($_PlanScript) { $ProviderScript = $_PlanScript }
}
else {
    # Legacy voice->engine heuristic — ONLY on the fallback path (no resolver
    # plan). When a plan resolved, the resolver already coupled voice->engine
    # correctly above, so this is skipped.
    $_VoiceIsKokoro = $VoiceOverride -match '^[a-z]{2}_[a-z0-9_]+$'
    if ($_VoiceIsKokoro) {
        # A Kokoro-format voice forces the Kokoro engine regardless of the per-LLM
        # ENGINE column or the global tts-provider.txt default.
        $ProviderScript = "$HooksDir\play-tts-kokoro.ps1"
    }
    elseif ($ProviderOverride) {
        # An explicit -ProviderOverride (forwarded from the SSH payload's "provider"
        # field, or a preview) is AUTHORITATIVE and was already applied above. Do NOT
        # let the per-LLM ENGINE column override it, or a receiver whose llm row
        # defaults to piper silently swallows a forwarded windows-sapi request.
    }
    elseif ($_LlmEngine) {
        # Accept both canonical Windows names and the cross-platform aliases the TUI
        # writes (e.g. "piper" saved on a Linux/WSL install that is later read on
        # Windows, or "sapi" as a short form).  Unknown values keep the global default.
        # Mirror the global-provider switch: prefer the PS-5.1-compatible script name,
        # fall back to the alternate name if the first doesn't exist on disk.
        switch ($_LlmEngine) {
            { $_ -in "windows-sapi", "sapi" } {
                $ProviderScript = "$HooksDir\play-tts-sapi.ps1"
                if (-not (Test-Path $ProviderScript)) { $ProviderScript = "$HooksDir\play-tts-windows-sapi.ps1" }
            }
            { $_ -in "windows-piper", "piper" } {
                $ProviderScript = "$HooksDir\play-tts-piper.ps1"
                if (-not (Test-Path $ProviderScript)) { $ProviderScript = "$HooksDir\play-tts-windows-piper.ps1" }
            }
            "soprano" { $ProviderScript = "$HooksDir\play-tts-soprano.ps1" }
            "kokoro" { $ProviderScript = "$HooksDir\play-tts-kokoro.ps1" }
            default {
                Write-Host "[INFO] play-tts.ps1: Unrecognised engine '$_LlmEngine' — keeping default provider" -ForegroundColor DarkGray
            }
        }
    }
}

# --- BMAD Party Mode note ----------------------------------------------------
# When BMAD party mode is active, multiple agents speak in rapid succession.
# Each agent's voice is resolved from bmad-voice-map.json inside the provider
# scripts — that BMAD-level routing is independent of this per-LLM system.
# The -llm flag is still used to set AGENTVIBES_LLM_KEY and can supply a
# background music track and reverb preset that stays consistent throughout
# the entire party mode session regardless of which agent is speaking.

# --- Diagnostic output -------------------------------------------------------
# Set AGENTVIBES_VERBOSE=1 in the shell environment to print routing state.
# The bare `provider=`/`voice=`/`plan=` lines mirror play-tts.sh's verbose
# DECISION echo so the resolved engine/voice can be characterization-tested
# without producing real audio (see test/windows/play-tts-resolver.Tests.ps1).
if ($env:AGENTVIBES_VERBOSE -eq "1") {
    $_ProviderName = switch -Wildcard ($ProviderScript) {
        "*play-tts-kokoro.ps1"  { "kokoro" }
        "*soprano*"             { "soprano" }
        "*piper*"               { "piper" }
        "*sapi*"                { "sapi" }
        default                 { Split-Path -Leaf $ProviderScript }
    }
    Write-Output "provider=$_ProviderName"
    Write-Output "voice=$VoiceOverride"
    Write-Output ("plan=" + $(if ($PlanOk) { "ok" } else { "fallback" }))
    Write-Host "[DEBUG] play-tts.ps1 LLM routing: llm=$llm | voice=$VoiceOverride | engine=$_LlmEngine | pretext=$_LlmPretext" -ForegroundColor DarkCyan
    Write-Host "[DEBUG] play-tts.ps1 LLM routing: reverb=$ReverbLevel | HasFfmpeg=$HasFfmpeg | BgEnabled=$BgEnabled | script=$ProviderScript" -ForegroundColor DarkCyan
}

# ===========================================================================
# End of Per-LLM Audio Routing
# ===========================================================================

# Helper: play a WAV file preferring ffplay over SoundPlayer.
# SoundPlayer uses WinMM's low-quality resampler (22050 Hz → 48000 Hz is choppy);
# ffplay uses libswresample with sinc resampling — no artefacts.
function Invoke-AudioPlay {
    param([string]$FilePath)
    # Stay silent while the automated test suite is running. The windows-tts/effects
    # tests invoke this script and assert on its [VOICE]/routing output (printed
    # earlier) — they never check playback — so skipping only the audio output keeps
    # them green while preventing real speech on the developer's machine.
    if (Test-Path (Join-Path $env:USERPROFILE ".agentvibes-tests-running")) { return }
    $ffplayCmd = Get-Command ffplay -ErrorAction SilentlyContinue
    $fp = if ($ffplayCmd) { $ffplayCmd.Source } else { $null }
    if (-not $fp) {
        # Watcher sessions may inherit a minimal PATH — refresh from registry
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" +
                    [System.Environment]::GetEnvironmentVariable("Path","User")
        $ffplayCmd = Get-Command ffplay -ErrorAction SilentlyContinue
        $fp = if ($ffplayCmd) { $ffplayCmd.Source } else { $null }
    }
    if ($fp) {
        & $fp -autoexit -nodisp -loglevel quiet $FilePath 2>$null
    } else {
        $p = $null
        try   { $p = New-Object System.Media.SoundPlayer $FilePath; $p.PlaySync() }
        finally { if ($p) { $p.Dispose() } }
    }
}

# If background music or reverb enabled and ffmpeg available, tell provider to skip playback
if (($BgEnabled -or $HasReverb) -and $HasFfmpeg) {
    $env:AGENTVIBES_NO_PLAY = "1"
}

# Call the provider script
try {
    if ($VoiceOverride) {
        $providerOutput = & $ProviderScript $Text $VoiceOverride 2>&1
    }
    else {
        $providerOutput = & $ProviderScript $Text 2>&1
    }
    # Show provider output
    $providerOutput | ForEach-Object { Write-Host $_ }
}
catch {
    Write-Host "[ERROR] TTS Error: $_" -ForegroundColor Red
    $env:AGENTVIBES_NO_PLAY = $null
    exit 1
}

# Resolve the exact audio file path from provider.
# Write-Host is not captured by 2>&1 in PS5.1, so we rely on Write-Output (bare .wav path).
$AudioFilePath = ""
foreach ($line in $providerOutput) {
    $lineStr = "$line".Trim()
    if ($lineStr -match '^.+\.wav$' -and (Test-Path $lineStr)) {
        $AudioFilePath = $lineStr
        break
    }
}

# Apply reverb and/or mix with background music
if (($BgEnabled -or $HasReverb) -and $HasFfmpeg) {
    $env:AGENTVIBES_NO_PLAY = $null

    if (-not $AudioFilePath -or -not (Test-Path $AudioFilePath)) {
        Write-Host "[ERROR] Provider did not return a valid audio file path" -ForegroundColor Red
        exit 1
    }

    $voicePath = $AudioFilePath
    $AudioDir = Split-Path $AudioFilePath

    # Apply reverb if configured
        if ($HasReverb) {
            $reverbFilter = switch ($ReverbLevel) {
                "light"     { "aecho=0.8:0.88:60:0.4" }
                "medium"    { "aecho=0.8:0.88:60|120:0.4|0.3" }
                "heavy"     { "aecho=0.8:0.88:60|120|180:0.4|0.3|0.2" }
                "cathedral" { "aecho=0.8:0.88:100|200|300|400:0.3|0.25|0.2|0.15" }
                default     { "" }
            }
            if ($reverbFilter) {
                $reverbedFile = "$AudioDir\tts-reverbed.wav"
                $reverbArgs = "-y -i `"$voicePath`" -af `"$reverbFilter`" `"$reverbedFile`""
                $proc = Start-Process -FilePath "ffmpeg" -ArgumentList $reverbArgs -NoNewWindow -Wait -PassThru -RedirectStandardError "NUL"
                if ($proc.ExitCode -eq 0 -and (Test-Path $reverbedFile)) {
                    $voicePath = $reverbedFile
                }
            }
        }

        # Mix with background music if enabled
        if ($BgEnabled) {
            # Get background track - default to bachata, or read from config
            $TracksDir = "$ClaudeDir\audio\tracks"
            $DefaultTrack = "agent_vibes_bachata_v1_loop.mp3"
            $DefaultTrackFile = "$ConfigDir\background-music-default.txt"
            if (Test-Path $DefaultTrackFile) {
                $configTrack = (Get-Content $DefaultTrackFile -Raw).Trim()
                # Validate: filename only, no path separators or traversal
                if ($configTrack -and $configTrack -match '^[a-zA-Z0-9_\-\.]+$') {
                    $DefaultTrack = $configTrack
                }
            }
            # Per-message music override from remote payload (e.g. Hermes, SSH remote)
            # Accepts full filename (e.g. "agent_vibes_bachata_v1_loop.mp3") or a
            # keyword (e.g. "bachata") — keyword triggers a glob search in TracksDir.
            if ($OverrideMusic -ne "") {
                if ($OverrideMusic -match '^[a-zA-Z0-9_\-\.]+$') {
                    if ($OverrideMusic -match '\.mp3$') {
                        # Full filename — use directly
                        $DefaultTrack = $OverrideMusic
                    } else {
                        # Keyword — find first matching track file
                        $matched = Get-ChildItem -Path $TracksDir -Filter "*$OverrideMusic*" -File -ErrorAction SilentlyContinue | Select-Object -First 1
                        if ($matched) { $DefaultTrack = $matched.Name }
                    }
                }
            }
            $BgTrackPath = Join-Path $TracksDir $DefaultTrack
            # Path containment: verify resolved path stays within tracks directory
            $ResolvedBgTrack = [System.IO.Path]::GetFullPath($BgTrackPath)
            $ResolvedTracksDir = [System.IO.Path]::GetFullPath($TracksDir)
            if (-not $ResolvedBgTrack.StartsWith($ResolvedTracksDir + [System.IO.Path]::DirectorySeparatorChar)) {
                $BgTrackPath = Join-Path $TracksDir "agent_vibes_bachata_v1_loop.mp3"
            }

            # Get volume (default 0.20) — per-message override takes precedence
            # TODO(AVI-S8.6): generate this constant from the shared JSON source of truth.
            $BgVolume = "0.20"
            $VolumeFile = "$ConfigDir\background-music-volume.txt"
            if (Test-Path $VolumeFile) {
                $vol = (Get-Content $VolumeFile -Raw).Trim()
                if ($vol -match '^\d+\.?\d*$') { $BgVolume = $vol }
            }
            if ($OverrideVolume -ne "" -and $OverrideVolume -match '^\d+\.?\d*$') {
                $BgVolume = $OverrideVolume
            }

            if (Test-Path $BgTrackPath) {
                $MixedFile = $AudioFilePath -replace '\.wav$', '-mixed.wav'

                try {
                    # Get voice duration to calculate total length
                    $durTmpFile = "$env:TEMP\agentvibes-dur-$([Guid]::NewGuid().ToString('N').Substring(0,8)).txt"
                    $probArgs = "-v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 `"$voicePath`""
                    $durationProc = Start-Process -FilePath "ffprobe" -ArgumentList $probArgs -NoNewWindow -Wait -PassThru -RedirectStandardError "NUL" -RedirectStandardOutput $durTmpFile
                    $voiceDuration = 5  # default fallback
                    if (Test-Path $durTmpFile) {
                        $durStr = (Get-Content $durTmpFile -Raw).Trim()
                        if ($durStr -match '^\d+\.?\d*$') { $voiceDuration = [double]$durStr }
                        Remove-Item $durTmpFile -Force -ErrorAction SilentlyContinue
                    }
                    $totalDuration = $voiceDuration + 4  # 2s intro + voice + 2s outro
                    $fadeOutStart = $totalDuration - 2

                    # Filter: music fades in 0.5s, voice delayed 2s, music fades out last 2s
                    $filter = "[0:a]volume=${BgVolume},afade=t=in:d=0.5,afade=t=out:st=${fadeOutStart}:d=2[bg];[1:a]adelay=2000|2000,apad=pad_dur=2[voice];[bg][voice]amix=inputs=2:duration=longest:dropout_transition=2[out]"

                    # Run ffmpeg - use Start-Process to avoid stderr issues with $ErrorActionPreference
                    $ffmpegArgs = "-y -stream_loop -1 -i `"$BgTrackPath`" -i `"$voicePath`" -filter_complex `"$filter`" -map `"[out]`" -t $totalDuration `"$MixedFile`""
                    $proc = Start-Process -FilePath "ffmpeg" -ArgumentList $ffmpegArgs -NoNewWindow -Wait -PassThru -RedirectStandardError "NUL"

                    if ($proc.ExitCode -eq 0 -and (Test-Path $MixedFile) -and (Get-Item $MixedFile).Length -gt 0) {
                        # Play the mixed audio
                        try {
                            Invoke-AudioPlay $MixedFile
                        } catch {
                            Write-Host "[WARNING] Mixed playback failed, playing voice only" -ForegroundColor Yellow
                            Invoke-AudioPlay $voicePath
                        }
                    } else {
                        # Mixing failed, play voice only
                        Invoke-AudioPlay $voicePath
                    }
                } catch {
                    # ffmpeg failed, play voice only
                    Invoke-AudioPlay $voicePath
                }
            } else {
                # No background track found, play voice only
                Invoke-AudioPlay $voicePath
            }
        } else {
            # No background music, play the (possibly reverbed) voice
            Invoke-AudioPlay $voicePath
        }
} else {
    $env:AGENTVIBES_NO_PLAY = $null
    # Play only when provider delegated playback via Write-Output (e.g. Piper).
    # SAPI plays audio inline itself and emits no path — skip to avoid double-play.
    if ($AudioFilePath -and (Test-Path $AudioFilePath)) {
        Invoke-AudioPlay $AudioFilePath
    }
}

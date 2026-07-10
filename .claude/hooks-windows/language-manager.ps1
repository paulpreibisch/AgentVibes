#
# File: .claude/hooks-windows/language-manager.ps1
#
# AgentVibes - Finally, your AI Agents can Talk Back!
# Website: https://agentvibes.org
# Copyright (c) 2025 Paul Preibisch
# Licensed under the Apache License, Version 2.0

param(
    [Parameter(Position=0)]
    [string]$Command = "help",
    [Parameter(Position=1)]
    [string]$Arg1 = "",
    [Parameter(Position=2)]
    [string]$Arg2 = ""
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ClaudeDir = Split-Path -Parent $ScriptDir

# Determine config directory
if ($env:CLAUDE_PROJECT_DIR -and (Test-Path "$env:CLAUDE_PROJECT_DIR\.claude")) {
    $ConfigClaudeDir = Join-Path $env:CLAUDE_PROJECT_DIR ".claude"
} else {
    $ConfigClaudeDir = $ClaudeDir
}

$LanguageFile = Join-Path $ConfigClaudeDir "tts-language.txt"
if (-not (Test-Path $ConfigClaudeDir)) { New-Item -ItemType Directory -Path $ConfigClaudeDir -Force | Out-Null }

# Language to Piper voice mapping
$PiperVoices = @{
    "spanish"    = "es_ES-davefx-medium"
    "french"     = "fr_FR-siwis-medium"
    "german"     = "de_DE-thorsten-medium"
    "italian"    = "it_IT-riccardo-x_low"
    "portuguese" = "pt_BR-faber-medium"
    "chinese"    = "zh_CN-huayan-medium"
    "japanese"   = "ja_JP-hikari-medium"
    "korean"     = "ko_KR-eunyoung-medium"
    "russian"    = "ru_RU-dmitri-medium"
    "polish"     = "pl_PL-darkman-medium"
    "dutch"      = "nl_NL-rdh-medium"
    "turkish"    = "tr_TR-dfki-medium"
    "arabic"     = "ar_JO-kareem-medium"
    "hindi"      = "hi_IN-amitabh-medium"
    "swedish"    = "sv_SE-nst-medium"
    "danish"     = "da_DK-talesyntese-medium"
    "norwegian"  = "no_NO-talesyntese-medium"
    "finnish"    = "fi_FI-harri-medium"
    "czech"      = "cs_CZ-jirka-medium"
    "romanian"   = "ro_RO-mihai-medium"
    "ukrainian"  = "uk_UA-lada-x_low"
    "greek"      = "el_GR-rapunzelina-low"
    "bulgarian"  = "bg_BG-valentin-medium"
    "croatian"   = "hr_HR-gorana-medium"
    "slovak"     = "sk_SK-lili-medium"
}

$SupportedLanguages = ($PiperVoices.Keys | Sort-Object) -join ", "

function Get-PiperVoiceForLanguage {
    param([string]$Lang)
    $lang = $Lang.ToLower()
    if ($PiperVoices.ContainsKey($lang)) { return $PiperVoices[$lang] }
    return ""
}

function Get-ActiveProvider {
    $provFile = Join-Path $ConfigClaudeDir "tts-provider.txt"
    if (-not (Test-Path $provFile)) {
        $provFile = Join-Path $env:USERPROFILE ".claude\tts-provider.txt"
    }
    if (Test-Path $provFile) { return (Get-Content $provFile -Raw).Trim() }
    return "piper"
}

switch ($Command) {
    "set" {
        if (-not $Arg1) {
            Write-Output "Usage: language-manager.ps1 set <language>"
            exit 1
        }

        $lang = $Arg1.ToLower()

        # Handle reset/english
        if ($lang -in @("reset", "english", "en")) {
            if (Test-Path $LanguageFile) {
                Remove-Item $LanguageFile -Force
                Write-Output "Language reset to English (default)"
            } else {
                Write-Output "Already using English (default)"
            }
            exit 0
        }

        # Validate language
        if (-not $PiperVoices.ContainsKey($lang)) {
            Write-Output "Language '$lang' not supported"
            Write-Output ""
            Write-Output "Supported languages:"
            Write-Output $SupportedLanguages
            exit 1
        }

        # Save language
        Set-Content -Path $LanguageFile -Value $lang -NoNewline

        $provider = Get-ActiveProvider
        $recommendedVoice = Get-PiperVoiceForLanguage $lang

        Write-Output "Language set to: $lang"
        Write-Output "Recommended voice for $provider TTS: $recommendedVoice"
        Write-Output ""
        Write-Output "TTS will now speak in $lang."
        Write-Output "Switch voice with: /agent-vibes:switch `"$recommendedVoice`""
    }

    "get" {
        if (Test-Path $LanguageFile) {
            $lang = (Get-Content $LanguageFile -Raw).Trim()
            $provider = Get-ActiveProvider
            $recommendedVoice = Get-PiperVoiceForLanguage $lang

            Write-Output "Current language: $lang"
            if ($recommendedVoice) {
                Write-Output "Recommended voice ($provider): $recommendedVoice"
            }
        } else {
            Write-Output "Current language: english (default)"
            Write-Output "No multilingual voice required"
        }
    }

    "code" {
        if (Test-Path $LanguageFile) {
            Write-Output (Get-Content $LanguageFile -Raw).Trim()
        } else {
            Write-Output "english"
        }
    }

    "check-voice" {
        if (-not $Arg1) {
            Write-Output "Usage: language-manager.ps1 check-voice <voice-name>"
            exit 1
        }
        # AVI-S9.6 AC1: trimmed to names that exist in the 21-voice ElevenLabs
        # catalog (src/services/provider-catalog.js ELEVENLABS_VOICES) — the
        # list previously included "Antoni"/"Rachel"/"Domi"/"Charlotte", none of
        # which exist there (the same class of bug design row 21 found in the
        # now-deleted learn-manager.sh). Parity-asserted against the catalog by
        # test/unit/provider-catalog-conformance.test.js.
        $multilingual = @("Bella", "Matilda")
        if ($Arg1 -in $multilingual) { Write-Output "yes" } else { Write-Output "no" }
    }

    "best-voice" {
        $lang = "english"
        if (Test-Path $LanguageFile) { $lang = (Get-Content $LanguageFile -Raw).Trim() }
        if ($lang -eq "english") {
            Write-Output ""
        } else {
            Write-Output (Get-PiperVoiceForLanguage $lang)
        }
    }

    "voice-for-language" {
        if (-not $Arg1) {
            Write-Output "Usage: language-manager.ps1 voice-for-language <language> [provider]"
            exit 1
        }
        Write-Output (Get-PiperVoiceForLanguage $Arg1.ToLower())
    }

    "list" {
        Write-Output "Supported languages and recommended voices:"
        Write-Output ""
        foreach ($lang in ($PiperVoices.Keys | Sort-Object)) {
            $voice = $PiperVoices[$lang]
            Write-Output ("{0,-15} -> {1}" -f $lang, $voice)
        }
    }

    default {
        Write-Output "AgentVibes Language Manager"
        Write-Output ""
        Write-Output "Usage:"
        Write-Output "  language-manager.ps1 set <language>                Set language"
        Write-Output "  language-manager.ps1 get                          Get current language"
        Write-Output "  language-manager.ps1 code                         Get language code only"
        Write-Output "  language-manager.ps1 check-voice <name>           Check if voice is multilingual"
        Write-Output "  language-manager.ps1 best-voice                   Get best voice for current language"
        Write-Output "  language-manager.ps1 voice-for-language <lang>    Get voice for language"
        Write-Output "  language-manager.ps1 list                         List all supported languages"
        exit 1
    }
}

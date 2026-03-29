#
# File: .claude/hooks-windows/learn-manager.ps1
#
# AgentVibes - Finally, your AI Agents can Talk Back!
# Website: https://agentvibes.org
# Copyright (c) 2025 Paul Preibisch
# Licensed under the Apache License, Version 2.0

param(
    [Parameter(Position=0)]
    [string]$Command = "help",
    [Parameter(Position=1)]
    [string]$Arg1 = ""
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ClaudeDir = Split-Path -Parent $ScriptDir

# Determine project directory
if (Test-Path (Join-Path $PWD ".claude")) {
    $ProjectDir = $PWD.Path
} else {
    $ProjectDir = Split-Path -Parent $ClaudeDir
}

$ProjectClaude = Join-Path $ProjectDir ".claude"
$GlobalClaude = Join-Path $env:USERPROFILE ".claude"

# Config files (project-local first)
$MainLangFile = Join-Path $ProjectClaude "tts-main-language.txt"
$TargetLangFile = Join-Path $ProjectClaude "tts-target-language.txt"
$TargetVoiceFile = Join-Path $ProjectClaude "tts-target-voice.txt"
$LearnModeFile = Join-Path $ProjectClaude "tts-learn-mode.txt"

# Global fallbacks
$GlobalMainLangFile = Join-Path $GlobalClaude "tts-main-language.txt"
$GlobalTargetLangFile = Join-Path $GlobalClaude "tts-target-language.txt"
$GlobalTargetVoiceFile = Join-Path $GlobalClaude "tts-target-voice.txt"
$GlobalLearnModeFile = Join-Path $GlobalClaude "tts-learn-mode.txt"

function Get-MainLanguage {
    if (Test-Path $MainLangFile) { return (Get-Content $MainLangFile -Raw).Trim() }
    if (Test-Path $GlobalMainLangFile) { return (Get-Content $GlobalMainLangFile -Raw).Trim() }
    return "english"
}

function Get-TargetLanguage {
    if (Test-Path $TargetLangFile) { return (Get-Content $TargetLangFile -Raw).Trim() }
    if (Test-Path $GlobalTargetLangFile) { return (Get-Content $GlobalTargetLangFile -Raw).Trim() }
    return ""
}

function Get-TargetVoice {
    if (Test-Path $TargetVoiceFile) { return (Get-Content $TargetVoiceFile -Raw).Trim() }
    if (Test-Path $GlobalTargetVoiceFile) { return (Get-Content $GlobalTargetVoiceFile -Raw).Trim() }
    return ""
}

function Test-LearnModeEnabled {
    if (Test-Path $LearnModeFile) { return (Get-Content $LearnModeFile -Raw).Trim() -eq "ON" }
    if (Test-Path $GlobalLearnModeFile) { return (Get-Content $GlobalLearnModeFile -Raw).Trim() -eq "ON" }
    return $false
}

function Get-GreetingForLanguage {
    param([string]$Language)
    switch ($Language.ToLower()) {
        "spanish"    { return "Hola! Soy tu profesor de espanol. Vamos a aprender juntos!" }
        "french"     { return "Bonjour! Je suis votre professeur de francais. Apprenons ensemble!" }
        "german"     { return "Hallo! Ich bin dein Deutschlehrer. Lass uns zusammen lernen!" }
        "italian"    { return "Ciao! Sono il tuo insegnante di italiano. Impariamo insieme!" }
        "portuguese" { return "Ola! Sou seu professor de portugues. Vamos aprender juntos!" }
        "chinese"    { return "Hello! I am your Chinese language teacher. Let us learn together!" }
        "japanese"   { return "Hello! I am your Japanese language teacher. Let us learn together!" }
        "korean"     { return "Hello! I am your Korean language teacher. Let us learn together!" }
        "russian"    { return "Hello! I am your Russian language teacher. Let us learn together!" }
        "dutch"      { return "Hallo! Ik ben je Nederlandse leraar. Laten we samen leren!" }
        "polish"     { return "Czesc! Jestem twoim nauczycielem polskiego. Uczmy sie razem!" }
        "turkish"    { return "Merhaba! Ben Turkce ogretmeninizim. Birlikte ogrenelim!" }
        "swedish"    { return "Hej! Jag ar din svenskalarare. Lat oss lara tillsammans!" }
        default      { return "Hello! I am your language teacher. Let us learn together!" }
    }
}

function Get-RecommendedVoice {
    param([string]$Language)
    # Try language-manager
    $langManager = Join-Path $ScriptDir "language-manager.ps1"
    if (Test-Path $langManager) {
        $voice = & powershell -NoProfile -ExecutionPolicy Bypass -File $langManager voice-for-language $Language 2>$null
        if ($voice) { return $voice.Trim() }
    }
    return ""
}

function Show-Status {
    $mainLang = Get-MainLanguage
    $targetLang = Get-TargetLanguage
    $targetVoice = Get-TargetVoice
    $learnMode = if (Test-LearnModeEnabled) { "ON" } else { "OFF" }

    Write-Output "-----------------------------------------------"
    Write-Output "   Language Learning Mode Status"
    Write-Output "-----------------------------------------------"
    Write-Output ""
    Write-Output "  Learning Mode:    $learnMode"
    Write-Output "  Main Language:    $mainLang"
    Write-Output "  Target Language:  $(if ($targetLang) { $targetLang } else { '(not set)' })"
    Write-Output "  Target Voice:     $(if ($targetVoice) { $targetVoice } else { '(not set)' })"
    Write-Output ""

    if ($learnMode -eq "ON") {
        if (-not $targetLang) {
            Write-Output "  Please set a target language: /agent-vibes:target <language>"
        }
        if (-not $targetVoice) {
            Write-Output "  Please set a target voice: /agent-vibes:target-voice <voice>"
        }
        if ($targetLang -and $targetVoice) {
            Write-Output "  All set! TTS will speak in both languages."
            Write-Output ""
            Write-Output "  How it works:"
            Write-Output "    1. First: Speak in $mainLang (your current voice)"
            Write-Output "    2. Then: Speak in $targetLang ($targetVoice voice)"
        }
    } else {
        Write-Output "  Enable learning mode with: /agent-vibes:learn"
    }

    Write-Output ""
    Write-Output "-----------------------------------------------"
}

# Ensure project .claude exists
if (-not (Test-Path $ProjectClaude)) { New-Item -ItemType Directory -Path $ProjectClaude -Force | Out-Null }

switch ($Command) {
    "enable" {
        Set-Content -Path $LearnModeFile -Value "ON" -NoNewline
        Write-Output "Language learning mode: ENABLED"
        Write-Output ""

        # Auto-set target voice if target language exists but voice doesn't
        $targetLang = Get-TargetLanguage
        $targetVoice = Get-TargetVoice

        if ($targetLang -and -not $targetVoice) {
            Write-Output "Auto-configuring voice for $targetLang..."
            $recommended = Get-RecommendedVoice $targetLang
            if ($recommended) {
                Set-Content -Path $TargetVoiceFile -Value $recommended -NoNewline
                $targetVoice = $recommended
                Write-Output "Target voice automatically set to: $recommended"
                Write-Output ""
            }
        }

        Show-Status

        # Greet in target language
        if ($targetLang -and $targetVoice) {
            $greeting = Get-GreetingForLanguage $targetLang
            Write-Output ""
            Write-Output "Your language teacher says: $greeting"
        }
    }

    "disable" {
        Set-Content -Path $LearnModeFile -Value "OFF" -NoNewline
        Write-Output "Language learning mode: DISABLED"
    }

    "status" {
        Show-Status
    }

    "is-enabled" {
        if (Test-LearnModeEnabled) {
            Write-Output "ON"
            exit 0
        } else {
            Write-Output "OFF"
            exit 1
        }
    }

    "get-main-language" {
        Write-Output (Get-MainLanguage)
    }

    "set-main-language" {
        if (-not $Arg1) {
            Write-Output "Usage: learn-manager.ps1 set-main-language <language>"
            exit 1
        }
        Set-Content -Path $MainLangFile -Value $Arg1 -NoNewline
        Write-Output "Main language set to: $Arg1"
    }

    "get-target-language" {
        Write-Output (Get-TargetLanguage)
    }

    "set-target-language" {
        if (-not $Arg1) {
            Write-Output "Usage: learn-manager.ps1 set-target-language <language>"
            exit 1
        }
        Set-Content -Path $TargetLangFile -Value $Arg1 -NoNewline
        Write-Output "Target language set to: $Arg1"

        # Auto-set recommended voice
        $recommended = Get-RecommendedVoice $Arg1
        if ($recommended) {
            Set-Content -Path $TargetVoiceFile -Value $recommended -NoNewline
            Write-Output "Target voice automatically set to: $recommended"

            $greeting = Get-GreetingForLanguage $Arg1
            Write-Output ""
            Write-Output "Your language teacher says: $greeting"
        }
    }

    "get-target-voice" {
        Write-Output (Get-TargetVoice)
    }

    "set-target-voice" {
        if (-not $Arg1) {
            Write-Output "Usage: learn-manager.ps1 set-target-voice <voice>"
            exit 1
        }
        Set-Content -Path $TargetVoiceFile -Value $Arg1 -NoNewline
        Write-Output "Target voice set to: $Arg1"
    }

    default {
        Write-Output "Usage: learn-manager.ps1 {enable|disable|status|is-enabled|get-main-language|set-main-language|get-target-language|set-target-language|get-target-voice|set-target-voice}"
        exit 1
    }
}

#
# File: ~/.claude/hooks-windows/bmad-party-speak.ps1
#
# AgentVibes PostToolUse Hook - BMAD Party Mode TTS
#
# Fires after every Agent tool call. Detects BMAD party mode agents by
# fingerprinting the prompt, extracts the agent display name, maps it to
# the canonical agent ID via the manifest, then calls bmad-speak.ps1.
#
# Installed globally so it works in any BMAD project.
# Uses $env:CLAUDE_PROJECT_DIR to locate the project manifest at runtime.
#

try {
    # --- Read stdin safely ---
    $raw = [Console]::In.ReadToEnd()
    if (-not $raw -or $raw.Trim() -eq "") { exit 0 }

    $data = $raw | ConvertFrom-Json
    if (-not $data) { exit 0 }

    # --- Only handle Agent tool ---
    if ($data.tool_name -ne "Agent") { exit 0 }


    # --- Extract prompt ---
    $prompt = $data.tool_input.prompt
    if (-not $prompt) { exit 0 }

    # --- Fingerprint: only fire for BMAD party mode agents ---
    if ($prompt -notmatch "BMAD agent in a collaborative roundtable") { exit 0 }

    # --- Extract display name from "You are {Name} (" ---
    if ($prompt -notmatch "You are ([A-Za-z]+)\s*\(") { exit 0 }
    $DisplayName = $Matches[1]

    # --- Extract response text ---
    $content = $data.tool_response.content
    if (-not $content -or $content.Count -eq 0) { exit 0 }
    $ResponseText = ($content | Where-Object { $_.type -eq "text" } | Select-Object -First 1).text
    if (-not $ResponseText) { exit 0 }

    # Strip leading icon + bold name header e.g. "📊 **Mary:**" or garbled "≡ƒôè **Mary:**"
    # Trim first so leading newlines don't defeat the ^ anchor (fixes M7)
    $ResponseText = $ResponseText.Trim()
    $ResponseText = $ResponseText -replace '^\S*\s*\*\*[^:]+:\*\*\s*', ''
    $ResponseText = $ResponseText.Trim()
    if (-not $ResponseText) { exit 0 }

    # Strip markdown so TTS doesn't speak asterisks, hashes, backticks, etc.
    $ResponseText = $ResponseText -replace '\*\*', ''      # bold
    $ResponseText = $ResponseText -replace '\*', ''        # italic
    $ResponseText = $ResponseText -replace '`{1,3}[^`]*`{1,3}', ''  # inline code / code blocks
    $ResponseText = $ResponseText -replace '#{1,6}\s*', '' # headings
    $ResponseText = $ResponseText -replace '__', ''        # underline/bold alt
    $ResponseText = $ResponseText -replace '_', ''         # italic alt
    $ResponseText = $ResponseText -replace '\[([^\]]+)\]\([^)]+\)', '$1'  # links → label only
    $ResponseText = $ResponseText -replace '!\[[^\]]*\]\([^)]+\)', ''     # images
    $ResponseText = $ResponseText -replace '^\s*[-*+]\s+', ''             # bullet list markers
    $ResponseText = $ResponseText.Trim()
    if (-not $ResponseText) { exit 0 }

    # --- Resolve paths ---
    $ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
    $ProjectRoot = $env:CLAUDE_PROJECT_DIR

    # --- Find bmad-speak.ps1 (prefer project-local, fall back to global) ---
    $BmadSpeak = $null
    if ($ProjectRoot) {
        $local = Join-Path $ProjectRoot ".claude\hooks-windows\bmad-speak.ps1"
        if (Test-Path $local) { $BmadSpeak = $local }
    }
    if (-not $BmadSpeak) {
        $global = Join-Path $ScriptDir "bmad-speak.ps1"
        if (Test-Path $global) { $BmadSpeak = $global }
    }
    if (-not $BmadSpeak) { exit 0 }

    # --- Look up canonical agent ID from project manifest (fixes m2: UTF8 encoding) ---
    $AgentId = $DisplayName  # fallback
    if ($ProjectRoot) {
        $ManifestFile = Join-Path $ProjectRoot "_bmad\_config\agent-manifest.csv"
        if (Test-Path $ManifestFile) {
            $rows = Import-Csv $ManifestFile -Encoding UTF8
            foreach ($row in $rows) {
                if ($row.displayName -ieq $DisplayName) {
                    $AgentId = $row.name
                    break
                }
            }
        }
    }

    # --- Apply verbosity truncation ---
    $Verbosity = "medium"
    $verbosityPaths = @(
        (Join-Path $env:USERPROFILE ".claude\tts-verbosity.txt")
    )
    if ($ProjectRoot) {
        $verbosityPaths = @((Join-Path $ProjectRoot ".claude\tts-verbosity.txt")) + $verbosityPaths
    }
    foreach ($p in $verbosityPaths) {
        if (Test-Path $p) {
            $v = (Get-Content $p -Raw -ErrorAction SilentlyContinue).Trim()
            if ($v) { $Verbosity = $v; break }
        }
    }

    switch ($Verbosity) {
        "low" {
            $sentences = [regex]::Split($ResponseText, '(?<=[.!?])\s+')
            # Fall back to full text if no sentence-ending punctuation (fixes m1)
            if ($sentences.Count -gt 0 -and $sentences[0]) { $ResponseText = $sentences[0] }
        }
        "medium" {
            $sentences = [regex]::Split($ResponseText, '(?<=[.!?])\s+')
            # Fall back to full text if no sentence-ending punctuation (fixes m1)
            $truncated = ($sentences | Select-Object -First 2) -join " "
            if ($truncated) { $ResponseText = $truncated }
        }
        # "high" = full text
    }

    # --- Pre-synthesize WAV before acquiring mutex so synthesis overlaps with previous agent's playback ---
    $PreSynthWav = $null
    try {
        # Resolve agent voice from voice map
        $VoiceMapLocal  = if ($ProjectRoot) { Join-Path $ProjectRoot ".agentvibes\bmad-voice-map.json" } else { $null }
        $VoiceMapGlobal = Join-Path $env:USERPROFILE ".agentvibes\bmad-voice-map.json"
        $VoiceMapFile   = if ($VoiceMapLocal -and (Test-Path $VoiceMapLocal)) { $VoiceMapLocal }
                          elseif (Test-Path $VoiceMapGlobal) { $VoiceMapGlobal }
                          else { $null }

        $AgentVoiceName  = $null
        $SpeakerId       = $null
        $AgentPretext    = $null
        if ($VoiceMapFile) {
            $vm = Get-Content $VoiceMapFile -Raw | ConvertFrom-Json
            $profile = $vm.agents.$AgentId
            if ($profile -and $profile.pretext) { $AgentPretext = $profile.pretext }
            if ($profile -and $profile.voice) {
                $raw = $profile.voice
                if ($raw -match '::') {
                    $parts = $raw -split '::'
                    $AgentVoiceName = $parts[0]
                    $SpeakerName = if ($parts.Length -ge 2) { $parts[1] } else { "" }
                    # NOTE: The suffix number (e.g. "14" in "Yara-14") is a display disambiguator,
                    # NOT the piper speaker index. Must look up real index from speaker_id_map.
                    if ($SpeakerName) {
                        $VoicesDir = "$env:USERPROFILE\.claude\piper-voices"
                        $OnnxJsonPath = "$VoicesDir\$AgentVoiceName.onnx.json"
                        if (Test-Path $OnnxJsonPath) {
                            try {
                                $onnxData = Get-Content $OnnxJsonPath -Raw -Encoding UTF8 | ConvertFrom-Json
                                $speakerIdMap = $onnxData.speaker_id_map
                                if ($speakerIdMap -and $speakerIdMap.PSObject.Properties[$SpeakerName]) {
                                    $SpeakerId = [string]$speakerIdMap.PSObject.Properties[$SpeakerName].Value
                                }
                            } catch { }
                        }
                    }
                } else {
                    $AgentVoiceName = $raw
                }
            }
        }

        # Locate piper
        $PiperExe = "$env:LOCALAPPDATA\Programs\Piper\piper.exe"
        if (-not (Test-Path $PiperExe)) {
            $found = Get-Command piper.exe -ErrorAction SilentlyContinue
            if ($found) { $PiperExe = $found.Source }
        }

        if (Test-Path $PiperExe) {
            $VoicesDir = "$env:USERPROFILE\.claude\piper-voices"
            # Fall back to first available voice if agent voice not found
            if (-not $AgentVoiceName) {
                $first = Get-ChildItem $VoicesDir -Filter "*.onnx" -ErrorAction SilentlyContinue | Select-Object -First 1
                if ($first) { $AgentVoiceName = $first.BaseName }
            }
            if ($AgentVoiceName -and ($AgentVoiceName -match '^[a-zA-Z0-9_\-\.]+$')) {
                $VoiceModel = Join-Path $VoicesDir "$AgentVoiceName.onnx"
                if (Test-Path $VoiceModel) {
                    $AudioDir = "$env:USERPROFILE\.claude\audio"
                    if (-not (Test-Path $AudioDir)) { New-Item -ItemType Directory -Path $AudioDir -Force | Out-Null }
                    $PreSynthWav = Join-Path $AudioDir "tts-presynth-$([System.IO.Path]::GetRandomFileName() -replace '\..*').wav"
                    $piperArgs = @("--model", $VoiceModel, "--output-file", $PreSynthWav)
                    if ($SpeakerId) { $piperArgs += @("--speaker", $SpeakerId) }
                    # Include pretext in pre-synthesis so it's spoken — bmad-speak.ps1 will
                    # skip synthesis (AGENTVIBES_PRESYNTHESIZED_WAV set) so pretext must be here.
                    $PreSynthText = if ($AgentPretext) { "$AgentPretext. $ResponseText" } else { $ResponseText }
                    $PreSynthText | & $PiperExe @piperArgs 2>$null
                    if (-not (Test-Path $PreSynthWav) -or (Get-Item $PreSynthWav).Length -eq 0) {
                        $PreSynthWav = $null
                    }
                }
            }
        }
    } catch {
        $PreSynthWav = $null  # degrade gracefully — will synthesize inside mutex instead
    }

    # --- Speak with queue serialization (named mutex, cross-process) ---
    $mutex = New-Object System.Threading.Mutex($false, "AgentVibesPartyModeTTSQueue")
    try {
        $acquired = $false
        try {
            # WaitOne throws AbandonedMutexException if prior process crashed while holding it.
            # That exception means we DID acquire the mutex — treat it as success (fixes M2).
            $acquired = $mutex.WaitOne(60000)
        } catch [System.Threading.AbandonedMutexException] {
            $acquired = $true  # abandoned = we now own it
        }

        if ($acquired) {
            try {
                # Pass pre-synthesized WAV path so play-tts.ps1 skips synthesis (reduces gap between agents)
                if ($PreSynthWav) { $env:AGENTVIBES_PRESYNTHESIZED_WAV = $PreSynthWav }
                # Pass positional args directly after -File (spaces handled by quoting via array)
                & powershell -NoProfile -ExecutionPolicy Bypass -File $BmadSpeak $AgentId $ResponseText
            } finally {
                $env:AGENTVIBES_PRESYNTHESIZED_WAV = ""
                if ($PreSynthWav -and (Test-Path $PreSynthWav)) {
                    Remove-Item $PreSynthWav -Force -ErrorAction SilentlyContinue
                }
                $mutex.ReleaseMutex()
            }
        } else {
            # Timed out — log to stderr so it's visible in hook error output (fixes M6)
            [Console]::Error.WriteLine("[AgentVibes] Party mode TTS queue timeout for agent: $AgentId")
        }
    } finally {
        $mutex.Close()
    }

} catch {
    # Silently exit — never block Claude
    exit 0
}

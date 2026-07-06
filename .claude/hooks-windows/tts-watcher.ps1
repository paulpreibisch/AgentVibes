#
# File: .claude/hooks-windows/tts-watcher.ps1
#
# AgentVibes TTS Queue Watcher — runs in the user's interactive session for audio access.
# The SSH receiver (session 0, no audio) writes JSON request files to the queue; this
# watcher picks them up and calls play-tts.ps1 in the user's desktop session.
#
# Single-instance guard: exit immediately if another watcher instance is already running.
$mutex = New-Object System.Threading.Mutex($false, 'Global\AgentVibesTtsWatcher')
if (-not $mutex.WaitOne(0)) { $mutex.Dispose(); exit 0 }

$QueueDir = "$env:USERPROFILE\.agentvibes\tts-queue"
$LogFile  = "$env:USERPROFILE\.agentvibes\watcher.log"
$PlayTts  = "$env:USERPROFILE\.claude\hooks-windows\play-tts.ps1"
if (-not (Test-Path $QueueDir)) { New-Item -ItemType Directory -Path $QueueDir -Force | Out-Null }

function Write-WatcherLog {
    param([string]$Level, [string]$Msg)
    $ts = Get-Date -Format 'yyyy-MM-ddTHH:mm:ss'
    Add-Content -Path $LogFile -Value "$ts [$Level] $Msg" -ErrorAction SilentlyContinue
}

Write-WatcherLog "INFO" "Watcher started. PlayTts=$PlayTts exists=$(Test-Path $PlayTts)"

try {
    while ($true) {
        $files = Get-ChildItem "$QueueDir\req-*.json" -ErrorAction SilentlyContinue | Sort-Object CreationTime
        foreach ($f in $files) {
            # Rename to proc-* before processing — crash recovery on restart
            $procFile = $f.FullName -replace '\\req-', '\proc-'
            try { Rename-Item $f.FullName $procFile -ErrorAction Stop } catch { continue }
            try {
                $req = Get-Content $procFile -Raw | ConvertFrom-Json

                # Music preview: play/stop a standalone background-music track
                # ASYNCHRONOUSLY (Start-Process) so it never blocks the TTS queue,
                # tracking the ffplay PID so a new request (or an explicit stop)
                # replaces the previous track instead of stacking playback.
                #   kind=music       → stop any current preview, then play the track
                #   kind=music-stop  → stop any current preview (no new playback)
                if ($req.kind -eq 'music' -or $req.kind -eq 'music-stop') {
                    $pidFile = Join-Path $env:USERPROFILE '.agentvibes\music-preview.pid'
                    # Stop the currently-playing preview, if any. Verify the PID is
                    # actually ffplay so a recycled PID can't kill an unrelated proc.
                    if (Test-Path $pidFile) {
                        $oldPid = (Get-Content $pidFile -Raw -ErrorAction SilentlyContinue).Trim()
                        if ($oldPid -match '^\d+$') {
                            $op = Get-Process -Id ([int]$oldPid) -ErrorAction SilentlyContinue
                            if ($op -and $op.ProcessName -eq 'ffplay') { Stop-Process -Id ([int]$oldPid) -Force -ErrorAction SilentlyContinue }
                        }
                        Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
                    }
                    if ($req.kind -eq 'music') {
                        $trackName = [string]$req.music
                        if ($trackName -match '^[A-Za-z0-9._][A-Za-z0-9._\-]*\.mp3$') {
                            $tracksDir = Join-Path $env:USERPROFILE '.claude\audio\tracks'
                            $full     = [System.IO.Path]::GetFullPath((Join-Path $tracksDir $trackName))
                            $baseFull = [System.IO.Path]::GetFullPath($tracksDir)
                            if (-not $baseFull.EndsWith([IO.Path]::DirectorySeparatorChar)) { $baseFull += [IO.Path]::DirectorySeparatorChar }
                            if ($full.StartsWith($baseFull, [StringComparison]::OrdinalIgnoreCase) -and (Test-Path $full)) {
                                $ffplay = Get-Command ffplay -ErrorAction SilentlyContinue
                                if ($ffplay) {
                                    Write-WatcherLog "INFO" "music-preview id=$($req.id) track=$trackName"
                                    $mp = Start-Process -FilePath $ffplay.Source -ArgumentList @('-autoexit','-nodisp','-loglevel','quiet','-volume','80',$full) -WindowStyle Hidden -PassThru
                                    if ($mp) { Set-Content -Path $pidFile -Value $mp.Id -NoNewline -ErrorAction SilentlyContinue }
                                } else {
                                    Write-WatcherLog "WARN" "ffplay not found - cannot preview music id=$($req.id)"
                                }
                            } else {
                                Write-WatcherLog "WARN" "music track not found id=$($req.id) track=$trackName"
                            }
                        } else {
                            Write-WatcherLog "WARN" "invalid music track name id=$($req.id)"
                        }
                    } else {
                        Write-WatcherLog "INFO" "music-stop id=$($req.id)"
                    }
                    Remove-Item $procFile -Force -ErrorAction SilentlyContinue
                    continue
                }

                # Validate voice before passing to command line
                $safeVoice = if ($req.voice -and $req.voice -match '^[a-zA-Z0-9_\-\. :]+$') { $req.voice } else { "" }
                $env:CLAUDE_PROJECT_DIR = $env:USERPROFILE
                $env:AGENTVIBES_NO_PRETEXT = "1"
                # Carry the sender's project (folder name/path) through to the
                # TalkingHead forward so the avatar badge/tab shows the real remote
                # origin instead of this machine's own profile dir. (Grafted from master WIP.)
                if ($req.project) { $env:AGENTVIBES_PROJECT = $req.project }
                else { [System.Environment]::SetEnvironmentVariable("AGENTVIBES_PROJECT", $null, "Process") }
                if ($req.projectPath) { $env:AGENTVIBES_PROJECT_PATH = $req.projectPath }
                else { [System.Environment]::SetEnvironmentVariable("AGENTVIBES_PROJECT_PATH", $null, "Process") }
                # Use SetEnvironmentVariable to truly unset (assignment to $null leaves empty string)
                if ($req.music)   { $env:AGENTVIBES_OVERRIDE_MUSIC   = $req.music }
                else { [System.Environment]::SetEnvironmentVariable("AGENTVIBES_OVERRIDE_MUSIC",   $null, "Process") }
                if ($req.volume)  { $env:AGENTVIBES_OVERRIDE_VOLUME  = $req.volume }
                else { [System.Environment]::SetEnvironmentVariable("AGENTVIBES_OVERRIDE_VOLUME",  $null, "Process") }
                if ($req.effects) { $env:AGENTVIBES_OVERRIDE_EFFECTS = $req.effects }
                else { [System.Environment]::SetEnvironmentVariable("AGENTVIBES_OVERRIDE_EFFECTS", $null, "Process") }

                if (Test-Path $PlayTts) {
                    # Play remote arrival prefix sound if configured
                    $prefixSoundFile = "$env:USERPROFILE\.agentvibes\remote-prefix-sound.txt"
                    if (Test-Path $prefixSoundFile) {
                        $prefixSound = (Get-Content $prefixSoundFile -Raw).Trim()
                        if ($prefixSound -and (Test-Path $prefixSound)) {
                            $ffplay = Get-Command ffplay -ErrorAction SilentlyContinue
                            if ($ffplay) {
                                & $ffplay.Source -autoexit -nodisp -loglevel quiet $prefixSound 2>$null
                            }
                        }
                    }

                    $tempText = Join-Path $env:TEMP "agentvibes-tts-$($req.id).txt"
                    try {
                        [System.IO.File]::WriteAllText($tempText, $req.text, [System.Text.UTF8Encoding]::new($false))
                        $env:AGENTVIBES_TEXT_FILE = $tempText

                        $llmArg = @()
                        if ($req.llm) {
                            if ($req.llm -match '^[a-zA-Z0-9][a-zA-Z0-9_-]*$') {
                                $llmArg = @('-llm', $req.llm)
                            } else {
                                Write-WatcherLog "WARN" "Invalid LLM name '$($req.llm)' - using default"
                            }
                        }

                        # Provider override: the Linux sender embeds its configured provider
                        # (from receiver-provider.txt / audio-effects.cfg ENGINE column) in the
                        # JSON payload so the Windows receiver uses the Linux-side engine choice.
                        $providerArg = @()
                        if ($req.provider) {
                            $safeProvider = $req.provider.Trim()
                            if ($safeProvider -match '^[a-zA-Z0-9][a-zA-Z0-9_-]*$') {
                                $providerArg = @('-ProviderOverride', $safeProvider)
                            } else {
                                Write-WatcherLog "WARN" "Invalid provider '$safeProvider' in payload - ignored"
                            }
                        }

                        Write-WatcherLog "INFO" "play-tts id=$($req.id) voice=$safeVoice llm=$($req.llm) provider=$safeProvider"
                        $playOutput = & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $PlayTts "__from_file__" $safeVoice @llmArg @providerArg 2>&1
                        if ($LASTEXITCODE -ne 0) {
                            Write-WatcherLog "ERROR" "play-tts exit=$LASTEXITCODE id=$($req.id) output=$($playOutput -join ' | ')"
                        } else {
                            Write-WatcherLog "INFO" "play-tts ok exit=0 id=$($req.id)"
                        }
                    } finally {
                        [System.Environment]::SetEnvironmentVariable("AGENTVIBES_TEXT_FILE", $null, "Process")
                        Remove-Item $tempText -Force -ErrorAction SilentlyContinue
                    }
                } else {
                    # Fallback: Windows SAPI (built-in, no installation required)
                    Write-WatcherLog "WARN" "play-tts.ps1 not found - using SAPI fallback for id=$($req.id)"
                    Add-Type -AssemblyName System.Speech
                    $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
                    $synth.Speak($req.text)
                    $synth.Dispose()
                }
                Remove-Item $procFile -Force -ErrorAction SilentlyContinue
            } catch {
                Write-WatcherLog "ERROR" "id=$($req.id) err=$_"
                Remove-Item $procFile -Force -ErrorAction SilentlyContinue
            }
        }
        # Crash recovery: re-queue any proc-* files left from a previous watcher crash
        $stale = Get-ChildItem "$QueueDir\proc-*.json" -ErrorAction SilentlyContinue
        foreach ($s in $stale) {
            $recovered = $s.FullName -replace '\\proc-', '\req-'
            try { Rename-Item $s.FullName $recovered -ErrorAction SilentlyContinue } catch {}
        }
        Start-Sleep -Milliseconds 200
    }
} finally {
    $mutex.ReleaseMutex()
    $mutex.Dispose()
}

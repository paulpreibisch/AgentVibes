#
# File: setup-windows.ps1
#
# AgentVibes Windows Native Setup Script
# Installs and configures AgentVibes for Windows
#
# Usage:
#   .\setup-windows.ps1                  # Interactive setup
#   .\setup-windows.ps1 -Provider soprano  # Skip provider prompt
#

param(
    [Parameter(Mandatory = $false)]
    [ValidateSet('soprano', 'piper', 'sapi')]
    [string]$Provider
)

$ErrorActionPreference = "Stop"

# ── UI Helper Functions ─────────────────────────────────────

$BoxWidth = 58

function Write-BoxTop {
    Write-Host "  $([char]0x256D)$([string]::new([char]0x2500, $BoxWidth))$([char]0x256E)" -ForegroundColor Cyan
}

function Write-BoxBottom {
    Write-Host "  $([char]0x2570)$([string]::new([char]0x2500, $BoxWidth))$([char]0x256F)" -ForegroundColor Cyan
}

function Write-BoxLine([string]$text, [string]$color = "White") {
    $padding = $BoxWidth - $text.Length
    if ($padding -lt 0) { $padding = 0; $text = $text.Substring(0, $BoxWidth) }
    Write-Host "  $([char]0x2502)" -ForegroundColor Cyan -NoNewline
    Write-Host "$text$([string]::new(' ', $padding))" -ForegroundColor $color -NoNewline
    Write-Host "$([char]0x2502)" -ForegroundColor Cyan
}

function Write-BoxEmpty {
    Write-BoxLine ([string]::new(' ', $BoxWidth)) "White"
}

function Write-Section([string]$label) {
    Write-Host ""
    Write-Host "  $([string]::new([char]0x2501, 56))" -ForegroundColor Yellow
    Write-Host "   $label" -ForegroundColor Yellow
    Write-Host "  $([string]::new([char]0x2501, 56))" -ForegroundColor Yellow
    Write-Host ""
}

function Write-Ok([string]$text) {
    Write-Host "    [OK] $text" -ForegroundColor Green
}

function Write-Warn([string]$text) {
    Write-Host "    [!!] $text" -ForegroundColor Yellow
}

function Write-Err([string]$text) {
    Write-Host "    [XX] $text" -ForegroundColor Red
}

function Write-Info([string]$text) {
    Write-Host "         $text" -ForegroundColor Gray
}

function Write-Item([string]$icon, [string]$name, [string]$desc) {
    $nameWidth = 30
    $paddedName = $name.PadRight($nameWidth)
    Write-Host "    $icon " -ForegroundColor Green -NoNewline
    Write-Host $paddedName -ForegroundColor White -NoNewline
    Write-Host $desc -ForegroundColor DarkGray
}

# ── Read Version ────────────────────────────────────────────

$Version = "unknown"
$ScriptDir = $PSScriptRoot
$PackageJson = Join-Path $ScriptDir "package.json"
if (Test-Path $PackageJson) {
    try {
        $pkg = Get-Content $PackageJson -Raw | ConvertFrom-Json
        $Version = $pkg.version
    } catch {}
}

# ── Banner ──────────────────────────────────────────────────

# ANSI Shadow figlet art matching the Node.js installer
$AgentArt = @(
    " █████╗  ██████╗ ███████╗███╗   ██╗████████╗",
    "██╔══██╗██╔════╝ ██╔════╝████╗  ██║╚══██╔══╝",
    "███████║██║  ███╗█████╗  ██╔██╗ ██║   ██║   ",
    "██╔══██║██║   ██║██╔══╝  ██║╚██╗██║   ██║   ",
    "██║  ██║╚██████╔╝███████╗██║ ╚████║   ██║   ",
    "╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝  ╚═══╝   ╚═╝   "
)
$VibesArt = @(
    "██╗   ██╗██╗██████╗ ███████╗███████╗",
    "██║   ██║██║██╔══██╗██╔════╝██╔════╝",
    "██║   ██║██║██████╔╝█████╗  ███████╗",
    "╚██╗ ██╔╝██║██╔══██╗██╔══╝  ╚════██║",
    " ╚████╔╝ ██║██████╔╝███████╗███████║",
    "  ╚═══╝  ╚═╝╚═════╝ ╚══════╝╚══════╝"
)

Write-Host ""
for ($i = 0; $i -lt $AgentArt.Count; $i++) {
    Write-Host $AgentArt[$i] -ForegroundColor Cyan -NoNewline
    Write-Host "  " -NoNewline
    Write-Host $VibesArt[$i] -ForegroundColor Magenta
}
Write-Host ""
Write-BoxTop
Write-BoxEmpty
Write-BoxLine "   Windows Native Setup  v$Version" "Cyan"
Write-BoxEmpty
Write-BoxLine "   Now your AI Agents can finally talk back!" "White"
Write-BoxLine "   Professional TTS for Claude Code on Windows" "DarkGray"
Write-BoxEmpty
Write-BoxLine "   https://agentvibes.org" "DarkCyan"
Write-BoxBottom
Write-Host ""

# ── What's New ──────────────────────────────────────────────

Write-Host "  WHAT'S NEW in v$Version" -ForegroundColor Green
Write-Host ""
Write-Host "    Native Windows support with three TTS providers (Soprano neural," -ForegroundColor Cyan
Write-Host "    Piper offline, Windows SAPI), background music from 16 genre tracks," -ForegroundColor Cyan
Write-Host "    reverb effects via ffmpeg, and verbosity control." -ForegroundColor Cyan
Write-Host ""
Write-Host "    Thanks to @nathanchase (Soprano), @alexeyv (Windows SAPI)," -ForegroundColor Yellow
Write-Host "    @bmadcode (BMAD Method)!" -ForegroundColor Yellow
Write-Host ""
Write-Host "    KEY HIGHLIGHTS:" -ForegroundColor Green
Write-Host "      [*] Native Windows TTS - Soprano, Piper, SAPI. No WSL needed!" -ForegroundColor Gray
Write-Host "      [*] Background Music - 16 genre tracks (Bachata, Flamenco, etc.)" -ForegroundColor Gray
Write-Host "      [*] Reverb & Effects - 5 reverb levels via ffmpeg aecho filter" -ForegroundColor Gray
Write-Host "      [*] Verbosity Control - High, Medium, or Low transparency" -ForegroundColor Gray
Write-Host "      [*] Beautiful Installer - Figlet banner, provider detection" -ForegroundColor Gray
Write-Host "      [*] 93/93 Tests Passing - 46 Windows + 47 cross-platform" -ForegroundColor Gray
Write-Host ""

# ── Node.js Detection ──────────────────────────────────────

try {
    $nodeVersion = & node --version 2>$null
    if ($nodeVersion) {
        Write-Host "  Node.js detected " -ForegroundColor Gray -NoNewline
        Write-Host "($nodeVersion)" -ForegroundColor Green
        Write-Host ""
        Write-Host "  Tip: For a richer install experience, you can also run:" -ForegroundColor DarkGray
        Write-Host "       npx agentvibes install" -ForegroundColor Cyan
        Write-Host ""
        $choice = Read-Host "  Launch the Node.js installer instead? (y/N)"
        if ($choice -eq 'y' -or $choice -eq 'Y') {
            Write-Host ""
            Write-Host "  Launching Node.js installer..." -ForegroundColor Cyan
            Write-Host ""
            $installerPath = Join-Path $ScriptDir "src\installer.js"
            if (Test-Path $installerPath) {
                & node $installerPath install
            } else {
                & npx agentvibes install
            }
            exit 0
        }
        Write-Host ""
        Write-Host "  Continuing with PowerShell installer..." -ForegroundColor Gray
    }
} catch {}

# ── PowerShell Version Check ───────────────────────────────

Write-Section "System Check"

$PSVersionRequired = [Version]"5.1"
if ($PSVersionTable.PSVersion -lt $PSVersionRequired) {
    Write-Err "PowerShell 5.1+ required (found $($PSVersionTable.PSVersion))"
    exit 1
}
Write-Ok "PowerShell $($PSVersionTable.PSVersion)"

# ── Detect Project Root ─────────────────────────────────────

if ($ScriptDir -match '[\\/]node_modules[\\/]agentvibes$') {
    $ProjectRoot = (Resolve-Path (Join-Path $ScriptDir "..\..")).Path
    Write-Ok "Detected npm package in: $ProjectRoot"
} else {
    $ProjectRoot = $ScriptDir
    Write-Ok "Project root: $ProjectRoot"
}

# ── Setup Directories ───────────────────────────────────────

Write-Section "Setting Up Directories"

Write-Host "    These directories store AgentVibes config and data:" -ForegroundColor Gray
Write-Host ""

$ProjectClaudeDir = "$ProjectRoot\.claude"
$HooksDir = "$ProjectClaudeDir\hooks-windows"
$UserClaudeDir = "$env:USERPROFILE\.claude"
$AudioDir = "$UserClaudeDir\audio"
$VoicesDir = "$UserClaudeDir\piper-voices"
$PiperDir = "$env:LOCALAPPDATA\Programs\Piper"
$PiperExe = "$PiperDir\piper.exe"

# Directory info: path, description, category
$DirInfo = @(
    @{ Path = $ProjectClaudeDir; Desc = "Project settings and hooks config"; Cat = "Project" },
    @{ Path = $HooksDir; Desc = "PowerShell TTS hook scripts"; Cat = "Project" },
    @{ Path = $UserClaudeDir; Desc = "Global AgentVibes configuration"; Cat = "User Profile" },
    @{ Path = $AudioDir; Desc = "TTS audio file cache"; Cat = "User Profile" },
    @{ Path = $VoicesDir; Desc = "Piper voice model files"; Cat = "User Profile" },
    @{ Path = $PiperDir; Desc = "Piper TTS engine binary"; Cat = "Applications" }
)

$CurrentCat = ""
foreach ($entry in $DirInfo) {
    if ($entry.Cat -ne $CurrentCat) {
        if ($CurrentCat -ne "") { Write-Host "" }
        Write-Host "    $($entry.Cat)" -ForegroundColor Cyan
        $CurrentCat = $entry.Cat
    }

    $dir = $entry.Path
    $existed = Test-Path $dir
    if (-not $existed) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }

    # Show relative path where possible
    $displayPath = $dir
    if ($dir.StartsWith($ProjectRoot)) {
        $displayPath = $dir.Substring($ProjectRoot.Length + 1)
    } elseif ($dir.StartsWith($env:USERPROFILE)) {
        $displayPath = "~" + $dir.Substring($env:USERPROFILE.Length)
    } elseif ($dir.StartsWith($env:LOCALAPPDATA)) {
        $displayPath = "%LOCALAPPDATA%" + $dir.Substring($env:LOCALAPPDATA.Length)
    }

    $status = if ($existed) { "[OK]" } else { "[OK]" }
    $action = if ($existed) { "exists" } else { "created" }

    Write-Host "      $status " -ForegroundColor Green -NoNewline
    Write-Host $displayPath.PadRight(32) -ForegroundColor White -NoNewline
    Write-Host $entry.Desc -ForegroundColor DarkGray
}

# ── Install Hook Scripts ────────────────────────────────────

Write-Section "Installing TTS Scripts"

Write-Host "    These scripts enable Claude Code to speak on Windows:" -ForegroundColor Gray
Write-Host ""

$SourceHooksDir = Join-Path $ScriptDir ".claude\hooks-windows"

# Validate source path is within the script directory (path traversal prevention)
$ResolvedSource = (Resolve-Path -Path $SourceHooksDir -ErrorAction SilentlyContinue).Path
$ResolvedScript = (Resolve-Path -Path $ScriptDir).Path

if (-not $ResolvedSource -or -not $ResolvedSource.StartsWith($ResolvedScript)) {
    Write-Err "Hook scripts source path is outside the project directory"
    exit 1
}

if (-not (Test-Path $SourceHooksDir)) {
    Write-Err "Hook scripts not found at: $SourceHooksDir"
    Write-Info "Make sure you're running this from the AgentVibes project directory"
    exit 1
}

# Ensure destination hooks directory exists
if (-not (Test-Path $HooksDir)) {
    New-Item -ItemType Directory -Path $HooksDir -Force | Out-Null
}

# Script info: filename, description
$HookScriptInfo = @(
    @{ Name = "play-tts.ps1"; Desc = "Main TTS router - dispatches to active provider" },
    @{ Name = "play-tts-soprano.ps1"; Desc = "Soprano neural voice provider (fastest)" },
    @{ Name = "play-tts-windows-piper.ps1"; Desc = "Piper offline neural voice provider" },
    @{ Name = "play-tts-windows-sapi.ps1"; Desc = "Windows built-in SAPI voice provider" },
    @{ Name = "provider-manager.ps1"; Desc = "Switch between TTS providers" },
    @{ Name = "voice-manager-windows.ps1"; Desc = "Browse and select voice models" },
    @{ Name = "audio-cache-utils.ps1"; Desc = "Manage TTS audio file cache" },
    @{ Name = "session-start-tts.ps1"; Desc = "Auto-activates TTS when Claude starts" }
)

$CopiedCount = 0
foreach ($info in $HookScriptInfo) {
    $script = $info.Name
    $SourceFile = Join-Path $SourceHooksDir $script
    $DestFile = Join-Path $HooksDir $script

    if (Test-Path $SourceFile) {
        # Skip if source and destination are the same file (running from project root)
        $resolvedSrc = (Resolve-Path $SourceFile).Path
        $resolvedDst = if (Test-Path $DestFile) { (Resolve-Path $DestFile).Path } else { "" }
        if ($resolvedSrc -eq $resolvedDst) {
            Write-Item "[OK]" $script $info.Desc
        } else {
            Copy-Item -Path $SourceFile -Destination $DestFile -Force
            Write-Item "[OK]" $script $info.Desc
        }
        $CopiedCount++
    }
    else {
        Write-Host "    [!!] " -ForegroundColor Yellow -NoNewline
        Write-Host "$($script.PadRight(30))" -ForegroundColor White -NoNewline
        Write-Host "not found" -ForegroundColor Yellow
    }
}

if ($CopiedCount -eq 0) {
    Write-Err "No hook scripts were installed"
    exit 1
}

Write-Host ""
Write-Host "    Location: " -ForegroundColor Gray -NoNewline
Write-Host ".claude\hooks-windows\" -ForegroundColor Cyan
Write-Ok "Installed $CopiedCount TTS scripts"

# ── Provider Selection ──────────────────────────────────────

Write-Section "Choose Your TTS Provider"

# Check if pip is available
$PipAvailable = $false
try {
    $pipTest = & pip --version 2>$null
    if ($pipTest) { $PipAvailable = $true }
} catch {}

# Check Soprano availability
$SopranoAvailable = $false
try {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:7860/api/predict" `
        -Method POST -UseBasicParsing -TimeoutSec 2 `
        -ContentType "application/json" `
        -Body '{"data":["test",1.0],"fn_index":0}' `
        -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) { $SopranoAvailable = $true }
} catch {}

# Check if pip has soprano-tts (only if pip is available)
$SopranoInstalled = $false
if ($PipAvailable) {
    try {
        $pipResult = & pip show soprano-tts 2>$null
        if ($pipResult) { $SopranoInstalled = $true }
    } catch {}
}

if (-not $Provider) {
    Write-Host "    [1] Soprano  (Best Quality)" -ForegroundColor White
    Write-Host "        Ultra-fast neural TTS, 80M parameter model" -ForegroundColor DarkGray
    if ($SopranoAvailable) {
        Write-Host "        Status: " -ForegroundColor DarkGray -NoNewline
        Write-Host "Running on port 7860" -ForegroundColor Green
    } elseif ($SopranoInstalled) {
        Write-Host "        Status: " -ForegroundColor DarkGray -NoNewline
        Write-Host "Installed (not running)" -ForegroundColor Yellow
    } else {
        Write-Host "        Requires: pip install soprano-tts" -ForegroundColor DarkGray
    }
    Write-Host ""

    Write-Host "    [2] Piper  (Recommended Offline)" -ForegroundColor White
    Write-Host "        High quality neural voices, works fully offline" -ForegroundColor DarkGray
    if (Test-Path $PiperExe) {
        Write-Host "        Status: " -ForegroundColor DarkGray -NoNewline
        Write-Host "Installed" -ForegroundColor Green
    } else {
        Write-Host "        Downloads: ~100MB (piper.exe + voice model)" -ForegroundColor DarkGray
    }
    Write-Host ""

    Write-Host "    [3] Windows SAPI  (Zero Setup)" -ForegroundColor White
    Write-Host "        Built-in Windows voices (David, Zira, Mark)" -ForegroundColor DarkGray
    Write-Host "        No download required" -ForegroundColor DarkGray
    Write-Host ""

    $choice = Read-Host "    Enter choice (1-3, default: 1)"

    switch ($choice) {
        "2" { $Provider = "piper" }
        "3" { $Provider = "sapi" }
        default { $Provider = "soprano" }
    }
}

$ProviderDisplayName = switch ($Provider) {
    "soprano" { "Soprano TTS" }
    "piper" { "Piper TTS" }
    "sapi" { "Windows SAPI" }
}

Write-Host ""
Write-Ok "Selected: $ProviderDisplayName"

# ── Install Soprano if selected ─────────────────────────────

if ($Provider -eq "soprano") {
    Write-Section "Soprano Setup"

    if ($SopranoAvailable) {
        Write-Ok "Soprano server running on port 7860"
    } elseif ($SopranoInstalled) {
        Write-Warn "Soprano is installed but not running"
        Write-Info "Start it with: soprano-tts --share"
        Write-Info "Or run it in WSL and forward port 7860"
    } else {
        Write-Warn "Soprano TTS not detected"
        Write-Host ""

        if (-not $PipAvailable) {
            Write-Error "pip is not available on this system"
            Write-Info "Please install Python 3 with pip, then run:"
            Write-Host "      pip install soprano-tts" -ForegroundColor Cyan
            Write-Host ""
        } else {
            # Offer to install Soprano
            $installChoice = Read-Host "Would you like to install Soprano now? (y/n, default: y)"

            if ($installChoice -eq "" -or $installChoice -eq "y" -or $installChoice -eq "Y") {
                Write-Info "Installing Soprano TTS..."
                Write-Host ""

                try {
                    & pip install soprano-tts 2>&1 | Tee-Object -Variable pipOutput | Write-Host

                    # Re-check if installation succeeded
                    $SopranoInstalled = $false
                    try {
                        $pipResult = & pip show soprano-tts 2>$null
                        if ($pipResult) { $SopranoInstalled = $true }
                    } catch {}

                    if ($SopranoInstalled) {
                        Write-Ok "Soprano TTS installed successfully!"
                        Write-Info "Start it with: soprano-tts --share"
                    } else {
                        Write-Error "Installation may have failed. Please check the output above."
                        Write-Info "You can try installing manually: pip install soprano-tts"
                    }
                } catch {
                    Write-Error "Installation failed: $_"
                    Write-Info "Please install manually: pip install soprano-tts"
                }
            } else {
                Write-Host ""
                Write-Host "    To install Soprano manually:" -ForegroundColor White
                Write-Host "      pip install soprano-tts" -ForegroundColor Cyan
                Write-Host ""
                Write-Host "    Or use Soprano in WSL with port forwarding:" -ForegroundColor White
                Write-Host "      ssh -L 7860:localhost:7860 your-wsl-host" -ForegroundColor Cyan
                Write-Host ""
                Write-Info "AgentVibes will work once Soprano is accessible on port 7860"
            }
        }
    }
}

# ── Install Piper if selected ───────────────────────────────

if ($Provider -eq "piper") {
    Write-Section "Piper Installation"

    if (Test-Path $PiperExe) {
        Write-Ok "Piper already installed at: $PiperDir"
    }
    else {
        Write-Host "    Downloading Piper TTS engine from GitHub..." -ForegroundColor White

        $DownloadUrl = "https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_windows_amd64.zip"
        $DownloadFile = "$env:TEMP\piper-windows.zip"

        try {
            Write-Info $DownloadUrl

            [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
            Invoke-WebRequest -Uri $DownloadUrl -OutFile $DownloadFile -UseBasicParsing -ErrorAction Stop

            Write-Ok "Downloaded ($('{0:N2}' -f ((Get-Item $DownloadFile).Length / 1MB)) MB)"

            Write-Host "    Extracting..." -ForegroundColor Gray
            $TempExtractDir = "$env:TEMP\piper-extract"
            Remove-Item -Path $TempExtractDir -Recurse -Force -ErrorAction SilentlyContinue
            Expand-Archive -Path $DownloadFile -DestinationPath $TempExtractDir -Force

            # Find piper.exe recursively
            $PiperFound = Get-ChildItem -Path $TempExtractDir -Name "piper.exe" -Recurse

            if ($PiperFound) {
                $PiperExePath = (Get-ChildItem -Path $TempExtractDir -Filter "piper.exe" -Recurse).FullName | Select-Object -First 1
                $PiperSourceDir = Split-Path -Parent $PiperExePath

                Copy-Item -Path "$PiperSourceDir\*" -Destination $PiperDir -Recurse -Force

                if (Test-Path $PiperExe) {
                    Write-Ok "Piper installed to: $PiperDir"
                }
                else {
                    throw "Failed to copy Piper executable"
                }
            }
            else {
                throw "piper.exe not found in extracted files"
            }

            # Cleanup
            Remove-Item -Path $TempExtractDir -Recurse -Force -ErrorAction SilentlyContinue
            Remove-Item $DownloadFile -Force -ErrorAction SilentlyContinue
        }
        catch {
            Write-Err "Failed to install Piper: $_"
            Write-Info "Please check your internet connection and try again"
            exit 1
        }
    }

    # Download default voice
    Write-Host ""
    Write-Host "    Setting up default voice model..." -ForegroundColor White

    $DefaultVoice = "en_US-ryan-high"
    $VoiceDir = $VoicesDir

    if ((Test-Path "$VoiceDir\$DefaultVoice.onnx") -and (Test-Path "$VoiceDir\$DefaultVoice.onnx.json")) {
        Write-Ok "Default voice ($DefaultVoice) already downloaded"
    }
    else {
        Write-Host "    Downloading $DefaultVoice..." -ForegroundColor Gray

        try {
            $HFBase = "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/ryan/high"

            [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

            Write-Host "    Downloading model file..." -ForegroundColor Gray
            Invoke-WebRequest -Uri "$HFBase/$DefaultVoice.onnx" `
                -OutFile "$VoiceDir\$DefaultVoice.onnx" `
                -UseBasicParsing -ErrorAction Stop

            Write-Host "    Downloading config file..." -ForegroundColor Gray
            Invoke-WebRequest -Uri "$HFBase/$DefaultVoice.onnx.json" `
                -OutFile "$VoiceDir\$DefaultVoice.onnx.json" `
                -UseBasicParsing -ErrorAction Stop

            Write-Ok "Voice model downloaded: $DefaultVoice"
        }
        catch {
            Write-Warn "Could not download voice: $_"
            Write-Info "You can download voices manually later"
        }
    }
}

# ── Set Active Provider ─────────────────────────────────────

Write-Section "Configuring Provider"

$ProviderFile = "$ProjectClaudeDir\tts-provider.txt"
$ProviderName = switch ($Provider) {
    "soprano" { "soprano" }
    "piper" { "windows-piper" }
    "sapi" { "windows-sapi" }
}

Set-Content -Path $ProviderFile -Value $ProviderName -NoNewline
Write-Ok "Active provider set to: $ProviderName"
Write-Info "Config file: .claude\tts-provider.txt"

# ── Background Music Selection ─────────────────────────

Write-Section "Background Music"

Write-Host "    Play background music under TTS voice output?" -ForegroundColor Gray
Write-Host "    Requires ffmpeg (mixing voice + music)." -ForegroundColor DarkGray
Write-Host ""

# Check ffmpeg availability
$HasFfmpeg = $false
try {
    $null = Get-Command ffmpeg -ErrorAction Stop
    $HasFfmpeg = $true
} catch {}

$BgMusicEnabled = $false
$BgMusicTrack = "agent_vibes_bachata_v1_loop.mp3"
$BgMusicDisplayName = "Off"

if (-not $HasFfmpeg) {
    Write-Warn "ffmpeg not found - background music requires ffmpeg"
    Write-Info "Install ffmpeg and re-run setup to enable background music"
} else {
    Write-Host "    [1] Yes - Enable background music (Recommended)" -ForegroundColor White
    Write-Host "    [2] No  - Voice only" -ForegroundColor White
    Write-Host ""

    $bgChoice = Read-Host "    Enter choice (1-2, default: 1)"

    if ($bgChoice -eq "2") {
        $BgMusicEnabled = $false
        $BgMusicDisplayName = "Off"
        Write-Host ""
        Write-Ok "Background music: Disabled"
    } else {
        $BgMusicEnabled = $true

        # Track list with filenames and display info
        $Tracks = @(
            @{ File = "agentvibes_soft_flamenco_loop.mp3";                  Name = "Soft Flamenco";       Desc = "Spanish guitar" },
            @{ File = "agent_vibes_bachata_v1_loop.mp3";                    Name = "Bachata";             Desc = "Latin rhythm" },
            @{ File = "agent_vibes_bossa_nova_v2_loop.mp3";                 Name = "Bossa Nova";          Desc = "Brazilian jazz" },
            @{ File = "agent_vibes_salsa_v2_loop.mp3";                      Name = "Salsa";               Desc = "Latin dance" },
            @{ File = "agent_vibes_cumbia_v1_loop.mp3";                     Name = "Cumbia";              Desc = "Colombian folk" },
            @{ File = "agent_vibes_japanese_city_pop_v1_loop.mp3";          Name = "Japanese City Pop";   Desc = "80s synth" },
            @{ File = "agent_vibes_chillwave_v2_loop.mp3";                  Name = "Chillwave";           Desc = "Electronic ambient" },
            @{ File = "dreamy_house_loop.mp3";                              Name = "Dreamy House";        Desc = "Electronic dance" },
            @{ File = "agent_vibes_dark_chill_step_loop.mp3";               Name = "Dark Chill Step";     Desc = "Electronic bass" },
            @{ File = "agent_vibes_goa_trance_v2_loop.mp3";                Name = "Goa Trance";          Desc = "Psychedelic electronic" },
            @{ File = "agent_vibes_harpsichord_v2_loop.mp3";               Name = "Harpsichord";         Desc = "Baroque classical" },
            @{ File = "agent_vibes_celtic_harp_v1_loop.mp3";               Name = "Celtic Harp";         Desc = "Irish traditional" },
            @{ File = "agent_vibes_hawaiian_slack_key_guitar_v2_loop.mp3";  Name = "Hawaiian Slack Key";  Desc = "Island guitar" },
            @{ File = "agent_vibes_arabic_v2_loop.mp3";                     Name = "Arabic Oud";          Desc = "Middle Eastern" },
            @{ File = "agent_vibes_ganawa_ambient_v2_loop.mp3";             Name = "Gnawa Ambient";       Desc = "North African" },
            @{ File = "agent_vibes_tabla_dream_pop_v1_loop.mp3";            Name = "Tabla Dream Pop";     Desc = "Indian percussion" }
        )

        Write-Host ""
        Write-Host "    Choose a background music genre:" -ForegroundColor White
        Write-Host ""

        for ($i = 0; $i -lt $Tracks.Count; $i++) {
            $num = ($i + 1).ToString().PadLeft(2)
            $trackName = $Tracks[$i].Name.PadRight(22)
            Write-Host "    [$num] " -ForegroundColor White -NoNewline
            Write-Host $trackName -ForegroundColor Cyan -NoNewline
            Write-Host $Tracks[$i].Desc -ForegroundColor DarkGray
        }

        Write-Host ""
        $trackChoice = Read-Host "    Enter choice (1-16, default: 2)"

        $trackIndex = 1  # default to Bachata (index 1)
        if ($trackChoice -match '^\d+$') {
            $parsed = [int]$trackChoice
            if ($parsed -ge 1 -and $parsed -le $Tracks.Count) {
                $trackIndex = $parsed - 1
            }
        }

        $BgMusicTrack = $Tracks[$trackIndex].File
        $BgMusicDisplayName = $Tracks[$trackIndex].Name

        Write-Host ""
        Write-Ok "Background music: $BgMusicDisplayName"
    }
}

# Write background music config
$ConfigDir = "$ProjectClaudeDir\config"
if (-not (Test-Path $ConfigDir)) {
    New-Item -ItemType Directory -Path $ConfigDir -Force | Out-Null
}

$bgEnabledValue = if ($BgMusicEnabled) { "true" } else { "false" }
Set-Content -Path "$ConfigDir\background-music-enabled.txt" -Value $bgEnabledValue -NoNewline
Set-Content -Path "$ConfigDir\background-music-default.txt" -Value $BgMusicTrack -NoNewline
Set-Content -Path "$ConfigDir\background-music-volume.txt" -Value "0.10" -NoNewline

# ── Audio Effects (Reverb) ─────────────────────────────

Write-Section "Audio Effects"

Write-Host "    Add reverb effect to voice output?" -ForegroundColor Gray
Write-Host ""

$ReverbLevel = "off"
$ReverbDisplayName = "Off"

if (-not $HasFfmpeg) {
    Write-Warn "ffmpeg not found - reverb requires ffmpeg"
    Write-Info "Install ffmpeg and re-run setup to enable reverb"
} else {
    Write-Host "    [1] Off          Dry, no reverb" -ForegroundColor White
    Write-Host "    [2] Light        Small room (Recommended)" -ForegroundColor White
    Write-Host "    [3] Medium       Conference room" -ForegroundColor White
    Write-Host "    [4] Heavy        Large hall" -ForegroundColor White
    Write-Host "    [5] Cathedral    Epic space" -ForegroundColor White
    Write-Host ""

    $reverbChoice = Read-Host "    Enter choice (1-5, default: 2)"

    switch ($reverbChoice) {
        "1" { $ReverbLevel = "off";        $ReverbDisplayName = "Off" }
        "3" { $ReverbLevel = "medium";     $ReverbDisplayName = "Medium" }
        "4" { $ReverbLevel = "heavy";      $ReverbDisplayName = "Heavy" }
        "5" { $ReverbLevel = "cathedral";  $ReverbDisplayName = "Cathedral" }
        default { $ReverbLevel = "light";  $ReverbDisplayName = "Light" }
    }

    Write-Host ""
    Write-Ok "Reverb: $ReverbDisplayName"
}

# Write reverb config
Set-Content -Path "$ConfigDir\reverb-level.txt" -Value $ReverbLevel -NoNewline

# ── Verbosity / Transparency ──────────────────────────

Write-Section "TTS Verbosity"

Write-Host "    How much should Claude speak during interactions?" -ForegroundColor Gray
Write-Host ""

Write-Host "    [1] High         Full reasoning, decisions, trade-offs" -ForegroundColor White
Write-Host "    [2] Medium       Key updates and acknowledgments" -ForegroundColor White
Write-Host "    [3] Low          Only essential messages" -ForegroundColor White
Write-Host ""

$verbChoice = Read-Host "    Enter choice (1-3, default: 1)"

$VerbosityLevel = "high"
$VerbosityDisplayName = "High"

switch ($verbChoice) {
    "2" { $VerbosityLevel = "medium"; $VerbosityDisplayName = "Medium" }
    "3" { $VerbosityLevel = "low";    $VerbosityDisplayName = "Low" }
    default { $VerbosityLevel = "high"; $VerbosityDisplayName = "High" }
}

Write-Host ""
Write-Ok "Verbosity: $VerbosityDisplayName"

# Write verbosity config
Set-Content -Path "$ProjectClaudeDir\tts-verbosity.txt" -Value $VerbosityLevel -NoNewline

# ── Test TTS ────────────────────────────────────────────────

Write-Section "Testing TTS"

Write-Host "    Running a quick TTS test..." -ForegroundColor Gray
Write-Host ""

$TestMessage = "Agent Vibes here. Setup complete, ready to speak on Windows."

try {
    switch ($Provider) {
        "soprano" {
            if ($SopranoAvailable) {
                & "$HooksDir\play-tts-soprano.ps1" $TestMessage | Out-Null
                Write-Ok "Soprano TTS is working"
            } else {
                Write-Warn "Soprano not running - skipping audio test"
                Write-Info "Start Soprano, then test with:"
                Write-Info ".\.claude\hooks-windows\play-tts.ps1 'Hello'"
            }
        }
        "piper" {
            & "$HooksDir\play-tts-windows-piper.ps1" $TestMessage | Out-Null
            Write-Ok "Piper TTS is working"
        }
        "sapi" {
            & "$HooksDir\play-tts-windows-sapi.ps1" $TestMessage | Out-Null
            Write-Ok "Windows SAPI is working"
        }
    }
}
catch {
    Write-Warn "TTS test failed: $_"
    Write-Info "AgentVibes should still work - check troubleshooting in WINDOWS-SETUP.md"
}

# ── Completion ──────────────────────────────────────────────

Write-Host ""
Write-BoxTop
Write-BoxEmpty
Write-BoxLine "   Setup Complete!" "Green"
Write-BoxEmpty
Write-BoxLine "   Provider:    $ProviderDisplayName" "White"
Write-BoxLine "   Background:  $BgMusicDisplayName" "White"
Write-BoxLine "   Reverb:      $ReverbDisplayName" "White"
Write-BoxLine "   Verbosity:   $VerbosityDisplayName" "White"
Write-BoxLine "   Version:     $Version" "DarkGray"
Write-BoxEmpty
Write-BoxBottom

Write-Host ""
Write-Host "  Quick Start Commands:" -ForegroundColor Cyan
Write-Host ""
Write-Host "    Test TTS" -ForegroundColor White
Write-Host "    .\.claude\hooks-windows\play-tts.ps1 ""Hello from AgentVibes""" -ForegroundColor Gray
Write-Host ""
Write-Host "    List voices" -ForegroundColor White
Write-Host "    .\.claude\hooks-windows\voice-manager-windows.ps1 list" -ForegroundColor Gray
Write-Host ""
Write-Host "    Switch provider" -ForegroundColor White
Write-Host "    .\.claude\hooks-windows\provider-manager.ps1 set soprano" -ForegroundColor Gray
Write-Host ""
Write-Host "    List providers" -ForegroundColor White
Write-Host "    .\.claude\hooks-windows\provider-manager.ps1 list" -ForegroundColor Gray
Write-Host ""

Write-Host "  Documentation:" -ForegroundColor Cyan
Write-Host "    Setup Guide:  WINDOWS-SETUP.md" -ForegroundColor Gray
Write-Host ""

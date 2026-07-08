#
# File: .claude/hooks-windows/provider-manager.ps1
#
# AgentVibes - Windows TTS Provider Management
#

param(
    [Parameter(Position = 0)]
    [ValidateSet('get', 'set', 'list', 'switch')]
    [string]$Command = 'get',

    [Parameter(Position = 1)]
    [string]$Provider
)

$ClaudeDir = "$env:USERPROFILE\.claude"
$ProviderFile = "$ClaudeDir\tts-provider.txt"
# kokoro is cross-platform (play-tts-kokoro.ps1 exists) and canonically supported
# (SUPPORTED_PROVIDERS in src/utils/provider-validator.js). See AVI-S8.1.
$ValidProviders = @('windows-piper', 'windows-sapi', 'soprano', 'kokoro')

# Ensure claude directory exists
if (-not (Test-Path $ClaudeDir)) {
    New-Item -ItemType Directory -Path $ClaudeDir -Force | Out-Null
}

function Get-ActiveProvider {
    if (Test-Path $ProviderFile) {
        $provider = Get-Content $ProviderFile -Raw
        return $provider.Trim()
    }

    # Default to SAPI (zero dependencies)
    return "windows-sapi"
}

function Get-AvailableProviders {
    $available = @()

    # Always available
    $available += @{
        name = "windows-sapi"
        description = "Windows SAPI (Built-in, No Installation)"
        installed = $true
    }

    # Check if Piper is installed
    $piperExe = "$env:LOCALAPPDATA\Programs\Piper\piper.exe"
    $piperInstalled = Test-Path $piperExe

    $available += @{
        name = "windows-piper"
        description = "Windows Piper (High Quality, Requires Installation)"
        installed = $piperInstalled
    }

    # Check if Soprano is installed
    $sopranoInstalled = $false
    $sopranoPort = if ($env:SOPRANO_PORT) { $env:SOPRANO_PORT } else { "7860" }
    try {
        $null = Get-Command soprano -ErrorAction Stop
        $sopranoInstalled = $true
    } catch {
        # Also check if a Soprano server is running (try both API paths)
        try {
            $null = Invoke-WebRequest -Uri "http://127.0.0.1:${sopranoPort}/gradio_api/info" -TimeoutSec 1 -UseBasicParsing -ErrorAction Stop
            $sopranoInstalled = $true
        } catch {
            try {
                $null = Invoke-WebRequest -Uri "http://127.0.0.1:${sopranoPort}/info" -TimeoutSec 1 -UseBasicParsing -ErrorAction Stop
                $sopranoInstalled = $true
            } catch {}
        }
    }

    $available += @{
        name = "soprano"
        description = "Soprano TTS (Ultra-fast Neural, pip install soprano-tts)"
        installed = $sopranoInstalled
    }

    # Check if Kokoro is installed. Mirror validateKokoroInstallation() in
    # src/utils/provider-validator.js, but use importlib.util.find_spec so we do
    # NOT actually import kokoro — importing the 82M-param neural lib takes
    # several seconds and would make `provider list` hang (AVI-S8.1). find_spec
    # only confirms the packages are importable, which is all we need here.
    $kokoroInstalled = $false
    $kokoroProbe = "import importlib.util as u,sys; sys.exit(0 if all(u.find_spec(m) for m in ('kokoro','soundfile','numpy')) else 1)"
    foreach ($py in @('py', 'python', 'python3')) {
        if (-not (Get-Command $py -ErrorAction SilentlyContinue)) { continue }
        try {
            $null = & $py -c $kokoroProbe 2>$null
            if ($LASTEXITCODE -eq 0) { $kokoroInstalled = $true }
            break  # first interpreter on PATH is authoritative; don't probe the rest
        } catch {
            # interpreter present but failed to run the probe — try next
        }
    }

    $available += @{
        name = "kokoro"
        description = "Kokoro TTS (Neural, pip install kokoro-onnx soundfile numpy)"
        installed = $kokoroInstalled
    }

    return $available
}

function Set-ActiveProvider {
    param([string]$NewProvider)

    if ($NewProvider -notin $ValidProviders) {
        Write-Host "[ERROR] Invalid provider: $NewProvider" -ForegroundColor Red
        Write-Host "Available providers:" -ForegroundColor Yellow
        Get-AvailableProviders | ForEach-Object {
            $status = if ($_.installed) { "[OK]" } else { "[INSTALL]" }
            Write-Host "  $status $($_.name) - $($_.description)"
        }
        return $false
    }

    # If trying to set piper, check if installed
    if ($NewProvider -eq "windows-piper") {
        $piperExe = "$env:LOCALAPPDATA\Programs\Piper\piper.exe"
        if (-not (Test-Path $piperExe)) {
            Write-Host "[WARNING] Piper not installed at: $piperExe" -ForegroundColor Yellow
            Write-Host "Run: .\setup-windows.ps1 to install Piper" -ForegroundColor Yellow
            return $false
        }
    }

    Set-Content -Path $ProviderFile -Value $NewProvider
    Write-Host "[OK] Provider set to: $NewProvider" -ForegroundColor Green
    return $true
}

function List-Providers {
    Write-Host ""
    Write-Host "Available TTS Providers:" -ForegroundColor Cyan
    Write-Host ""

    Get-AvailableProviders | ForEach-Object {
        $status = if ($_.installed) { "[READY]" } else { "[INSTALL]" }
        Write-Host "$status  $($_.name)" -ForegroundColor $(if ($_.installed) { "Green" } else { "Yellow" })
        Write-Host "     $($_.description)" -ForegroundColor Gray
        Write-Host ""
    }

    $active = Get-ActiveProvider
    Write-Host "Currently Active: $active" -ForegroundColor Cyan
    Write-Host ""
}

# Main command routing
switch ($Command) {
    'get' {
        $active = Get-ActiveProvider
        Write-Host "[ACTIVE] TTS Provider: $active"
    }

    'set' {
        if (-not $Provider) {
            Write-Host "[ERROR] Provider name required" -ForegroundColor Red
            Write-Host "Usage: provider-manager.ps1 set PROVIDER_NAME" -ForegroundColor Yellow
            List-Providers
            exit 1
        }
        Set-ActiveProvider $Provider | Out-Null
    }

    'list' {
        List-Providers
    }

    'switch' {
        if (-not $Provider) {
            Write-Host "[ERROR] Provider name required" -ForegroundColor Red
            Write-Host "Usage: provider-manager.ps1 switch PROVIDER_NAME" -ForegroundColor Yellow
            List-Providers
            exit 1
        }
        Set-ActiveProvider $Provider | Out-Null
    }
}

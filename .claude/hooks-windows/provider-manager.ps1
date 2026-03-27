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
$ValidProviders = @('piper', 'windows-piper', 'sapi', 'windows-sapi', 'soprano')

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
    return "sapi"
}

function Get-AvailableProviders {
    $available = @()

    # Always available
    $available += @{
        name = "sapi"
        description = "Windows SAPI (Built-in, No Installation)"
        installed = $true
    }

    # Check if Piper is installed (standard location or PATH)
    $piperExe = "$env:LOCALAPPDATA\Programs\Piper\piper.exe"
    $piperInstalled = Test-Path $piperExe
    if (-not $piperInstalled) {
        $found = Get-Command piper.exe -ErrorAction SilentlyContinue
        $piperInstalled = $null -ne $found
    }

    $available += @{
        name = "piper"
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

    # If trying to set piper, check if installed (standard location or PATH)
    if ($NewProvider -eq "piper" -or $NewProvider -eq "windows-piper") {
        $piperExe = "$env:LOCALAPPDATA\Programs\Piper\piper.exe"
        $piperFound = (Test-Path $piperExe) -or ($null -ne (Get-Command piper.exe -ErrorAction SilentlyContinue))
        if (-not $piperFound) {
            Write-Host "[WARNING] Piper not installed. Not found at: $piperExe or in PATH" -ForegroundColor Yellow
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

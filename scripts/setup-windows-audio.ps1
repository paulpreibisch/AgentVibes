#Requires -Version 5.1

<#
.SYNOPSIS
    AgentVibes Remote Audio Setup Script for Windows

.DESCRIPTION
    Configures SSH client on Windows to tunnel audio from remote Linux servers.
    Sets up RemoteForward in SSH config to enable audio playback through WSL.

.PARAMETER RemoteHost
    The hostname or IP address of your remote server

.PARAMETER RemoteUser
    The username to use for SSH connection (defaults to current Windows username)

.PARAMETER TunnelPort
    The port to use for audio tunneling (default: 14713)

.PARAMETER SSHConfigPath
    Custom path to SSH config file (default: $HOME\.ssh\config)

.EXAMPLE
    .\setup-windows-audio.ps1 -RemoteHost "192.168.1.100"

.EXAMPLE
    .\setup-windows-audio.ps1 -RemoteHost "myserver.com" -RemoteUser "ubuntu" -TunnelPort 24713
#>

param(
    [Parameter(Mandatory=$true, HelpMessage="Remote server hostname or IP address")]
    [string]$RemoteHost,

    [Parameter(Mandatory=$false)]
    [string]$RemoteUser = $env:USERNAME,

    [Parameter(Mandatory=$false)]
    [int]$TunnelPort = 14713,

    [Parameter(Mandatory=$false)]
    [string]$SSHConfigPath = "$env:USERPROFILE\.ssh\config"
)

# Color functions for output
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

function Write-Success {
    param([string]$Message)
    Write-Host "✓ " -ForegroundColor Green -NoNewline
    Write-Host $Message
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠ " -ForegroundColor Yellow -NoNewline
    Write-Host $Message
}

function Write-Error {
    param([string]$Message)
    Write-Host "✗ " -ForegroundColor Red -NoNewline
    Write-Host $Message
}

function Write-Section {
    param([string]$Message)
    Write-Host "`n==> " -ForegroundColor Blue -NoNewline
    Write-Host $Message
}

# Header
Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Blue
Write-Host "║      AgentVibes Remote Audio Setup (Windows)              ║" -ForegroundColor Blue
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Blue

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
if (-not $isAdmin) {
    Write-Warning "Not running as Administrator. Some checks may be limited."
}

# Check for WSL
Write-Section "Checking system requirements"

$wslInstalled = $false
try {
    $wslVersion = wsl --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        $wslInstalled = $true
        Write-Success "WSL is installed"
    }
} catch {
    $wslInstalled = $false
}

if (-not $wslInstalled) {
    Write-Warning "WSL may not be installed or is not up to date"
    Write-Host "  For audio to work, you need WSL2 with GUI support (WSLg)"
    Write-Host "  Install or update WSL by running: wsl --update"
    Write-Host ""
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne 'y') {
        exit 1
    }
}

# Check for OpenSSH Client
$sshInstalled = Get-Command ssh -ErrorAction SilentlyContinue
if (-not $sshInstalled) {
    Write-Error "OpenSSH Client is not installed"
    Write-Host "  Please install OpenSSH Client:"
    Write-Host "  Settings > Apps > Optional Features > Add a feature > OpenSSH Client"
    Write-Host ""
    exit 1
}
Write-Success "OpenSSH Client is installed"

# Create .ssh directory if it doesn't exist
Write-Section "Preparing SSH configuration"

$sshDir = Split-Path -Parent $SSHConfigPath
if (-not (Test-Path $sshDir)) {
    New-Item -ItemType Directory -Path $sshDir -Force | Out-Null
    Write-Success "Created SSH directory: $sshDir"
} else {
    Write-Success "SSH directory exists: $sshDir"
}

# Backup existing SSH config
if (Test-Path $SSHConfigPath) {
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $backupPath = "$SSHConfigPath.backup.$timestamp"
    Copy-Item $SSHConfigPath $backupPath
    Write-Success "Backed up existing SSH config to: $backupPath"
}

# Generate a friendly host alias
$hostAlias = $RemoteHost -replace '[^a-zA-Z0-9-]', '-'
if ($hostAlias -match '^\d') {
    $hostAlias = "server-$hostAlias"
}

Write-Host "`nConfiguration details:" -ForegroundColor Cyan
Write-Host "  Host alias: $hostAlias"
Write-Host "  Remote host: $RemoteHost"
Write-Host "  Remote user: $RemoteUser"
Write-Host "  Tunnel port: $TunnelPort"
Write-Host ""

# Check if host already exists in SSH config
$configExists = $false
if (Test-Path $SSHConfigPath) {
    $existingConfig = Get-Content $SSHConfigPath -Raw
    if ($existingConfig -match "Host\s+$hostAlias\s") {
        $configExists = $true
        Write-Warning "Host '$hostAlias' already exists in SSH config"
        $overwrite = Read-Host "Do you want to update it? (y/n)"
        if ($overwrite -ne 'y') {
            Write-Host "Keeping existing configuration. Exiting."
            exit 0
        }
    }
}

# Create SSH config entry
Write-Section "Configuring SSH tunnel"

$sshConfigEntry = @"

# AgentVibes Remote Audio Configuration
# Generated on $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
Host $hostAlias
    HostName $RemoteHost
    User $RemoteUser
    Port 22
    RemoteForward $TunnelPort localhost:$TunnelPort
    ServerAliveInterval 30
    ServerAliveCountMax 3

"@

if ($configExists) {
    # Remove existing entry and add new one
    $existingConfig = Get-Content $SSHConfigPath -Raw
    $pattern = "(?ms)# AgentVibes Remote Audio Configuration.*?Host $hostAlias.*?(?=\n\nHost|\n\n# |\z)"
    $newConfig = $existingConfig -replace $pattern, ""
    $newConfig = $newConfig.TrimEnd() + "`n" + $sshConfigEntry
    Set-Content -Path $SSHConfigPath -Value $newConfig
    Write-Success "Updated SSH configuration for host '$hostAlias'"
} else {
    # Append new entry
    Add-Content -Path $SSHConfigPath -Value $sshConfigEntry
    Write-Success "Added SSH configuration for host '$hostAlias'"
}

# Test SSH connection (optional)
Write-Section "Connection Test"
Write-Host "You can test the connection by running:" -ForegroundColor Cyan
Write-Host "  ssh $hostAlias" -ForegroundColor Yellow
Write-Host ""

$testNow = Read-Host "Do you want to test the SSH connection now? (y/n)"
if ($testNow -eq 'y') {
    Write-Host "`nTesting connection to $RemoteHost..."
    Write-Host "(You may be prompted for password or to accept the host key)`n"

    # Test connection
    ssh -o ConnectTimeout=10 -o BatchMode=no "${RemoteUser}@${RemoteHost}" "echo 'Connection successful!'" 2>&1

    if ($LASTEXITCODE -eq 0) {
        Write-Success "Connection test successful!"
    } else {
        Write-Warning "Connection test failed. Please check your network and credentials."
    }
}

# Summary and next steps
Write-Section "Setup Summary"
Write-Host ""
Write-ColorOutput "✓ Configuration complete!" -Color Green
Write-Host ""
Write-Host "SSH Config file: $SSHConfigPath"
Write-Host "Host alias: $hostAlias"
Write-Host "Tunnel port: $TunnelPort"
Write-Host ""

Write-Section "Next Steps"
Write-Host ""
Write-Host "1. Make sure you've configured the remote Linux server" -ForegroundColor Cyan
Write-Host "   If not, run this on your remote server:"
Write-Host "   curl -O https://raw.githubusercontent.com/paulpreibisch/AgentVibes/master/scripts/setup-remote-audio.sh"
Write-Host "   chmod +x setup-remote-audio.sh"
Write-Host "   ./setup-remote-audio.sh"
Write-Host ""
Write-Host "2. Connect to your remote server:" -ForegroundColor Cyan
Write-Host "   ssh $hostAlias" -ForegroundColor Yellow
Write-Host ""
Write-Host "3. Once connected, test audio on the remote server:" -ForegroundColor Cyan
Write-Host "   echo `$PULSE_SERVER    # Should show tcp:localhost:$TunnelPort"
Write-Host "   pactl info            # Check PulseAudio connection"
Write-Host "   speaker-test -t sine -f 1000 -l 1    # Test audio playback"
Write-Host ""

Write-Section "VS Code Integration"
Write-Host ""
Write-Host "If you use VS Code with Remote-SSH extension:"
Write-Host "  1. Install Remote-SSH extension if not installed"
Write-Host "  2. Press F1 and search 'Remote-SSH: Connect to Host'"
Write-Host "  3. Select '$hostAlias'"
Write-Host "  4. The audio tunnel will be automatically established!"
Write-Host ""

Write-Section "Troubleshooting"
Write-Host ""
Write-Host "If audio doesn't work:"
Write-Host "  - Ensure WSL is up to date: " -NoNewline
Write-ColorOutput "wsl --update" -Color Yellow
Write-Host "  - Restart WSL: " -NoNewline
Write-ColorOutput "wsl --shutdown" -Color Yellow
Write-Host "  - Check Windows audio settings"
Write-Host "  - Verify SSH tunnel: " -NoNewline
Write-ColorOutput "ssh -v $hostAlias" -Color Yellow
Write-Host ""
Write-Host "For more help: https://github.com/paulpreibisch/AgentVibes/blob/master/docs/remote-audio-setup.md"
Write-Host ""

Write-Success "Setup completed successfully!"
Write-Host ""

#Requires -RunAsAdministrator
#
# AgentVibes SSH Receiver Setup (Windows)
# Run this in an ADMIN PowerShell:
#   powershell -ExecutionPolicy Bypass -File setup-ssh-receiver.ps1
#

Write-Host "`n=== AgentVibes SSH Receiver Setup ===" -ForegroundColor Cyan
Write-Host ""

$Username = $env:USERNAME
$TailscaleIp = ""
try {
    $TailscaleIp = (tailscale ip -4 2>$null).Trim()
} catch {}

if (-not $TailscaleIp) {
    Write-Host "WARNING: Tailscale not found. Install Tailscale first for secure setup." -ForegroundColor Yellow
    Write-Host "         Falling back to listen on all interfaces." -ForegroundColor Yellow
    $TailscaleIp = "0.0.0.0"
}

# Step 1: Stop sshd
Write-Host "[1/8] Stopping sshd..." -ForegroundColor Yellow
Stop-Service sshd -ErrorAction SilentlyContinue

# Step 2: Backup original config
Write-Host "[2/8] Backing up original sshd_config..." -ForegroundColor Yellow
$configPath = "C:\ProgramData\ssh\sshd_config"
$backupPath = "C:\ProgramData\ssh\sshd_config.bak"
if (Test-Path $configPath) {
    Copy-Item $configPath $backupPath -Force
    Write-Host "       Backup: $backupPath" -ForegroundColor Gray
}

# Step 3: Deploy hardened config with user-specific values
Write-Host "[3/8] Deploying hardened sshd_config..." -ForegroundColor Yellow
$hardenedConfig = Join-Path $PSScriptRoot "templates\sshd_config_hardened"
if (Test-Path $hardenedConfig) {
    $config = Get-Content $hardenedConfig -Raw
    $config = $config -replace 'YourUsername', $Username
    $config = $config -replace 'ListenAddress 0\.0\.0\.0', "ListenAddress $TailscaleIp"
    $receiverPath = "C:\Users\$Username\.agentvibes\play-remote.ps1"
    $config = $config -replace 'C:\\Users\\YourUsername\\\.agentvibes\\play-remote\.ps1', $receiverPath
    Set-Content -Path $configPath -Value $config
    Write-Host "       Port: 45123" -ForegroundColor Green
    Write-Host "       Listen: $TailscaleIp" -ForegroundColor Green
    Write-Host "       Auth: Key-only, no passwords" -ForegroundColor Green
    Write-Host "       ForceCommand: Receiver script only, no shell" -ForegroundColor Green
} else {
    Write-Host "       ERROR: $hardenedConfig not found!" -ForegroundColor Red
    exit 1
}

# Step 4: Install receiver script
Write-Host "[4/8] Installing receiver script..." -ForegroundColor Yellow
$agentvibesDir = "$env:USERPROFILE\.agentvibes"
if (-not (Test-Path $agentvibesDir)) {
    New-Item -ItemType Directory -Path $agentvibesDir -Force | Out-Null
}
$receiverSrc = Join-Path $PSScriptRoot "templates\agentvibes-receiver.ps1"
if (Test-Path $receiverSrc) {
    # Stamp the installing user's home path so the receiver can find hooks/config
    # even when sshd runs it as a different user (e.g. agentvibes-receiver)
    $content = Get-Content $receiverSrc -Raw
    $content = $content -replace '__OWNER_HOME__', $env:USERPROFILE
    Set-Content -Path "$agentvibesDir\play-remote.ps1" -Value $content
    Write-Host "       Installed to: $agentvibesDir\play-remote.ps1" -ForegroundColor Green
    Write-Host "       Owner home:   $env:USERPROFILE" -ForegroundColor Gray
}

# Step 5: Grant agentvibes-receiver read access to required paths
Write-Host "[5/8] Granting agentvibes-receiver permissions..." -ForegroundColor Yellow
$ReceiverUser = "agentvibes-receiver"
$userExists = Get-LocalUser -Name $ReceiverUser -ErrorAction SilentlyContinue
if ($userExists) {
    # Read+Execute on .agentvibes (plus Modify on tts-queue and receiver.log for writes)
    icacls "$agentvibesDir" /grant "${ReceiverUser}:(OI)(CI)RX" /T /Q 2>$null
    icacls "$agentvibesDir\tts-queue" /grant "${ReceiverUser}:(OI)(CI)M" /T /Q 2>$null
    if (Test-Path "$agentvibesDir\receiver.log") {
        icacls "$agentvibesDir\receiver.log" /grant "${ReceiverUser}:M" /Q 2>$null
    }
    # Read+Modify on .claude (hooks, config, voice files, audio output)
    $claudeDir = "$env:USERPROFILE\.claude"
    if (Test-Path $claudeDir) {
        icacls "$claudeDir" /grant "${ReceiverUser}:(OI)(CI)M" /T /Q 2>$null
    }
    # Read+Execute on Piper install
    $piperDir = "$env:LOCALAPPDATA\Programs\Piper"
    if (Test-Path $piperDir) {
        icacls "$piperDir" /grant "${ReceiverUser}:(OI)(CI)RX" /T /Q 2>$null
    }
    Write-Host "       Granted $ReceiverUser access to .agentvibes, .claude, Piper" -ForegroundColor Green
} else {
    Write-Host "       SKIP: $ReceiverUser user not found (create it first)" -ForegroundColor Yellow
}

# Step 6: Firewall rule
Write-Host "[6/8] Adding firewall rule for port 45123 (Tailscale only)..." -ForegroundColor Yellow
$existingRule = Get-NetFirewallRule -Name "AgentVibes-SSH-Receiver" -ErrorAction SilentlyContinue
if ($existingRule) {
    Remove-NetFirewallRule -Name "AgentVibes-SSH-Receiver"
}
New-NetFirewallRule -Name "AgentVibes-SSH-Receiver" `
    -DisplayName "AgentVibes SSH Receiver" `
    -Description "Allow AgentVibes TTS receiver on port 45123 from Tailscale only" `
    -Direction Inbound `
    -Protocol TCP `
    -LocalPort 45123 `
    -RemoteAddress 100.0.0.0/8 `
    -Action Allow | Out-Null
Write-Host "       Firewall: Allow TCP 45123 from 100.0.0.0/8 only" -ForegroundColor Green

# Step 7: Set up admin authorized keys
Write-Host "[7/8] Configuring authorized keys..." -ForegroundColor Yellow
$adminKeysFile = "C:\ProgramData\ssh\administrators_authorized_keys"
if (-not (Test-Path $adminKeysFile)) {
    Write-Host "       NOTE: No SSH keys found at $adminKeysFile" -ForegroundColor Yellow
    Write-Host "       Add your sender's public key there, then run:" -ForegroundColor Yellow
    Write-Host "       icacls `"$adminKeysFile`" /inheritance:r /grant `"SYSTEM:F`" /grant `"BUILTIN\Administrators:F`"" -ForegroundColor Cyan
} else {
    cmd /c "icacls `"$adminKeysFile`" /inheritance:r /grant `"SYSTEM:F`" /grant `"BUILTIN\Administrators:F`"" 2>$null
}
# Step 8: Start sshd
Write-Host "[8/8] Starting sshd..." -ForegroundColor Yellow
Start-Service sshd
$status = (Get-Service sshd).Status
if ($status -eq "Running") {
    Write-Host "       sshd: Running" -ForegroundColor Green
} else {
    Write-Host "       sshd: $status (check Event Viewer)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== Setup Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Security:" -ForegroundColor White
Write-Host "  Port:       45123" -ForegroundColor Gray
Write-Host "  Interface:  $TailscaleIp (Tailscale)" -ForegroundColor Gray
Write-Host "  Auth:       SSH key only" -ForegroundColor Gray
Write-Host "  Access:     Receiver script only (no shell)" -ForegroundColor Gray
Write-Host "  Firewall:   Tailscale IPs only (100.x.x.x)" -ForegroundColor Gray
Write-Host ""
Write-Host "To test from sender:" -ForegroundColor White
Write-Host "  echo `"hello`" | base64 | ssh -p 45123 $Username@$TailscaleIp" -ForegroundColor Cyan
Write-Host ""

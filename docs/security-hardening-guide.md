# Security Hardening Guide: Termux, SSH, and OpenClaw Deployment

⚠️ **CRITICAL SECURITY DISCLAIMER** ⚠️

**Running OpenClaw with AgentVibes on a remote server (cloud or self-hosted) with SSH access exposes your infrastructure to significant security risks. This guide provides hardening recommendations, but understand:**

- 🚨 **You are responsible** for securing your server, SSH access, and data
- 🚨 **No security is perfect** - these measures reduce risk but cannot eliminate it
- 🚨 **Exposing SSH to the internet** invites automated attacks (brute force, exploits)
- 🚨 **Compromised servers can lead to** data theft, ransomware, botnet recruitment, crypto mining
- 🚨 **Cloud costs can skyrocket** if your server is compromised and used for malicious activity
- 🚨 **Personal data at risk** - OpenClaw may handle sensitive conversations, API keys, credentials

**IF YOU ARE NOT COMFORTABLE WITH THESE RISKS, DO NOT PROCEED.**

**Recommended for:** Experienced sysadmins, security-conscious developers, users who understand Linux hardening

**Not recommended for:** Beginners, production environments handling sensitive data without professional security audit

---

## Table of Contents

1. [Threat Model](#threat-model)
2. [Defense-in-Depth Strategy](#defense-in-depth-strategy)
3. [SSH Hardening](#ssh-hardening)
4. [Firewall Configuration (UFW)](#firewall-configuration-ufw)
5. [VPN Access (Tailscale)](#vpn-access-tailscale)
6. [Intrusion Detection (Fail2Ban)](#intrusion-detection-fail2ban)
7. [File Integrity Monitoring (AIDE)](#file-integrity-monitoring-aide)
8. [Android/Termux Security](#androidtermux-security)
9. [OpenClaw Security Best Practices](#openclaw-security-best-practices)
10. [Monitoring & Incident Response](#monitoring--incident-response)
11. [Security Checklist](#security-checklist)

---

## Threat Model

**What are we protecting against?**

| Threat | Risk Level | Mitigation |
|--------|-----------|------------|
| **SSH Brute Force** | 🔴 CRITICAL | SSH key auth, Fail2Ban, rate limiting, Tailscale VPN |
| **Unpatched Vulnerabilities** | 🔴 CRITICAL | Regular updates, security monitoring |
| **Credential Theft** | 🟠 HIGH | No password auth, encrypted keys, environment isolation |
| **DoS/DDoS Attacks** | 🟠 HIGH | Rate limiting, Fail2Ban, Tailscale (hides public IP) |
| **Malicious Input via Messaging** | 🟡 MEDIUM | Input validation, sandboxing, resource limits |
| **Data Interception** | 🟡 MEDIUM | TLS/SSL, Tailscale encryption, SSH tunneling |
| **Supply Chain Attacks** | 🟡 MEDIUM | Verify package signatures, use official repos only |

---

## Defense-in-Depth Strategy

**Multiple layers of security:**

```
┌─────────────────────────────────────────────┐
│  Layer 1: Network Perimeter                │
│  - Tailscale VPN (hide SSH from internet)  │
│  - UFW Firewall (block all except needed)  │
└─────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────┐
│  Layer 2: Access Control                   │
│  - SSH key authentication (no passwords)   │
│  - Fail2Ban (auto-block brute force)       │
│  - Rate limiting (limit connection attempts)│
└─────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────┐
│  Layer 3: System Hardening                 │
│  - Minimal services (disable unused ports) │
│  - Regular updates (security patches)      │
│  - AIDE (detect unauthorized changes)      │
└─────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────┐
│  Layer 4: Application Security             │
│  - OpenClaw input validation               │
│  - AgentVibes sandboxing (Termux proot)    │
│  - Resource limits (prevent DoS)           │
└─────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────┐
│  Layer 5: Monitoring & Response            │
│  - Log monitoring (detect intrusions)      │
│  - Intrusion alerts (email/Telegram)       │
│  - Incident response plan                  │
└─────────────────────────────────────────────┘
```

---

## SSH Hardening

### 1. Disable Password Authentication (REQUIRED)

**Why:** Password-based SSH is vulnerable to brute force attacks. Use SSH keys only.

#### Generate SSH Key Pair (on your local machine)

```bash
# Generate ED25519 key (modern, secure)
ssh-keygen -t ed25519 -C "your-email@example.com" -f ~/.ssh/openclaw_server

# Set passphrase when prompted (adds extra layer of protection)
Enter passphrase (empty for no passphrase): [type strong passphrase]
```

#### Copy Public Key to Server

```bash
# Copy public key to server
ssh-copy-id -i ~/.ssh/openclaw_server.pub user@your-server

# Or manually:
cat ~/.ssh/openclaw_server.pub | ssh user@your-server "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
```

#### Configure SSH Client (on your local machine)

Add to `~/.ssh/config`:

```
Host openclaw-server
    HostName your-server-ip-or-domain
    User your-username
    IdentityFile ~/.ssh/openclaw_server
    IdentitiesOnly yes
    ServerAliveInterval 60
    ServerAliveCountMax 3
```

Now connect with: `ssh openclaw-server`

### 2. Harden SSH Server Configuration

Edit `/etc/ssh/sshd_config` on your server:

```bash
sudo nano /etc/ssh/sshd_config
```

**Required hardening settings:**

```bash
# Disable password authentication (CRITICAL)
PasswordAuthentication no
ChallengeResponseAuthentication no
UsePAM no

# Disable root login (CRITICAL)
PermitRootLogin no

# Use only strong key exchange algorithms
KexAlgorithms curve25519-sha256,curve25519-sha256@libssh.org,diffie-hellman-group16-sha512,diffie-hellman-group18-sha512

# Use only strong ciphers
Ciphers chacha20-poly1305@openssh.com,aes256-gcm@openssh.com,aes128-gcm@openssh.com,aes256-ctr,aes192-ctr,aes128-ctr

# Use only strong MACs
MACs hmac-sha2-512-etm@openssh.com,hmac-sha2-256-etm@openssh.com,hmac-sha2-512,hmac-sha2-256

# Limit authentication attempts
MaxAuthTries 3
MaxSessions 2

# Disable X11 forwarding (unless needed)
X11Forwarding no

# Disable TCP forwarding (unless needed for AgentVibes audio)
# NOTE: AgentVibes remote audio needs RemoteForward enabled
AllowTcpForwarding yes
GatewayPorts no

# Set login grace time (how long to authenticate)
LoginGraceTime 30

# Log more verbosely
LogLevel VERBOSE

# Whitelist specific users only (optional but recommended)
AllowUsers your-username

# Change default port (security through obscurity, not primary defense)
# Port 2222  # Uncomment to use non-standard port
```

**Restart SSH service:**

```bash
sudo systemctl restart sshd

# Verify it's running
sudo systemctl status sshd
```

⚠️ **IMPORTANT:** Test new SSH connection in a separate terminal BEFORE closing your current session! If you lock yourself out, you'll need console access.

---

## Firewall Configuration (UFW)

**UFW (Uncomplicated Firewall)** blocks all incoming traffic except what you explicitly allow.

### Install UFW

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y ufw

# Fedora/RHEL
sudo dnf install -y ufw
```

### Configure UFW Rules

```bash
# Default: deny all incoming, allow all outgoing
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH (default port 22)
sudo ufw allow 22/tcp comment 'SSH'

# If using custom SSH port (e.g., 2222):
# sudo ufw allow 2222/tcp comment 'SSH custom port'

# Allow PulseAudio reverse tunnel (for AgentVibes remote audio)
# NOTE: This is only accessible via SSH tunnel, not directly exposed
# No additional UFW rule needed - SSH tunnel handles it

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status verbose
```

**Expected output:**

```
Status: active
Logging: on (low)
Default: deny (incoming), allow (outgoing), disabled (routed)

To                         Action      From
--                         ------      ----
22/tcp                     ALLOW IN    Anywhere                   # SSH
22/tcp (v6)                ALLOW IN    Anywhere (v6)              # SSH
```

---

## VPN Access (Tailscale)

**Tailscale creates a private, encrypted mesh network** - your server is only accessible via your VPN, not the public internet.

### Why Use Tailscale?

✅ **Hide SSH from internet** - No public SSH port exposure
✅ **Zero-trust networking** - Only your devices can access the server
✅ **Encrypted traffic** - WireGuard encryption
✅ **No port forwarding** - Works behind NAT/firewalls
✅ **Free for personal use** - Up to 20 devices

### Install Tailscale

#### On Server (Linux)

```bash
# Install Tailscale
curl -fsSL https://tailscale.com/install.sh | sh

# Authenticate and connect
sudo tailscale up

# Get Tailscale IP
tailscale ip -4
```

#### On Android (Termux/Phone)

1. Install [Tailscale app from Google Play](https://play.google.com/store/apps/details?id=com.tailscale.ipn)
2. Log in with same account as server
3. Enable VPN connection

#### On Local Machine (Mac/Linux/Windows)

Download from https://tailscale.com/download

### Restrict SSH to Tailscale Network Only

**Edit `/etc/ssh/sshd_config`:**

```bash
# Only listen on Tailscale IP
ListenAddress 100.x.y.z  # Replace with your Tailscale IP from 'tailscale ip -4'
```

**Update UFW to only allow SSH from Tailscale:**

```bash
# Remove public SSH rule
sudo ufw delete allow 22/tcp

# Allow SSH only from Tailscale subnet
sudo ufw allow from 100.64.0.0/10 to any port 22 proto tcp comment 'SSH via Tailscale only'

# Reload UFW
sudo ufw reload
```

Now SSH is **ONLY accessible via Tailscale VPN** - invisible to internet scanners! 🔒

**Connect via Tailscale:**

```bash
ssh user@100.x.y.z  # Use Tailscale IP instead of public IP
```

---

## Intrusion Detection (Fail2Ban)

**Fail2Ban monitors logs and automatically bans IPs** with suspicious activity (brute force, port scanning).

### Install Fail2Ban

```bash
# Ubuntu/Debian
sudo apt-get install -y fail2ban

# Fedora/RHEL
sudo dnf install -y fail2ban

# Start and enable
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### Configure Fail2Ban for SSH

Create `/etc/fail2ban/jail.local`:

```bash
sudo nano /etc/fail2ban/jail.local
```

**Add configuration:**

```ini
[DEFAULT]
# Ban for 1 hour (3600 seconds)
bantime = 3600

# Monitor last 10 minutes of logs
findtime = 600

# Ban after 3 failed attempts
maxretry = 3

# Send email alerts (optional - configure email first)
# destemail = your-email@example.com
# sendername = Fail2Ban
# action = %(action_mwl)s

[sshd]
enabled = true
port = 22
# If using custom SSH port:
# port = 2222
logpath = /var/log/auth.log
# For RHEL/Fedora:
# logpath = /var/log/secure
maxretry = 3
bantime = 3600
```

**Restart Fail2Ban:**

```bash
sudo systemctl restart fail2ban

# Check status
sudo fail2ban-client status sshd
```

**Test Fail2Ban (optional):**

From another machine, try 3 failed SSH password attempts. Your IP should be banned:

```bash
sudo fail2ban-client status sshd
```

**Unban an IP manually:**

```bash
sudo fail2ban-client set sshd unbanip YOUR_IP
```

---

## File Integrity Monitoring (AIDE)

**AIDE (Advanced Intrusion Detection Environment)** detects unauthorized file changes (backdoors, malware, config tampering).

### Install AIDE

```bash
# Ubuntu/Debian
sudo apt-get install -y aide

# Fedora/RHEL
sudo dnf install -y aide
```

### Initialize AIDE Database

```bash
# Create baseline database (first time)
sudo aideinit

# Move database to active location
sudo mv /var/lib/aide/aide.db.new /var/lib/aide/aide.db
```

⏱️ **This takes 5-30 minutes** depending on system size.

### Configure AIDE

Edit `/etc/aide/aide.conf` to monitor critical directories:

```bash
# Monitor OpenClaw and AgentVibes directories
!/home/user/openclaw/node_modules  # Exclude large dirs
/home/user/openclaw R

!/home/user/.claude/audio  # Exclude audio cache
/home/user/.claude R

# Monitor SSH and system configs
/etc/ssh R
/etc/fail2ban R
/etc/ufw R
```

### Run AIDE Checks

```bash
# Check for changes
sudo aide --check

# Update database after legitimate changes
sudo aide --update
sudo mv /var/lib/aide/aide.db.new /var/lib/aide/aide.db
```

### Automate AIDE (Daily Cron Job)

```bash
# Create daily check script
sudo nano /etc/cron.daily/aide-check
```

**Add script:**

```bash
#!/bin/bash
/usr/bin/aide --check | mail -s "AIDE Report - $(hostname)" your-email@example.com
```

**Make executable:**

```bash
sudo chmod +x /etc/cron.daily/aide-check
```

---

## Android/Termux Security

### 1. Secure Termux Installation

**Install from F-Droid only** (NOT Google Play - outdated):

```bash
# Download F-Droid: https://f-droid.org/
# Install Termux from F-Droid
```

### 2. Grant Storage Permissions Carefully

```bash
# Only grant if needed
termux-setup-storage
```

⚠️ **This gives Termux access to your phone's storage** - use with caution.

### 3. Set Termux Lock Screen

```bash
# Install termux-auth
pkg install termux-auth

# Enable fingerprint/PIN authentication
termux-auth
```

### 4. Encrypt SSH Keys on Phone

```bash
# Generate SSH key with strong passphrase
ssh-keygen -t ed25519 -C "termux-phone"

# Always set a passphrase for keys stored on phone
Enter passphrase: [strong passphrase]
```

### 5. Use Termux:API Securely

```bash
# Install Termux:API (for TTS playback)
# Download from F-Droid: https://f-droid.org/en/packages/com.termux.api/

pkg install termux-api
```

**Permissions:** Only grant microphone/notification access if needed.

### 6. Keep Termux Updated

```bash
pkg update && pkg upgrade -y
```

### 7. Restrict Network Access (Optional)

Use **NetGuard** or **AFWall+** to restrict Termux internet access to only needed connections.

---

## OpenClaw Security Best Practices

### 1. API Key Protection

**NEVER commit API keys to git:**

```bash
# Store in .env file (add to .gitignore)
echo "ANTHROPIC_API_KEY=sk-ant-xxxxx" > .env
echo ".env" >> .gitignore
```

**Load from environment:**

```javascript
// In OpenClaw config
require('dotenv').config();
const apiKey = process.env.ANTHROPIC_API_KEY;
```

### 2. Input Validation

**Sanitize all user input from Telegram/WhatsApp:**

```javascript
// Example: Prevent command injection
function sanitizeInput(userMessage) {
  // Remove shell metacharacters
  return userMessage.replace(/[;&|`$(){}[\]<>]/g, '');
}
```

### 3. Rate Limiting

**Prevent abuse and API cost overruns:**

```javascript
// Example: Limit messages per user
const rateLimiter = new Map();

function checkRateLimit(userId) {
  const now = Date.now();
  const userRequests = rateLimiter.get(userId) || [];

  // Remove requests older than 1 minute
  const recentRequests = userRequests.filter(t => now - t < 60000);

  if (recentRequests.length >= 10) {
    return false; // Deny - too many requests
  }

  recentRequests.push(now);
  rateLimiter.set(userId, recentRequests);
  return true; // Allow
}
```

### 4. Conversation Privacy

**Encrypt conversation logs:**

```bash
# Use encrypted filesystem
sudo apt-get install ecryptfs-utils

# Encrypt OpenClaw conversation directory
ecryptfs-setup-private
```

### 5. Webhook Security

**If using webhooks (Telegram/WhatsApp), validate signatures:**

```javascript
// Telegram webhook validation
const crypto = require('crypto');

function validateTelegramWebhook(req, botToken) {
  const secret = crypto.createHash('sha256').update(botToken).digest();
  const checkString = req.body.update_id + req.body.message?.text;
  const hash = crypto.createHmac('sha256', secret).update(checkString).digest('hex');

  return hash === req.headers['x-telegram-bot-api-secret-token'];
}
```

---

## Monitoring & Incident Response

### 1. Log Monitoring

**Monitor critical logs:**

```bash
# Watch authentication attempts
sudo tail -f /var/log/auth.log

# Watch Fail2Ban activity
sudo tail -f /var/log/fail2ban.log

# Watch OpenClaw logs
tail -f ~/openclaw/logs/openclaw.log
```

### 2. Set Up Alerts

**Email alerts for security events:**

```bash
# Install mailutils
sudo apt-get install -y mailutils

# Configure simple email (using external SMTP)
sudo dpkg-reconfigure exim4-config
```

**Send alert on SSH login:**

Create `/etc/profile.d/ssh-login-alert.sh`:

```bash
#!/bin/bash
echo "SSH Login: $(whoami) from $(echo $SSH_CLIENT | awk '{print $1}') at $(date)" | \
  mail -s "SSH Login Alert - $(hostname)" your-email@example.com
```

### 3. Incident Response Plan

**If you suspect compromise:**

1. **Disconnect from network immediately:**
   ```bash
   sudo ufw default deny incoming
   sudo ufw default deny outgoing
   ```

2. **Check for unauthorized access:**
   ```bash
   # Check active SSH sessions
   who

   # Check recent logins
   last -n 20

   # Check failed login attempts
   sudo grep "Failed password" /var/log/auth.log
   ```

3. **Check for backdoors:**
   ```bash
   # Check for unauthorized SSH keys
   cat ~/.ssh/authorized_keys

   # Check for suspicious cron jobs
   crontab -l
   sudo crontab -l

   # Check for suspicious processes
   ps aux | grep -v "$(whoami)"
   ```

4. **Run AIDE check:**
   ```bash
   sudo aide --check
   ```

5. **Rotate all credentials:**
   - Change SSH keys
   - Rotate API keys (Anthropic, Telegram, WhatsApp)
   - Change server passwords

6. **Consider rebuilding server from clean image**

---

## Security Checklist

### Initial Setup

- [ ] SSH key authentication enabled
- [ ] SSH password authentication disabled
- [ ] SSH root login disabled
- [ ] UFW firewall enabled and configured
- [ ] Tailscale VPN installed and configured
- [ ] SSH only accessible via Tailscale (optional but highly recommended)
- [ ] Fail2Ban installed and monitoring SSH
- [ ] AIDE installed and baseline database created
- [ ] OpenClaw API keys stored in .env (not in code)
- [ ] .gitignore configured to exclude .env and sensitive files

### Android/Termux

- [ ] Termux installed from F-Droid (not Google Play)
- [ ] SSH keys encrypted with passphrase
- [ ] Termux storage permissions granted only if needed
- [ ] Termux kept updated (`pkg update && pkg upgrade`)

### Regular Maintenance (Weekly)

- [ ] Review SSH login logs (`last -n 50`)
- [ ] Review Fail2Ban bans (`sudo fail2ban-client status sshd`)
- [ ] Check AIDE integrity (`sudo aide --check`)
- [ ] Update system packages (`sudo apt-get update && sudo apt-get upgrade`)

### Regular Maintenance (Monthly)

- [ ] Rotate SSH keys
- [ ] Review and rotate API keys
- [ ] Review firewall rules (`sudo ufw status verbose`)
- [ ] Check for security updates (`sudo unattended-upgrades --dry-run`)

---

## Additional Resources

- **SSH Hardening Guide**: https://www.ssh.com/academy/ssh/sshd_config
- **Fail2Ban Documentation**: https://www.fail2ban.org/wiki/index.php/Main_Page
- **Tailscale Documentation**: https://tailscale.com/kb/
- **AIDE Manual**: https://aide.github.io/
- **OpenClaw Documentation**: https://openclaw.ai/docs
- **OWASP Top 10**: https://owasp.org/www-project-top-ten/

---

## Final Warning

🚨 **Security is a process, not a product.** These hardening steps significantly reduce risk but cannot eliminate it. If you're running OpenClaw on a server accessible from the internet:

- **Assume breach** - Plan for compromise, not just prevention
- **Monitor constantly** - Logs, intrusion detection, file integrity
- **Update religiously** - Security patches are critical
- **Limit exposure** - Use Tailscale VPN to hide SSH from public internet
- **Encrypt everything** - Data at rest, data in transit
- **Back up regularly** - Separate backups, test restoration

**When in doubt, consult a professional security expert.**

---

**Questions or security concerns?** Open an issue: https://github.com/paulpreibisch/AgentVibes/issues

**License:** Apache 2.0 - Use at your own risk.

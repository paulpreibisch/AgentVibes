/**
 * AgentVibes TUI Console — Receiver Tab
 * SSH Receiver — setup, enable/disable, and live message monitor.
 *
 * Implements the Tab Component Contract:
 *   createReceiverTab(screen, services) → { box, show, hide, onFocus, onBlur, getFooterText, getFooterColor }
 *
 * Uses scrollable text boxes (not lists) so users can highlight and copy
 * with their mouse in the terminal.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, chmodSync, unlinkSync, watchFile, unwatchFile } from 'node:fs';
import { execSync, spawnSync } from 'node:child_process';
import path from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

const IS_TEST = process.env.AGENTVIBES_TEST_MODE === 'true';

let blessed;
if (!IS_TEST) {
  const { default: b } = await import('blessed');
  blessed = b;
}

// ---------------------------------------------------------------------------

const COLORS = {
  contentBg:  '#0a0e1a',
  sectionHdr: '#00897b',
  labelFg:    '#e3f2fd',
  valueFg:    '#ffff00',
  activeFg:   '#80cbc4',
  borderFg:   '#00897b',
  footerBg:   '#00897b',
  noticeFg:   '#90a4ae',
};

const FOOTER_TEXT = '[E] Enable  [D] Details  [C] Clear Log  [Q] Quit';

// ---------------------------------------------------------------------------

function createTestStub() {
  return {
    box: {},
    show: () => {},
    hide: () => {},
    onFocus: () => {},
    onBlur: () => {},
    getFooterText: () => FOOTER_TEXT,
    getFooterColor: () => COLORS.footerBg,
  };
}

// ---------------------------------------------------------------------------

const _thisDir = IS_TEST ? '' : path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = IS_TEST ? '' : path.resolve(_thisDir, '..', '..', '..', 'templates', 'agentvibes-receiver.sh');

/**
 * Get the machine's Tailscale IP (if available) and SSH port.
 */
function _getNetworkInfo() {
  let tailscaleIp = '';
  let localIp = '';
  let sshPort = '22';
  try {
    tailscaleIp = execSync('tailscale ip -4 2>/dev/null', { timeout: 3000 }).toString().trim();
  } catch { /* tailscale not installed */ }
  try {
    localIp = execSync("hostname -I 2>/dev/null | awk '{print $1}'", { timeout: 3000 }).toString().trim();
  } catch { /* ignore */ }
  try {
    const portLine = execSync("grep -E '^Port ' /etc/ssh/sshd_config 2>/dev/null || echo 'Port 22'", { timeout: 3000 }).toString().trim();
    const m = portLine.match(/^Port\s+(\d+)/);
    if (m) sshPort = m[1];
  } catch { /* default 22 */ }
  return { tailscaleIp, localIp, sshPort };
}

/**
 * Build detailed setup instructions (cross-platform).
 * Organized: explanation → server instructions (for copying) → local setup.
 */
function _buildDetailedInstructions(receiverAlias, receiverScript, networkInfo) {
  return [
    'Press [A] to copy all text to your clipboard.',
    '',
    '============================================================',
    'WHAT IS SSH RECEIVER?',
    '============================================================',
    '',
    'AgentVibes SSH Receiver lets remote servers (cloud VPS, dev',
    'servers) send TTS audio to your local machine. The server AI',
    'sends text + voice config over SSH, and this machine generates',
    'and plays audio locally through its speakers.',
    '',
    'Server AI  --[SSH payload]-->  This Machine  --[piper+sox+ffmpeg]-->  Speakers',
    '',
    '',
    '============================================================',
    'INSTRUCTIONS FOR YOUR SERVER',
    '============================================================',
    '',
    'Copy this section and give it to your server AI (or follow',
    'these steps manually on the server):',
    '',
    '1. Add an SSH alias on the server (~/.ssh/config):',
    '',
    '     Host ' + receiverAlias,
    '       HostName ' + (networkInfo.tailscaleIp || '<this-machine-ip-or-tailscale-name>'),
    '       Port ' + networkInfo.sshPort,
    '       User agentvibes-receiver',
    '       IdentityFile ~/.ssh/id_ed25519',
    '',
    '2. Tell AgentVibes where to send TTS:',
    '',
    '     echo "' + receiverAlias + '" > .claude/ssh-remote-host.txt',
    '',
    '3. Switch to the ssh-remote provider:',
    '',
    '     # In .agentvibes/config/agentvibes.json set "provider": "ssh-remote"',
    '     # Or run: agentvibes provider switch ssh-remote',
    '',
    '4. Test it:',
    '',
    '     agentvibes tts "Hello from the server!"',
    '',
    'The sender hook at .claude/hooks/play-tts-ssh-remote.sh',
    'bundles voice, effects, and music into a single JSON payload',
    'and sends it over SSH. No TTS software needed on the server.',
    '',
    '',
    '============================================================',
    'LOCAL SETUP (this machine — the receiver)',
    '============================================================',
    '',
    'Step 1: Enable receiver',
    '  Press [E] in this tab (installs play-remote.sh to ~/.agentvibes/)',
    '',
    'Step 2: Create SSH access for the server',
    '',
    '  Option A — Dedicated user (recommended):',
    '',
    '    Linux/WSL:',
    '      sudo useradd -m -s /bin/bash agentvibes-receiver',
    '      # Then copy the server\'s SSH public key:',
    '      ssh-copy-id agentvibes-receiver@<this-machine-ip>',
    '',
    '    macOS:',
    '      sudo dscl . -create /Users/agentvibes-receiver',
    '      sudo dscl . -create /Users/agentvibes-receiver UserShell /bin/bash',
    '      # Enable Remote Login in System Settings > General > Sharing',
    '',
    '  Option B — Use your own user (simpler, less secure):',
    '      ssh-copy-id <your-user>@<this-machine-ip>',
    '',
    'Step 3: ForceCommand (recommended — limits SSH to audio only)',
    '',
    '  Linux/WSL — edit /etc/ssh/sshd_config:',
    '    Match User agentvibes-receiver',
    '        ForceCommand ' + receiverScript,
    '        PasswordAuthentication no',
    '        PermitTTY no',
    '    Then: sudo systemctl reload sshd',
    '',
    '  macOS — edit /etc/ssh/sshd_config:',
    '    (same config block as above)',
    '    Then: sudo launchctl kickstart -k system/com.openssh.sshd',
    '',
    'Step 4: Audio access (multi-user setups only)',
    '',
    '  If using a dedicated user, it needs access to your audio:',
    '',
    '  Linux (PipeWire):',
    '    sudo setfacl -m u:agentvibes-receiver:rx /run/user/$(id -u)',
    '    # Persist across reboots:',
    '    echo "a /run/user/$(id -u) - - - - m:u:agentvibes-receiver:rx" \\',
    '      | sudo tee /etc/tmpfiles.d/agentvibes-receiver.conf',
    '',
    '  Linux (PulseAudio):',
    '    # Copy ~/.config/pulse/cookie to the receiver user',
    '',
    '  macOS:',
    '    # Audio access is per-session; the receiver user needs to',
    '    # be in the "audio" group or use coreaudiod directly',
    '',
    '  WSL2:',
    '    # Audio goes through PulseServer at /mnt/wslg/PulseServer',
    '    # Set PULSE_SERVER in the receiver script if needed',
  ].join('\n');
}

export function createReceiverTab(screen, services) {
  if (IS_TEST) return createTestStub();

  const AGENTVIBES_DIR = path.join(homedir(), '.agentvibes');
  const RECEIVER_SCRIPT = path.join(AGENTVIBES_DIR, 'play-remote.sh');
  const RECEIVER_ALIAS = 'my-receiver';

  // Log file: check receiver user's home first, fall back to current user's
  const RECEIVER_USER_LOG = '/home/agentvibes-receiver/.agentvibes/receiver.log';
  const LOCAL_LOG = path.join(AGENTVIBES_DIR, 'receiver.log');
  const LOG_FILE = existsSync(RECEIVER_USER_LOG) ? RECEIVER_USER_LOG : LOCAL_LOG;

  // -------------------------------------------------------------------------
  // Container

  const box = blessed.box({
    parent: screen,
    top: 4,
    left: 0,
    width: '100%',
    bottom: 2,
    hidden: true,
    style: { fg: COLORS.labelFg, bg: COLORS.contentBg },
    border: { type: 'line' },
    borderStyle: { fg: COLORS.borderFg },
  });

  // -------------------------------------------------------------------------
  // Top: always-visible status area

  blessed.text({
    parent: box,
    top: 1,
    left: 2,
    content: `{${COLORS.sectionHdr}-fg}── SSH Receiver ${'─'.repeat(52)}{/${COLORS.sectionHdr}-fg}`,
    tags: true,
    style: { bg: COLORS.contentBg },
  });

  const introLine = blessed.text({
    parent: box,
    top: 3,
    left: 4,
    tags: true,
    content: '',
    style: { fg: COLORS.noticeFg, bg: COLORS.contentBg },
  });

  const statusLine = blessed.text({
    parent: box,
    top: 4,
    left: 4,
    tags: true,
    content: '',
    style: { fg: COLORS.labelFg, bg: COLORS.contentBg },
  });

  const healthLine = blessed.text({
    parent: box,
    top: 5,
    left: 4,
    tags: true,
    content: '',
    style: { fg: COLORS.labelFg, bg: COLORS.contentBg },
  });

  const feedbackLine = blessed.text({
    parent: box,
    top: 6,
    left: 4,
    tags: true,
    content: '',
    style: { fg: COLORS.noticeFg, bg: COLORS.contentBg },
  });

  // -------------------------------------------------------------------------
  // Main content: scrollable text box (supports mouse highlight/copy)

  blessed.text({
    parent: box,
    top: 8,
    left: 2,
    content: `{${COLORS.sectionHdr}-fg}${'─'.repeat(68)}{/${COLORS.sectionHdr}-fg}`,
    tags: true,
    style: { bg: COLORS.contentBg },
  });

  const sectionLabel = blessed.text({
    parent: box,
    top: 8,
    left: 4,
    tags: true,
    content: '',
    style: { bg: COLORS.contentBg },
  });

  const contentBox = blessed.box({
    parent: box,
    top: 10,
    left: 2,
    width: '96%',
    bottom: 2,
    scrollable: true,
    alwaysScroll: true,
    scrollbar: { ch: '│', style: { fg: COLORS.sectionHdr } },
    border: { type: 'line' },
    focusable: true,
    style: {
      fg: COLORS.labelFg,
      bg: COLORS.contentBg,
      border: { fg: COLORS.borderFg },
    },
  });

  // -------------------------------------------------------------------------
  // State

  let _messages = [];
  let _watchActive = false;
  let _showDetails = false;

  // -------------------------------------------------------------------------
  // Receiver management

  function _isReceiverEnabled() {
    return existsSync(RECEIVER_SCRIPT);
  }

  function _enableReceiver() {
    try {
      mkdirSync(AGENTVIBES_DIR, { recursive: true, mode: 0o700 });
      if (existsSync(TEMPLATE_PATH)) {
        copyFileSync(TEMPLATE_PATH, RECEIVER_SCRIPT);
        chmodSync(RECEIVER_SCRIPT, 0o755);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  function _disableReceiver() {
    try {
      unlinkSync(RECEIVER_SCRIPT);
      return true;
    } catch {
      return false;
    }
  }

  // -------------------------------------------------------------------------
  // Log parsing

  function _parseLogFile() {
    if (!existsSync(LOG_FILE)) return [];
    try {
      const content = readFileSync(LOG_FILE, 'utf-8');
      const lines = content.trim().split('\n').filter(l => l.length > 0);
      return lines
        .filter(line => line.includes('|'))  // Skip v1 format lines
        .map(line => {
          const parts = line.split('|');
          // Extract music from detail field (e.g., "effects=none music=track.mp3")
          const detail = parts[5] || '';
          const musicMatch = detail.match(/music=(\S+)/);
          const musicRaw = musicMatch ? musicMatch[1] : '';
          // Convert filename to friendly name: "agentvibes_soft_flamenco_loop.mp3" → "Soft Flamenco Loop"
          let music = '';
          if (musicRaw && musicRaw !== 'none') {
            music = musicRaw
              .replace(/\.[^.]+$/, '')            // strip extension
              .replace(/^agent_?vibes_/i, '')     // strip agent_vibes_ or agentvibes_ prefix
              .replace(/_?loop$/i, '')            // strip _loop suffix
              .replace(/_v\d+$/i, '')             // strip _v1, _v2 etc
              .replace(/_/g, ' ')                 // underscores to spaces
              .replace(/\b\w/g, c => c.toUpperCase()); // title case
          }
          return {
            timestamp: parts[0] || '',
            status: parts[1] || '',
            project: parts[2] || 'unknown',
            voice: parts[3] || '',
            textPreview: parts[4] || '',
            detail,
            music,
            ip: parts[6] || '',
            logId: parts[7] || '',
          };
        });
    } catch {
      return [];
    }
  }

  function _formatMessage(msg) {
    const date = msg.timestamp.replace(/T/, ' ').substring(0, 10);
    const time = msg.timestamp.replace(/T/, ' ').substring(11, 19);
    const status = msg.status === 'DONE' ? 'OK  ' :
                   msg.status === 'ERROR' ? 'ERR ' :
                   msg.status === 'PLAYING' ? 'PLAY' :
                   msg.status === 'RECEIVED' ? 'RECV' :
                   msg.status === 'WARN' ? 'WARN' :
                   msg.status.substring(0, 4).padEnd(4);
    const logId = (msg.logId || '—').padEnd(5);
    const ip = (msg.ip || '—').substring(0, 15).padEnd(15);
    const project = msg.project.substring(0, 12).padEnd(12);
    const voice = msg.voice.substring(0, 18).padEnd(18);
    const music = (msg.music || '—').substring(0, 15).padEnd(15);
    const text = msg.textPreview.substring(0, 25);
    return `${date} ${time}  ${logId}  ${status}  ${ip}  ${project}  ${voice}  ${music}  ${text}`;
  }

  // -------------------------------------------------------------------------
  // Health check

  function _checkHealth() {
    const checks = [];
    const cmdCheck = (cmd) => {
      try {
        execSync(`command -v ${cmd}`, { stdio: 'pipe' });
        return true;
      } catch {
        return false;
      }
    };

    checks.push(cmdCheck('piper') ? '{green-fg}piper{/green-fg}' : '{red-fg}piper{/red-fg}');
    checks.push(cmdCheck('sox') ? '{green-fg}sox{/green-fg}' : '{yellow-fg}sox{/yellow-fg}');
    checks.push(cmdCheck('ffmpeg') ? '{green-fg}ffmpeg{/green-fg}' : '{yellow-fg}ffmpeg{/yellow-fg}');

    let player = 'none';
    for (const p of ['pw-play', 'paplay', 'aplay']) {
      if (cmdCheck(p)) { player = p; break; }
    }
    checks.push(player !== 'none' ? `{green-fg}${player}{/green-fg}` : '{red-fg}no player{/red-fg}');

    healthLine.setContent(`  Tools: ${checks.join('  ')}`);
  }

  // -------------------------------------------------------------------------
  // Feedback flash (shows a message for 3 seconds)

  let _feedbackTimer = null;
  function _showFeedback(msg) {
    feedbackLine.setContent('  ' + msg);
    screen.render();
    if (_feedbackTimer) clearTimeout(_feedbackTimer);
    _feedbackTimer = setTimeout(() => {
      _updateFeedbackDefault();
      screen.render();
    }, 3000);
  }

  function _updateFeedbackDefault() {
    if (_showDetails) {
      feedbackLine.setContent('  {bold}[D]{/bold} Back to messages    {bold}[A]{/bold} Copy all to clipboard');
    } else {
      feedbackLine.setContent('  {bold}[D]{/bold} Setup details & AI prompt');
    }
  }

  // -------------------------------------------------------------------------
  // Refresh display

  // Cache network info (computed once, refreshed on display)
  let _networkInfo = { tailscaleIp: '', localIp: '', sshPort: '22' };

  function refreshDisplay() {
    const enabled = _isReceiverEnabled();
    _networkInfo = _getNetworkInfo();

    const ipDisplay = _networkInfo.tailscaleIp || _networkInfo.localIp || 'unknown';
    introLine.setContent(`  Receive TTS from remote servers via SSH.  IP: {bold}${ipDisplay}{/bold}  Port: {bold}${_networkInfo.sshPort}{/bold}  Press {bold}[D]{/bold} for setup.`);

    if (enabled) {
      statusLine.setContent(`  Status: {green-fg}{bold}ENABLED{/bold}{/green-fg}  {bold}[E]{/bold} Disable    Script: ${RECEIVER_SCRIPT}`);
    } else {
      statusLine.setContent(`  Status: {yellow-fg}{bold}DISABLED{/bold}{/yellow-fg} {bold}[E]{/bold} Enable     Script: not installed`);
    }

    _checkHealth();
    _updateFeedbackDefault();

    // Main content
    _messages = _parseLogFile();

    if (_showDetails) {
      sectionLabel.setContent(`{${COLORS.sectionHdr}-fg} Setup Instructions {/${COLORS.sectionHdr}-fg}`);
      contentBox.setContent(_buildDetailedInstructions(RECEIVER_ALIAS, RECEIVER_SCRIPT, _networkInfo));
    } else {
      sectionLabel.setContent(`{${COLORS.sectionHdr}-fg} Messages {/${COLORS.sectionHdr}-fg}`);

      if (_messages.length === 0) {
        const text = [
          'No messages received yet. Waiting for SSH TTS requests...',
          '',
          'Press [D] for full setup instructions and server config.',
        ].join('\n');
        contentBox.setContent(text);
      } else {
        const header = `${'DATE'.padEnd(10)} ${'TIME'.padEnd(8)}  ${'ID'.padEnd(5)}  ${'STAT'.padEnd(4)}  ${'IP'.padEnd(15)}  ${'PROJECT'.padEnd(12)}  ${'VOICE'.padEnd(18)}  ${'MUSIC'.padEnd(15)}  TEXT`;
        const separator = '─'.repeat(78);
        const lines = [header, separator];
        // Group log lines per request — show one row with final status
        // Each request produces RECEIVED → PLAYING → DONE/ERROR
        const grouped = [];
        let current = null;
        for (const msg of _messages) {
          if (msg.status === 'RECEIVED') {
            current = { ...msg };
          } else if (current && (msg.status === 'DONE' || msg.status === 'ERROR' || msg.status === 'WARN')) {
            current.status = msg.status;
            current.timestamp = msg.timestamp;
            grouped.push(current);
            current = null;
          } else if (!current && (msg.status === 'DONE' || msg.status === 'ERROR')) {
            // Orphaned status — show as-is
            grouped.push(msg);
          }
        }
        // If a request is still in-progress, show it
        if (current) {
          grouped.push(current);
        }
        const recent = grouped.slice(-50).reverse();
        for (const msg of recent) {
          lines.push(_formatMessage(msg));
        }
        contentBox.setContent(lines.join('\n'));
      }
    }

    contentBox.scrollTo(0);
    screen.render();
  }

  // -------------------------------------------------------------------------
  // File watcher

  function _startWatching() {
    if (_watchActive) return;
    _watchActive = true;
    try {
      watchFile(LOG_FILE, { interval: 2000 }, () => refreshDisplay());
    } catch { /* file may not exist yet */ }
  }

  function _stopWatching() {
    if (!_watchActive) return;
    _watchActive = false;
    try { unwatchFile(LOG_FILE); } catch { /* ignore */ }
  }

  // -------------------------------------------------------------------------
  // Scroll bindings
  box.key(['up'], () => { contentBox.scroll(-1); screen.render(); });
  box.key(['down'], () => { contentBox.scroll(1); screen.render(); });
  box.key(['pageup'], () => { contentBox.scroll(-contentBox.height); screen.render(); });
  box.key(['pagedown'], () => { contentBox.scroll(contentBox.height); screen.render(); });

  // -------------------------------------------------------------------------
  // Action key bindings

  box.key(['e', 'E'], () => {
    if (_isReceiverEnabled()) {
      _disableReceiver();
      _showFeedback('{yellow-fg}Receiver disabled{/yellow-fg}');
    } else {
      if (_enableReceiver()) {
        _showFeedback('{green-fg}Receiver enabled! play-remote.sh installed.{/green-fg}');
      } else {
        _showFeedback('{red-fg}Failed to enable — template not found{/red-fg}');
      }
    }
    refreshDisplay();
  });

  box.key(['d', 'D'], () => {
    _showDetails = !_showDetails;
    refreshDisplay();
  });

  box.key(['a', 'A'], () => {
    // Copy all visible content to clipboard
    const text = contentBox.getContent();
    const result = spawnSync('xclip', ['-selection', 'clipboard'], {
      input: text,
      timeout: 3000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    if (result.status === 0) {
      _showFeedback('{green-fg}Copied to clipboard!{/green-fg}');
    } else {
      // Fallback: try xsel, wl-copy, pbcopy
      for (const [cmd, args] of [['xsel', ['--clipboard', '--input']], ['wl-copy', []], ['pbcopy', []]]) {
        const r = spawnSync(cmd, args, { input: text, timeout: 3000, stdio: ['pipe', 'pipe', 'pipe'] });
        if (r.status === 0) {
          _showFeedback('{green-fg}Copied to clipboard!{/green-fg}');
          return;
        }
      }
      // Last resort: save to file
      const filePath = path.join(AGENTVIBES_DIR, 'receiver-clipboard.txt');
      try {
        mkdirSync(AGENTVIBES_DIR, { recursive: true });
        writeFileSync(filePath, text + '\n');
        _showFeedback(`{yellow-fg}Saved to ${filePath}{/yellow-fg}`);
      } catch {
        _showFeedback('{red-fg}Failed to copy{/red-fg}');
      }
    }
  });

  box.key(['c', 'C'], () => {
    try { writeFileSync(LOG_FILE, ''); } catch { /* ignore */ }
    _showDetails = false;
    _showFeedback('{green-fg}Log cleared{/green-fg}');
    refreshDisplay();
  });

  // -------------------------------------------------------------------------
  // Tab Component Contract

  return {
    box,
    show() {
      box.show();
      refreshDisplay();
      _startWatching();
    },
    hide() {
      box.hide();
      _stopWatching();
    },
    onFocus() { box.focus(); },
    onBlur() {},
    getFooterText: () => FOOTER_TEXT,
    getFooterColor: () => COLORS.footerBg,
  };
}

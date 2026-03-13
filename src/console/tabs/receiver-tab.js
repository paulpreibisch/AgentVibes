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

const FOOTER_TEXT = 'SSH Receiver  [Q] Quit';

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
 * Detect current receiver setup state — returns an object with boolean checks.
 * Used to determine whether instructions should show full setup or just verification.
 */
function _detectSetupState() {
  const state = {
    receiverUserExists: false,
    receiverScriptInstalled: false,
    voiceModelsPresent: false,
    pipewireTcpConfigured: false,
    flatVolumesDisabled: false,
    pulseCookieShared: false,
    forceCommandConfigured: false,
    tcpModuleLoaded: false,
  };
  try {
    // Resolve receiver user home directory dynamically (works on Linux + macOS)
    let receiverHome = '';
    try {
      execSync('id agentvibes-receiver', { timeout: 3000, stdio: 'pipe' });
      state.receiverUserExists = true;
      try {
        receiverHome = execSync("getent passwd agentvibes-receiver 2>/dev/null | cut -d: -f6 || echo '/home/agentvibes-receiver'",
          { timeout: 3000, stdio: 'pipe' }).toString().trim();
      } catch { receiverHome = '/home/agentvibes-receiver'; }
    } catch { /* user does not exist */ }

    // Check receiver script installed
    if (receiverHome) {
      state.receiverScriptInstalled = existsSync(path.join(receiverHome, '.agentvibes/play-remote.sh'));
    }

    // Check voice models present
    if (receiverHome) {
      try {
        const voices = execSync(`ls ${receiverHome}/.claude/piper-voices/*.onnx 2>/dev/null | wc -l`,
          { timeout: 3000, stdio: 'pipe' }).toString().trim();
        state.voiceModelsPresent = parseInt(voices, 10) > 0;
      } catch { /* no access or no voices */ }
    }

    // Check PipeWire TCP config
    const home = homedir();
    state.pipewireTcpConfigured = existsSync(
      path.join(home, '.config/pipewire/pipewire-pulse.conf.d/agentvibes-tcp.conf'));
    state.flatVolumesDisabled = existsSync(
      path.join(home, '.config/pipewire/pipewire-pulse.conf.d/no-flat-volumes.conf'));

    // Check pulse cookie shared
    if (receiverHome) {
      state.pulseCookieShared = existsSync(path.join(receiverHome, '.config/pulse/cookie'));
    }

    // Check ForceCommand in sshd_config
    try {
      const sshdConf = readFileSync('/etc/ssh/sshd_config', 'utf-8');
      state.forceCommandConfigured = sshdConf.includes('Match User agentvibes-receiver');
    } catch { /* no read access */ }

    // Check TCP module loaded
    try {
      const modules = execSync('pactl list modules short 2>/dev/null', { timeout: 3000, stdio: 'pipe' }).toString();
      state.tcpModuleLoaded = modules.includes('module-native-protocol-tcp');
    } catch { /* pactl not available */ }
  } catch { /* detection failed, assume not set up */ }
  return state;
}

/**
 * Build detailed setup instructions (cross-platform).
 * Organized: explanation → server instructions (for copying) → local setup.
 * Designed to be self-contained so an AI agent can execute all steps.
 * Detects existing setup and shows verification-only instructions when ready.
 */
function _buildDetailedInstructions(receiverAlias, receiverScript, networkInfo) {
  // Show detected values as hints but always use placeholders in instructions
  // so the AI agent asks the user to confirm/provide their actual values
  const detectedIp = networkInfo.tailscaleIp || networkInfo.localIp || '';
  const detectedPort = networkInfo.sshPort || '22';
  const state = _detectSetupState();
  const allReady = state.receiverUserExists && state.receiverScriptInstalled &&
    state.voiceModelsPresent && state.pipewireTcpConfigured &&
    state.flatVolumesDisabled && state.pulseCookieShared &&
    state.forceCommandConfigured && state.tcpModuleLoaded;

  // Build status header showing what's detected
  const check = (ok) => ok ? '[OK]' : '[--]';
  const statusLines = [
    '============================================================',
    'SETUP STATUS (auto-detected)',
    '============================================================',
    '',
    '  ' + check(state.receiverUserExists) + ' Receiver user (agentvibes-receiver)',
    '  ' + check(state.receiverScriptInstalled) + ' Receiver script (play-remote.sh)',
    '  ' + check(state.voiceModelsPresent) + ' Voice models copied',
    '  ' + check(state.pipewireTcpConfigured) + ' PipeWire TCP audio (port 34567)',
    '  ' + check(state.flatVolumesDisabled) + ' Flat-volumes disabled',
    '  ' + check(state.pulseCookieShared) + ' PulseAudio cookie shared',
    '  ' + check(state.forceCommandConfigured) + ' SSH ForceCommand configured',
    '  ' + check(state.tcpModuleLoaded) + ' TCP audio module loaded',
    '',
  ];

  if (allReady) {
    return [
      'Press [A] to copy all text to your clipboard.',
      '',
      ...statusLines,
      'All checks passed! Setup is complete.',
      'Below are verification tests and server-side instructions.',
      '',
      '',
      '============================================================',
      'BEFORE YOU BEGIN — Ask the user for these values:',
      '============================================================',
      '',
      '  RECEIVER_IP:   The receiver machine IP or Tailscale hostname',
      detectedIp ? '                (detected: ' + detectedIp + ' — ask user to confirm)' : '                (could not auto-detect — user must provide)',
      '  RECEIVER_PORT: The SSH port on the receiver machine',
      '                (detected: ' + detectedPort + ' — ask user to confirm)',
      '  RECEIVER_NAME: SSH alias name (default: my-receiver)',
      '  TTS_PROVIDER:  Which TTS engine on the receiver?',
      '                Options: piper (default, Linux), soprano (neural TTS, any platform),',
      '                macos (macOS say), windows-sapi (Windows SAPI)',
      '',
      'Replace <RECEIVER_IP>, <RECEIVER_PORT>, <RECEIVER_NAME>,',
      'and <TTS_PROVIDER> in commands below with user-provided values.',
      '',
      '',
      '============================================================',
      'SERVER SETUP (the remote machine running Claude)',
      '============================================================',
      'Sender hook: .claude/hooks/play-tts-ssh-remote.sh',
      'Config file: .agentvibes/config/agentvibes.json',
      '',
      'Run these steps on the remote server that needs TTS.',
      '',
      '1. Add an SSH alias for the receiver (~/.ssh/config):',
      '',
      '     Host <RECEIVER_NAME>',
      '       HostName <RECEIVER_IP>',
      '       Port <RECEIVER_PORT>',
      '       User agentvibes-receiver',
      '       IdentityFile ~/.ssh/id_ed25519',
      '',
      '2. Tell AgentVibes where to send TTS:',
      '',
      '     echo "<RECEIVER_NAME>" > .claude/ssh-remote-host.txt',
      '',
      '3. Switch to the ssh-remote provider:',
      '',
      '     # In .agentvibes/config/agentvibes.json set "provider": "ssh-remote"',
      '     # Or run: agentvibes provider switch ssh-remote',
      '',
      '',
      '============================================================',
      'AUDIBLE VERIFICATION TESTS',
      '============================================================',
      '',
      'Test 1 — Local audio (no SSH, verifies audio pipeline):',
      '',
      '  sudo -u agentvibes-receiver \\',
      '    PULSE_SERVER=tcp:127.0.0.1:34567 \\',
      '    paplay /usr/share/sounds/freedesktop/stereo/bell.oga',
      '  # You should hear a bell sound',
      '',
      'Test 2 — Local TTS pipeline (no SSH):',
      '',
      '  sudo -u agentvibes-receiver \\',
      '    PULSE_SERVER=tcp:127.0.0.1:34567 \\',
      '    /home/agentvibes-receiver/.agentvibes/play-remote.sh \\',
      '    "$(echo \'{"text":"Receiver setup verified","voice":"en_US-lessac-medium"}\' | base64)"',
      '  # You should hear spoken text',
      '',
      'Test 3 — End-to-end from server (uses tmux for split view):',
      '',
      '  tmux new-session -d -s av-test \\',
      '    "tail -f /home/agentvibes-receiver/.agentvibes/receiver.log"',
      '  tmux split-window -h -t av-test \\',
      '    "ssh <your-server>"',
      '  tmux attach -t av-test',
      '',
      '  Then in the server pane:',
      '    ssh <RECEIVER_NAME> "$(echo \'{"text":"Hello from server","voice":"en_US-lessac-medium"}\' | base64)"',
      '  # Left pane: log shows RECEIVED -> PLAYING -> DONE',
      '  # Speakers: you hear the TTS audio',
      '',
      'Test 4 — Full AgentVibes pipeline from server:',
      '  bash .claude/hooks/play-tts.sh "End to end test complete"',
      '',
    ].join('\n');
  }

  // Full setup instructions (when not everything is detected)
  return [
    'Press [A] to copy all text to your clipboard.',
    'Give this to an AI agent on your server AND local machine',
    'to set up and verify the SSH receiver end-to-end.',
    '',
    ...statusLines,
    '',
    '============================================================',
    'BEFORE YOU BEGIN — Ask the user for these values:',
    '============================================================',
    '',
    '  RECEIVER_IP:   The receiver machine IP or Tailscale hostname',
    detectedIp ? '                (detected: ' + detectedIp + ' — ask user to confirm)' : '                (could not auto-detect — user must provide)',
    '  RECEIVER_PORT: The SSH port on the receiver machine',
    '                (detected: ' + detectedPort + ' — ask user to confirm)',
    '  RECEIVER_NAME: SSH alias name (default: my-receiver)',
    '  TTS_PROVIDER:  Which TTS engine on the receiver?',
    '                Options: piper (default, Linux), soprano (neural TTS, any platform),',
    '                macos (macOS say), windows-sapi (Windows SAPI)',
    '',
    'Replace <RECEIVER_IP>, <RECEIVER_PORT>, <RECEIVER_NAME>,',
    'and <TTS_PROVIDER> in commands below with user-provided values.',
    '',
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
    'Prerequisites:',
    '  - Both machines can reach each other via SSH (Tailscale VPN',
    '    recommended for easy setup: https://tailscale.com/download)',
    '  - A TTS engine on the receiver (this machine):',
    '      Linux:   piper-tts (default, offline, fast)',
    '      Windows: soprano or windows-sapi (uses system voices)',
    '      macOS:   macos (uses built-in say command)',
    '  - sox and ffmpeg recommended for audio effects and music',
    '',
    '',
    '============================================================',
    'PART 1: LOCAL SETUP (this machine — the receiver)',
    '============================================================',
    'Setup script: scripts/setup-receiver-user.sh',
    'Receiver template: templates/agentvibes-receiver.sh',
    'Sender hook: .claude/hooks/play-tts-ssh-remote.sh',
    '',
    'Run these steps on the machine that has speakers attached.',
    '',
    'IMPORTANT: Steps that require sudo cannot be run by an AI',
    'agent. The USER must run sudo commands in a separate terminal.',
    'The AI agent should tell the user what to run, then verify',
    'the results using the detection checks shown above.',
    '',
    '--- Option A: Automated Setup (recommended) ---',
    '',
    'Ask the USER to run this in a separate terminal:',
    '',
    '  sudo bash /path/to/AgentVibes/scripts/setup-receiver-user.sh',
    '',
    'This single script handles everything:',
    '  - Creates agentvibes-receiver user (groups: audio + your group)',
    '  - Copies piper voice models and music tracks',
    '  - Installs the receiver script (play-remote.sh)',
    '  - Configures PipeWire TCP audio on localhost:34567',
    '  - Disables flat-volumes (prevents volume hijacking)',
    '  - Shares PulseAudio cookie for cross-user auth',
    '  - Tests audio playback',
    '',
    'After the user confirms it ran successfully, verify with:',
    '  id agentvibes-receiver                     # user exists?',
    '  ls /home/agentvibes-receiver/.claude/piper-voices/*.onnx  # voices?',
    '  pactl list modules short | grep tcp        # TCP module?',
    '',
    'Then skip to Step 3 (ForceCommand) below.',
    '',
    '--- Option B: Manual Setup (step by step) ---',
    '',
    'Step 1: Enable receiver script',
    '  Press [E] in this tab (installs play-remote.sh to ~/.agentvibes/)',
    '',
    'Step 2: Create the receiver user',
    '',
    '  Ask the USER to run these sudo commands in a terminal:',
    '',
    '  Linux/WSL:',
    '    sudo useradd -m -s /bin/bash agentvibes-receiver',
    '    sudo usermod -aG audio,$(id -gn) agentvibes-receiver',
    '    # Create directories for voices and music:',
    '    sudo mkdir -p /home/agentvibes-receiver/.claude/piper-voices',
    '    sudo mkdir -p /home/agentvibes-receiver/.claude/audio/tracks',
    '    sudo mkdir -p /home/agentvibes-receiver/.agentvibes',
    '    # Copy voice models (required for TTS):',
    '    sudo cp ~/.claude/piper-voices/*.onnx /home/agentvibes-receiver/.claude/piper-voices/',
    '    sudo cp ~/.claude/piper-voices/*.onnx.json /home/agentvibes-receiver/.claude/piper-voices/',
    '    # Copy music tracks (optional, for background music):',
    '    sudo cp ~/.claude/audio/tracks/*.mp3 /home/agentvibes-receiver/.claude/audio/tracks/ 2>/dev/null',
    '    # Install receiver script:',
    '    sudo cp ~/.agentvibes/play-remote.sh /home/agentvibes-receiver/.agentvibes/play-remote.sh',
    '    sudo chmod +x /home/agentvibes-receiver/.agentvibes/play-remote.sh',
    '    # Fix ownership:',
    '    sudo chown -R agentvibes-receiver:agentvibes-receiver /home/agentvibes-receiver/.claude',
    '    sudo chown -R agentvibes-receiver:agentvibes-receiver /home/agentvibes-receiver/.agentvibes',
    '',
    '  macOS:',
    '    sudo dscl . -create /Users/agentvibes-receiver',
    '    sudo dscl . -create /Users/agentvibes-receiver UserShell /bin/bash',
    '    sudo dscl . -create /Users/agentvibes-receiver NFSHomeDirectory /Users/agentvibes-receiver',
    '    sudo mkdir -p /Users/agentvibes-receiver',
    '    # Enable Remote Login in System Settings > General > Sharing',
    '    # Then copy voices/script as above (adjust paths to /Users/)',
    '',
    '  AI agent: After user confirms, verify:',
    '    id agentvibes-receiver       # user exists?',
    '    ls /home/agentvibes-receiver/.agentvibes/play-remote.sh  # script?',
    '    ls /home/agentvibes-receiver/.claude/piper-voices/*.onnx # voices?',
    '',
    'Step 3: ForceCommand (recommended — limits SSH to audio only)',
    '',
    '  Ask the USER to add this to /etc/ssh/sshd_config:',
    '',
    '    Match User agentvibes-receiver',
    '        ForceCommand ' + receiverScript,
    '        PasswordAuthentication no',
    '        PermitTTY no',
    '',
    '  Then ask user to reload sshd:',
    '    Linux/WSL: sudo systemctl reload sshd',
    '    macOS:     sudo launchctl kickstart -k system/com.openssh.sshd',
    '',
    '  AI agent: Verify (no sudo needed):',
    '    grep "Match User agentvibes-receiver" /etc/ssh/sshd_config',
    '',
    'Step 4: Audio access (required for dedicated user)',
    '',
    '  The receiver user runs as a different UID and cannot access',
    '  your audio via Unix sockets. TCP localhost solves this.',
    '',
    '  Linux (PipeWire — most modern distros):',
    '',
    '    a) Enable TCP audio listener (AI agent CAN do this — no sudo):',
    '       mkdir -p ~/.config/pipewire/pipewire-pulse.conf.d',
    '       cat > ~/.config/pipewire/pipewire-pulse.conf.d/agentvibes-tcp.conf << \'EOF\'',
    '       pulse.cmd = [',
    '           { cmd = "load-module" args = "module-native-protocol-tcp auth-cookie-enabled=1 auth-anonymous=0 listen=127.0.0.1 port=34567" }',
    '       ]',
    '       EOF',
    '',
    '    b) Disable flat-volumes (AI agent CAN do this — no sudo):',
    '       cat > ~/.config/pipewire/pipewire-pulse.conf.d/no-flat-volumes.conf << \'EOF\'',
    '       pulse.properties = {',
    '           pulse.flat.volumes = false',
    '       }',
    '       EOF',
    '',
    '    c) Share PulseAudio cookie (REQUIRES sudo — ask USER):',
    '       sudo mkdir -p /home/agentvibes-receiver/.config/pulse',
    '       sudo cp ~/.config/pulse/cookie /home/agentvibes-receiver/.config/pulse/',
    '       sudo chown -R agentvibes-receiver:agentvibes-receiver \\',
    '         /home/agentvibes-receiver/.config/pulse',
    '       sudo chmod 600 /home/agentvibes-receiver/.config/pulse/cookie',
    '',
    '    d) Load TCP module now (AI agent CAN do this — no sudo):',
    '       pactl load-module module-native-protocol-tcp \\',
    '         auth-cookie-enabled=1 auth-anonymous=0 \\',
    '         listen=127.0.0.1 port=34567',
    '',
    '    AI agent: Verify audio setup:',
    '       pactl list modules short | grep tcp           # TCP loaded?',
    '       ls /home/agentvibes-receiver/.config/pulse/cookie  # cookie?',
    '       PULSE_SERVER=tcp:127.0.0.1:34567 pactl info   # TCP works?',
    '',
    '  Linux (PulseAudio — older distros):',
    '    # Add to /etc/pulse/default.pa or ~/.config/pulse/default.pa:',
    '    load-module module-native-protocol-tcp auth-cookie-enabled=1 \\',
    '      auth-anonymous=0 listen=127.0.0.1 port=34567',
    '    # Then share the cookie as above (step c — requires sudo)',
    '    # Restart: pulseaudio --kill && pulseaudio --start',
    '',
    '  macOS:',
    '    # macOS uses coreaudiod which is system-wide.',
    '    # The receiver user should have audio access if in the',
    '    # "audio" group. No TCP workaround needed.',
    '',
    '  WSL2:',
    '    # Audio routes through WSLg PulseServer at /mnt/wslg/PulseServer.',
    '    # Set in receiver script: export PULSE_SERVER=unix:/mnt/wslg/PulseServer',
    '    # Cross-user access may require the TCP approach above.',
    '',
    'Step 5: Add server SSH key',
    '',
    '  On the server, generate a key if needed:',
    '    ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519 -N ""',
    '',
    '  Copy the public key to the receiver:',
    '    ssh-copy-id -i ~/.ssh/id_ed25519.pub \\',
    '      agentvibes-receiver@<RECEIVER_IP>',
    '',
    '',
    '============================================================',
    'PART 2: SERVER SETUP (the remote machine running Claude)',
    '============================================================',
    'Sender hook: .claude/hooks/play-tts-ssh-remote.sh',
    'Config file: .agentvibes/config/agentvibes.json',
    '',
    'Run these steps on the remote server that needs TTS.',
    '',
    '1. Add an SSH alias for the receiver (~/.ssh/config):',
    '',
    '     Host <RECEIVER_NAME>',
    '       HostName <RECEIVER_IP>',
    '       Port <RECEIVER_PORT>',
    '       User agentvibes-receiver',
    '       IdentityFile ~/.ssh/id_ed25519',
    '',
    '2. Tell AgentVibes where to send TTS:',
    '',
    '     echo "<RECEIVER_NAME>" > .claude/ssh-remote-host.txt',
    '',
    '3. Switch to the ssh-remote provider:',
    '',
    '     # In .agentvibes/config/agentvibes.json set "provider": "ssh-remote"',
    '     # Or run: agentvibes provider switch ssh-remote',
    '',
    'The sender hook at .claude/hooks/play-tts-ssh-remote.sh',
    'bundles voice, effects, and music into a single JSON payload',
    'and sends it over SSH. No TTS software needed on the server.',
    '',
    '',
    '============================================================',
    'PART 3: VERIFICATION (test end-to-end)',
    '============================================================',
    '',
    'Use tmux to test both sides simultaneously:',
    '',
    '  tmux new-session -d -s agentvibes-verify',
    '  # Left pane: watch receiver log on LOCAL machine',
    '  tmux send-keys "tail -f /home/agentvibes-receiver/.agentvibes/receiver.log \\',
    '    || tail -f ~/.agentvibes/receiver.log" Enter',
    '  # Right pane: send test from SERVER',
    '  tmux split-window -h',
    '  tmux send-keys "ssh <your-server>" Enter',
    '  tmux attach -t agentvibes-verify',
    '',
    'Then in the server pane, run these tests in order:',
    '',
    'Test 1 — SSH connectivity:',
    '  ssh <RECEIVER_NAME> "echo hello"',
    '  # Expected: ForceCommand runs, you see RECEIVED in the log pane',
    '',
    'Test 2 — TTS from server:',
    '  echo \'{"text":"Hello from server test","voice":"en_US-lessac-medium"}\' \\',
    '    | base64 | xargs ssh <RECEIVER_NAME>',
    '  # Expected: Audio plays on receiver speakers, log shows DONE',
    '',
    'Test 3 — Full AgentVibes pipeline:',
    '  bash .claude/hooks/play-tts.sh "Testing AgentVibes receiver"',
    '  # Expected: TTS with configured voice, effects, and music',
    '',
    'Or test locally on the receiver machine without SSH:',
    '',
    '  sudo -u agentvibes-receiver \\',
    '    PULSE_SERVER=tcp:127.0.0.1:34567 \\',
    '    paplay /usr/share/sounds/freedesktop/stereo/bell.oga',
    '  # Expected: Bell sound plays through your speakers',
    '',
    '  sudo -u agentvibes-receiver \\',
    '    PULSE_SERVER=tcp:127.0.0.1:34567 \\',
    '    /home/agentvibes-receiver/.agentvibes/play-remote.sh \\',
    '    "$(echo \'{"text":"Local pipeline test","voice":"en_US-lessac-medium"}\' | base64)"',
    '  # Expected: TTS audio plays, receiver.log shows RECEIVED → PLAYING → DONE',
    '',
    '',
    '============================================================',
    'TROUBLESHOOTING',
    '============================================================',
    '',
    'SSH connection refused:',
    '  - Check sshd is running: systemctl status sshd',
    '  - Check firewall allows <RECEIVER_PORT>: sudo ufw status',
    '  - Check authorized_keys: cat /home/agentvibes-receiver/.ssh/authorized_keys',
    '',
    'No audio / connection refused on audio:',
    '  - Check TCP module: pactl list modules short | grep tcp',
    '  - Check cookie exists: ls -la /home/agentvibes-receiver/.config/pulse/cookie',
    '  - Test TCP directly: PULSE_SERVER=tcp:127.0.0.1:34567 pactl info',
    '',
    'Volume hijacked / wrong speaker:',
    '  - Verify flat-volumes disabled:',
    '    cat ~/.config/pipewire/pipewire-pulse.conf.d/no-flat-volumes.conf',
    '  - Select specific sink: echo "sink_name" > \\',
    '    /home/agentvibes-receiver/.agentvibes/receiver-sink.txt',
    '  - List available sinks: pactl list sinks short',
    '',
    'No voice models:',
    '  - Check: ls /home/agentvibes-receiver/.claude/piper-voices/*.onnx',
    '  - Re-copy: sudo cp ~/.claude/piper-voices/*.onnx* \\',
    '    /home/agentvibes-receiver/.claude/piper-voices/',
    '',
    'ForceCommand not working:',
    '  - Check sshd_config syntax: sudo sshd -t',
    '  - Reload sshd: sudo systemctl reload sshd',
    '  - Test manually: ssh agentvibes-receiver@localhost',
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

  // Sink config — shared with receiver script via receiver user's home
  const RECEIVER_SINK_FILE = '/home/agentvibes-receiver/.agentvibes/receiver-sink.txt';
  const LOCAL_SINK_FILE = path.join(AGENTVIBES_DIR, 'receiver-sink.txt');
  const SINK_FILE = existsSync('/home/agentvibes-receiver/.agentvibes') ? RECEIVER_SINK_FILE : LOCAL_SINK_FILE;

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
  // Description text (collapsible)
  const DESC_TEXT = [
    'SSH Receiver lets your remote servers speak through this machine.',
    'When an AI assistant on a remote server (VPS, cloud, dev box) needs',
    'to play TTS audio, it sends the text over SSH to this machine, which',
    'generates and plays the audio through your speakers locally.',
    '',
    'Remote AI  ──[SSH]──►  This Machine  ──[piper+sox+ffmpeg]──►  Your Speakers',
  ].join('\n');

  const descBox = blessed.box({
    parent: box,
    top: 0,
    left: 2,
    width: '96%',
    height: 9,
    tags: true,
    hidden: true,
    border: { type: 'line' },
    label: ` {bold}What is SSH Receiver?{/bold} `,
    style: {
      fg: COLORS.labelFg,
      bg: '#111827',
      border: { fg: COLORS.sectionHdr },
    },
  });

  blessed.text({
    parent: descBox,
    top: 0,
    left: 1,
    tags: true,
    content: DESC_TEXT,
    style: { fg: '#b0bec5', bg: '#111827' },
  });

  blessed.text({
    parent: descBox,
    top: 6,
    right: 2,
    tags: true,
    content: '{#90a4ae-fg}Press {bold}[?]{/bold} to close{/#90a4ae-fg}',
    style: { bg: '#111827' },
  });

  // -------------------------------------------------------------------------
  // Top: actions row + status row + info row + feedback
  // Positions are dynamic — shift down when description is open

  const _topOffset = () => _showDescription ? 10 : 0;

  const actionsLine = blessed.text({
    parent: box,
    top: 0,  // updated dynamically
    left: 4,
    tags: true,
    content: '',
    style: { fg: COLORS.labelFg, bg: COLORS.contentBg },
  });

  const statusLine = blessed.text({
    parent: box,
    top: 1,  // updated dynamically
    left: 4,
    tags: true,
    content: '',
    style: { fg: COLORS.labelFg, bg: COLORS.contentBg },
  });

  const infoLine = blessed.text({
    parent: box,
    top: 2,  // updated dynamically
    left: 4,
    tags: true,
    content: '',
    style: { fg: COLORS.noticeFg, bg: COLORS.contentBg },
  });

  const feedbackLine = blessed.text({
    parent: box,
    top: 3,  // updated dynamically
    left: 4,
    tags: true,
    content: '',
    style: { fg: COLORS.noticeFg, bg: COLORS.contentBg },
  });

  // -------------------------------------------------------------------------
  // Separator + section label + main content

  const separatorLine = blessed.text({
    parent: box,
    top: 5,  // updated dynamically
    left: 2,
    content: `{${COLORS.sectionHdr}-fg}${'─'.repeat(68)}{/${COLORS.sectionHdr}-fg}`,
    tags: true,
    style: { bg: COLORS.contentBg },
  });

  const sectionLabel = blessed.text({
    parent: box,
    top: 5,  // updated dynamically
    left: 4,
    tags: true,
    content: '',
    style: { bg: COLORS.contentBg },
  });

  const contentBox = blessed.box({
    parent: box,
    top: 7,  // updated dynamically
    left: 2,
    width: '96%',
    bottom: 2,
    tags: true,
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
  let _showDescription = true;  // Show description on first visit

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
    const [date = '', time = ''] = (msg.timestamp || '').split('T');
    const statusRaw = msg.status === 'DONE' ? 'OK  ' :
                      msg.status === 'ERROR' ? 'ERR ' :
                      msg.status === 'PLAYING' ? 'PLAY' :
                      msg.status === 'RECEIVED' ? 'RECV' :
                      msg.status === 'WARN' ? 'WARN' :
                      msg.status.substring(0, 4).padEnd(4);
    // Color-coded status
    const statusColor = msg.status === 'DONE' ? 'green' :
                        msg.status === 'ERROR' ? 'red' :
                        msg.status === 'WARN' ? 'yellow' :
                        msg.status === 'PLAYING' ? 'cyan' : 'white';
    const status = `{${statusColor}-fg}${statusRaw}{/${statusColor}-fg}`;
    const logId = `{#607d8b-fg}${(msg.logId || '—').padEnd(5)}{/#607d8b-fg}`;
    const ip = `{#ce93d8-fg}${(msg.ip || '—').substring(0, 15).padEnd(15)}{/#ce93d8-fg}`;
    const project = `{#4fc3f7-fg}${msg.project.substring(0, 12).padEnd(12)}{/#4fc3f7-fg}`;
    const voice = `{#ffb74d-fg}${msg.voice.substring(0, 18).padEnd(18)}{/#ffb74d-fg}`;
    const music = `{#a5d6a7-fg}${(msg.music || '—').substring(0, 15).padEnd(15)}{/#a5d6a7-fg}`;
    // Parse playback detail (sink, vol, pulse) from PLAYING log line
    const pd = msg.playDetail || '';
    const sinkMatch = pd.match(/sink=(\S+)/);
    const volMatch = pd.match(/vol=(\S+)/);
    const sinkName = sinkMatch ? sinkMatch[1].replace(/^alsa_output\./, '').substring(0, 20) : '—';
    const vol = volMatch ? volMatch[1] : '—';
    const sink = `{#b39ddb-fg}${sinkName.padEnd(20)}{/#b39ddb-fg}`;
    const volume = `{#ef9a9a-fg}${vol.padEnd(5)}{/#ef9a9a-fg}`;
    const text = `{red-fg}${msg.textPreview}{/red-fg}`;
    return `${logId}  {#90a4ae-fg}${date} ${time}{/#90a4ae-fg}  ${status}  ${ip}  ${project}  ${voice}  ${sink}  ${volume}  ${music}  ${text}`;
  }

  // -------------------------------------------------------------------------
  // Health check

  function _getToolChecks() {
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
    return checks.join('  ');
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
    feedbackLine.setContent('');
  }

  // -------------------------------------------------------------------------
  // Refresh display

  // Cache network info and tool checks (refresh every 30s, not every render)
  let _networkInfo = { tailscaleIp: '', localIp: '', sshPort: '22' };
  let _toolChecksCache = '';
  let _lastCacheTime = 0;
  const CACHE_TTL_MS = 30000;

  function _refreshCachedInfo() {
    const now = Date.now();
    if (now - _lastCacheTime > CACHE_TTL_MS) {
      _networkInfo = _getNetworkInfo();
      _toolChecksCache = _getToolChecks();
      _lastCacheTime = now;
    }
  }

  function refreshDisplay() {
    const enabled = _isReceiverEnabled();
    _refreshCachedInfo();

    // Toggle description box
    if (_showDescription) {
      descBox.show();
    } else {
      descBox.hide();
    }

    // Dynamic positioning based on description visibility
    const offset = _showDescription ? 10 : 0;
    actionsLine.top = offset;
    statusLine.top = offset + 1;
    infoLine.top = offset + 2;
    feedbackLine.top = offset + 3;
    separatorLine.top = offset + 5;
    sectionLabel.top = offset + 5;
    contentBox.top = offset + 7;

    // Actions row — each action a different color
    const enableLabel = enabled
      ? '{#ef5350-fg}{bold}[E]{/bold} Turn Off{/#ef5350-fg}'
      : '{#66bb6a-fg}{bold}[E]{/bold} Turn On{/#66bb6a-fg}';
    const speakerKey = '{#ce93d8-fg}{bold}[O]{/bold} Speaker{/#ce93d8-fg}';
    const detailLabel = _showDetails
      ? '{#4fc3f7-fg}{bold}[D]{/bold} Messages{/#4fc3f7-fg}'
      : '{#4fc3f7-fg}{bold}[D]{/bold} Setup Guide{/#4fc3f7-fg}';
    const clearKey = '{#ffb74d-fg}{bold}[C]{/bold} Clear Log{/#ffb74d-fg}';
    const copyKey = '{#a5d6a7-fg}{bold}[A]{/bold} Copy{/#a5d6a7-fg}';
    const descLabel = _showDescription
      ? '{#90a4ae-fg}{bold}[?]{/bold} Hide Info{/#90a4ae-fg}'
      : '{#90a4ae-fg}{bold}[?]{/bold} What is this?{/#90a4ae-fg}';
    actionsLine.setContent(`  ${enableLabel}    ${speakerKey}    ${detailLabel}    ${clearKey}    ${copyKey}    ${descLabel}`);

    // Status + Speaker
    const statusIcon = enabled ? '{green-fg}● ON{/green-fg}' : '{yellow-fg}● OFF{/yellow-fg}';
    let speakerDisplay = '{#90a4ae-fg}(default){/#90a4ae-fg}';
    try {
      const configured = readFileSync(SINK_FILE, 'utf-8').trim();
      if (configured) speakerDisplay = `{bold}${configured.replace(/^alsa_output\./, '')}{/bold}`;
    } catch { /* no config */ }
    statusLine.setContent(`  Status: ${statusIcon}    Speaker: ${speakerDisplay}`);

    // Network + tools + log — IP yellow, port cyan
    const ipDisplay = _networkInfo.tailscaleIp || _networkInfo.localIp || 'unknown';
    infoLine.setContent(`  IP: {yellow-fg}{bold}${ipDisplay}{/bold}{/yellow-fg}  Port: {#4fc3f7-fg}{bold}${_networkInfo.sshPort}{/bold}{/#4fc3f7-fg}    Tools: ${_toolChecksCache}    Log: {#90a4ae-fg}${LOG_FILE}{/#90a4ae-fg}`);

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
          'Press [D] above for setup guide.',
        ].join('\n');
        contentBox.setContent(text);
      } else {
        const header = `{#607d8b-fg}${'ID'.padEnd(5)}{/#607d8b-fg}  {#90a4ae-fg}${'DATE'.padEnd(10)} ${'TIME'.padEnd(8)}{/#90a4ae-fg}  {bold}${'STAT'.padEnd(4)}{/bold}  {#ce93d8-fg}${'IP'.padEnd(15)}{/#ce93d8-fg}  {#4fc3f7-fg}${'PROJECT'.padEnd(12)}{/#4fc3f7-fg}  {#ffb74d-fg}${'VOICE'.padEnd(18)}{/#ffb74d-fg}  {#b39ddb-fg}${'SPEAKER'.padEnd(20)}{/#b39ddb-fg}  {#ef9a9a-fg}${'VOL'.padEnd(5)}{/#ef9a9a-fg}  {#a5d6a7-fg}${'MUSIC'.padEnd(15)}{/#a5d6a7-fg}  {red-fg}TEXT{/red-fg}`;
        const separator = '─'.repeat(78);
        const lines = [header, separator];
        // Group log lines per request — show one row with final status
        // Each request produces RECEIVED → PLAYING → DONE/ERROR
        const grouped = [];
        let current = null;
        for (const msg of _messages) {
          if (msg.status === 'RECEIVED') {
            current = { ...msg };
          } else if (current && msg.status === 'PLAYING') {
            // Merge PLAYING detail (sink, vol, pulse) into grouped row
            current.playDetail = msg.detail;
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
    // Copy all visible content to clipboard — strip blessed markup tags
    const text = contentBox.getContent().replace(/\{[^}]*\}/g, '');
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

  box.key(['?'], () => {
    _showDescription = !_showDescription;
    refreshDisplay();
  });

  box.key(['o', 'O'], () => {
    // List available audio sinks and let user pick one
    let sinks;
    try {
      const out = execSync('pactl --server=tcp:127.0.0.1:34567 list sinks short 2>/dev/null || pactl list sinks short 2>/dev/null', { timeout: 5000 }).toString().trim();
      sinks = out.split('\n').filter(l => l.length > 0).map(line => {
        const parts = line.split('\t');
        return { id: parts[0], name: parts[1] || '', driver: parts[2] || '', state: parts[4] || '' };
      });
    } catch {
      _showFeedback('{red-fg}Failed to list audio outputs{/red-fg}');
      return;
    }
    if (sinks.length === 0) {
      _showFeedback('{red-fg}No audio outputs found{/red-fg}');
      return;
    }

    // Read current configured sink
    let currentSink = '';
    try { currentSink = readFileSync(SINK_FILE, 'utf-8').trim(); } catch { /* none set */ }

    const sinkList = blessed.list({
      parent: screen,
      top: 'center',
      left: 'center',
      width: '80%',
      height: Math.min(sinks.length + 4, 20),
      tags: true,
      border: { type: 'line' },
      label: ' Select Audio Output (Enter to confirm, Esc to cancel) ',
      style: {
        fg: COLORS.labelFg,
        bg: '#1a1a2e',
        border: { fg: COLORS.sectionHdr },
        selected: { fg: '#000000', bg: '#80cbc4' },
        item: { fg: COLORS.labelFg, bg: '#1a1a2e' },
      },
      keys: true,
      vi: true,
      items: sinks.map(s => {
        const marker = s.name === currentSink ? ' {green-fg}◆{/green-fg}' : '  ';
        const stateColor = s.state === 'RUNNING' ? 'green' : s.state === 'SUSPENDED' ? 'yellow' : 'gray';
        // Strip alsa_output. prefix for readability
        const shortName = s.name.replace(/^alsa_output\./, '');
        return `${marker} {bold}${shortName}{/bold}  {${stateColor}-fg}${s.state}{/${stateColor}-fg}`;
      }),
    });

    sinkList.focus();
    screen.render();

    sinkList.on('select', (_item, index) => {
      const chosen = sinks[index].name;
      try {
        writeFileSync(SINK_FILE, chosen + '\n');
        // Also write to receiver user's config if accessible
        if (SINK_FILE !== RECEIVER_SINK_FILE) {
          try { writeFileSync(RECEIVER_SINK_FILE, chosen + '\n'); } catch { /* no access */ }
        }
        _showFeedback(`{green-fg}Speaker set: ${chosen.replace(/^alsa_output\./, '')}{/green-fg}`);
      } catch (e) {
        _showFeedback(`{red-fg}Failed to save speaker: ${e.message}{/red-fg}`);
      }
      sinkList.destroy();
      box.focus();
      refreshDisplay();
    });

    sinkList.key(['escape', 'q'], () => {
      sinkList.destroy();
      box.focus();
      screen.render();
    });
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

---
name: agentvibes-target
description: Send TTS text from Hermes to a Windows laptop or Android device via AgentVibes queue-based player over SSH
category: tts
required_environment_variables:
  - AGENTVIBES_SSH_KEY
  - AGENTVIBES_RECEIVER_HOST
  - AGENTVIBES_RECEIVER_PORT
  - AGENTVIBES_RECEIVER_USER
  - AGENTVIBES_ANDROID_HOST
  - AGENTVIBES_ANDROID_PORT
  - AGENTVIBES_ANDROID_USER
---

# AgentVibes TTS — Send Text to a Remote Device

## Architecture

```
Hermes (VPS/Docker) --[SSH, base64]--> Windows receiver: $AGENTVIBES_RECEIVER_HOST:$AGENTVIBES_RECEIVER_PORT
                                  OR
                                       Android receiver: $AGENTVIBES_ANDROID_HOST:$AGENTVIBES_ANDROID_PORT

Windows: Piper TTS --> speakers
Android: Piper TTS --> speakers
```

AgentVibes uses a **queue-based player**: SSH call enqueues a base64-encoded TTS payload and returns immediately; a background worker handles synthesis and playback sequentially.

Two targets are supported:
- **Windows** (primary) — user `agentvibes-receiver`, queue-based playback
- **Android** — via Termux SSH receiver

---

## How It Works

The receiver at `$AGENTVIBES_RECEIVER_HOST:$AGENTVIBES_RECEIVER_PORT` is an SSH server that accepts **only base64-encoded JSON payloads** — it does NOT execute shell commands and does NOT read from stdin/pty. You pass the base64 string as a **command-line argument** (not piped or sent via TTY), and it queues the text for TTS playback.

**Critical: Do NOT pipe or TTY-send the payload** — the receiver ignores stdin. The base64 string must appear as a plain argument after the user@host.

### Payload format

The payload is a **base64-encoded JSON object**. All fields except `text` are optional — omit or leave empty to use the receiver's current defaults.

```json
{
  "text":     "Words to speak aloud",
  "voice":    "en_US-libritts-high::Leo-8",
  "music":    "bachata",
  "volume":   "0.30",
  "effects":  "medium",
  "pretext":  "Hermes here, ",
  "speed":    "",
  "provider": "piper",
  "project":  "hermes"
}
```

| Field | What it controls | Examples |
|-------|-----------------|---------|
| `text` | Text to speak | Any string |
| `voice` | Voice model and speaker | `en_US-libritts-high::Leo-8`, `en_US-jenny-medium` |
| `music` | Background music track | `bachata`, `chillwave`, `dreamy-house`, `""` = use default |
| `volume` | Background music volume (0.0–1.0) | `"0.25"`, `"0.40"` |
| `effects` | Reverb preset (Windows) or Sox string (Linux) | `"off"`, `"light"`, `"medium"`, `"heavy"`, `"cathedral"` |
| `pretext` | Spoken prefix prepended to text | `"Hermes here, "`, `""` = no prefix |
| `speed` | Speech rate multiplier | `"1.2"` = faster, `""` = default |
| `provider` | TTS engine | `"piper"` |
| `project` | Tag shown in receiver log | `"hermes"` |

**To change voice:** set `voice` to any `voiceId` or `voiceId::SpeakerName` string. Ask the user which voice they want, or use `list_voices` if the AgentVibes MCP server is available.

**To change music:** set `music` to a track keyword (`bachata`, `chillwave`, `dreamy-house`) or `""` to inherit the receiver default.

**To remove reverb:** set `effects` to `"off"`.

**To add reverb:** set `effects` to `"light"`, `"medium"`, `"heavy"`, or `"cathedral"`.

### Step 1: Build and encode the payload
```bash
PAYLOAD=$(echo -n '{"text":"Your message here","voice":"","music":"","effects":"","pretext":"Hermes here, ","volume":"","speed":"","provider":"piper","project":"hermes"}' | base64 -w 0)
```

### Step 2: SSH the base64 payload to the receiver
```bash
ssh -i "$AGENTVIBES_SSH_KEY" -o ConnectTimeout=10 -o StrictHostKeyChecking=no \
  -p "$AGENTVIBES_RECEIVER_PORT" "$AGENTVIBES_RECEIVER_USER@$AGENTVIBES_RECEIVER_HOST" "$PAYLOAD"
```

### Step 3: Response
Returns `Queued for playback: <id>` on success.

---

## Prerequisites

1. **OpenSSH client** installed on the Hermes server:
   ```bash
   apt-get install -y openssh-client
   ```

2. **Ed25519 SSH key** for the `agentvibes-receiver` user:
   - Private key at an absolute path (no tilde — subprocess won't expand it)
   - Public key must be registered on the receiver machine

3. **Docker networking**: If running Hermes in Docker with Tailscale, SSH to Tailscale peers works from inside the container — Tailscale proxies the traffic. Do NOT assume `--network=host` is needed unless SSH times out.

4. **Environment variables** must be set in `~/.bashrc` (not in `.env` — that file is not read by the gateway shell):
   ```bash
   export AGENTVIBES_SSH_KEY=/absolute/path/to/id_ed25519
   export AGENTVIBES_RECEIVER_HOST=<your-receiver-tailscale-ip>
   export AGENTVIBES_RECEIVER_PORT=<your-receiver-port>
   export AGENTVIBES_RECEIVER_USER=agentvibes-receiver
   export AGENTVIBES_ANDROID_HOST=<your-android-tailscale-ip>
   export AGENTVIBES_ANDROID_PORT=<your-android-port>
   export AGENTVIBES_ANDROID_USER=<your-android-user>
   ```

## Common Mistakes

**Using port 22** — Wrong. The AgentVibes receiver listens on the port configured during `npx agentvibes install`, NOT 22. Check your receiver setup for the correct port.

**Sending plain text or piping** — The receiver does NOT read from stdin/pty. It only accepts a base64-encoded string as a command-line argument. If you get `"Payload must be base64-encoded"`, you either sent plain text or tried to pipe/echo into SSH. Correct: `ssh ... 'BASE64STRING'` with the base64 as an argument.

**Using hostname instead of IP** — Hostnames may NOT resolve from inside a Docker container (Docker network namespace isolation). Use the direct IP (e.g., Tailscale IP) rather than a hostname alias.

**No SSH key mounted** — If the container has no SSH key, generate one:
  ```bash
  ssh-keygen -t ed25519 -f /absolute/path/to/id_ed25519 -N ""
  ```
  Then register the public key on the receiver machine's `agentvibes-receiver` user.

## Important Rules

- **Always base64-encode** the message before sending via SSH — the receiver rejects plain text.
- **Keep messages short** (~150 chars) — the queue worker plays sequentially, so long messages block subsequent ones.
- **Do NOT parallelize SSH calls** — wait for each call to return before sending the next.
- The SSH call returns immediately after enqueueing — do NOT wait for audio to finish.
- Messages are queued with a unique ID (e.g., `ff81350a`) — this is just a queue reference.

---

## Switching Target: Windows vs Android

The user can switch between two AgentVibes targets:

1. **Windows** (default) — `$AGENTVIBES_RECEIVER_HOST:$AGENTVIBES_RECEIVER_PORT`, Piper TTS, queue-based playback.
2. **Android** — `$AGENTVIBES_ANDROID_HOST:$AGENTVIBES_ANDROID_PORT`, user `$AGENTVIBES_ANDROID_USER`, Piper TTS via Termux.

### SSH commands by target

**Windows:**
```bash
ssh -i "$AGENTVIBES_SSH_KEY" -o ConnectTimeout=10 -o StrictHostKeyChecking=no \
  -p "$AGENTVIBES_RECEIVER_PORT" "$AGENTVIBES_RECEIVER_USER@$AGENTVIBES_RECEIVER_HOST" '<base64>'
```

**Android:**
```bash
ssh -i "$AGENTVIBES_SSH_KEY" -o ConnectTimeout=10 -o StrictHostKeyChecking=no \
  -p "$AGENTVIBES_ANDROID_PORT" "$AGENTVIBES_ANDROID_USER@$AGENTVIBES_ANDROID_HOST" '<base64>'
```

---

## Troubleshooting

**"Payload must be base64-encoded"**
→ The receiver requires base64 passed as a **command-line argument**, not piped via stdin. Correct: `ssh ... 'BASE64STRING'`. Wrong: `echo BASE64 | ssh ...` or `ssh ... < file`.

**"Permission denied (publickey)" on Windows receiver**
→ The SSH public key is not registered on the `agentvibes-receiver` user. Re-run the receiver setup on the Windows machine.

**"Permission denied (publickey)" on Android**
→ The same key must be installed on the Android device. Get the public key:
  ```bash
  cat /absolute/path/to/id_ed25519.pub
  ```
  Register it on the Android device and retry.

**SSH times out**
→ Docker network namespace issue — Tailscale may not be running inside the container. Try restarting the container with `--network=host`, or verify Tailscale is active inside the container.

**Hook loaded but not working**
→ Gateway must be restarted to pick up new hooks — the hook system is discovered at startup only.
→ Verify hook is loaded: check gateway logs for `discover_and_load()` output and confirm `hooks/agentvibes-tts/` exists in your Hermes home directory.

---

## npx agentvibes

`npx agentvibes` is a **TUI console** for interactive setup on the target machine — it does NOT provide a headless API for programmatic sending. Use the Python hook (`handler.py`) for automated sending from Hermes.

**No separate AgentVibes API key is needed.** The SSH key is the only credential required.

---

## Auto-Speak: Hook on Every Response

See the companion skill `hermes-agentvibes-hook` for a complete hook that auto-speaks every Hermes response. It fires on `agent:end` events and handles all encoding, rate-limiting, and error logging.

**Useful CLI TTS distinction:**

`auto_tts: true` in Hermes config does NOT make Hermes speak in CLI mode — it only pre-enables TTS once you enter voice recording mode (`/voice on`). For CLI text-to-speech without voice recording:
- Run `/voice tts` to toggle TTS on/off
- Run `/voice on` to enter full voice recording mode (TTS auto-enabled)

`auto_tts` is NOT a global "always speak" flag.

---

## What NOT to do

- Do NOT send plain text to the receiver — always base64-encode
- Do NOT wait for audio playback to finish — the SSH call enqueues and returns immediately
- Do NOT put env vars in `.env` files that the gateway shell doesn't read — use `~/.bashrc`

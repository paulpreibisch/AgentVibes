---
name: hermes-agentvibes-hook
description: Auto-speak every Hermes response via AgentVibes TTS on a remote machine over SSH. Portable skill — works with any AgentVibes setup.
category: tts
---

# Hermes ↔ AgentVibes TTS Hook

Send every Hermes response as spoken audio to a remote machine via the AgentVibes SSH receiver.

## Architecture

```
Hermes (server/Docker)
  └── agent:end event fires
      └── hooks/agentvibes-tts/handler.py
          └── strip markdown, truncate at word boundary
          └── JSON payload → base64-encode
          └── SSH → agentvibes-receiver@<host>:<port>
              └── Remote machine queues & plays via Piper TTS
```

## Setup

### 1. Install AgentVibes on the target machine (the one with speakers)

```bash
npx agentvibes install
```

### 2. Generate an SSH key on the Hermes server

```bash
ssh-keygen -t ed25519 -f /absolute/path/to/id_ed25519_agentvibes -N ""
```

Use an **absolute path** — tilde (`~`) expansion does not work inside Python subprocess argument lists.

Register the public key on the target machine's `agentvibes-receiver` user.

### 3. Create the hook directory and files

Create `<hermes_home>/hooks/agentvibes-tts/HOOK.yaml`:

```yaml
name: agentvibes-tts
description: Send agent responses to AgentVibes TTS remotely
events:
  - agent:end
```

Create `<hermes_home>/hooks/agentvibes-tts/handler.py` — update the four config constants at the top:

```python
"""
AgentVibes TTS Hook — fires on agent:end to speak the agent's response.

Sends the response via SSH to the AgentVibes receiver using the full JSON
payload format (supports voice, project, effects metadata).
"""

import asyncio
import base64
import json
import logging
import os
import re
import subprocess
import time

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

AGENTVIBES_SSH_KEY  = "/absolute/path/to/id_ed25519"   # no tilde — subprocess won't expand it
AGENTVIBES_HOST     = "<target-ip-or-hostname>"
AGENTVIBES_PORT     = "<receiver-port>"
AGENTVIBES_USER     = "agentvibes-receiver"
AGENTVIBES_VOICE    = "en_US-libritts-high::Leo-8"
AGENTVIBES_PROJECT  = "hermes"
MAX_CONTENT_LEN     = 200          # chars of spoken content (prefix NOT counted)
PREFIX              = "Hermes here, "
_KNOWN_HOSTS        = "/absolute/path/to/known_hosts"   # persistent across restarts
_LOG_FILE           = os.path.join(os.path.dirname(os.path.abspath(__file__)), "tts-hook.log")

# ---------------------------------------------------------------------------
# File logger — writes to tts-hook.log next to handler.py, never to stdout
# ---------------------------------------------------------------------------

_log = logging.getLogger("agentvibes-tts")
if not _log.handlers:
    try:
        _h = logging.FileHandler(_LOG_FILE, encoding="utf-8")
        _h.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(message)s"))
        _log.addHandler(_h)
    except OSError:
        _log.addHandler(logging.NullHandler())
    _log.setLevel(logging.INFO)

# ---------------------------------------------------------------------------
# Rate limiting — prevent queue flooding on rapid consecutive turns
# ---------------------------------------------------------------------------

_last_sent: float = 0.0
_MIN_INTERVAL_S: float = 3.0


def _tts_speak(text: str) -> None:
    """Build JSON payload and send to AgentVibes receiver over SSH."""
    global _last_sent

    if not text or not text.strip():
        return

    now = time.monotonic()
    if now - _last_sent < _MIN_INTERVAL_S:
        _log.info("rate-limited: %.1fs since last send — skipping", now - _last_sent)
        return
    _last_sent = now

    # Truncate at word boundary so the spoken text never cuts mid-syllable
    full_text = PREFIX + text.strip()
    max_len = len(PREFIX) + MAX_CONTENT_LEN
    if len(full_text) > max_len:
        truncated = full_text[:max_len].rsplit(" ", 1)[0]
        full_text = truncated + "..."

    payload = base64.b64encode(
        json.dumps({
            "text":     full_text,
            "voice":    AGENTVIBES_VOICE,
            "project":  AGENTVIBES_PROJECT,
            "provider": "piper",
            "pretext":  "",   # prefix already prepended above
            "effects":  "",
            "music":    "",
            "volume":   "",
            "speed":    "",
        }).encode()
    ).decode()

    cmd = [
        "ssh",
        "-i", AGENTVIBES_SSH_KEY,
        "-o", "ConnectTimeout=5",
        # accept-new: trust the host key on first connection, reject changes
        # (MITM protection without interactive prompts)
        "-o", "StrictHostKeyChecking=accept-new",
        "-o", f"UserKnownHostsFile={_KNOWN_HOSTS}",
        "-o", "BatchMode=yes",
        "-p", AGENTVIBES_PORT,
        f"{AGENTVIBES_USER}@{AGENTVIBES_HOST}",
        payload,
    ]

    try:
        result = subprocess.run(cmd, capture_output=True, timeout=15)
        if result.returncode != 0:
            stderr = result.stderr.decode(errors="replace").strip()
            _log.warning("ssh exit %d: %s", result.returncode, stderr or "(no stderr)")
        else:
            stdout = result.stdout.decode(errors="replace").strip()
            _log.info("queued OK: %s", stdout)
    except subprocess.TimeoutExpired:
        _log.warning("ssh timed out after 15s to %s:%s", AGENTVIBES_HOST, AGENTVIBES_PORT)
    except Exception as exc:
        _log.warning("ssh error: %s", exc)


async def handle(event_type: str, context: dict) -> None:
    """Async handler — only processes agent:end events."""
    if event_type != "agent:end":
        return

    response = (context.get("response") or "").strip()
    if not response:
        return

    response = _strip_markdown(response)

    loop = asyncio.get_running_loop()
    await loop.run_in_executor(None, _tts_speak, response)


def _strip_markdown(text: str) -> str:
    """Remove markdown artifacts that sound unnatural in TTS."""
    # Fenced code blocks — always unlistenable
    text = re.sub(r"```[\s\S]*?```", "", text)
    # Inline code — unwrap
    text = re.sub(r"`([^`]+)`", r"\1", text)
    # Bold / italic markers
    text = re.sub(r"\*{1,2}([^\*]+)\*{1,2}", r"\1", text)
    # Links — keep label, drop URL
    text = re.sub(r"\[([^\]]+)\]\([^\)]+\)", r"\1", text)
    # Emoji — strip everywhere, not just line-start
    text = re.sub(
        r"[\U0001F300-\U0001F9FF"
        r"\U00002600-\U000027FF"
        r"\U0000FE00-\U0000FE0F"
        r"•→↓↑]+",
        "",
        text,
    )
    text = re.sub(r"\s+", " ", text).strip()
    return text
```

### 4. Restart gateway

```bash
hermes gateway restart
```

### 5. Verify

Check `hooks/agentvibes-tts/tts-hook.log` after the next agent turn. Every SSH call logs its result (exit code, receiver ACK, or error message).

## Configuration Reference

| Constant | Description | Notes |
|----------|-------------|-------|
| `AGENTVIBES_SSH_KEY` | Absolute path to SSH private key | No `~` — subprocess will not expand it |
| `AGENTVIBES_HOST` | Hostname or IP of target machine | Tailscale IP recommended |
| `AGENTVIBES_PORT` | SSH port of AgentVibes receiver | Set during `npx agentvibes install` |
| `AGENTVIBES_USER` | SSH user on target machine | `agentvibes-receiver` |
| `AGENTVIBES_VOICE` | Voice in `voiceId::SpeakerName` format | e.g. `en_US-libritts-high::Leo-8` |
| `AGENTVIBES_PROJECT` | Project tag shown in receiver log | `hermes` |
| `MAX_CONTENT_LEN` | Max chars of spoken content | Prefix length NOT counted |
| `PREFIX` | Spoken intro before each response | `Hermes here, ` |
| `_KNOWN_HOSTS` | Absolute path to persistent known_hosts | Required for `accept-new` to survive restarts |
| `_MIN_INTERVAL_S` | Seconds between TTS calls | Prevents queue flooding on rapid turns |

## How It Works

1. Guards on `event_type == "agent:end"` — ignores all other hook events
2. Strips markdown (code blocks, bold, links, emoji — anywhere in the string)
3. Prepends `PREFIX`, truncates at last word boundary before `MAX_CONTENT_LEN` chars, appends `...`
4. Builds JSON payload with voice, project, and provider fields (uses AgentVibes full format, not legacy plain text)
5. Base64-encodes and sends over SSH — every call logged to `tts-hook.log`
6. `StrictHostKeyChecking=accept-new` + explicit `UserKnownHostsFile` protects against MITM after first connect

## Troubleshooting

- **No audio, no `tts-hook.log`**: Check `HERMES_HOME` env var so the hook file is found; check directory write permissions
- **SSH permission denied**: Register the key's public half on the `agentvibes-receiver` user
- **SSH host key changed error**: Remove the stale entry from the `_KNOWN_HOSTS` file and reconnect once
- **"Queued" but silent on target**: Check the queue watcher (`tts-watcher.ps1`) is running on the target machine
- **Responses not spoken**: Check `tts-hook.log` — SSH errors are now logged with full detail

## MCP Server Integration

AgentVibes ships with an MCP server (`npx agentvibes-mcp-server`) with tools for voice selection, effects, background music, and mute/unmute. Install it in your Hermes MCP config to control AgentVibes with natural language commands. The MCP server must run on the target machine where speakers live.

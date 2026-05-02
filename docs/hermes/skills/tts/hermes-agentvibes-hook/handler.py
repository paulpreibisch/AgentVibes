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
# Configuration — set these via environment variables or edit directly
# ---------------------------------------------------------------------------

AGENTVIBES_SSH_KEY  = os.environ.get("AGENTVIBES_SSH_KEY",  "/absolute/path/to/id_ed25519")
AGENTVIBES_HOST     = os.environ.get("AGENTVIBES_HOST",     "<target-ip-or-hostname>")
AGENTVIBES_PORT     = os.environ.get("AGENTVIBES_PORT",     "<receiver-port>")
AGENTVIBES_USER     = os.environ.get("AGENTVIBES_USER",     "agentvibes-receiver")
AGENTVIBES_VOICE    = os.environ.get("AGENTVIBES_VOICE",    "en_US-libritts-high::Leo-8")
AGENTVIBES_MUSIC    = os.environ.get("AGENTVIBES_MUSIC",    "")   # e.g. "bachata", "chillwave" — empty = use receiver default
AGENTVIBES_PROJECT  = os.environ.get("AGENTVIBES_PROJECT",  "hermes")
MAX_CONTENT_LEN     = 200          # chars of spoken content (prefix NOT counted)
PREFIX              = "Hermes here, "
_KNOWN_HOSTS        = os.environ.get(
    "AGENTVIBES_KNOWN_HOSTS",
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "known_hosts"),
)
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
            "music":    AGENTVIBES_MUSIC,
            "volume":   "",
            "speed":    "",
        }).encode()
    ).decode()

    cmd = [
        "ssh",
        "-i", AGENTVIBES_SSH_KEY,
        "-o", "ConnectTimeout=5",
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
    text = re.sub(r"```[\s\S]*?```", "", text)
    text = re.sub(r"`([^`]+)`", r"\1", text)
    text = re.sub(r"\*{1,2}([^\*]+)\*{1,2}", r"\1", text)
    text = re.sub(r"\[([^\]]+)\]\([^\)]+\)", r"\1", text)
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

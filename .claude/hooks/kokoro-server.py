#!/usr/bin/env python3
#
# File: .claude/hooks/kokoro-server.py
#
# AgentVibes - Kokoro TTS persistent daemon
# Loads the Kokoro model ONCE (on GPU when available) and serves synthesis over
# a localhost HTTP socket, so each request skips the ~10s model-load + CUDA-init
# cost that a fresh `python kokoro-tts.py` invocation pays every time.
#
# This is the difference between ~31s/message (cold process per call) and
# ~2-3s/message (warm resident model).
#
# Endpoints (bound to 127.0.0.1 only — never exposed off-host):
#   GET  /health  -> 200 {"ok":true} once the model is loaded and warmed
#   POST /synth   -> body {text, voice, speed, output}; writes a WAV to `output`
#                    and returns {"ok":true,"path":output} or {"ok":false,"error":...}
#
# Usage: python kokoro-server.py [port]   (default port 7855)
#
# Licensed under the Apache License, Version 2.0
#
import json
import os
import sys
import tempfile
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

# A bad argv[1] (non-numeric) must not crash the daemon before it can bind;
# fall back to the standard kokoro-server port.
try:
    PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 7855
except (ValueError, IndexError):
    PORT = 7855

# Language code from the voice prefix (af/am=American, bf/bm=British, etc.)
LANG_MAP = {
    'af': 'a', 'am': 'a', 'bf': 'b', 'bm': 'b', 'jf': 'j', 'jm': 'j',
    'kf': 'k', 'km': 'k', 'zf': 'z', 'zm': 'z', 'ff': 'f', 'fm': 'f',
    'hf': 'h', 'hm': 'h', 'if': 'i', 'im': 'i', 'pf': 'p', 'pm': 'p',
    'ef': 'e', 'em': 'e', 'nf': 'n', 'nm': 'n',
}

# Heavy imports up front so the model is resident before we accept connections.
import numpy as np
import soundfile as sf
from kokoro import KPipeline

_pipelines = {}
_lock = threading.Lock()        # guards pipeline creation only
_infer_lock = threading.Lock()  # serializes inference (torch is not thread-safe)


def get_pipeline(lang_code):
    """Return a cached KPipeline for the language, creating it once on demand."""
    with _lock:
        pipe = _pipelines.get(lang_code)
        if pipe is None:
            pipe = KPipeline(lang_code=lang_code)
            _pipelines[lang_code] = pipe
        return pipe


def synth(text, voice, speed, output):
    """Synthesize `text` with `voice` to the `output` WAV path. Returns the path."""
    prefix = voice[:2].lower() if len(voice) >= 2 else 'af'
    lang_code = LANG_MAP.get(prefix, 'a')
    pipeline = get_pipeline(lang_code)

    chunks = []
    # The daemon shares one KPipeline across ThreadingHTTPServer worker threads
    # and torch inference is not thread-safe — run one inference at a time. This
    # lock is acquired after get_pipeline() has released _lock, so no deadlock.
    with _infer_lock:
        for result in pipeline(text, voice=voice, speed=speed):
            audio = getattr(result, "audio", None)
            if audio is None:
                try:
                    audio = result[-1]
                except (TypeError, IndexError, KeyError):
                    audio = None
            if audio is None:
                continue
            if hasattr(audio, "detach"):
                audio = audio.detach().cpu().numpy()
            audio = np.asarray(audio).reshape(-1)
            if audio.size > 0:
                chunks.append(audio)

    if not chunks:
        raise RuntimeError("Kokoro returned no audio samples")

    sf.write(output, np.concatenate(chunks), 24000)  # kokoro is always 24 kHz
    return output


def _allowed_output_dirs():
    """Directories a /synth request is permitted to write a WAV into.

    Mirrors the shell hooks' audio-cache resolution (project-local first, then
    the global ~/.claude/audio) plus TEMP, which is where the daemon writes its
    own transient/warmup files.
    """
    dirs = []
    proj = os.environ.get("CLAUDE_PROJECT_DIR")
    if proj:
        dirs.append(os.path.join(proj, ".claude", "audio"))
    home = os.environ.get("HOME") or os.path.expanduser("~")
    dirs.append(os.path.join(home, ".claude", "audio"))
    dirs.append(os.environ.get("TEMP", "/tmp"))
    return dirs


def is_output_within_cache(output):
    """True if `output` resolves inside an allowed audio dir (blocks traversal).

    The daemon is shared across projects on a fixed port, so it cannot rely on
    its own CLAUDE_PROJECT_DIR to know every project's audio dir. Accept the
    home/TEMP locations plus any file that sits directly inside a ".claude/audio"
    directory (the only place the providers ever write). realpath has already
    collapsed any "..", so true traversal (e.g. /etc/x.wav) is still rejected.
    """
    tgt = os.path.realpath(output)
    for base in _allowed_output_dirs():
        base = os.path.realpath(base)
        if tgt == base or tgt.startswith(base + os.sep):
            return True
    # Project-local audio dir for ANY project — the file must live directly in
    # a ".claude/audio" directory.
    parent = os.path.dirname(tgt).replace("\\", "/").lower()
    if parent.endswith("/.claude/audio"):
        return True
    return False


class Handler(BaseHTTPRequestHandler):
    # Silence default per-request stderr logging
    def log_message(self, *args):
        pass

    def _send(self, code, obj):
        data = json.dumps(obj).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        try:
            self.wfile.write(data)
        except OSError:
            # Client closed the socket early (health probes do this) — WinError
            # 10053/10054 etc. Nothing to send to; ignore.
            pass

    def do_GET(self):
        if self.path == "/health":
            self._send(200, {"ok": True})
        else:
            self._send(404, {"ok": False, "error": "not found"})

    def do_POST(self):
        if self.path != "/synth":
            self._send(404, {"ok": False, "error": "not found"})
            return
        try:
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length) or b"{}")
            text = body["text"]
            voice = body.get("voice", "af_heart")
            speed = float(body.get("speed", 1.0))
            output = body["output"]
            # Output must be an absolute .wav path (the provider always supplies one)
            if not isinstance(output, str) or not output.lower().endswith(".wav"):
                raise ValueError("output must be a .wav path")
            # Path-traversal guard: the resolved target must stay inside an
            # allowed audio directory — reject before any file is written.
            if not is_output_within_cache(output):
                self._send(400, {"ok": False, "error": "output path outside allowed audio directory"})
                return
            synth(text, voice, speed, output)
            self._send(200, {"ok": True, "path": output})
        except Exception as e:  # noqa: BLE001 - report any failure to the client
            self._send(500, {"ok": False, "error": str(e)})


def main():
    try:
        import torch
        device = "cuda" if torch.cuda.is_available() else "cpu"
    except Exception:
        device = "cpu"

    # Bind first so a second accidental launch fails fast (address in use) and
    # exits instead of loading a second copy of the model.
    try:
        server = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    except OSError as e:
        print(f"kokoro-server: port {PORT} unavailable ({e}); another instance is likely running", file=sys.stderr)
        sys.exit(0)

    # Warm the default English pipeline + trigger CUDA kernel compilation so the
    # very first real /synth request is already fast.
    warm_fd, warm_out = tempfile.mkstemp(suffix=".wav")
    os.close(warm_fd)  # synth/soundfile reopens by path; we only need the name
    try:
        synth("ready", "af_heart", 1.0, warm_out)
    except Exception as e:  # noqa: BLE001
        print(f"kokoro-server: warmup failed (continuing): {e}", file=sys.stderr)
    finally:
        try:
            os.remove(warm_out)
        except OSError:
            pass

    print(f"kokoro-server ready on 127.0.0.1:{PORT} device={device}", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()

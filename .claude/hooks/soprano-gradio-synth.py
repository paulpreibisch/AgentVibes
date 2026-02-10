#!/usr/bin/env python3
#
# File: .claude/hooks/soprano-gradio-synth.py
#
# AgentVibes - Finally, your AI Agents can Talk Back!
# Website: https://agentvibes.org
# Repository: https://github.com/paulpreibisch/AgentVibes
#
# Co-created by Paul Preibisch with Claude AI
# Copyright (c) 2025 Paul Preibisch
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
# ---
#
# Soprano Gradio WebUI synthesizer helper.
# Calls the Soprano WebUI's Gradio API and saves the result as a WAV file.
# Uses only Python stdlib (json, sys, urllib) — no extra dependencies.
#
# Usage: python3 soprano-gradio-synth.py "text to speak" output.wav [port]
#
"""
Soprano Gradio WebUI synthesizer helper for AgentVibes.

Calls the Soprano WebUI's Gradio API via the Server-Sent Events (SSE) protocol
and downloads the generated audio as a WAV file.

Flow:
  1. Submit generation request → get event_id
  2. Poll SSE stream for audio file URL
  3. Download WAV file to output path

See: https://github.com/ekwek1/soprano
"""
import json
import sys
import urllib.request
import urllib.error


def synth(text: str, output_path: str, port: int = 7860) -> None:
    base = f"http://127.0.0.1:{port}"

    # Step 1: Submit generation request
    # Args: text, temperature, top_p, repetition_penalty, chunk_size, streaming
    payload = json.dumps({
        "data": [text, 0.0, 0.95, 1.2, 1, False]
    }).encode()

    event_id = submit_request(base, payload)

    # Step 2: Poll SSE stream for audio file URL
    audio_url = poll_for_result(base, event_id)

    # Step 3: Download the audio file
    download_file(audio_url, output_path)


def submit_request(base: str, payload: bytes) -> str:
    """Submit generation request to Gradio API, return event_id."""
    for api_base in ["/gradio_api/call", "/call"]:
        url = f"{base}{api_base}/generate_speech"
        req = urllib.request.Request(
            url,
            data=payload,
            headers={"Content-Type": "application/json"},
        )
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                return json.loads(resp.read())["event_id"]
        except urllib.error.URLError:
            continue

    raise RuntimeError("Could not reach Soprano WebUI API")


def poll_for_result(base: str, event_id: str) -> str:
    """Poll SSE endpoint until audio file URL is returned."""
    for api_base in ["/gradio_api/call", "/call"]:
        url = f"{base}{api_base}/generate_speech/{event_id}"
        req = urllib.request.Request(url)
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                for raw_line in resp:
                    line = raw_line.decode("utf-8", errors="replace").strip()
                    if not line.startswith("data: "):
                        continue
                    try:
                        parsed = json.loads(line[6:])
                    except json.JSONDecodeError:
                        continue
                    # Response format: [{"path": "...", "url": "...", ...}, "status string"]
                    if isinstance(parsed, list) and len(parsed) >= 1:
                        audio = parsed[0]
                        if isinstance(audio, dict) and "url" in audio:
                            return audio["url"]
            break
        except urllib.error.URLError:
            continue

    raise RuntimeError("No audio URL in Soprano response")


def download_file(url: str, output_path: str) -> None:
    """Download audio file from Gradio file server."""
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req, timeout=30) as resp:
        with open(output_path, "wb") as f:
            while True:
                chunk = resp.read(8192)
                if not chunk:
                    break
                f.write(chunk)


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(f"Usage: {sys.argv[0]} \"text\" output.wav [port]", file=sys.stderr)
        sys.exit(1)

    text = sys.argv[1]
    output = sys.argv[2]
    port = int(sys.argv[3]) if len(sys.argv) > 3 else 7860

    try:
        synth(text, output, port)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

#!/usr/bin/env python3
"""
File: mcp-server/server.py

AgentVibes - Finally, your AI Agents can Talk Back! Text-to-Speech WITH personality for AI Assistants!
Website: https://agentvibes.org
Repository: https://github.com/paulpreibisch/AgentVibes

Co-created by Paul Preibisch with Claude AI
Copyright (c) 2025 Paul Preibisch

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

DISCLAIMER: This software is provided "AS IS", WITHOUT WARRANTY OF ANY KIND,
express or implied, including but not limited to the warranties of
merchantability, fitness for a particular purpose and noninfringement.
In no event shall the authors or copyright holders be liable for any claim,
damages or other liability, whether in an action of contract, tort or
otherwise, arising from, out of or in connection with the software or the
use or other dealings in the software.

---

@fileoverview MCP Server exposing AgentVibes TTS capabilities via Model Context Protocol
@context Provides natural language control of TTS features for Claude Desktop, Warp, and other MCP clients
@architecture MCP Server implementation wrapping bash scripts, async subprocess execution for non-blocking I/O
@dependencies .claude/hooks/*.sh scripts, MCP SDK, Python asyncio, subprocess
@entrypoints Called by Claude Desktop/Warp via MCP protocol (stdio transport)
@patterns Tool registry pattern, async subprocess wrapping, provider abstraction, state file management
@related GitHub repo, mcp-server/test_server.py, .claude/hooks/play-tts.sh, docs/ai-optimized-documentation-standards.md
"""

import asyncio
import json
import os
import platform
import re as _re
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

from mcp.server import Server
from mcp.types import Tool, TextContent, ImageContent, EmbeddedResource, CallToolResult
import mcp.server.stdio


# Default per-script timeout for _run_script(). Keeps a hung/interactive
# manager script (e.g. a `read -p` prompt reached by mistake) from wedging
# the MCP server forever and eating the stdio JSON-RPC stream.
DEFAULT_SCRIPT_TIMEOUT = 30.0


# ── Provider Catalog (SSOT Layer 2) — platform allowlists + display names ────
#
# server.py DERIVES its per-platform provider allowlists and provider display
# names from the shipped provider-catalog.json (generated from
# src/services/provider-catalog.js). The literals below are an EMBEDDED FALLBACK
# used ONLY when that JSON is missing or unreadable (installed-tree skew) —
# degraded, never dead: the MCP server MUST start without the file.
#
# Bidirectional parity (embedded fallback ≡ catalog, per platform, BOTH
# directions) is asserted by test/unit/provider-catalog-conformance.test.js so
# the fallback can never silently drift from the catalog (design §8 — a
# one-directional check is the exact gap that let elevenlabs-on-Windows through
# the old positive-only test).
#
# The non-Windows fallback mirrors the catalog's DARWIN set (the superset that
# also covers Linux: darwin adds macOS `say`, which a Linux box simply won't
# have installed — availability is enforced by the dispatchers downstream, not
# here). Windows uses the catalog WINDOWS set. elevenlabs is deliberately ABSENT
# from Windows: there is NO play-tts-elevenlabs.ps1 runtime (AVI-S9.1 /
# provider-catalog.js: elevenlabs.runtime.windows === null).
_FALLBACK_PROVIDERS_WINDOWS = ["windows-piper", "windows-sapi", "soprano", "kokoro"]
_FALLBACK_PROVIDERS_NON_WINDOWS = ["piper", "macos", "soprano", "kokoro", "elevenlabs"]

# termux-ssh is a TRANSPORT (relays TTS over SSH to a phone), NOT a synthesis
# provider: it has no catalog record and no play-tts-termux-ssh runtime. It is
# accepted on non-Windows as a documented non-catalog transport token, and is
# EXCLUDED BY NAME from the catalog parity assertion (AC6) so it can neither be
# silently dropped nor silently drift INTO the catalog.
_TRANSPORT_TOKENS = ["termux-ssh"]

# Embedded fallback display names — byte-equal to catalog.json `displayNames`
# (group-8 parity). termux-ssh is NOT here (it has no catalog record); its
# display name is added separately as a transport token.
_FALLBACK_DISPLAY_NAMES = {
    "soprano": "Soprano TTS",
    "piper": "Piper TTS",
    "kokoro": "Kokoro TTS",
    "elevenlabs": "ElevenLabs",
    "macos": "macOS Say",
    "windows-sapi": "Windows SAPI",
    "windows-piper": "Piper TTS",
}
_TRANSPORT_DISPLAY_NAMES = {
    "termux-ssh": "Termux SSH",
}


@dataclass
class ScriptResult:
    """Structured result of running a hook script.

    Callers MUST branch on `ok`/`returncode`, never on emoji/text sniffing —
    Windows manager scripts print plain text (no ✅/✓/🎭), so any
    `"<emoji>" in stdout` check silently reports failure on Windows even when
    the script succeeded.
    """
    returncode: int
    stdout: str
    stderr: str

    @property
    def ok(self) -> bool:
        return self.returncode == 0

    @property
    def error_detail(self) -> str:
        """Best-effort human-readable error text for failure messages."""
        return self.stderr or self.stdout or f"exit code {self.returncode}"


class AgentVibesServer:
    """MCP Server for AgentVibes TTS functionality"""

    # Script name constants (addresses SonarCloud S1192)
    VOICE_MANAGER_SCRIPT = "voice-manager.sh"
    PERSONALITY_MANAGER_SCRIPT = "personality-manager.sh"
    LANGUAGE_MANAGER_SCRIPT = "language-manager.sh"
    BACKGROUND_MUSIC_MANAGER_SCRIPT = "background-music-manager.sh"
    EFFECTS_MANAGER_SCRIPT = "effects-manager.sh"

    # Path constants (addresses SonarCloud S1192)
    CLAUDE_DIR_NAME = ".claude"
    MUTE_FILE_NAME = ".agentvibes-muted"
    SEPARATOR = "━" * 39

    def __init__(self):
        """Initialize the AgentVibes MCP server"""
        # Detect native Windows (not WSL)
        self.is_windows = platform.system() == "Windows" and not os.environ.get("WSL_DISTRO_NAME")
        self.is_darwin = platform.system() == "Darwin"

        # Script name constants — Windows uses .ps1, Unix uses .sh
        if self.is_windows:
            self.VOICE_MANAGER_SCRIPT = "voice-manager-windows.ps1"
            self.PERSONALITY_MANAGER_SCRIPT = "personality-manager.ps1"
            self.LANGUAGE_MANAGER_SCRIPT = "language-manager.ps1"
            self.BACKGROUND_MUSIC_MANAGER_SCRIPT = "background-music-manager.ps1"
            self.EFFECTS_MANAGER_SCRIPT = "effects-manager.ps1"

        # Find the .claude directory (project-local or global)
        self.claude_dir = self._find_claude_dir()
        self.hooks_dir = self.claude_dir / ("hooks-windows" if self.is_windows else "hooks")
        # Store AgentVibes root directory for environment variable
        self.agentvibes_root = self.claude_dir.parent

        # Serializes the "mutate global personality/language -> speak -> restore"
        # critical section in text_to_speech() so concurrent MCP tool calls
        # cannot interleave and corrupt persistent state (residual risk: this
        # only protects against concurrent calls *within this process* — a
        # second MCP server process or a slash-command CLI invocation writing
        # the same file at the same time is not covered; see story 8.2 notes).
        self._override_lock = asyncio.Lock()

        # provider-catalog.json is read lazily once and cached (design: no
        # blocking I/O per call; load at first use, not per set_provider).
        self._provider_catalog = None
        self._provider_catalog_loaded = False

    def _load_provider_catalog(self) -> Optional[dict]:
        """Load the shipped provider-catalog.json ONCE (cached).

        Generated from src/services/provider-catalog.js into
        .claude/hooks/provider-catalog.json and shipped beside the hooks, it is
        the SSOT for per-platform provider allowlists and display names. Returns
        the parsed dict, or None on ANY failure (missing / unreadable /
        malformed) so the MCP server always starts — callers then fall back to
        the embedded literals that conformance asserts are equivalent.
        """
        if self._provider_catalog_loaded:
            return self._provider_catalog
        self._provider_catalog_loaded = True
        catalog = None
        try:
            # catalog.json lives under hooks/ on EVERY platform (program data,
            # not a per-platform hook script — the generator only writes it there).
            path = self.claude_dir / "hooks" / "provider-catalog.json"
            if path.exists() and not path.is_symlink():
                parsed = json.loads(path.read_text(encoding="utf-8"))
                if isinstance(parsed, dict):
                    catalog = parsed
        except (OSError, ValueError):
            catalog = None
        if catalog is None:
            # Degraded, never dead. Warn on stderr ONLY (stdout is the MCP
            # JSON-RPC stream); one terse line, since a missing file is the
            # common installed-tree-skew case.
            print(
                "agentvibes: provider-catalog.json unavailable; using embedded provider fallback",
                file=sys.stderr,
            )
        self._provider_catalog = catalog
        return catalog

    def _valid_providers(self) -> list:
        """Per-platform provider allowlist, DERIVED from provider-catalog.json.

        Windows → catalog `platforms.windows`; non-Windows → catalog
        `platforms.darwin` (the superset covering both Linux and macOS). Falls
        back to the embedded literals when the catalog is unavailable. Transport
        tokens (termux-ssh) are appended on non-Windows only.
        """
        catalog = self._load_provider_catalog()
        base = None
        if catalog:
            platforms = catalog.get("platforms")
            if isinstance(platforms, dict):
                key = "windows" if self.is_windows else "darwin"
                derived = platforms.get(key)
                if isinstance(derived, list) and derived:
                    base = list(derived)
        if base is None:
            base = list(
                _FALLBACK_PROVIDERS_WINDOWS if self.is_windows else _FALLBACK_PROVIDERS_NON_WINDOWS
            )
        if not self.is_windows:
            for token in _TRANSPORT_TOKENS:
                if token not in base:
                    base.append(token)
        return base

    def _provider_display_names(self) -> dict:
        """Provider display names, DERIVED from provider-catalog.json.

        Falls back to the embedded dict when the catalog is unavailable. Non-
        catalog transport tokens (termux-ssh) are always merged in.
        """
        catalog = self._load_provider_catalog()
        names = None
        if catalog:
            derived = catalog.get("displayNames")
            if isinstance(derived, dict) and derived:
                names = dict(derived)
        if names is None:
            names = dict(_FALLBACK_DISPLAY_NAMES)
        for token, label in _TRANSPORT_DISPLAY_NAMES.items():
            names.setdefault(token, label)
        return names

    def _find_claude_dir(self) -> Path:
        """Find the .claude directory relative to this script"""
        # Get the AgentVibes root directory (parent of mcp-server)
        script_dir = Path(__file__).resolve().parent  # mcp-server/
        agentvibes_root = script_dir.parent  # AgentVibes/
        claude_dir = agentvibes_root / self.CLAUDE_DIR_NAME

        # ALWAYS use package .claude for hooks (even in NPX cache)
        # The package ALWAYS has .claude/ with all the hooks
        if claude_dir.exists() and claude_dir.is_dir():
            return claude_dir

        # Fallback to global ~/.claude (should never happen in properly installed package)
        return Path.home() / self.CLAUDE_DIR_NAME

    def _resolve_friendly_name(self, voice_name: str) -> str:
        """
        Resolve friendly name to Piper voice ID using voice-metadata.json.

        Args:
            voice_name: Friendly name (e.g., "ryan") or Piper ID

        Returns:
            Resolved Piper voice ID, or original voice_name if not found
        """
        import re

        metadata_path = self.agentvibes_root / ".agentvibes" / "config" / "voice-metadata.json"

        # SECURITY: Verify file exists and is not a symlink
        if not metadata_path.exists() or metadata_path.is_symlink():
            return voice_name

        # SECURITY: Verify file ownership matches current user (Unix only)
        try:
            if hasattr(os, 'getuid'):
                stat_info = metadata_path.stat()
                if stat_info.st_uid != os.getuid():
                    return voice_name
        except (OSError, AttributeError):
            pass

        try:
            with open(metadata_path, 'r') as f:
                metadata = json.load(f)

            voices = metadata.get('voices', {})
            voice_lower = voice_name.lower()

            resolved_id = None

            # Check if it's a friendly name key
            if voice_lower in voices:
                resolved_id = voices[voice_lower].get('id')

            # Check if it matches a displayName
            if not resolved_id:
                for friendly_name, voice_data in voices.items():
                    if voice_data.get('displayName', '').lower() == voice_lower:
                        resolved_id = voice_data.get('id')
                        break

            # SECURITY: Validate resolved ID matches safe pattern
            if resolved_id and re.match(r'^[a-zA-Z0-9_-]+$', resolved_id):
                return resolved_id

        except (json.JSONDecodeError, KeyError, IOError, TypeError):
            pass

        return voice_name

    # ── LibriTTS display-name resolution ──────────────────────────────────────

    _SURNAME_POOL = [
        'Bell', 'Carter', 'Davis', 'Ellis', 'Foster', 'Gray', 'Hayes', 'Irving',
        'Jones', 'Knox', 'Lane', 'Mason', 'Nash', 'Owens', 'Pierce', 'Quinn',
    ]

    @classmethod
    def _uniquify_voice_name(cls, raw_name: str) -> str:
        """Python port of uniquifyVoiceName from src/utils/voice-names.js"""
        import re as _re
        if not raw_name:
            return raw_name
        m = _re.match(r'^(.+)-(\d+)$', raw_name)
        if m:
            base, n = m.group(1), int(m.group(2))
            if n >= 2:
                return f"{base} {cls._SURNAME_POOL[(n - 1) % len(cls._SURNAME_POOL)]}"
        if ' ' in raw_name:
            return raw_name
        return f"{raw_name} {cls._SURNAME_POOL[0]}"

    def _build_libritts_catalog(self) -> dict:
        """
        Build a case-insensitive display-name → entry map from voice-assignments.json.
        Returns dict keyed by lowercased display name / raw name / speaker name.
        """
        catalog: dict = {}
        va_path = self.agentvibes_root / "voice-assignments.json"
        if not va_path.exists():
            return catalog
        try:
            data = json.loads(va_path.read_text())
            for id_str, entry in data.get("libritts_speakers", {}).items():
                speaker_id = int(id_str)
                raw_name = entry.get("voice_name", "")
                display_name = self._uniquify_voice_name(raw_name)
                voice_id = f"en_US-libritts-high::{raw_name}"
                info = {
                    "voice_id": voice_id,
                    "model": "en_US-libritts-high",
                    "speaker_name": raw_name,
                    "speaker_id": speaker_id,
                    "display_name": display_name,
                    "gender": entry.get("gender", ""),
                }
                for key in (display_name.lower(), raw_name.lower(),
                            raw_name.replace(" ", "_").lower()):
                    catalog.setdefault(key, info)
        except (json.JSONDecodeError, KeyError, ValueError, OSError):
            pass
        return catalog

    def _resolve_voice_input(self, voice_input: str) -> Optional[dict]:
        """
        Resolve a voice display name or ID to a dict with model/speakerId/voiceId.
        Returns None if unresolvable.
        Accepts: "Bella Bell", "Bella-2", "en_US-libritts-high::Bella",
                 "Kristin_Hughes", "en_US-amy-medium"
        """
        import re as _re
        if not voice_input:
            return None
        MS_SEP = "::"

        # Already a full voiceId with MS_SEP
        if MS_SEP in voice_input:
            parts = voice_input.split(MS_SEP, 1)
            model, speaker_name = parts[0], parts[1]
            if not _re.match(r'^[a-zA-Z0-9_-]+$', model):
                return None
            catalog = self._build_libritts_catalog()
            entry = catalog.get(speaker_name.lower())
            return {
                "voice_id": voice_input,
                "model": model,
                "speaker_name": speaker_name,
                "speaker_id": entry["speaker_id"] if entry else None,
                "display_name": entry["display_name"] if entry else speaker_name,
            }

        # Plain piper model ID (e.g. en_US-amy-medium)
        if _re.match(r'^en_[A-Z]{2}-[a-zA-Z0-9_]+-[a-z]+$', voice_input):
            return {
                "voice_id": voice_input, "model": voice_input,
                "speaker_name": None, "speaker_id": None, "display_name": voice_input,
            }

        # LibriTTS display name / raw name lookup
        catalog = self._build_libritts_catalog()
        normalised = voice_input.replace("_", " ")
        entry = catalog.get(normalised.lower()) or catalog.get(voice_input.lower())
        return entry or None

    def _get_config_dir(self) -> Path:
        """Return the .claude dir to write voice config files into (project or global)."""
        cwd = Path.cwd()
        if (cwd / ".claude").is_dir() and cwd != self.agentvibes_root:
            return cwd / ".claude"
        return self.claude_dir

    async def text_to_speech(
        self,
        text: str,
        voice: Optional[str] = None,
        personality: Optional[str] = None,
        language: Optional[str] = None,
    ) -> str:
        """
        Convert text to speech using AgentVibes.

        Args:
            text: The text to speak
            voice: Optional voice name (e.g., "Aria", "Northern Terry")
            personality: Optional personality style (e.g., "flirty", "sarcastic")
            language: Optional language (e.g., "spanish", "french")

        Returns:
            Success message with audio file path
        """
        # Store original settings to restore later. Mutating the personality/
        # language files is inherently racy across processes; the lock below
        # only protects against concurrent tool calls within *this* server
        # instance (see the residual-risk note on self._override_lock).
        original_personality = None
        personality_file_existed = True
        original_language = None
        needs_override = bool(personality or language)

        if needs_override:
            await self._override_lock.acquire()

        try:
            # Temporarily set personality if specified
            personality_path = self._get_config_dir() / "tts-personality.txt"
            if personality:
                # Read the ORIGINAL from the SAME file the manager writes to
                # (the config dir). _get_personality() reads a different set of
                # dirs (package dir, then global ~/.claude) and, from inside a
                # host project, returns the wrong value — restoring that would
                # overwrite the project's real personality. Non-Destructive Rule.
                personality_file_existed = personality_path.exists()
                if personality_file_existed:
                    try:
                        original_personality = personality_path.read_text(encoding="utf-8").strip()
                    except OSError:
                        original_personality = None  # can't read → don't clobber on restore
                await self._run_script(
                    self.PERSONALITY_MANAGER_SCRIPT, ["set", personality]
                )

            # Temporarily set language if specified
            if language:
                original_language = await self._get_language()
                await self._run_script(self.LANGUAGE_MANAGER_SCRIPT, ["set", language])

            # Resolve LLM key: AGENTVIBES_LLM > CLAUDECODE=1 > AGENTVIBES_MCP_FALLBACK > "default"
            llm_key = os.environ.get("AGENTVIBES_LLM", "").strip()
            if llm_key and not _re.match(r"^[a-zA-Z0-9][a-zA-Z0-9_-]*$", llm_key):
                llm_key = ""
            if not llm_key and os.environ.get("CLAUDECODE", "").strip() == "1":
                llm_key = "claude-code"
            if not llm_key:
                fallback = os.environ.get("AGENTVIBES_MCP_FALLBACK", "").strip()
                if fallback and _re.match(r"^[a-zA-Z0-9][a-zA-Z0-9_-]*$", fallback):
                    llm_key = fallback

            # Call the TTS script via appropriate shell
            tts_script = "play-tts.ps1" if self.is_windows else "play-tts.sh"
            play_tts = self.hooks_dir / tts_script
            if self.is_windows:
                args = ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", str(play_tts), text]
                if voice:
                    args.extend(["-VoiceOverride", voice])
                if llm_key:
                    args.extend(["-llm", llm_key])
            else:
                args = ["bash", str(play_tts)]
                if llm_key:
                    args.extend(["--llm", llm_key])
                args.append(text)
                if voice:
                    args.append(voice)

            env = self._build_script_env()

            # Declare voice provenance so the resolver treats an MCP-requested
            # voice as a genuine explicit pick (user-explicit), never demoting it
            # to a per-LLM/default row the way it would an LLM echo (F-1). Only
            # set when the caller actually asked for a specific voice.
            if voice:
                env["AGENTVIBES_VOICE_SOURCE"] = "user-explicit"

            result = await asyncio.create_subprocess_exec(
                *args,
                stdin=asyncio.subprocess.DEVNULL,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env=env,
            )
            try:
                try:
                    stdout, stderr = await asyncio.wait_for(result.communicate(), timeout=60.0)
                except asyncio.TimeoutError:
                    result.kill()
                    await result.wait()
                    return "❌ TTS timed out after 60 seconds"

                if result.returncode == 0:
                    output = stdout.decode().strip()
                    # Strip ANSI escape codes for clean extraction
                    _ansi_strip = _re.compile(r'\x1b\[[0-9;]*m')
                    audio_file_path = None
                    voice_info = None
                    for line in output.split("\n"):
                        clean = _ansi_strip.sub('', line).strip()
                        if "Saved to:" in clean and audio_file_path is None:
                            raw_path = clean.split("Saved to:")[1].strip()
                            # Path ends at .wav (strip trailing size/count info)
                            wav_end = raw_path.find(".wav")
                            audio_file_path = raw_path[:wav_end + 4] if wav_end != -1 else raw_path.split()[0]
                        if ("Voice used:" in clean or ("Voice:" in clean and "Background" not in clean)) and voice_info is None:
                            voice_info = clean

                    if audio_file_path:
                        truncated = (
                            f"{text[:50]}..." if len(text) > 50 else text
                        )
                        result_msg = f"✅ Spoke: {truncated}\n📁 Audio saved: {audio_file_path}"
                        if voice_info:
                            result_msg += f"\n{voice_info}"
                        return result_msg

                    return f"✅ Spoke: {text[:50]}..." if len(text) > 50 else f"✅ Spoke: {text}"
                else:
                    error = stderr.decode().strip()
                    stdout_output = stdout.decode().strip()
                    full_error = f"{error}\nStdout: {stdout_output}" if stdout_output else error
                    return f"❌ TTS failed: {full_error}"
            finally:
                # Ensure process cleanup
                if result.returncode is None:
                    result.kill()
                    await result.wait()

        finally:
            # Restore original personality. personality-manager.sh has no
            # delete-on-default behavior (unlike language-manager.sh), so if
            # no personality file existed before this call, restore by
            # deleting the file rather than writing "normal" into it — the
            # non-destructive-config rule means a temporary per-call override
            # must not leave a permanent file behind that wasn't there before.
            if personality:
                if personality_file_existed:
                    if original_personality is not None:
                        restore = await self._run_script(
                            self.PERSONALITY_MANAGER_SCRIPT, ["set", original_personality]
                        )
                        if not restore.ok:
                            import sys
                            print(
                                f"Warning: failed to restore personality "
                                f"'{original_personality}': {restore.error_detail}",
                                file=sys.stderr,
                            )
                else:
                    # No personality file existed before this call — restore by
                    # deleting (same config dir we captured existence from).
                    try:
                        personality_path.unlink()
                    except OSError:
                        pass
            if original_language is not None:
                # "english"/"reset" makes language-manager.sh *delete* the
                # language file rather than write it, so this naturally
                # restores "no override was ever set" correctly too.
                restore_lang = await self._run_script(
                    self.LANGUAGE_MANAGER_SCRIPT, ["set", original_language]
                )
                if not restore_lang.ok:
                    import sys
                    print(
                        f"Warning: failed to restore language "
                        f"'{original_language}': {restore_lang.error_detail}",
                        file=sys.stderr,
                    )
            if needs_override:
                self._override_lock.release()

    async def list_voices(self) -> str:
        """
        List all available TTS voices for the active provider.

        Returns:
            Formatted list of available voices
        """
        # Get active provider for display purposes
        provider = await self._get_provider()
        current_voice = await self._get_current_voice()

        # voice-manager.sh list-simple is now provider-aware
        result = await self._run_script(self.VOICE_MANAGER_SCRIPT, ["list-simple"])
        if result.ok and result.stdout:
            voices = result.stdout.strip().split("\n")
            voices = [v for v in voices if v]  # Filter empty strings

            if not voices:
                return (
                    f"📦 No voices available\n"
                    f"{self.SEPARATOR}\n"
                    f"For Piper: Download voices using /agent-vibes:provider download <voice-name>\n"
                    f"Example: en_US-lessac-medium, en_GB-alba-medium"
                )

            # Determine provider label and alternative provider
            if "Piper" in provider:
                provider_label = "Piper TTS"
                alternative_provider = "macOS"
            elif "macOS" in provider:
                provider_label = "macOS TTS"
                alternative_provider = "Piper"
            elif "Termux" in provider or "Android" in provider:
                provider_label = "Termux SSH (Android)"
                alternative_provider = "Piper"
            else:
                provider_label = "TTS"
                alternative_provider = None

            output = f"🎤 Available {provider_label} Voices:\n"
            output += f"{self.SEPARATOR}\n"
            for voice in voices:
                marker = " ✓ (current)" if voice == current_voice else ""
                output += f"  • {voice}{marker}\n"

            # Expand LibriTTS named speakers when en_US-libritts-high is installed
            piper_voices_dir = Path.home() / ".local" / "share" / "piper-voices"
            libritts_onnx = piper_voices_dir / "en_US-libritts-high.onnx"
            if libritts_onnx.exists():
                catalog = self._build_libritts_catalog()
                if catalog:
                    output += f"\n  📖 LibriTTS named speakers (en_US-libritts-high):\n"
                    # De-duplicate: only one entry per display name
                    seen: set = set()
                    for entry in catalog.values():
                        dn = entry["display_name"]
                        if dn in seen:
                            continue
                        seen.add(dn)
                        spk = entry["speaker_name"]
                        sid = entry["speaker_id"]
                        gender = entry.get("gender", "")
                        g_icon = "♀" if gender.lower() == "female" else ("♂" if gender.lower() == "male" else "—")
                        marker = " ✓ (current)" if entry["voice_id"] == current_voice else ""
                        output += f"  • {dn} ({g_icon} speaker {sid}){marker}\n"

            output += f"{self.SEPARATOR}\n"

            # Add provider switch hint
            if alternative_provider:
                output += f"\n💡 Switch to {alternative_provider}? Use: set_provider(provider=\"{alternative_provider.lower()}\")\n"

            return output
        return f"❌ Failed to list voices: {result.error_detail}"

    async def set_voice(self, voice_name: str) -> str:
        """
        Switch to a different voice (supports friendly names like "ryan" or "katherine").

        Args:
            voice_name: Friendly name (e.g., "ryan") or Piper voice ID

        Returns:
            Success or error message
        """
        # Try new display-name resolver first (handles "Bella Bell", "::" ids, etc.)
        resolved = self._resolve_voice_input(voice_name)

        if resolved:
            voice_id     = resolved["voice_id"]
            display_name = resolved["display_name"]
            model        = resolved["model"]
            speaker_id   = resolved["speaker_id"]
            speaker_name = resolved["speaker_name"]

            # Write the three config files directly (no voice-manager.sh needed)
            config_dir = self._get_config_dir()
            try:
                config_dir.mkdir(parents=True, exist_ok=True)
                (config_dir / "tts-voice.txt").write_text(display_name + "\n")
                if speaker_name:
                    (config_dir / "tts-piper-model.txt").write_text(model + "\n")
                    if speaker_id is not None:
                        (config_dir / "tts-piper-speaker-id.txt").write_text(str(speaker_id) + "\n")
                    else:
                        # Clear speaker-id so piper uses default
                        try: (config_dir / "tts-piper-speaker-id.txt").unlink()
                        except FileNotFoundError: pass
                else:
                    # Single-speaker model — clear multi-speaker files
                    for f in ("tts-piper-model.txt", "tts-piper-speaker-id.txt"):
                        try: (config_dir / f).unlink()
                        except FileNotFoundError: pass
            except OSError as e:
                return f"❌ Failed to write voice config: {e}"

            detail = f" (speaker {speaker_id}, model {model})" if speaker_id is not None else ""
            return f"✅ Voice set to: {display_name}{detail}"

        # Fall back to legacy friendly-name resolver (voice-metadata.json)
        original_name = voice_name
        resolved_name = self._resolve_friendly_name(voice_name)
        result = await self._run_script(
            self.VOICE_MANAGER_SCRIPT, ["switch", resolved_name, "--silent"]
        )
        if result.ok:
            if original_name.lower() != resolved_name.lower():
                return f"✅ Voice switched to: {original_name} ({resolved_name})"
            return f"✅ Voice switched to: {voice_name}"
        return (
            f"❌ Failed to switch voice — could not resolve '{voice_name}'. "
            f"Try 'list_voices' to see available names. ({result.error_detail})"
        )

    async def list_personalities(self) -> str:
        """
        List all available personalities.

        Returns:
            Formatted list of personalities with descriptions
        """
        result = await self._run_script(self.PERSONALITY_MANAGER_SCRIPT, ["list"])
        if result.ok:
            return result.stdout
        return f"❌ Failed to list personalities: {result.error_detail}"

    async def set_personality(self, personality: str) -> str:
        """
        Set the personality style for TTS messages.

        Args:
            personality: Personality name (e.g., "flirty", "sarcastic", "pirate")

        Returns:
            Success or error message
        """
        # Serialize against text_to_speech's temporary override/restore so a
        # deliberate set here can't be silently reverted by an in-flight call's
        # restore step (they mutate the same tts-personality.txt).
        async with self._override_lock:
            result = await self._run_script(
                self.PERSONALITY_MANAGER_SCRIPT, ["set", personality]
            )
        if result.ok:
            # Windows (.ps1) scripts print plain text with no 🎭 marker; add
            # our own so the tool's output stays consistent across platforms.
            return result.stdout if "🎭" in result.stdout else f"🎭 {result.stdout}"
        return f"❌ Failed to set personality: {result.error_detail}"

    async def get_config(self) -> str:
        """
        Get current AgentVibes configuration.

        Returns:
            Current voice, personality, language, provider, and LLM settings
        """
        voice = await self._get_current_voice()
        personality = await self._get_personality()
        language = await self._get_language()
        provider = await self._get_provider()

        # Resolve the LLM key using the same priority as text_to_speech:
        # 1. AGENTVIBES_LLM    2. CLAUDECODE=1    3. AGENTVIBES_MCP_FALLBACK    4. "default"
        llm_key = os.environ.get("AGENTVIBES_LLM", "").strip()
        if llm_key and not _re.match(r"^[a-zA-Z0-9][a-zA-Z0-9_-]*$", llm_key):
            llm_key = ""
        if not llm_key and os.environ.get("CLAUDECODE", "").strip() == "1":
            llm_key = "claude-code"
        if not llm_key:
            fallback = os.environ.get("AGENTVIBES_MCP_FALLBACK", "").strip()
            if fallback and _re.match(r"^[a-zA-Z0-9][a-zA-Z0-9_-]*$", fallback):
                llm_key = fallback
        if not llm_key:
            llm_key = "default"

        output = "🎤 Current AgentVibes Configuration\n"
        output += f"{self.SEPARATOR}\n"
        output += f"LLM: {llm_key}\n"
        output += f"Provider: {provider}\n"
        output += f"Voice: {voice}\n"
        output += f"Personality: {personality}\n"
        output += f"Language: {language}\n"
        output += f"{self.SEPARATOR}\n"
        return output

    async def set_language(self, language: str) -> str:
        """
        Set the language for TTS speech.

        Args:
            language: Language name (e.g., "spanish", "french", "german")

        Returns:
            Success or error message
        """
        # Serialize against text_to_speech's temporary override/restore (both
        # mutate the same language config), so a deliberate set here isn't
        # silently reverted by an in-flight call's restore step.
        async with self._override_lock:
            result = await self._run_script(self.LANGUAGE_MANAGER_SCRIPT, ["set", language])
        if result.ok:
            return result.stdout if "✓" in result.stdout else f"✓ {result.stdout}"
        return f"❌ Failed to set language: {result.error_detail}"

    async def replay_audio(self, n: int = 1) -> str:
        """
        Replay recently generated TTS audio.

        Args:
            n: Which audio to replay (1 = most recent, 2 = second most recent, etc.)

        Returns:
            Success or error message
        """
        result = await self._run_script(self.VOICE_MANAGER_SCRIPT, ["replay", str(n)])
        if result.ok:
            return result.stdout if "🔊" in result.stdout else f"🔊 {result.stdout}"
        return f"❌ Failed to replay audio: {result.error_detail}"

    async def set_provider(self, provider: str) -> str:
        """
        Switch TTS provider between the supported synthesis engines.

        Args:
            provider: Provider name. Non-Windows: "piper", "macos", "termux-ssh",
                "soprano", "kokoro", "elevenlabs". Windows: "windows-piper",
                "windows-sapi", "soprano", "kokoro".

        Returns:
            Success or error message
        """
        provider = provider.lower()
        # Platform allowlist + display names DERIVE from provider-catalog.json
        # (SSOT), with embedded fallbacks (module constants above). kokoro is
        # cross-platform; elevenlabs is Unix-only (NO play-tts-elevenlabs.ps1, so
        # it is absent from the Windows set — switching to it on Windows would be
        # silently unplayable). See AVI-S9.1 / AVI-S9.5 and provider-catalog.js
        # (elevenlabs.runtime.windows === null).
        valid_providers = self._valid_providers()
        if provider not in valid_providers:
            return f"❌ Invalid provider: {provider}. Choose from: {', '.join(valid_providers)}"

        result = await self._run_script("provider-manager.sh", ["switch", provider])
        if result.ok:
            # Automatically speak confirmation in the new provider's voice.
            provider_names = self._provider_display_names()
            provider_name = provider_names.get(provider, provider.title())
            confirmation_text = f"Successfully switched to {provider_name} provider"

            try:
                # Speak the confirmation with 5 second timeout to prevent hanging
                await asyncio.wait_for(
                    self.text_to_speech(confirmation_text),
                    timeout=5.0
                )
                # Return the provider switch result plus TTS confirmation
                return f"{result.stdout}\n🔊 Spoken confirmation: {confirmation_text}"
            except asyncio.TimeoutError:
                # Timeout - provider may need setup (e.g., Piper not installed)
                return f"{result.stdout}\n⚠️ Provider switched (TTS confirmation timed out - provider may need setup)"
            except Exception as e:
                # If TTS fails, still return success for the provider switch
                return f"{result.stdout}\n⚠️ Provider switched but TTS confirmation failed: {e}"

        return f"❌ Failed to switch provider: {result.error_detail}"

    async def set_speed(self, speed: str, target: bool = False) -> str:
        """
        Set speech speed for main or target voice.

        Works with both Piper and macOS providers.

        Args:
            speed: Speed value (e.g., "0.5x", "1x", "2x", "normal", "fast", "slow")
            target: If True, sets target language speed; if False, sets main voice speed

        Returns:
            Success or error message
        """
        # Security: Using secrets.choice for cryptographically secure random selection
        # Even though this is just for UI variety, we use secrets to satisfy security scanners
        import secrets

        args = ["target", speed] if target else [speed]
        result = await self._run_script("speed-manager.sh", args)
        if result.ok:
            # Simple test messages to demonstrate the new speed
            test_messages = [
                "Testing speed change",
                "Speed test in progress",
                "Checking audio speed",
                "Speed configuration test",
                "Audio speed test",
            ]

            # Pick a random test message and speak it
            test_message = secrets.choice(test_messages)

            try:
                # Speak the test message to demonstrate the new speed
                await self.text_to_speech(test_message)
                return f"{result.stdout}\n🔊 Testing new speed: \"{test_message}\""
            except Exception as e:
                # If TTS fails, still return success for the speed change
                return f"{result.stdout}\n⚠️ Speed changed but demo failed: {e}"

        return f"❌ Failed to set speed: {result.error_detail}"

    async def get_speed(self) -> str:
        """
        Get current speech speed settings.

        Returns:
            Current speed settings for main and target voices
        """
        result = await self._run_script("speed-manager.sh", ["get"])
        return result.stdout if result.ok else f"❌ Failed to get speed settings: {result.error_detail}"

    async def download_extra_voices(self, auto_yes: bool = False) -> str:
        """
        Download extra high-quality Piper voices from HuggingFace.

        Downloads custom voices: Kristin, Jenny, and Tracy/16Speakers.

        Args:
            auto_yes: If True, skips confirmation prompt and downloads automatically

        Returns:
            Success message with download summary
        """
        if not auto_yes:
            # download-extra-voices.sh hits `read -p "...? [Y/n]: "` when no
            # --yes flag is given. Since stdin is always DEVNULL (see
            # _run_script), that read would return EOF/empty rather than
            # hang — but reaching it at all is still the wrong behavior for
            # an MCP tool: an LLM caller can't answer an interactive prompt.
            # Fail fast with a clear, actionable error instead of ever
            # spawning the script.
            return (
                "⚠️ Confirmation required: call download_extra_voices(auto_yes=True) "
                "to download the extra voices. This tool cannot answer an interactive "
                "Y/n prompt, so it refuses to start the download without explicit consent."
            )
        result = await self._run_script("download-extra-voices.sh", ["--yes"], timeout=180.0)
        if result.ok:
            return result.stdout
        return f"❌ Failed to download extra voices: {result.error_detail}"

    async def get_verbosity(self) -> str:
        """
        Get current verbosity level.

        Returns:
            Current verbosity level with description
        """
        result = await self._run_script("verbosity-manager.sh", ["get"])
        if result.ok:
            level = result.stdout.strip()
            descriptions = {
                "low": "LOW - Acknowledgments + Completions only (minimal)",
                "medium": "MEDIUM - + Major decisions and findings (balanced)",
                "high": "HIGH - All reasoning (maximum transparency)"
            }
            desc = descriptions.get(level, level)
            return f"🎙️ Current Verbosity: {desc}\n\n💡 Change with: set_verbosity(level=\"low|medium|high\")"
        return f"❌ Failed to get verbosity level: {result.error_detail}"

    async def set_verbosity(self, level: str) -> str:
        """
        Set verbosity level to control how much Claude speaks.

        Args:
            level: Verbosity level (low, medium, or high)

        Returns:
            Success or error message
        """
        result = await self._run_script("verbosity-manager.sh", ["set", level])
        if result.ok:
            body = result.stdout if "✅" in result.stdout else f"✅ {result.stdout}"
            return f"{body}\n\n⚠️  Restart Claude Code for changes to take effect"
        return f"❌ Failed to set verbosity: {result.error_detail}"

    def _get_mute_files(self) -> list:
        """Get all mute file paths for current platform"""
        files = [
            Path.home() / self.MUTE_FILE_NAME,
            Path.cwd() / self.CLAUDE_DIR_NAME / "agentvibes-muted",
        ]
        # Windows PowerShell scripts check tts-muted.txt in .claude dir
        if self.is_windows:
            files.append(Path.home() / self.CLAUDE_DIR_NAME / "tts-muted.txt")
        return files

    async def mute(self) -> str:
        """
        Mute all TTS output. Creates a persistent mute flag.

        Returns:
            Success message confirming mute is active
        """
        try:
            mute_file = Path.home() / self.MUTE_FILE_NAME
            mute_file.touch()
            # On Windows, also write tts-muted.txt for PowerShell script compatibility
            if self.is_windows:
                win_mute = Path.home() / self.CLAUDE_DIR_NAME / "tts-muted.txt"
                win_mute.parent.mkdir(parents=True, exist_ok=True)
                win_mute.write_text("true")
            return "🔇 AgentVibes TTS muted. All voice output is now silenced.\n\n💡 To unmute, use: unmute()"
        except Exception as e:
            return f"❌ Failed to mute: {e}"

    async def unmute(self) -> str:
        """
        Unmute TTS output. Removes the mute flag.

        Returns:
            Success message confirming TTS is restored
        """
        removed = []
        try:
            for mute_file in self._get_mute_files():
                if mute_file.exists():
                    # tts-muted.txt uses content "true"/"false", others use file existence
                    if mute_file.name == "tts-muted.txt":
                        content = mute_file.read_text().strip()
                        if content == "true":
                            mute_file.write_text("false")
                            removed.append(str(mute_file.name))
                    else:
                        mute_file.unlink()
                        removed.append(str(mute_file.name))

            if removed:
                return f"🔊 AgentVibes TTS unmuted. Voice output is now restored.\n   (Removed: {', '.join(removed)} mute flag)"
            else:
                return "🔊 AgentVibes TTS was not muted. Voice output is active."
        except Exception as e:
            return f"❌ Failed to unmute: {e}"

    async def is_muted(self) -> str:
        """
        Check if TTS is currently muted.

        Returns:
            Current mute status
        """
        for mute_file in self._get_mute_files():
            if mute_file.exists():
                # tts-muted.txt uses content "true"/"false"
                if mute_file.name == "tts-muted.txt":
                    content = mute_file.read_text().strip()
                    if content == "true":
                        return "🔇 TTS is currently MUTED\n\n💡 To unmute, use: unmute()"
                else:
                    return "🔇 TTS is currently MUTED\n\n💡 To unmute, use: unmute()"
        return "🔊 TTS is currently ACTIVE\n\n💡 To mute, use: mute()"

    async def list_background_music(self) -> str:
        """
        List all available background music tracks.

        Returns:
            Formatted list of all pre-packaged background music files
        """
        result = await self._run_script(self.BACKGROUND_MUSIC_MANAGER_SCRIPT, ["list"])
        return result.stdout if result.ok else f"❌ Failed to list background music: {result.error_detail}"

    async def set_background_music(self, track_name: str, agent_name: Optional[str] = None) -> str:
        """
        Set background music track for a specific agent, all agents, or as default.

        Args:
            track_name: Track filename or partial name for fuzzy matching
            agent_name: Agent name ('all' for all agents, None for default)

        Returns:
            Success or error message
        """
        import re

        # Get list of available tracks for fuzzy matching
        list_result = await self._run_script(self.BACKGROUND_MUSIC_MANAGER_SCRIPT, ["list"])
        if not list_result.ok:
            return f"❌ Failed to list background music tracks: {list_result.error_detail}"

        # Parse track names
        tracks = []
        for line in list_result.stdout.split("\n"):
            match = re.match(r'\s*\d+\.\s+(.+)', line.strip())
            if match:
                tracks.append(match.group(1).strip())

        # Try to find a matching track (case-insensitive partial match)
        track_lower = track_name.lower()
        matched_track = None

        # First try exact match
        for track in tracks:
            if track.lower() == track_lower:
                matched_track = track
                break

        # If no exact match, try partial match
        if not matched_track:
            for track in tracks:
                if track_lower in track.lower():
                    matched_track = track
                    break

        if not matched_track:
            # Show available tracks to help user
            available = "\n".join([f"  • {t}" for t in tracks])
            return f"❌ No track matching '{track_name}' found.\n\nAvailable tracks:\n{available}\n\n💡 Try a partial match like 'celtic' or 'chillwave'"

        # Determine which command to use based on agent_name
        if agent_name and agent_name.lower() == "all":
            # Set for all agents
            result = await self._run_script(self.BACKGROUND_MUSIC_MANAGER_SCRIPT, ["set-all", matched_track])
        elif agent_name:
            # Set for specific agent
            result = await self._run_script(self.BACKGROUND_MUSIC_MANAGER_SCRIPT, ["set-agent", agent_name, matched_track])
        else:
            # Set as default
            result = await self._run_script(self.BACKGROUND_MUSIC_MANAGER_SCRIPT, ["set-default", matched_track])

        if result.ok:
            if matched_track.lower() != track_name.lower():
                return f"{result.stdout}\n\n🔍 Matched '{track_name}' to '{matched_track}'"
            return result.stdout
        return f"❌ Failed to set background music: {result.error_detail}"

    async def enable_background_music(self, enabled: bool) -> str:
        """
        Enable or disable background music globally.

        Args:
            enabled: True to enable, False to disable

        Returns:
            Success or error message
        """
        command = "on" if enabled else "off"
        result = await self._run_script(self.BACKGROUND_MUSIC_MANAGER_SCRIPT, [command])
        # Sync to .agentvibes/config.json (TUI source of truth)
        try:
            import json
            cfg_path = self.agentvibes_root / ".agentvibes" / "config.json"
            cfg = {}
            if cfg_path.exists():
                cfg = json.loads(cfg_path.read_text(encoding="utf-8"))
            if "backgroundMusic" not in cfg:
                cfg["backgroundMusic"] = {}
            cfg["backgroundMusic"]["enabled"] = enabled
            cfg_path.parent.mkdir(parents=True, exist_ok=True)
            cfg_path.write_text(json.dumps(cfg, indent=2) + "\n", encoding="utf-8")
        except Exception:
            pass  # best-effort sync
        if result.ok:
            return result.stdout
        return f"❌ Failed to {'enable' if enabled else 'disable'} background music: {result.error_detail}"

    async def set_background_music_volume(self, volume: float) -> str:
        """
        Set background music volume.

        Args:
            volume: Volume level (0.0-1.0)

        Returns:
            Success or error message
        """
        result = await self._run_script(self.BACKGROUND_MUSIC_MANAGER_SCRIPT, ["volume", str(volume)])
        return result.stdout if result.ok else f"❌ Failed to set background music volume: {result.error_detail}"

    async def get_background_music_status(self) -> str:
        """
        Get current background music configuration.

        Returns:
            Status information
        """
        result = await self._run_script(self.BACKGROUND_MUSIC_MANAGER_SCRIPT, ["status"])
        return result.stdout if result.ok else f"❌ Failed to get background music status: {result.error_detail}"

    async def set_reverb(self, level: str, agent: str = "default", apply_all: bool = False) -> str:
        """
        Set reverb level for an agent or globally.

        Args:
            level: Reverb level (off, light, medium, heavy, cathedral)
            agent: Agent name (default: "default")
            apply_all: Apply to all agents (default: False)

        Returns:
            Success message
        """
        args = ["set-reverb", level, agent]
        if apply_all:
            args.append("--all")
        result = await self._run_script(self.EFFECTS_MANAGER_SCRIPT, args)
        if result.ok:
            return result.stdout if result.stdout else f"✅ Set reverb to {level}"
        return f"❌ Failed to set reverb: {result.error_detail}"

    async def get_reverb(self, agent: str = "default") -> str:
        """
        Get current reverb level for an agent.

        Args:
            agent: Agent name (default: "default")

        Returns:
            Current reverb level
        """
        result = await self._run_script(self.EFFECTS_MANAGER_SCRIPT, ["get-reverb", agent])
        if result.ok:
            return f"Current reverb level for {agent}: {result.stdout.strip()}"
        return f"❌ Failed to get reverb for {agent}: {result.error_detail}"

    async def list_audio_effects(self) -> str:
        """
        List all audio effects for all agents.

        Returns:
            Effects configuration
        """
        result = await self._run_script(self.EFFECTS_MANAGER_SCRIPT, ["list"])
        return result.stdout if result.ok else f"❌ Failed to list audio effects: {result.error_detail}"

    async def clean_audio_cache(self) -> str:
        """
        Clean all TTS audio cache files and report space freed.

        Non-interactive cleanup suitable for MCP tool usage. Deletes all
        TTS-generated audio files (wav, mp3, aiff) while preserving
        background music tracks.

        Returns:
            Cleanup results with file count and space freed
        """
        result = await self._run_script("clean-audio-cache.sh", [])
        return result.stdout if result.ok else f"❌ Failed to clean audio cache: {result.error_detail}"

    # ── Hermes config helpers ────────────────────────────────────────────────

    def _hermes_cfg_path(self) -> Path:
        hermes_home = Path(os.environ.get("HERMES_HOME", Path.home() / ".hermes"))
        return hermes_home / "hooks" / "agentvibes-tts" / "agentvibes-ssh-config.json"

    async def get_hermes_config(self) -> str:
        """
        Get current Hermes AgentVibes SSH configuration.

        Returns:
            Current SSH key, host, port, and voice settings
        """
        cfg_path = self._hermes_cfg_path()
        defaults = {
            "mode": "local",
            "sshKey": "/absolute/path/to/id_ed25519_agentvibes",
            "host": "your-receiver-tailscale-ip",
            "port": "2222",
            "voice": "en_US-libritts-high::Leo-8",
        }
        try:
            cfg = json.loads(cfg_path.read_text(encoding="utf-8"))
        except Exception:
            cfg = {}
        merged = {**defaults, **cfg}
        installed = cfg_path.exists()
        is_local = merged.get("mode", "local") == "local"
        out = "🔌 Hermes AgentVibes Configuration\n"
        out += "─" * 40 + "\n"
        out += f"Status:   {'✅ Configured' if installed else '⚠️  Not yet installed (run: agentvibes install)'}\n"
        out += f"Mode:     {'🏠 Local (Hermes & speakers on same machine)' if is_local else '🌐 Remote (SSH to receiver)'}\n"
        out += f"Voice:    {merged['voice']}\n"
        if not is_local:
            out += f"SSH Key:  {merged['sshKey']}\n"
            out += f"Host:     {merged['host']}\n"
            out += f"Port:     {merged['port']}\n"
        if installed:
            out += f"\nConfig file: {cfg_path}\n"
            out += "After changes, run: hermes gateway restart\n"
        return out

    async def set_hermes_config(
        self,
        mode: Optional[str] = None,
        ssh_key: Optional[str] = None,
        host: Optional[str] = None,
        port: Optional[str] = None,
        voice: Optional[str] = None,
    ) -> str:
        """
        Save Hermes AgentVibes SSH configuration.

        Returns:
            Success message with saved values
        """
        import re as _re
        cfg_path = self._hermes_cfg_path()
        defaults = {
            "mode": "local",
            "sshKey": "/absolute/path/to/id_ed25519_agentvibes",
            "host": "your-receiver-tailscale-ip",
            "port": "2222",
            "voice": "en_US-libritts-high::Leo-8",
        }
        try:
            existing = json.loads(cfg_path.read_text(encoding="utf-8"))
        except Exception:
            existing = {}
        merged = {**defaults, **existing}

        if mode is not None:
            m = str(mode).lower().strip()
            if m not in ("local", "remote"):
                return "❌ Invalid mode: must be 'local' or 'remote'"
            merged["mode"] = m
        if ssh_key is not None:
            sk = str(ssh_key).strip()
            if not _re.match(r'^[/~][a-zA-Z0-9_./ -]{0,511}$', sk):
                return "❌ Invalid ssh_key: must be an absolute path (no special chars)"
            merged["sshKey"] = sk
        if host is not None:
            h = str(host).strip()
            if not _re.match(r'^[a-zA-Z0-9._\[\]:-]{1,253}$', h):
                return "❌ Invalid host: must be a hostname or IP address"
            merged["host"] = h
        if port is not None:
            p = str(port).strip()
            if not _re.match(r"^\d{1,5}$", p):
                return "❌ Invalid port: must be a number (e.g. '2222')"
            merged["port"] = p
        if voice is not None:
            merged["voice"] = str(voice)[:200]

        try:
            cfg_path.parent.mkdir(parents=True, exist_ok=True)
            cfg_path.parent.chmod(0o700)
            cfg_path.write_text(json.dumps(merged, indent=2), encoding="utf-8")
            cfg_path.chmod(0o600)
        except Exception as e:
            return f"❌ Failed to save config: {e}"

        is_local = merged.get("mode", "local") == "local"
        out = "✅ Hermes config saved!\n"
        out += "─" * 40 + "\n"
        out += f"Mode:     {'🏠 Local' if is_local else '🌐 Remote (SSH)'}\n"
        out += f"Voice:    {merged['voice']}\n"
        if not is_local:
            out += f"SSH Key:  {merged['sshKey']}\n"
            out += f"Host:     {merged['host']}\n"
            out += f"Port:     {merged['port']}\n"
        out += f"\nConfig file: {cfg_path}\n"
        out += "Run: hermes gateway restart\n"
        return out

    # Helper methods
    def _build_script_env(self) -> dict:
        """Build environment dict for script execution (shared by all script runners)"""
        env = os.environ.copy()

        # Determine where to save settings based on context:
        # 1. If cwd has .claude/ → Use cwd (real Claude Code project)
        # 2. Otherwise → Use global ~/.claude/ (Claude Desktop, Warp, etc.)
        # Note: Hooks are ALWAYS from package .claude/ (self.claude_dir)
        cwd = Path.cwd()
        if (cwd / ".claude").is_dir() and cwd != self.agentvibes_root:
            env["CLAUDE_PROJECT_DIR"] = str(cwd)

        # Augment PATH with platform-specific binary locations (Unix only).
        # MCP servers launched by Claude Desktop inherit a sanitized launchd/dbus PATH
        # that omits Homebrew (Mac) and pipx (all POSIX) locations.
        if not self.is_windows:
            home_dir = Path.home()
            extra_paths = [
                str(home_dir / ".local" / "bin"),
                str(home_dir / ".local" / "share" / "pipx" / "venvs" / "piper-tts" / "bin"),
            ]
            # Mac: add Homebrew prefix for both Apple Silicon (/opt/homebrew) and Intel (/usr/local)
            if self.is_darwin:
                extra_paths = ["/opt/homebrew/bin", "/usr/local/bin"] + extra_paths

            current_path = env.get("PATH", "")
            path_parts = current_path.split(os.pathsep) if current_path else []
            new_dirs = [p for p in extra_paths if p not in path_parts]
            if new_dirs:
                env["PATH"] = os.pathsep.join(new_dirs) + os.pathsep + current_path

        return env

    async def _run_script(
        self,
        script_name: str,
        args: list[str],
        timeout: float = DEFAULT_SCRIPT_TIMEOUT,
    ) -> ScriptResult:
        """Run a script and return its (returncode, stdout, stderr) as a ScriptResult.

        Callers MUST branch on `.ok`/`.returncode` — never on text/emoji
        content — because Windows manager scripts (.ps1) print plain text
        where the Unix (.sh) scripts print an emoji marker.

        `stdin` is always DEVNULL and a timeout is always enforced so a
        script that reaches an interactive prompt (e.g. `read -p`) cannot
        inherit the MCP stdio JSON-RPC stream or hang the server forever.
        """
        # Auto-resolve .sh → .ps1 on Windows (class constants handle special cases)
        if self.is_windows and script_name.endswith('.sh'):
            script_name = script_name[:-3] + '.ps1'
        script_path = self.hooks_dir / script_name
        if not script_path.exists():
            return ScriptResult(127, "", f"Script not found: {script_path}")

        # Build command — PowerShell on Windows, bash on Unix
        if self.is_windows:
            cmd = [
                "powershell", "-NoProfile", "-ExecutionPolicy", "Bypass",
                "-File", str(script_path)
            ] + args
        else:
            cmd = ["bash", str(script_path)] + args

        env = self._build_script_env()

        proc = None
        try:
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdin=asyncio.subprocess.DEVNULL,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env=env,
            )
            # Shield the communicate() task from wait_for's cancellation. On the
            # Unix event loop, cancelling communicate() awaits the still-running
            # child, so a plain `wait_for(proc.communicate())` does NOT honor the
            # timeout (it blocks for the child's full runtime). Instead let the
            # timeout fire, kill the child ourselves, then drain the shielded task
            # (which now returns promptly). Works on both Unix and Windows loops.
            comm_task = asyncio.ensure_future(proc.communicate())
            try:
                stdout, stderr = await asyncio.wait_for(asyncio.shield(comm_task), timeout=timeout)
            except asyncio.TimeoutError:
                proc.kill()
                try:
                    await comm_task  # completes quickly once the child is dead
                except Exception:
                    pass
                return ScriptResult(
                    -1, "",
                    f"Script '{script_name}' timed out after {timeout:.0f}s "
                    "(it may have reached an interactive prompt)"
                )
            return ScriptResult(
                proc.returncode if proc.returncode is not None else -1,
                stdout.decode(errors="replace").strip(),
                stderr.decode(errors="replace").strip(),
            )
        except Exception as e:
            return ScriptResult(-2, "", f"Error running script: {e}")
        finally:
            # Ensure process cleanup
            if proc is not None and proc.returncode is None:
                proc.kill()
                await proc.wait()

    async def _get_current_voice(self) -> str:
        """Get the currently active voice"""
        result = await self._run_script(self.VOICE_MANAGER_SCRIPT, ["get"])
        return result.stdout.strip() if result.ok and result.stdout else "Unknown"

    async def _get_personality(self) -> str:
        """Get the current personality setting"""
        personality_file = self.claude_dir / "tts-personality.txt"
        if not personality_file.exists():
            # Try global
            personality_file = Path.home() / self.CLAUDE_DIR_NAME / "tts-personality.txt"

        try:
            if personality_file.exists():
                return personality_file.read_text().strip()
        except (PermissionError, UnicodeDecodeError, OSError) as e:
            # Log error but don't crash - return default
            import sys
            print(f"Warning: Could not read personality file: {e}", file=sys.stderr)
        return "normal"

    async def _get_language(self) -> str:
        """Get the current language setting"""
        result = await self._run_script(self.LANGUAGE_MANAGER_SCRIPT, ["code"])
        return result.stdout.strip() if result.ok and result.stdout else "english"

    async def _get_provider(self) -> str:
        """Get the active TTS provider"""
        provider_file = self.claude_dir / "tts-provider.txt"
        if not provider_file.exists():
            provider_file = Path.home() / self.CLAUDE_DIR_NAME / "tts-provider.txt"

        provider_labels = {
            "macos": "macOS TTS",
            "piper": "Piper TTS (Free, Offline)",
            "termux-ssh": "Termux SSH (Android)",
            "windows-piper": "Windows Piper TTS (Free, Offline)",
            "windows-sapi": "Windows SAPI (Built-in)",
            "soprano": "Soprano TTS (Ultra-fast Neural)",
        }
        try:
            if provider_file.exists():
                provider = provider_file.read_text().strip()
                # Strip BOM from PowerShell-written files
                provider = provider.lstrip('\ufeff')
                return provider_labels.get(provider, provider)
        except (PermissionError, UnicodeDecodeError, OSError) as e:
            # Log error but don't crash - return default
            import sys
            print(f"Warning: Could not read provider file: {e}", file=sys.stderr)
        # Default based on platform
        if self.is_windows:
            return "Windows SAPI (Built-in)"
        return "Piper TTS (Free, Offline)"


# Create the MCP server
app = Server("agentvibes")
agent_vibes = AgentVibesServer()


@app.list_tools()
async def list_tools() -> list[Tool]:
    """List all available AgentVibes tools"""
    return [
        Tool(
            name="text_to_speech",
            description="""Convert text to speech using AgentVibes TTS.

Supports both macOS TTS and Piper (free, offline) providers.
Can use different voices, personalities, and languages.

Perfect for:
- Speaking acknowledgments and confirmations
- Adding voice to Claude responses
- Multi-language communication
- Personality-driven interactions

Examples:
- text_to_speech(text="Hello, I'm ready to help!")
- text_to_speech(text="Task completed!", personality="flirty")
- text_to_speech(text="Hola, ¿cómo estás?", language="spanish")
""",
            inputSchema={
                "type": "object",
                "properties": {
                    "text": {
                        "type": "string",
                        "description": "Text to convert to speech (max 500 characters)",
                    },
                    "voice": {
                        "type": "string",
                        "description": "Voice name (optional). Use list_voices to see options.",
                    },
                    "personality": {
                        "type": "string",
                        "description": "Personality style (optional). Examples: flirty, sarcastic, pirate, robot, zen",
                    },
                    "language": {
                        "type": "string",
                        "description": "Language to speak in (optional). Examples: spanish, french, german, italian",
                    },
                },
                "required": ["text"],
            },
        ),
        Tool(
            name="list_voices",
            description="List all available TTS voices with current selection",
            inputSchema={"type": "object", "properties": {}},
        ),
        Tool(
            name="set_voice",
            description="Switch to a different TTS voice",
            inputSchema={
                "type": "object",
                "properties": {
                    "voice_name": {
                        "type": "string",
                        "description": "Name of the voice to switch to",
                    }
                },
                "required": ["voice_name"],
            },
        ),
        Tool(
            name="list_personalities",
            description="List all available personality styles with descriptions",
            inputSchema={"type": "object", "properties": {}},
        ),
        Tool(
            name="set_personality",
            description="Set the personality style for TTS messages",
            inputSchema={
                "type": "object",
                "properties": {
                    "personality": {
                        "type": "string",
                        "description": "Personality name (e.g., flirty, sarcastic, pirate)",
                    }
                },
                "required": ["personality"],
            },
        ),
        Tool(
            name="set_language",
            description="Set the language for TTS speech (supports 25+ languages)",
            inputSchema={
                "type": "object",
                "properties": {
                    "language": {
                        "type": "string",
                        "description": "Language name (e.g., spanish, french, german)",
                    }
                },
                "required": ["language"],
            },
        ),
        Tool(
            name="get_config",
            description="Get current voice, personality, language, and provider configuration",
            inputSchema={"type": "object", "properties": {}},
        ),
        Tool(
            name="replay_audio",
            description="Replay recently generated TTS audio",
            inputSchema={
                "type": "object",
                "properties": {
                    "n": {
                        "type": "integer",
                        "description": "Which audio to replay (1 = most recent, default: 1)",
                        "minimum": 1,
                        "maximum": 10,
                    }
                },
            },
        ),
        Tool(
            name="set_provider",
            description="Switch between TTS providers" + (
                ": Windows Piper, Windows SAPI, or Soprano" if agent_vibes.is_windows
                else ": macOS TTS, Piper (free, offline), Soprano, or Termux SSH (Android)"
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "provider": {
                        "type": "string",
                        "description": (
                            "Provider name: 'windows-piper', 'windows-sapi', or 'soprano'"
                            if agent_vibes.is_windows
                            else "Provider name: 'piper', 'macos', 'soprano', or 'termux-ssh'"
                        ),
                        "enum": (
                            ["windows-piper", "windows-sapi", "soprano"]
                            if agent_vibes.is_windows
                            else ["piper", "macos", "soprano", "termux-ssh"]
                        ),
                    }
                },
                "required": ["provider"],
            },
        ),
        Tool(
            name="set_speed",
            description="Set speech speed for main or target voice. Works with both Piper and macOS providers. Use this to make voices faster or slower.",
            inputSchema={
                "type": "object",
                "properties": {
                    "speed": {
                        "type": "string",
                        "description": "Speed value: '0.5x' or 'slow/slower' (half speed, slower), '1x' or 'normal' (normal speed), '2x' or 'fast' (double speed, faster), '3x' or 'faster' (triple speed, very fast)"
                    },
                    "target": {
                        "type": "boolean",
                        "description": "If true, sets target language speed (for learning mode); if false or omitted, sets main voice speed",
                        "default": False
                    }
                },
                "required": ["speed"],
            },
        ),
        Tool(
            name="get_speed",
            description="Get current speech speed settings for main and target voices",
            inputSchema={"type": "object", "properties": {}},
        ),
        Tool(
            name="download_extra_voices",
            description=(
                "Download extra high-quality custom Piper voices from HuggingFace. "
                "Includes: Kristin (US female), Jenny (UK female with Irish accent), "
                "and Tracy/16Speakers (multi-speaker). Perfect for adding variety to "
                "your TTS voices. This tool never proceeds without explicit consent: "
                "call it with auto_yes=True to actually start the download, or it "
                "returns a 'confirmation required' message and does nothing."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "auto_yes": {
                        "type": "boolean",
                        "description": (
                            "Must be True to download. False (the default) returns a "
                            "confirmation-required message without downloading anything — "
                            "this tool cannot answer an interactive Y/n prompt."
                        ),
                        "default": False
                    }
                },
            },
        ),
        Tool(
            name="get_verbosity",
            description="Get current AgentVibes verbosity level (low/medium/high/caveman). Verbosity controls how much Claude speaks while working - from minimal (acknowledgments only) to maximum transparency (all reasoning spoken) to caveman (ultra-terse fragments, max token savings).",
            inputSchema={"type": "object", "properties": {}},
        ),
        Tool(
            name="set_verbosity",
            description="""Set AgentVibes verbosity level to control how much Claude speaks while working.

Verbosity Levels:
- LOW: Only acknowledgments (start) and completions (end). Minimal interruption.
- MEDIUM: + Major decisions and key findings. Balanced transparency.
- HIGH: All reasoning, decisions, and findings. Maximum transparency.
- CAVEMAN: Ultra-terse fragments. Drops articles, filler, hedging. Abbreviates heavily. 65-75% fewer output tokens.

Perfect for:
- LOW: Quiet work sessions, minimal distraction
- MEDIUM: Understanding major decisions without full narration
- HIGH: Full transparency, learning mode, debugging complex tasks
- CAVEMAN: Maximum token savings, minimal prose

Note: Changes take effect on next Claude Code session restart.""",
            inputSchema={
                "type": "object",
                "properties": {
                    "level": {
                        "type": "string",
                        "description": "Verbosity level to set",
                        "enum": ["low", "medium", "high", "caveman"]
                    }
                },
                "required": ["level"],
            },
        ),
        Tool(
            name="mute",
            description="Mute all AgentVibes TTS output. Creates a persistent mute flag that silences all voice output until unmuted. Persists across sessions.",
            inputSchema={"type": "object", "properties": {}},
        ),
        Tool(
            name="unmute",
            description="Unmute AgentVibes TTS output. Removes the mute flag and restores voice output.",
            inputSchema={"type": "object", "properties": {}},
        ),
        Tool(
            name="is_muted",
            description="Check if TTS is currently muted.",
            inputSchema={"type": "object", "properties": {}},
        ),
        Tool(
            name="list_background_music",
            description="List all available pre-packaged background music tracks. Shows all audio files that can be used as background music for TTS.",
            inputSchema={"type": "object", "properties": {}},
        ),
        Tool(
            name="set_background_music",
            description="""Set background music track for a specific agent, all agents, or as default. Supports smart fuzzy matching.

Perfect for:
- "change background music to flamenco" - Sets for all agents
- "set John's background music to celtic harp" - Agent-specific
- "use chillwave as default background" - Default for new agents

Fuzzy matching examples:
- "flamenco" matches "agentvibes_soft_flamenco_loop.mp3"
- "celtic" matches "agent_vibes_celtic_harp_v1_loop.mp3"
- "bossa" matches "agent_vibes_bossa_nova_v2_loop.mp3"
""",
            inputSchema={
                "type": "object",
                "properties": {
                    "track_name": {
                        "type": "string",
                        "description": "Track filename or partial name for fuzzy matching (e.g., 'celtic', 'flamenco', 'bossa nova')",
                    },
                    "agent_name": {
                        "type": "string",
                        "description": "Agent name to configure (optional). Use 'all' for all agents, omit for default",
                    },
                },
                "required": ["track_name"],
            },
        ),
        Tool(
            name="enable_background_music",
            description="Enable or disable background music globally. When enabled, TTS audio will be mixed with background music at configured volume (default 20%).",
            inputSchema={
                "type": "object",
                "properties": {
                    "enabled": {
                        "type": "boolean",
                        "description": "True to enable background music, False to disable",
                    }
                },
                "required": ["enabled"],
            },
        ),
        Tool(
            name="set_background_music_volume",
            description="Set the volume level for background music (0.0-1.0). Recommended: 0.20-0.40 for subtle background ambiance.",
            inputSchema={
                "type": "object",
                "properties": {
                    "volume": {
                        "type": "number",
                        "description": "Volume level (0.0 = silent, 0.20 = default, 1.0 = full volume)",
                        "minimum": 0.0,
                        "maximum": 1.0,
                    }
                },
                "required": ["volume"],
            },
        ),
        Tool(
            name="get_background_music_status",
            description="Get current background music configuration including enabled status, volume, default track, and number of available tracks.",
            inputSchema={"type": "object", "properties": {}},
        ),
        Tool(
            name="set_reverb",
            description="""Set reverb level for TTS audio. Can apply globally (default agent), to a specific agent, or to all agents.

Reverb adds room/space ambiance to the voice, making it sound like it's in a small room, conference room, or large hall.

Examples:
- set_reverb(level="medium") - Set reverb for default agent
- set_reverb(level="cathedral", agent="Winston") - Set cathedral reverb for Winston
- set_reverb(level="light", apply_all=True) - Set light reverb for all agents
- set_reverb(level="off") - Turn off reverb for default agent
""",
            inputSchema={
                "type": "object",
                "properties": {
                    "level": {
                        "type": "string",
                        "description": "Reverb level",
                        "enum": ["off", "light", "medium", "heavy", "cathedral"]
                    },
                    "agent": {
                        "type": "string",
                        "description": "Agent name (optional, defaults to 'default'). Examples: Winston, John, Mary, Amelia",
                    },
                    "apply_all": {
                        "type": "boolean",
                        "description": "Apply to all agents (optional, default: false)",
                    }
                },
                "required": ["level"],
            },
        ),
        Tool(
            name="get_reverb",
            description="Get current reverb level for a specific agent or default",
            inputSchema={
                "type": "object",
                "properties": {
                    "agent": {
                        "type": "string",
                        "description": "Agent name (optional, defaults to 'default')",
                    }
                },
            },
        ),
        Tool(
            name="list_audio_effects",
            description="List current audio effects configuration for all agents, including reverb levels and other effects",
            inputSchema={"type": "object", "properties": {}},
        ),
        Tool(
            name="clean_audio_cache",
            description="Clean all TTS audio cache files and report space freed. Non-interactive cleanup that removes all wav/mp3/aiff files while preserving background music tracks.",
            inputSchema={"type": "object", "properties": {}},
        ),
        Tool(
            name="get_hermes_config",
            description="Get current Hermes AgentVibes SSH configuration (SSH key path, host, port, voice). Use this to check what's currently set before changing it.",
            inputSchema={"type": "object", "properties": {}},
        ),
        Tool(
            name="set_hermes_config",
            description="Configure Hermes AgentVibes TTS settings. Choose 'local' mode when Hermes runs on the same machine as your speakers (no SSH needed), or 'remote' mode to send audio over SSH to a receiver. Omit any field to keep its current value.",
            inputSchema={
                "type": "object",
                "properties": {
                    "mode": {
                        "type": "string",
                        "enum": ["local", "remote"],
                        "description": "'local' = Hermes and speakers on same machine (no SSH). 'remote' = send audio over SSH to a receiver machine.",
                    },
                    "ssh_key": {
                        "type": "string",
                        "description": "Absolute path to SSH private key (e.g. /home/user/.ssh/id_ed25519_agentvibes) — only used in remote mode",
                    },
                    "host": {
                        "type": "string",
                        "description": "Tailscale IP or hostname of the machine with speakers — only used in remote mode",
                    },
                    "port": {
                        "type": "string",
                        "description": "AgentVibes receiver SSH port (e.g. '2222') — only used in remote mode",
                    },
                    "voice": {
                        "type": "string",
                        "description": "Piper voice model (e.g. 'en_US-libritts-high::Leo-8')",
                    },
                },
            },
        ),
    ]


@app.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent] | CallToolResult:
    """Handle tool calls.

    Every AgentVibesServer method below returns a string that starts with
    "❌" on failure (a marker produced by our own code from the script's
    *exit code*, not sniffed from the child script's stdout — see H1/#1 in
    story 8.2). We use that marker here, once, to set MCP's `isError` so
    clients can distinguish failure without parsing text.
    """
    try:
        if name == "text_to_speech":
            result = await agent_vibes.text_to_speech(
                text=arguments["text"],
                voice=arguments.get("voice"),
                personality=arguments.get("personality"),
                language=arguments.get("language"),
            )
        elif name == "list_voices":
            result = await agent_vibes.list_voices()
        elif name == "set_voice":
            result = await agent_vibes.set_voice(arguments["voice_name"])
        elif name == "list_personalities":
            result = await agent_vibes.list_personalities()
        elif name == "set_personality":
            result = await agent_vibes.set_personality(arguments["personality"])
        elif name == "set_language":
            result = await agent_vibes.set_language(arguments["language"])
        elif name == "get_config":
            result = await agent_vibes.get_config()
        elif name == "replay_audio":
            n = arguments.get("n", 1)
            result = await agent_vibes.replay_audio(n)
        elif name == "set_provider":
            result = await agent_vibes.set_provider(arguments["provider"])
        elif name == "set_speed":
            target = arguments.get("target", False)
            result = await agent_vibes.set_speed(arguments["speed"], target)
        elif name == "get_speed":
            result = await agent_vibes.get_speed()
        elif name == "download_extra_voices":
            auto_yes = arguments.get("auto_yes", False)
            result = await agent_vibes.download_extra_voices(auto_yes)
        elif name == "get_verbosity":
            result = await agent_vibes.get_verbosity()
        elif name == "set_verbosity":
            result = await agent_vibes.set_verbosity(arguments["level"])
        elif name == "mute":
            result = await agent_vibes.mute()
        elif name == "unmute":
            result = await agent_vibes.unmute()
        elif name == "is_muted":
            result = await agent_vibes.is_muted()
        elif name == "list_background_music":
            result = await agent_vibes.list_background_music()
        elif name == "set_background_music":
            track_name = arguments.get("track_name")
            agent_name = arguments.get("agent_name")
            result = await agent_vibes.set_background_music(track_name, agent_name)
        elif name == "enable_background_music":
            enabled = arguments.get("enabled")
            result = await agent_vibes.enable_background_music(enabled)
        elif name == "set_background_music_volume":
            volume = arguments.get("volume")
            result = await agent_vibes.set_background_music_volume(volume)
        elif name == "get_background_music_status":
            result = await agent_vibes.get_background_music_status()
        elif name == "set_reverb":
            level = arguments["level"]
            agent = arguments.get("agent", "default")
            apply_all = arguments.get("apply_all", False)
            result = await agent_vibes.set_reverb(level, agent, apply_all)
        elif name == "get_reverb":
            agent = arguments.get("agent", "default")
            result = await agent_vibes.get_reverb(agent)
        elif name == "list_audio_effects":
            result = await agent_vibes.list_audio_effects()
        elif name == "clean_audio_cache":
            result = await agent_vibes.clean_audio_cache()
        elif name == "get_hermes_config":
            result = await agent_vibes.get_hermes_config()
        elif name == "set_hermes_config":
            result = await agent_vibes.set_hermes_config(
                mode=arguments.get("mode"),
                ssh_key=arguments.get("ssh_key"),
                host=arguments.get("host"),
                port=arguments.get("port"),
                voice=arguments.get("voice"),
            )
        else:
            return CallToolResult(
                content=[TextContent(type="text", text=f"Unknown tool: {name}")],
                isError=True,
            )

        content = [TextContent(type="text", text=result)]
        if isinstance(result, str) and result.startswith("❌"):
            return CallToolResult(content=content, isError=True)
        return content

    except Exception as e:
        return CallToolResult(
            content=[TextContent(type="text", text=f"Error: {str(e)}")],
            isError=True,
        )


async def main():
    """Run the MCP server"""
    async with mcp.server.stdio.stdio_server() as (read_stream, write_stream):
        await app.run(
            read_stream,
            write_stream,
            app.create_initialization_options(),
        )


if __name__ == "__main__":
    asyncio.run(main())

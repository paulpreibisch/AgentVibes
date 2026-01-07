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
import os
import subprocess
from pathlib import Path
from typing import Optional

from mcp.server import Server
from mcp.types import Tool, TextContent, ImageContent, EmbeddedResource
import mcp.server.stdio


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
        # Find the .claude directory (project-local or global)
        self.claude_dir = self._find_claude_dir()
        self.hooks_dir = self.claude_dir / "hooks"
        # Store AgentVibes root directory for environment variable
        self.agentvibes_root = self.claude_dir.parent

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
        # Store original settings to restore later
        original_personality = None
        original_language = None

        try:
            # Temporarily set personality if specified
            if personality:
                original_personality = await self._get_personality()
                await self._run_script(
                    self.PERSONALITY_MANAGER_SCRIPT, ["set", personality]
                )

            # Temporarily set language if specified
            if language:
                original_language = await self._get_language()
                await self._run_script(self.LANGUAGE_MANAGER_SCRIPT, ["set", language])

            # Call the TTS script via bash explicitly
            play_tts = self.hooks_dir / "play-tts.sh"
            args = ["bash", str(play_tts), text]
            if voice:
                args.append(voice)

            # Set environment and ensure PATH includes .local/bin
            env = os.environ.copy()

            # Determine where to save settings based on context:
            # 1. If cwd has .claude/ → Use cwd (real Claude Code project)
            # 2. Otherwise → Use global ~/.claude/ (Claude Desktop, Warp, etc.)
            # Note: Hooks are ALWAYS from package .claude/ (self.claude_dir)
            cwd = Path.cwd()
            if (cwd / self.CLAUDE_DIR_NAME).is_dir() and cwd != self.agentvibes_root:
                # Real Claude Code project with .claude directory
                env["CLAUDE_PROJECT_DIR"] = str(cwd)
            # else: Don't set CLAUDE_PROJECT_DIR, let scripts fall back to ~/.claude
            # This handles: Claude Desktop (NPX), Warp, and any non-project context
            # Add common locations for piper to PATH
            home_dir = Path.home()
            local_bin = str(home_dir / ".local" / "bin")
            if "PATH" in env:
                if local_bin not in env["PATH"]:
                    env["PATH"] = f"{local_bin}:{env['PATH']}"
            else:
                env["PATH"] = local_bin

            result = await asyncio.create_subprocess_exec(
                *args,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env=env,
            )
            try:
                stdout, stderr = await result.communicate()

                if result.returncode == 0:
                    output = stdout.decode().strip()
                    # Extract file path from output
                    for line in output.split("\n"):
                        if "Saved to:" in line:
                            file_path = line.split("Saved to:")[1].strip()
                            truncated = (
                                f"{text[:50]}..." if len(text) > 50 else text
                            )
                            return f"✅ Spoke: {truncated}\n📁 Audio saved: {file_path}"

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
            # Restore original settings
            if original_personality:
                await self._run_script(
                    self.PERSONALITY_MANAGER_SCRIPT, ["set", original_personality]
                )
            if original_language:
                await self._run_script(
                    self.LANGUAGE_MANAGER_SCRIPT, ["set", original_language]
                )

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
        if result:
            voices = result.strip().split("\n")
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
            output += f"{self.SEPARATOR}\n"

            # Add provider switch hint
            if alternative_provider:
                output += f"\n💡 Switch to {alternative_provider}? Use: set_provider(provider=\"{alternative_provider.lower()}\")\n"

            return output
        return "❌ Failed to list voices"

    async def set_voice(self, voice_name: str) -> str:
        """
        Switch to a different voice.

        Args:
            voice_name: Name of the voice to switch to

        Returns:
            Success or error message
        """
        result = await self._run_script(
            self.VOICE_MANAGER_SCRIPT, ["switch", voice_name, "--silent"]
        )
        if result and "✅" in result:
            return f"✅ Voice switched to: {voice_name}"
        return f"❌ Failed to switch voice: {result}"

    async def list_personalities(self) -> str:
        """
        List all available personalities.

        Returns:
            Formatted list of personalities with descriptions
        """
        result = await self._run_script(self.PERSONALITY_MANAGER_SCRIPT, ["list"])
        return result if result else "❌ Failed to list personalities"

    async def set_personality(self, personality: str) -> str:
        """
        Set the personality style for TTS messages.

        Args:
            personality: Personality name (e.g., "flirty", "sarcastic", "pirate")

        Returns:
            Success or error message
        """
        result = await self._run_script(
            self.PERSONALITY_MANAGER_SCRIPT, ["set", personality]
        )
        if result and "🎭" in result:
            return result
        return f"❌ Failed to set personality: {result}"

    async def get_config(self) -> str:
        """
        Get current AgentVibes configuration.

        Returns:
            Current voice, personality, language, and provider settings
        """
        voice = await self._get_current_voice()
        personality = await self._get_personality()
        language = await self._get_language()
        provider = await self._get_provider()

        output = "🎤 Current AgentVibes Configuration\n"
        output += f"{self.SEPARATOR}\n"
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
        result = await self._run_script(self.LANGUAGE_MANAGER_SCRIPT, ["set", language])
        if result and "✓" in result:
            return result
        return f"❌ Failed to set language: {result}"

    async def replay_audio(self, n: int = 1) -> str:
        """
        Replay recently generated TTS audio.

        Args:
            n: Which audio to replay (1 = most recent, 2 = second most recent, etc.)

        Returns:
            Success or error message
        """
        result = await self._run_script(self.VOICE_MANAGER_SCRIPT, ["replay", str(n)])
        if result and "🔊" in result:
            return result
        return f"❌ Failed to replay audio: {result}"

    async def set_provider(self, provider: str) -> str:
        """
        Switch TTS provider between Piper, macOS, and Termux SSH.

        Args:
            provider: Provider name ("piper", "macos", or "termux-ssh")

        Returns:
            Success or error message
        """
        provider = provider.lower()
        if provider not in ["piper", "macos", "termux-ssh"]:
            return f"❌ Invalid provider: {provider}. Choose 'piper', 'macos', or 'termux-ssh'"

        result = await self._run_script("provider-manager.sh", ["switch", provider])
        if result and "✓" in result:
            # Automatically speak confirmation in the new provider's voice
            if provider == "macos":
                provider_name = "macOS"
            elif provider == "termux-ssh":
                provider_name = "Termux SSH"
            else:
                provider_name = "Piper"
            confirmation_text = f"Successfully switched to {provider_name} provider"

            try:
                # Speak the confirmation with 5 second timeout to prevent hanging
                await asyncio.wait_for(
                    self.text_to_speech(confirmation_text),
                    timeout=5.0
                )
                # Return the provider switch result plus TTS confirmation
                return f"{result}\n🔊 Spoken confirmation: {confirmation_text}"
            except asyncio.TimeoutError:
                # Timeout - provider may need setup (e.g., Piper not installed)
                return f"{result}\n⚠️ Provider switched (TTS confirmation timed out - provider may need setup)"
            except Exception as e:
                # If TTS fails, still return success for the provider switch
                return f"{result}\n⚠️ Provider switched but TTS confirmation failed: {e}"

        return f"❌ Failed to switch provider: {result}"

    async def set_learn_mode(self, enabled: bool) -> str:
        """
        Enable or disable language learning mode.

        When enabled, TTS speaks in both your main language and target language.

        Args:
            enabled: True to enable, False to disable

        Returns:
            Success or error message
        """
        action = "enable" if enabled else "disable"
        result = await self._run_script("learn-manager.sh", [action])
        if result and "✓" in result:
            return result
        return f"❌ Failed to set learn mode: {result}"

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
        if result and "✓" in result:
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
                return f"{result}\n🔊 Testing new speed: \"{test_message}\""
            except Exception as e:
                # If TTS fails, still return success for the speed change
                return f"{result}\n⚠️ Speed changed but demo failed: {e}"

        return f"❌ Failed to set speed: {result}"

    async def get_speed(self) -> str:
        """
        Get current speech speed settings.

        Returns:
            Current speed settings for main and target voices
        """
        result = await self._run_script("speed-manager.sh", ["get"])
        return result if result else "❌ Failed to get speed settings"

    async def download_extra_voices(self, auto_yes: bool = False) -> str:
        """
        Download extra high-quality Piper voices from HuggingFace.

        Downloads custom voices: Kristin, Jenny, and Tracy/16Speakers.

        Args:
            auto_yes: If True, skips confirmation prompt and downloads automatically

        Returns:
            Success message with download summary
        """
        args = ["--yes"] if auto_yes else []
        result = await self._run_script("download-extra-voices.sh", args)
        if result and ("✅" in result or "Successfully downloaded" in result or "already downloaded" in result):
            return result
        return f"❌ Failed to download extra voices: {result}"

    async def get_verbosity(self) -> str:
        """
        Get current verbosity level.

        Returns:
            Current verbosity level with description
        """
        result = await self._run_script("verbosity-manager.sh", ["get"])
        if result:
            level = result.strip()
            descriptions = {
                "low": "LOW - Acknowledgments + Completions only (minimal)",
                "medium": "MEDIUM - + Major decisions and findings (balanced)",
                "high": "HIGH - All reasoning (maximum transparency)"
            }
            desc = descriptions.get(level, level)
            return f"🎙️ Current Verbosity: {desc}\n\n💡 Change with: set_verbosity(level=\"low|medium|high\")"
        return "❌ Failed to get verbosity level"

    async def set_verbosity(self, level: str) -> str:
        """
        Set verbosity level to control how much Claude speaks.

        Args:
            level: Verbosity level (low, medium, or high)

        Returns:
            Success or error message
        """
        result = await self._run_script("verbosity-manager.sh", ["set", level])
        if result and "✅" in result:
            return f"{result}\n\n⚠️  Restart Claude Code for changes to take effect"
        return f"❌ Failed to set verbosity: {result}"

    async def mute(self) -> str:
        """
        Mute all TTS output. Creates a persistent mute flag.

        Returns:
            Success message confirming mute is active
        """
        mute_file = Path.home() / self.MUTE_FILE_NAME
        try:
            mute_file.touch()
            return "🔇 AgentVibes TTS muted. All voice output is now silenced.\n\n💡 To unmute, use: unmute()"
        except Exception as e:
            return f"❌ Failed to mute: {e}"

    async def unmute(self) -> str:
        """
        Unmute TTS output. Removes the mute flag.

        Returns:
            Success message confirming TTS is restored
        """
        global_mute = Path.home() / self.MUTE_FILE_NAME
        project_mute = Path.cwd() / self.CLAUDE_DIR_NAME / "agentvibes-muted"

        removed = []
        try:
            if global_mute.exists():
                global_mute.unlink()
                removed.append("global")
            if project_mute.exists():
                project_mute.unlink()
                removed.append("project")

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
        global_mute = Path.home() / self.MUTE_FILE_NAME
        project_mute = Path.cwd() / self.CLAUDE_DIR_NAME / "agentvibes-muted"

        if global_mute.exists() or project_mute.exists():
            return "🔇 TTS is currently MUTED\n\n💡 To unmute, use: unmute()"
        else:
            return "🔊 TTS is currently ACTIVE\n\n💡 To mute, use: mute()"

    async def list_background_music(self) -> str:
        """
        List all available background music tracks.

        Returns:
            Formatted list of all pre-packaged background music files
        """
        result = await self._run_script(self.BACKGROUND_MUSIC_MANAGER_SCRIPT, ["list"])
        return result if result else "❌ Failed to list background music"

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
        if not list_result or "❌" in list_result:
            return "❌ Failed to list background music tracks"

        # Parse track names
        tracks = []
        for line in list_result.split("\n"):
            match = re.match(r'\s*\d+\.\s+(.+)', line)
            if match:
                tracks.append(match.group(1))

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

        if result and "✅" in result:
            if matched_track.lower() != track_name.lower():
                return f"{result}\n\n🔍 Matched '{track_name}' to '{matched_track}'"
            return result
        return f"❌ Failed to set background music: {result}"

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
        return result if result else f"❌ Failed to {'enable' if enabled else 'disable'} background music"

    async def set_background_music_volume(self, volume: float) -> str:
        """
        Set background music volume.

        Args:
            volume: Volume level (0.0-1.0)

        Returns:
            Success or error message
        """
        result = await self._run_script(self.BACKGROUND_MUSIC_MANAGER_SCRIPT, ["volume", str(volume)])
        return result if result else "❌ Failed to set background music volume"

    async def get_background_music_status(self) -> str:
        """
        Get current background music configuration.

        Returns:
            Status information
        """
        result = await self._run_script(self.BACKGROUND_MUSIC_MANAGER_SCRIPT, ["status"])
        return result if result else "❌ Failed to get background music status"

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
        return result if result else f"✅ Set reverb to {level}"

    async def get_reverb(self, agent: str = "default") -> str:
        """
        Get current reverb level for an agent.

        Args:
            agent: Agent name (default: "default")

        Returns:
            Current reverb level
        """
        result = await self._run_script(self.EFFECTS_MANAGER_SCRIPT, ["get-reverb", agent])
        if result:
            return f"Current reverb level for {agent}: {result.strip()}"
        return f"❌ Failed to get reverb for {agent}"

    async def list_audio_effects(self) -> str:
        """
        List all audio effects for all agents.

        Returns:
            Effects configuration
        """
        result = await self._run_script(self.EFFECTS_MANAGER_SCRIPT, ["list"])
        return result if result else "❌ Failed to list audio effects"

    # Helper methods
    async def _run_script(self, script_name: str, args: list[str]) -> str:
        """Run a bash script and return output"""
        script_path = self.hooks_dir / script_name
        if not script_path.exists():
            return f"Script not found: {script_path}"

        # Explicitly call bash to run the script
        cmd = ["bash", str(script_path)] + args

        # Set environment and ensure PATH includes .local/bin
        env = os.environ.copy()

        # Determine where to save settings based on context:
        # 1. If cwd has .claude/ → Use cwd (real Claude Code project)
        # 2. Otherwise → Use global ~/.claude/ (Claude Desktop, Warp, etc.)
        # Note: Hooks are ALWAYS from package .claude/ (self.claude_dir)
        cwd = Path.cwd()
        if (cwd / ".claude").is_dir() and cwd != self.agentvibes_root:
            # Real Claude Code project with .claude directory
            env["CLAUDE_PROJECT_DIR"] = str(cwd)
        # else: Don't set CLAUDE_PROJECT_DIR, let scripts fall back to ~/.claude
        # This handles: Claude Desktop (NPX), Warp, and any non-project context
        # Add common locations for piper to PATH
        home_dir = Path.home()
        local_bin = str(home_dir / ".local" / "bin")
        if "PATH" in env:
            if local_bin not in env["PATH"]:
                env["PATH"] = f"{local_bin}:{env['PATH']}"
        else:
            env["PATH"] = local_bin

        try:
            result = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env=env,
            )
            try:
                stdout, stderr = await result.communicate()
                if result.returncode == 0:
                    return stdout.decode().strip()
                else:
                    error_msg = stderr.decode().strip()
                    if not error_msg:  # If stderr is empty, include stdout for debugging
                        error_msg = f"Return code {result.returncode}. Stdout: {stdout.decode().strip()}"
                    return error_msg
            finally:
                # Ensure process cleanup
                if result.returncode is None:
                    result.kill()
                    await result.wait()
        except Exception as e:
            return f"Error running script: {e}"

    async def _get_current_voice(self) -> str:
        """Get the currently active voice"""
        result = await self._run_script(self.VOICE_MANAGER_SCRIPT, ["get"])
        return result.strip() if result else "Unknown"

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
        return result.strip() if result else "english"

    async def _get_provider(self) -> str:
        """Get the active TTS provider"""
        provider_file = self.claude_dir / "tts-provider.txt"
        if not provider_file.exists():
            provider_file = Path.home() / self.CLAUDE_DIR_NAME / "tts-provider.txt"

        try:
            if provider_file.exists():
                provider = provider_file.read_text().strip()
                if provider == "macos":
                    return "macOS TTS"
                elif provider == "piper":
                    return "Piper TTS (Free, Offline)"
                elif provider == "termux-ssh":
                    return "Termux SSH (Android)"
                return provider
        except (PermissionError, UnicodeDecodeError, OSError) as e:
            # Log error but don't crash - return default
            import sys
            print(f"Warning: Could not read provider file: {e}", file=sys.stderr)
        # Default to Piper (free, offline)
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
            description="Switch between TTS providers: macOS TTS, Piper (free, offline), or Termux SSH (Android)",
            inputSchema={
                "type": "object",
                "properties": {
                    "provider": {
                        "type": "string",
                        "description": "Provider name: 'piper', 'macos', or 'termux-ssh'",
                        "enum": ["piper", "macos", "termux-ssh"]
                    }
                },
                "required": ["provider"],
            },
        ),
        Tool(
            name="set_learn_mode",
            description="Enable or disable language learning mode. When ON, TTS speaks in both your main language and target language for bilingual learning.",
            inputSchema={
                "type": "object",
                "properties": {
                    "enabled": {
                        "type": "boolean",
                        "description": "True to enable learning mode, False to disable"
                    }
                },
                "required": ["enabled"],
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
            description="Download extra high-quality custom Piper voices from HuggingFace. Includes: Kristin (US female), Jenny (UK female with Irish accent), and Tracy/16Speakers (multi-speaker). Perfect for adding variety to your TTS voices.",
            inputSchema={
                "type": "object",
                "properties": {
                    "auto_yes": {
                        "type": "boolean",
                        "description": "Skip confirmation prompt and download automatically (default: False)",
                        "default": False
                    }
                },
            },
        ),
        Tool(
            name="get_verbosity",
            description="Get current AgentVibes verbosity level (low/medium/high). Verbosity controls how much Claude speaks while working - from minimal (acknowledgments only) to maximum transparency (all reasoning spoken).",
            inputSchema={"type": "object", "properties": {}},
        ),
        Tool(
            name="set_verbosity",
            description="""Set AgentVibes verbosity level to control how much Claude speaks while working.

Verbosity Levels:
- LOW: Only acknowledgments (start) and completions (end). Minimal interruption.
- MEDIUM: + Major decisions and key findings. Balanced transparency.
- HIGH: All reasoning, decisions, and findings. Maximum transparency.

Perfect for:
- LOW: Quiet work sessions, minimal distraction
- MEDIUM: Understanding major decisions without full narration
- HIGH: Full transparency, learning mode, debugging complex tasks

Note: Changes take effect on next Claude Code session restart.""",
            inputSchema={
                "type": "object",
                "properties": {
                    "level": {
                        "type": "string",
                        "description": "Verbosity level to set",
                        "enum": ["low", "medium", "high"]
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
            description="Enable or disable background music globally. When enabled, TTS audio will be mixed with background music at configured volume (default 30%).",
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
                        "description": "Volume level (0.0 = silent, 0.30 = default, 1.0 = full volume)",
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
    ]


@app.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent]:
    """Handle tool calls"""
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
        elif name == "set_learn_mode":
            result = await agent_vibes.set_learn_mode(arguments["enabled"])
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
        else:
            result = f"Unknown tool: {name}"

        return [TextContent(type="text", text=result)]

    except Exception as e:
        return [TextContent(type="text", text=f"Error: {str(e)}")]


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

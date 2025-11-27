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
        claude_dir = agentvibes_root / ".claude"

        # ALWAYS use package .claude for hooks (even in NPX cache)
        # The package ALWAYS has .claude/ with all the hooks
        if claude_dir.exists() and claude_dir.is_dir():
            return claude_dir

        # Fallback to global ~/.claude (should never happen in properly installed package)
        return Path.home() / ".claude"

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
                    "personality-manager.sh", ["set", personality]
                )

            # Temporarily set language if specified
            if language:
                original_language = await self._get_language()
                await self._run_script("language-manager.sh", ["set", language])

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
                    "personality-manager.sh", ["set", original_personality]
                )
            if original_language:
                await self._run_script(
                    "language-manager.sh", ["set", original_language]
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
        result = await self._run_script("voice-manager.sh", ["list-simple"])
        if result:
            voices = result.strip().split("\n")
            voices = [v for v in voices if v]  # Filter empty strings

            if not voices:
                return (
                    "📦 No voices available\n"
                    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                    "For Piper: Download voices using /agent-vibes:provider download <voice-name>\n"
                    "Example: en_US-lessac-medium, en_GB-alba-medium"
                )

            # Determine provider label and alternative provider
            if "Piper" in provider:
                provider_label = "Piper TTS"
                alternative_provider = "ElevenLabs"
            elif "ElevenLabs" in provider:
                provider_label = "ElevenLabs"
                alternative_provider = "Piper"
            else:
                provider_label = "TTS"
                alternative_provider = None

            output = f"🎤 Available {provider_label} Voices:\n"
            output += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
            for voice in voices:
                marker = " ✓ (current)" if voice == current_voice else ""
                output += f"  • {voice}{marker}\n"
            output += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"

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
            "voice-manager.sh", ["switch", voice_name, "--silent"]
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
        result = await self._run_script("personality-manager.sh", ["list"])
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
            "personality-manager.sh", ["set", personality]
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
        output += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        output += f"Provider: {provider}\n"
        output += f"Voice: {voice}\n"
        output += f"Personality: {personality}\n"
        output += f"Language: {language}\n"
        output += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        return output

    async def set_language(self, language: str) -> str:
        """
        Set the language for TTS speech.

        Args:
            language: Language name (e.g., "spanish", "french", "german")

        Returns:
            Success or error message
        """
        result = await self._run_script("language-manager.sh", ["set", language])
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
        result = await self._run_script("voice-manager.sh", ["replay", str(n)])
        if result and "🔊" in result:
            return result
        return f"❌ Failed to replay audio: {result}"

    async def set_provider(self, provider: str) -> str:
        """
        Switch TTS provider between ElevenLabs and Piper.

        Args:
            provider: Provider name ("elevenlabs" or "piper")

        Returns:
            Success or error message
        """
        provider = provider.lower()
        if provider not in ["elevenlabs", "piper"]:
            return f"❌ Invalid provider: {provider}. Choose 'elevenlabs' or 'piper'"

        result = await self._run_script("provider-manager.sh", ["switch", provider])
        if result and "✓" in result:
            # Automatically speak confirmation in the new provider's voice
            provider_name = "ElevenLabs" if provider == "elevenlabs" else "Piper"
            confirmation_text = f"Successfully switched to {provider_name} provider"

            try:
                # Speak the confirmation (ignoring the TTS result details)
                await self.text_to_speech(confirmation_text)
                # Return the provider switch result plus TTS confirmation
                return f"{result}\n🔊 Spoken confirmation: {confirmation_text}"
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

        Works with both Piper and ElevenLabs providers.

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
        result = await self._run_script("voice-manager.sh", ["get"])
        return result.strip() if result else "Unknown"

    async def _get_personality(self) -> str:
        """Get the current personality setting"""
        personality_file = self.claude_dir / "tts-personality.txt"
        if not personality_file.exists():
            # Try global
            personality_file = Path.home() / ".claude" / "tts-personality.txt"

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
        result = await self._run_script("language-manager.sh", ["code"])
        return result.strip() if result else "english"

    async def _get_provider(self) -> str:
        """Get the active TTS provider"""
        provider_file = self.claude_dir / "tts-provider.txt"
        if not provider_file.exists():
            provider_file = Path.home() / ".claude" / "tts-provider.txt"

        try:
            if provider_file.exists():
                provider = provider_file.read_text().strip()
                if provider == "elevenlabs":
                    return "ElevenLabs (Premium AI)"
                elif provider == "piper":
                    return "Piper TTS (Free, Offline)"
                return provider
        except (PermissionError, UnicodeDecodeError, OSError) as e:
            # Log error but don't crash - return default
            import sys
            print(f"Warning: Could not read provider file: {e}", file=sys.stderr)
        # Default to Piper (free, offline) instead of ElevenLabs
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

Supports both ElevenLabs (premium) and Piper (free, offline) providers.
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
            description="Switch between ElevenLabs (premium) and Piper (free, offline) TTS providers",
            inputSchema={
                "type": "object",
                "properties": {
                    "provider": {
                        "type": "string",
                        "description": "Provider name: 'elevenlabs' or 'piper'",
                        "enum": ["elevenlabs", "piper"]
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
            description="Set speech speed for main or target voice. Works with both Piper and ElevenLabs providers. Use this to make voices faster or slower.",
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

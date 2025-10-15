#!/usr/bin/env python3
"""
AgentVibes MCP Server

Exposes AgentVibes text-to-speech capabilities as MCP tools.
Supports ElevenLabs and Piper TTS providers with personality, language, and voice management.
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

    def _find_claude_dir(self) -> Path:
        """Find the .claude directory (project-local first, then global)"""
        # Try current directory and parents
        current = Path.cwd()
        while current != current.parent:
            claude_dir = current / ".claude"
            if claude_dir.exists() and claude_dir.is_dir():
                return claude_dir
            current = current.parent

        # Fallback to global ~/.claude
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

            # Call the TTS script
            play_tts = self.hooks_dir / "play-tts.sh"
            args = [str(play_tts), text]
            if voice:
                args.append(voice)

            result = await asyncio.create_subprocess_exec(
                *args,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
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
                return f"❌ TTS failed: {error}"

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
        List all available TTS voices.

        Returns:
            Formatted list of available voices
        """
        result = await self._run_script("voice-manager.sh", ["list-simple"])
        if result:
            voices = result.strip().split("\n")
            current_voice = await self._get_current_voice()

            output = "🎤 Available TTS Voices:\n"
            output += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
            for voice in voices:
                marker = " ✓ (current)" if voice == current_voice else ""
                output += f"  • {voice}{marker}\n"
            output += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
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

    # Helper methods
    async def _run_script(self, script_name: str, args: list[str]) -> str:
        """Run a bash script and return output"""
        script_path = self.hooks_dir / script_name
        if not script_path.exists():
            return f"Script not found: {script_path}"

        cmd = [str(script_path)] + args
        try:
            result = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await result.communicate()
            return stdout.decode().strip() if result.returncode == 0 else stderr.decode().strip()
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

        if personality_file.exists():
            return personality_file.read_text().strip()
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

        if provider_file.exists():
            provider = provider_file.read_text().strip()
            if provider == "elevenlabs":
                return "ElevenLabs (Premium AI)"
            elif provider == "piper":
                return "Piper TTS (Free, Offline)"
            return provider
        return "ElevenLabs (Premium AI)"


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

# 🎤 AgentVibes

> Beautiful ElevenLabs TTS voice commands for Claude Code
> Add professional narration to your AI coding sessions

[![npm version](https://badge.fury.io/js/agentvibes.svg)](https://badge.fury.io/js/agentvibes)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

**Repository**: [github.com/paulpreibisch/AgentVibes](https://github.com/paulpreibisch/AgentVibes)
**Author**: Paul Preibisch ([@997Fire](https://x.com/997Fire))

---

## ✨ What is AgentVibes?

AgentVibes brings your Claude Code sessions to life with beautiful text-to-speech narration powered by ElevenLabs. Get audio feedback for completions, errors, and important updates - making your AI-assisted coding more immersive and productive.

### 🎯 Features

- 🎤 **15+ Professional Voices** - Character voices from ElevenLabs
- 🎵 **Instant Audio Feedback** - Hear task completions and updates
- 🎭 **Personality Styles** - Add emotion and character to messages
- 🔄 **Voice Switching** - Change voices on the fly
- 📋 **Voice Preview** - Listen to samples before choosing
- 🔁 **Audio Replay** - Replay last 10 messages
- ➕ **Custom Voices** - Add your own ElevenLabs voices
- ⚡ **One Command Install** - Local installation

---

## 🚀 Quick Start

### Installation

**🔧 Local Development (not yet published to npm):**

```bash
# Clone the repo
cd ~/claude/AgentVibes

# Install dependencies
npm install

# Run installer from your project directory
cd ~/my-project
node ~/claude/AgentVibes/bin/agent-vibes install
```

### Enable Voice Narration

After installation, activate TTS voice narration in Claude Code:

```bash
/output-style agent-vibes
```

This enables automatic TTS for task acknowledgments and completions.

### Setup ElevenLabs API Key

1. Sign up at [elevenlabs.io](https://elevenlabs.io/)
2. Copy your API key
3. Set it in your environment:

```bash
export ELEVENLABS_API_KEY="your-api-key-here"
```

For permanent setup, add to your `~/.bashrc` or `~/.zshrc`:

```bash
echo 'export ELEVENLABS_API_KEY="your-api-key-here"' >> ~/.bashrc
source ~/.bashrc
```

---

## 🎭 Available Commands

Once installed, use these slash commands in Claude Code:

### `/agent-vibes`
Show all available commands and documentation

### `/agent-vibes:list [first|last] [N]`
List all available voices
```
/agent-vibes:list              # Show all voices
/agent-vibes:list first 5      # Show first 5 voices
/agent-vibes:list last 3       # Show last 3 voices
```

### `/agent-vibes:preview [first|last] [N]`
Preview voices by playing audio samples
```
/agent-vibes:preview           # Preview first 3 voices
/agent-vibes:preview 5         # Preview first 5 voices
/agent-vibes:preview last 5    # Preview last 5 voices
```

### `/agent-vibes:switch <voice_name>`
Switch to a different default voice. Your voice selection is saved locally in `.claude/tts-voice.txt` and persists across Claude Code sessions.
```
/agent-vibes:switch Aria
/agent-vibes:switch "Cowboy Bob"
/agent-vibes:switch Northern Terry
```

### `/agent-vibes:get`
Display the currently selected voice

### `/agent-vibes:whoami`
Show current voice (alias for `:get`)

### `/agent-vibes:sample <voice_name>`
Test a specific voice with sample text
```
/agent-vibes:sample Aria
/agent-vibes:sample "Southern Mama"
```

### `/agent-vibes:add <name> <voice_id>`
Add a custom voice from your ElevenLabs account
```
/agent-vibes:add "My Voice" abc123xyz456
```

### `/agent-vibes:replay [N]`
Replay recently played TTS audio
```
/agent-vibes:replay            # Replay last audio
/agent-vibes:replay 1          # Replay most recent
/agent-vibes:replay 2          # Replay second-to-last
```

### `/agent-vibes:personality <style>`
Set personality style for TTS messages
```
/agent-vibes:personality flirty       # Playful and charming
/agent-vibes:personality sarcastic    # Dry wit and irony
/agent-vibes:personality list         # Show all personalities
/agent-vibes:personality add cowboy "Howdy!" "Partner!"  # Custom
```

Available personalities: normal, flirty, angry, sassy, moody, funny, sarcastic, poetic, annoying, professional, pirate, robot, valley-girl, zen, dramatic, random (picks randomly each time)

---

## 🎨 Default Voices

AgentVibes comes with 15 Character Voices from ElevenLabs:

- **Aria** (default) - Clear, professional
- **Northern Terry** - Warm, friendly
- **Cowboy Bob** - Western charm
- **Southern Mama** - Comforting drawl
- **Grandpa Spuds Oxley** - Wise elder
- **Ms. Walker** - Professional teacher
- **Ralf Eisend** - German precision
- **Amy** - Bright Chinese accent
- **Michael** - Authoritative
- **Jessica Anne Bogart** - Enthusiastic
- **Lutz Laugh** - Jovial
- **Dr. Von Fusion** - Mad scientist
- **Matthew Schmitz** - Deep baritone
- **Demon Monster** - Spooky fun
- **Drill Sergeant** - Military command

---

## 🔧 Advanced Usage

### Using Voices in Output Styles

You can specify voices in your Claude Code output style:

```markdown
I'll [do the task]
[Bash: play-tts.sh "I'll do the task" "Aria"]
[... does the work ...]
✅ [Task complete]
[Bash: play-tts.sh "Task complete" "Aria"]
```

### Adding Custom Voices

1. Go to [elevenlabs.io/app/voice-library](https://elevenlabs.io/app/voice-library)
2. Select or create a voice
3. Copy the voice ID (15-30 character alphanumeric string)
4. Add it with:
   ```
   /agent-vibes:add "Custom Voice" voice-id-here
   ```

---

## 📦 What Gets Installed?

```
your-project/
└── .claude/
    ├── audio/                      # Generated TTS audio files saved here
    │   └── tts-*.mp3              # Audio files (last 10 kept for replay)
    ├── tts-voice.txt              # Your selected voice preference
    ├── commands/
    │   ├── agent-vibes.md
    │   ├── agent-vibes:list.md
    │   ├── agent-vibes:preview.md
    │   ├── agent-vibes:switch.md
    │   ├── agent-vibes:get.md
    │   ├── agent-vibes:whoami.md
    │   ├── agent-vibes:sample.md
    │   ├── agent-vibes:add.md
    │   ├── agent-vibes:replay.md
    │   └── agent-vibes:personality.md
    ├── output-styles/
    │   └── agent-vibes.md          # TTS output style for voice narration
    └── hooks/
        ├── voice-manager.sh
        ├── personality-manager.sh
        └── play-tts.sh
```

---

## 🛠️ CLI Commands

Check installation status:
```bash
node ~/claude/AgentVibes/bin/agent-vibes status
```

Install in specific directory:
```bash
node ~/claude/AgentVibes/bin/agent-vibes install --directory /path/to/project
```

Skip confirmation prompt:
```bash
node ~/claude/AgentVibes/bin/agent-vibes install --yes
```

---

## 🌟 Show Some Love

If AgentVibes enhances your coding sessions:
- ⭐ Star this repo
- 📣 Tweet about it @997Fire
- 🎤 Share your favorite voices
- 💬 Tag me in your AI coding videos

---

## 📝 License

Apache 2.0 License - See [LICENSE](LICENSE) for details

---

## 🙏 Credits

- Built by [Paul Preibisch](https://github.com/paulpreibisch) ([@997Fire](https://x.com/997Fire))
- Powered by [ElevenLabs](https://elevenlabs.io/)
- Made for [Claude Code](https://claude.com/claude-code)

---

## 🤝 Contributing

PRs welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

**Enjoy your TTS-enhanced coding sessions! 🎵**

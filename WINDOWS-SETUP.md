# AgentVibes Windows Native Setup

This folder contains AgentVibes configured for **native Windows** (not WSL) with three TTS providers available.

## Quick Start

### 1. Open in VS Code (Native Windows)

- **File > Open Folder** > Select this folder (`agentvibes-in-windows`)
- Make sure you're opening in **native Windows VS Code** (not WSL remote)

### 2. Open PowerShell Terminal

- **Terminal > New Terminal**
- Change shell to **PowerShell** (if needed)

### 3. Run Setup

```powershell
.\setup-windows.ps1
```

This script will:
- Check PowerShell version (5.1+)
- Create `.claude` directories
- Let you choose TTS provider (Piper or SAPI)
- Install Piper if you choose it
- Download a default voice model
- Test TTS
- Configure for first use

### 4. Install Dependencies

```powershell
npm install
```

### 5. Start Using AgentVibes

Open a Claude Code session in this project. The SessionStart hook will automatically inject TTS protocol instructions, causing Claude to speak all responses.

## TTS Providers

### Option 1: Soprano (Best Quality)
- **Quality**: Ultra-high (80M parameter neural model)
- **Voices**: Single high-quality voice (Soprano-1.1-80M)
- **Download**: `pip install soprano-tts`
- **Setup**: Start WebUI with `soprano-webui` or API with `uvicorn soprano.server:app`
- **Speed**: GPU-accelerated, very fast
- **Features**: Gradio WebUI mode, OpenAI-compatible API mode, CLI fallback

To set up Soprano:
```powershell
# Install Soprano
pip install soprano-tts

# Start WebUI (recommended - stays running in background)
soprano-webui

# Set provider
.\.claude\hooks-windows\provider-manager.ps1 set soprano

# Test
.\.claude\hooks-windows\play-tts-soprano.ps1 "Hello from Soprano"
```

### Option 2: Windows Piper (Recommended for Offline)
- **Quality**: High (neural voices)
- **Voices**: 50+ available
- **Download**: ~100MB
- **Setup**: Automatic (run `setup-windows.ps1`)
- **Speed**: Offline synthesis
- **Features**: All AgentVibes features supported

### Option 3: Windows SAPI (Built-in, Zero Setup)
- **Quality**: Basic
- **Voices**: ~10 built-in (David, Zira, Mark)
- **Download**: 0 MB (no installation needed)
- **Setup**: Select during `setup-windows.ps1`
- **Speed**: Fast
- **Features**: Core TTS only

## Claude Code Integration

AgentVibes hooks into Claude Code via `.claude/settings.json`. The SessionStart hook runs automatically when Claude starts a session:

```json
{
  "hooks": {
    "SessionStart": [{
      "hooks": [{
        "type": "command",
        "command": "powershell -NoProfile -ExecutionPolicy Bypass -File \"$CLAUDE_PROJECT_DIR\\.claude\\hooks-windows\\session-start-tts.ps1\""
      }]
    }]
  }
}
```

This injects TTS protocol instructions so Claude speaks every response using the configured provider.

## Manual Commands

Test TTS manually:

```powershell
# Test current provider
.\.claude\hooks-windows\play-tts.ps1 "Hello from Windows"

# Test specific providers
.\.claude\hooks-windows\play-tts-windows-sapi.ps1 "Hello SAPI"
.\.claude\hooks-windows\play-tts-windows-piper.ps1 "Hello Piper"
.\.claude\hooks-windows\play-tts-soprano.ps1 "Hello Soprano"

# List available voices
.\.claude\hooks-windows\voice-manager-windows.ps1 list

# Switch voice (for Piper/SAPI)
.\.claude\hooks-windows\voice-manager-windows.ps1 switch "en_US-lessac-high"

# List providers
.\.claude\hooks-windows\provider-manager.ps1 list

# Switch provider
.\.claude\hooks-windows\provider-manager.ps1 set soprano
.\.claude\hooks-windows\provider-manager.ps1 set windows-piper
.\.claude\hooks-windows\provider-manager.ps1 set windows-sapi
```

## Troubleshooting

### PowerShell Execution Policy Error

If you get an "execution policy" error, run:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Then try again.

### No Audio Playing

1. Check Windows volume isn't muted
2. Try switching to SAPI provider (zero-setup): `.\.claude\hooks-windows\provider-manager.ps1 set windows-sapi`
3. Test SAPI directly: `.\.claude\hooks-windows\play-tts-windows-sapi.ps1 "test"`

### Soprano Not Detected

1. Ensure soprano-webui is running: `soprano-webui`
2. Check port 7860 is accessible: `Test-NetConnection -ComputerName 127.0.0.1 -Port 7860`
3. Set custom port if needed: `$env:SOPRANO_PORT = "8080"` before running TTS

### Piper Installation Failed

1. Check internet connection
2. Run setup again: `.\setup-windows.ps1`
3. Or manually download from: https://github.com/rhasspy/piper/releases

### Can't Find Voice

For Piper, voices are stored in: `%USERPROFILE%\.claude\piper-voices\`

You can download additional voices with `.\download-piper-voices.ps1`.

## Architecture

```
agentvibes-in-windows/
├── .claude/
│   ├── hooks-windows/               # PowerShell TTS scripts
│   │   ├── play-tts.ps1             # Main router (dispatches to active provider)
│   │   ├── play-tts-soprano.ps1     # Soprano provider
│   │   ├── play-tts-windows-piper.ps1  # Piper provider
│   │   ├── play-tts-windows-sapi.ps1   # SAPI provider
│   │   ├── soprano-gradio-synth.py  # Python helper for Soprano Gradio API
│   │   ├── provider-manager.ps1     # Provider switching
│   │   ├── voice-manager-windows.ps1   # Voice management
│   │   ├── session-start-tts.ps1    # SessionStart hook (injects TTS protocol)
│   │   └── audio-cache-utils.ps1    # Audio cache cleanup
│   ├── settings.json                # Claude Code hooks config
│   ├── audio/                       # Audio cache (auto-created)
│   ├── piper-voices/                # Piper voice models (auto-created)
│   └── tts-provider.txt             # Active provider config
├── setup-windows.ps1                # Installation script
├── download-piper-voices.ps1        # Download additional Piper voices
└── WINDOWS-SETUP.md                 # This file
```

## What's Different from WSL

| Feature | WSL Version | Windows Native |
|---------|-------------|----------------|
| **TTS Scripts** | Bash shell scripts (.sh) | PowerShell scripts (.ps1) |
| **Audio** | PulseAudio/paplay | System.Media.SoundPlayer |
| **Providers** | Piper, macOS, Termux, Soprano | Piper, SAPI, Soprano |
| **Setup** | WSL + PulseAudio config | Native Windows only |
| **Hook Dir** | `.claude/hooks/` | `.claude/hooks-windows/` |

## Support

- **Documentation**: https://agentvibes.org
- **Issues**: https://github.com/paulpreibisch/AgentVibes/issues

---

**Version**: 2.0 (Windows Native + Soprano)
**Last Updated**: 2026-02-11

# Installation Structure (Full Details)

```
your-project/
└── .claude/
    ├── commands/
    │   ├── agent-vibes/              # 15 voice commands
    │   └── agent-vibes-bmad.md       # BMAD plugin command
    ├── hooks/
    │   ├── play-tts.sh               # Main TTS (provider-aware)
    │   ├── play-tts-elevenlabs.sh    # ElevenLabs implementation
    │   ├── play-tts-piper.sh         # Piper implementation
    │   ├── provider-manager.sh       # Provider switching
    │   ├── provider-commands.sh      # Provider CLI
    │   ├── language-manager.sh       # Language system
    │   ├── voice-manager.sh          # Voice switching
    │   ├── personality-manager.sh    # Personality system
    │   ├── sentiment-manager.sh      # Sentiment system
    │   ├── bmad-voice-manager.sh     # BMAD integration
    │   ├── piper-voice-manager.sh    # Piper voices
    │   ├── piper-download-voices.sh  # Piper downloader
    │   └── voices-config.sh          # Voice ID mappings
    ├── personalities/                # 19 personality templates
    ├── plugins/
    │   └── bmad-voices.md            # BMAD voice mappings
    └── audio/                        # Generated TTS files
```

## Voice Settings Storage

**Project-Local Settings** (`.claude/` in project):
- **Current Provider**: `tts-provider.txt` - Active TTS provider (elevenlabs/piper)
- **Current Voice**: `tts-voice.txt` - Selected voice name
- **Current Personality**: `tts-personality.txt` - Active personality
- **Current Sentiment**: `tts-sentiment.txt` - Active sentiment
- **Current Language**: `tts-language.txt` - Selected language

**Global Fallback** (`~/.claude/`):
Settings fall back to global config if project-local doesn't exist.

**How it works:**
1. AgentVibes checks `.claude/` in current project first
2. Falls back to `~/.claude/` if project setting doesn't exist
3. This allows different voices/personalities per project!

Settings persist across Claude Code sessions!

---

[↑ Back to Main README](../README.md)

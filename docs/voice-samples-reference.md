# AgentVibes Voice Samples Reference

Complete reference for the 10 curated installer voices with friendly names and file locations.

## Voice Metadata System

**Metadata File:** `.agentvibes/config/voice-metadata.json`

This file maps friendly names to Piper voice IDs and includes metadata like gender, accent, quality, and personality traits.

---

## Voice Mapping Table

| # | Friendly Name | Piper Voice ID | Gender | Accent | Quality | Sample File Location |
|---|---------------|----------------|--------|---------|---------|---------------------|
| 1 | Ryan | `en_US-ryan-high` | Male | American | High | `.claude/audio/voice-samples/piper/ryan.wav` |
| 2 | Joe | `en_US-joe-medium` | Male | American | Medium | `.claude/audio/voice-samples/piper/joe.wav` |
| 3 | Alan | `en_GB-alan-medium` | Male | British | Medium | `.claude/audio/voice-samples/piper/alan.wav` |
| 4 | Marcus | `en_US-kusal-medium` | Male | American | Medium | `.claude/audio/voice-samples/piper/marcus.wav` |
| 5 | John | `en_US-john-medium` | Male | American | Medium | `.claude/audio/voice-samples/piper/john.wav` |
| 6 | Katherine | `en_US-lessac-high` | Female | American | High | `.claude/audio/voice-samples/piper/katherine.wav` |
| 7 | Linda | `en_US-ljspeech-high` | Female | American | High | `.claude/audio/voice-samples/piper/linda.wav` |
| 8 | Amy | `en_US-amy-medium` | Female | American | Medium | `.claude/audio/voice-samples/piper/amy.wav` |
| 9 | Kristin | `en_US-kristin-medium` | Female | American | Medium | `.claude/audio/voice-samples/piper/kristin.wav` |
| 10 | Charlotte | `en_GB-southern_english_female-low` | Female | British | Low | `.claude/audio/voice-samples/piper/charlotte.wav` |

---

## Voice Model Files

Piper voice models are stored in: `~/.local/share/piper/voices/`

Each voice has two files:
- `.onnx` - The neural network model (60-120MB)
- `.onnx.json` - Voice configuration

**Example:**
```
~/.local/share/piper/voices/
├── en_US-ryan-high.onnx (116MB)
├── en_US-ryan-high.onnx.json (4KB)
├── en_US-joe-medium.onnx (61MB)
├── en_US-joe-medium.onnx.json (4KB)
└── ...
```

---

## Sample Audio Files

Voice samples are stored in the repository: `.claude/audio/voice-samples/piper/`

**Total Size:** ~4.7MB (all 10 samples)

**Individual Samples:**
- `ryan.wav` - 504K
- `joe.wav` - 488K
- `alan.wav` - 575K
- `marcus.wav` - 487K
- `john.wav` - 488K
- `katherine.wav` - 432K
- `linda.wav` - 482K
- `amy.wav` - 550K
- `kristin.wav` - 550K
- `charlotte.wav` - 263K

---

## Sample Scripts

Each voice sample demonstrates a specific AgentVibes feature. See `docs/voice-sample-scripts.md` for full scripts.

**Quick Reference:**
1. **Ryan** - TTS Providers (Piper, Windows SAPI, macOS, Soprano)
2. **Joe** - Soprano neural voice quality
3. **Alan** - PulseAudio for headless servers
4. **Marcus** - 37+ voice options
5. **John** - Custom background music
6. **Katherine** - Sarcastic personality demo
7. **Linda** - AgentVibes Receiver
8. **Amy** - Audio effects (reverb, pitch, EQ)
9. **Kristin** - MCP server integration
10. **Charlotte** - GitHub star request

---

## BMAD Agent Default Mappings

Default voice assignments for BMAD agents (defined in metadata):

| Agent | Default Voice | Piper ID |
|-------|---------------|----------|
| Architect | Alan | `en_GB-alan-medium` |
| Analyst | Kristin | `en_US-kristin-medium` |
| Developer | Joe | `en_US-joe-medium` |
| PM | John | `en_US-john-medium` |
| Scrum Master | Amy | `en_US-amy-medium` |
| Test Architect | Marcus | `en_US-kusal-medium` |
| Tech Writer | Linda | `en_US-ljspeech-high` |
| UX Designer | Charlotte | `en_GB-southern_english_female-low` |
| BMad Master | Ryan | `en_US-ryan-high` |

---

## File Structure

```
AgentVibes/
├── .agentvibes/
│   └── config/
│       └── voice-metadata.json          # Friendly name mappings
├── .claude/
│   └── audio/
│       └── voice-samples/
│           └── piper/
│               ├── ryan.wav             # Sample files (friendly names)
│               ├── joe.wav
│               ├── alan.wav
│               ├── marcus.wav
│               ├── john.wav
│               ├── katherine.wav
│               ├── linda.wav
│               ├── amy.wav
│               ├── kristin.wav
│               └── charlotte.wav
├── docs/
│   ├── voice-sample-scripts.md          # Sample text scripts
│   └── voice-samples-reference.md       # This file
└── scripts/
    ├── generate-installer-voice-samples.sh
    └── regenerate-voice-samples.sh
```

---

## Usage in Installer

When users run `agentvibes install`, the installer:

1. Loads `voice-metadata.json`
2. Displays voices with friendly names (e.g., "Ryan" not "en_US-ryan-high")
3. Plays samples from `.claude/audio/voice-samples/piper/{friendlyName}.wav`
4. Converts selected friendly name back to Piper ID for configuration
5. Saves Piper ID to config (e.g., `defaultVoice: "en_US-ryan-high"`)

---

## Generation Scripts

**Download models & generate samples:**
```bash
./scripts/generate-installer-voice-samples.sh
```

**Regenerate samples with updated scripts:**
```bash
./scripts/regenerate-voice-samples.sh
```

Both scripts:
- Download voice models if missing (~675MB total)
- Generate WAV samples (~4.7MB total)
- Use custom scripts from `voice-sample-scripts.md`
- Output friendly-named files (ryan.wav, not en_US-ryan-high.wav)

---

## Quality Levels

- **High** (3 voices): 22.05kHz, 28-32M params
  - Ryan, Katherine, Linda
- **Medium** (6 voices): 22.05kHz, 15-20M params
  - Joe, Alan, Marcus, John, Amy, Kristin
- **Low** (1 voice): 16kHz, 15-20M params
  - Charlotte

---

## Notes

- Samples are checked into git for instant previews during installation
- Voice models are downloaded on-demand (not in repo - too large)
- Friendly names are only used in UI - Piper IDs used in config
- All samples use PulseAudio for WSL compatibility

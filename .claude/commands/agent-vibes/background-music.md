---
description: Toggle background music for TTS (on/off/status)
tags: [user]
---

Control background music that plays behind TTS voice output.

## Usage

- `/agent-vibes:background-music` - Show current status
- `/agent-vibes:background-music on` - Enable background music
- `/agent-vibes:background-music off` - Disable background music
- `/agent-vibes:background-music volume 0.3` - Set volume (0.0-1.0)
- `/agent-vibes:background-music list` - List all pre-packaged background music tracks
- `/agent-vibes:background-music set-default TRACK` - Set default background music track

## How It Works

When enabled, TTS audio is mixed with ambient background music:
- **Party mode** - Uses room ambiance track for multi-agent discussions
- **Solo agent** - Uses agent-specific theme music (if configured)

Background music:
- Fades in/out smoothly
- Plays at configurable volume (default 40%)
- Requires `sox` and `ffmpeg` installed

## Configuration

Background tracks are stored in `.claude/audio/backgrounds/`

Agent-specific themes are configured in `.claude/config/audio-effects.cfg`:
```
# Format: AGENT_NAME|SOX_EFFECTS|BACKGROUND_FILE|VOLUME
John|gain -1|electronica.mp3|0.30
Winston|reverb 40|ambient.mp3|0.20
_party_mode||chill-ambient.mp3|0.40
```

## Requirements

- `sox` - for voice effects
- `ffmpeg` - for audio mixing

Install on macOS: `brew install sox ffmpeg`
Install on Linux/WSL: `apt install sox ffmpeg`

## Examples

```
/agent-vibes:background-music on
🎵 Background music enabled at 40% volume

/agent-vibes:background-music volume 0.25
🎵 Background music volume set to 25%

/agent-vibes:background-music list
🎵 Available Background Music Tracks
====================================

 1. Agent Vibes Arabic v2.mp3
 2. Agent Vibes Bossa Nova v2.mp3
 3. Agent Vibes Celtic Harp v1.mp3
...

/agent-vibes:background-music set-default "Agent Vibes ChillWave v2.mp3"
✅ Default background music set to: Agent Vibes ChillWave v2.mp3

/agent-vibes:background-music off
🔇 Background music disabled
```

## Related Commands

- `/agent-vibes:personality` - Set voice personality style
- `/agent-vibes:verbosity` - Control how much Claude speaks

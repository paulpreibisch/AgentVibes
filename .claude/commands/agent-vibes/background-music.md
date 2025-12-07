---
description: Toggle background music for TTS (on/off/status)
tags: [user]
---

**IMPORTANT: When user requests background music changes in natural language (e.g., "change to salsa", "switch to jazz"), you MUST:**

1. Run `.claude/hooks/background-music-manager.sh list` to see all available tracks
2. Find the matching track by searching for keywords (e.g., "salsa" → "agent_vibes_salsa_v2_loop.mp3")
3. Execute `.claude/hooks/background-music-manager.sh set-default EXACT_FILENAME`
4. Test with TTS to confirm the change took effect

**CRITICAL PATH INFORMATION:**
- The script is ALWAYS at `.claude/hooks/background-music-manager.sh` (relative to current directory)
- DO NOT use global paths like `/agent-vibes/cli.sh` or `~/.agentvibes/cli.sh`
- DO NOT search for the script - it's always in the same location
- Use either `bash .claude/hooks/background-music-manager.sh` OR just `.claude/hooks/background-music-manager.sh`

**NEVER:**
- Search for background-music-manager.sh (you already know where it is)
- Use global installation paths
- Manually edit config files directly
- Create new config files like "background-music.cfg"
- Guess filenames without listing them first

Run the background music manager script with the provided command.

If no arguments provided, show status. Otherwise execute:
`bash .claude/hooks/background-music-manager.sh {command}`

Valid commands: on, off, status, list, volume {0.0-1.0}, set-default {filename}, set-agent {agent_name} {filename}, set-all {filename}

Control background music that plays behind TTS voice output.

## Usage

- `/agent-vibes:background-music` - Show current status
- `/agent-vibes:background-music on` - Enable background music
- `/agent-vibes:background-music off` - Disable background music
- `/agent-vibes:background-music volume 0.3` - Set volume (0.0-1.0)
- `/agent-vibes:background-music list` - List all pre-packaged background music tracks
- `/agent-vibes:background-music set-default TRACK` - Set default background music track
- `/agent-vibes:background-music set-agent AGENT TRACK` - Set background music for a specific agent
- `/agent-vibes:background-music set-all TRACK` - Set the same background music for all agents

## How It Works

When enabled, TTS audio is mixed with ambient background music:
- **Party mode** - Uses room ambiance track for multi-agent discussions
- **Solo agent** - Uses agent-specific theme music (if configured)

Background music:
- Fades in/out smoothly
- Plays at configurable volume (default 40%)
- Requires `sox` and `ffmpeg` installed

## Configuration

Background tracks are stored in `.claude/audio/tracks/`

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

/agent-vibes:background-music set-default agent_vibes_chillwave_v2_loop.mp3
✅ Default background music set to: agent_vibes_chillwave_v2_loop.mp3

/agent-vibes:background-music set-agent John optimized/agent_vibes_goa_trance_v2_loop.mp3
✅ Updated background music for John: optimized/agent_vibes_goa_trance_v2_loop.mp3

/agent-vibes:background-music set-all optimized/dreamy_house_loop.mp3
✅ Updated background music for 10 agents: optimized/dreamy_house_loop.mp3

/agent-vibes:background-music off
🔇 Background music disabled
```

## Related Commands

- `/agent-vibes:personality` - Set voice personality style
- `/agent-vibes:verbosity` - Control how much Claude speaks

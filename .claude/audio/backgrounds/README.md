# Background Music for AgentVibes

This folder contains background music tracks that play behind TTS voice output.

## Adding Your Own Music

1. **Copy audio files here:**
   ```bash
   cp ~/Music/your-track.mp3 .claude/audio/backgrounds/
   ```

2. **Edit the config** (`.claude/config/audio-effects.cfg`):
   ```
   # Format: AGENT_NAME|SOX_EFFECTS|BACKGROUND_FILE|VOLUME

   # Party mode (multi-agent discussions)
   _party_mode||your-track.mp3|0.40

   # Individual agents
   John||electronica.mp3|0.30
   Winston||ambient.mp3|0.25
   ```

3. **Enable background music:**
   ```
   /agent-vibes:background-music on
   ```

## Supported Formats

- MP3 (`.mp3`) - recommended
- WAV (`.wav`)
- OGG (`.ogg`)

## Tips

- **Volume**: Use 0.20-0.40 range (20-40%) so voice stays clear
- **Track length**: Longer tracks work better (2+ minutes)
- **Genre**: Instrumental/ambient works best - vocals can compete with TTS
- **Continuous playback**: Music continues from where it left off between messages

## Included Tracks

- `dreamy-house.mp3` - Upbeat electronic for energetic agents
- `agent-vibes-dark-chill-step.mp3` - Atmospheric ambient for party mode

## Commands

- `/agent-vibes:background-music on` - Enable
- `/agent-vibes:background-music off` - Disable
- `/agent-vibes:background-music volume 0.3` - Set volume (0.0-1.0)
- `/agent-vibes:background-music` - Show status

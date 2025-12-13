---
scope: project
description: Configure whether TTS audio files are saved to disk (on/off/status)
---

Configure whether AgentVibes saves TTS audio files to disk or uses temporary files.

**Default: Disabled** (audio plays but files are not saved, conserves disk space)

Modes:
- **On** - Save audio files to `.claude/audio/` (useful for debugging, archiving, replay)
- **Off** - Use temporary files that are automatically cleaned up (default, saves disk space)

Usage:
- `/agent-vibes:save-audio on` - Enable audio file saving
- `/agent-vibes:save-audio off` - Disable audio file saving (default)
- `/agent-vibes:save-audio status` - Check current setting

When enabled, audio files are saved to `.claude/audio/tts-{timestamp}.wav`

When disabled:
- Lite Mode: Files are automatically cleaned up after playback
- Full Mode: Files use secure temp directories with automatic cleanup

The setting persists across sessions via `.agentvibes/config/save-audio.txt`

## Implementation

```bash
#!/bin/bash
bash .agentvibes/hooks/save-audio-manager.sh "$@"
```

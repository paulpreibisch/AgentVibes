---
description: Replay recently played TTS audio
argument-hint: [N]
---

Replay previously played TTS audio from history.

Usage:
- `/agent-vibes:replay` - Replay last audio (most recent)
- `/agent-vibes:replay 1` - Replay last audio
- `/agent-vibes:replay 2` - Replay second-to-last audio
- `/agent-vibes:replay 3` - Replay third-to-last audio

The system keeps the last 10 audio files in history. This is useful for:
- Hearing a summary again
- Checking what was just said
- Comparing different voice samples

!bash .claude/hooks/voice-manager.sh replay $ARGUMENTS

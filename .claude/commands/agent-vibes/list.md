---
description: List available Piper TTS TTS voices with optional filtering
argument-hint: [first|last] [N]
---

List available Piper TTS TTS voices.

Usage examples:
- `/agent-vibes:list` - Show all voices
- `/agent-vibes:list first 5` - Show first 5 voices
- `/agent-vibes:list last 3` - Show last 3 voices

!bash .claude/hooks/voice-manager.sh list $ARGUMENTS

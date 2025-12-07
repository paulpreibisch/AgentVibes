---
description: Preview TTS voices by playing audio samples (provider-aware)
argument-hint: [voice_name|first|last] [N]
---

Preview TTS voices by playing audio samples from your active provider.

Usage examples:
- `/agent-vibes:preview` - Preview first 3 voices (default)
- `/agent-vibes:preview 5` - Preview first 5 voices
- `/agent-vibes:preview Jessica` - Preview Jessica Anne Bogart voice (Piper TTS)
- `/agent-vibes:preview lessac` - Preview Lessac voice (Piper)
- `/agent-vibes:preview "Northern Terry"` - Preview Northern Terry voice
- `/agent-vibes:preview first 10` - Preview first 10 voices
- `/agent-vibes:preview last 5` - Preview last 5 voices

!bash .claude/hooks/provider-commands.sh preview $ARGUMENTS

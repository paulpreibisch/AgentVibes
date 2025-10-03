---
description: Preview ElevenLabs TTS voices by playing audio samples
argument-hint: [voice_name|first|last] [N]
---

Preview ElevenLabs TTS voices by playing audio samples.

Usage examples:
- `/agent-vibes:preview` - Preview first 3 voices (default)
- `/agent-vibes:preview 5` - Preview first 5 voices
- `/agent-vibes:preview Jessica` - Preview Jessica Anne Bogart voice
- `/agent-vibes:preview "Northern Terry"` - Preview Northern Terry voice
- `/agent-vibes:preview first 10` - Preview first 10 voices
- `/agent-vibes:preview last 5` - Preview last 5 voices

!bash .claude/hooks/voice-manager.sh preview $ARGUMENTS

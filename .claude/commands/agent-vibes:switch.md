---
description: Switch to a different ElevenLabs TTS voice
argument-hint: [voice_name_or_number]
---

Switch the default ElevenLabs TTS voice.

Usage:
- `/agent-vibes:switch` - Show numbered list of voices to choose from
- `/agent-vibes:switch 5` - Switch by voice number
- `/agent-vibes:switch Northern Terry` - Switch by voice name
- `/agent-vibes:switch "Cowboy Bob"` - Switch by voice name (with spaces)

When called without arguments, displays a numbered list of all available voices for easy selection.

After switching, all future TTS audio will use the selected voice unless a different voice is explicitly specified.

!bash .claude/hooks/voice-manager.sh switch $ARGUMENTS

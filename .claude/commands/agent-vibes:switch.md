---
description: Switch to a different ElevenLabs TTS voice
argument-hint: <voice_name>
---

Switch the default ElevenLabs TTS voice.

Usage:
- `/agent-vibes:switch Northern Terry` - Switch to Northern Terry voice
- `/agent-vibes:switch "Cowboy Bob"` - Switch to Cowboy Bob voice

After switching, all future TTS audio will use the selected voice unless a different voice is explicitly specified.

!bash /home/fire/claude/SoraSage/teams/team-9/SageDev/.claude/hooks/voice-manager.sh switch $ARGUMENTS

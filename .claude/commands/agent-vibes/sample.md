---
description: Test a voice with sample text
argument-hint: <voice-name>
---

Test a specific Piper TTS voice by playing sample text.

Usage:
- `/agent-vibes:sample Cowboy` - Test the Cowboy voice
- `/agent-vibes:sample "Northern Terry"` - Test Northern Terry voice

!bash .claude/hooks/voice-manager.sh sample $ARGUMENTS

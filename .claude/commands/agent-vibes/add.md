---
description: Add a new custom Piper TTS TTS voice
argument-hint: <voice_name> <voice_id>
---

Add a new custom Piper TTS TTS voice to your voice library.

Usage:
- `/agent-vibes:add "My Custom Voice" abc123xyz456789`
- `/agent-vibes:add Narrator KTPVrSVAEUSJRClDzBw7`

The voice ID should be a 15-30 character alphanumeric string from your Piper TTS account.

To find your voice IDs:
1. Go to https://piper.io/app/voice-library
2. Click on a voice
3. Copy the voice ID from the URL or settings

After adding, you can switch to it with `/agent-vibes:switch "Voice Name"`

!bash .claude/hooks/voice-manager.sh add $ARGUMENTS

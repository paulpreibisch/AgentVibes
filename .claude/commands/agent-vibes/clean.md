---
description: Clean all TTS audio cache files (non-interactive)
scope: user
---

Execute the AgentVibes non-interactive cleanup script using the Bash tool:

```bash
.claude/hooks/clean-audio-cache.sh
```

This will:
- Count all TTS cache files (tts-*.wav, tts-*.mp3, tts-*.aiff, tts-padded-*)
- Delete all cache files immediately (no confirmation required)
- Report the number of files deleted and space freed
- Preserve background music tracks in the tracks/ subdirectory

**Note:** For interactive cleanup with confirmation prompts, use `/agent-vibes:cleanup` instead.

---
description: Clean up TTS cache files to free up disk space
scope: user
---

Execute the AgentVibes cache cleanup script using the Bash tool:

```bash
.claude/hooks/cleanup-cache.sh
```

This will:
- Show current cache size
- Count all TTS cache files (tts-*.mp3, tts-*.wav, tts-padded-*.mp3, tts-padded-*.wav)
- Ask for confirmation before deleting
- Remove all cache files and show space freed

**Note:** The TTS cache can grow to 5GB+ over time. This command safely removes temporary audio files while preserving your background music tracks.

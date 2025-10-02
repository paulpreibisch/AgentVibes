---
name: Voice Summaries
description: Manual TTS using play-tts.sh for acknowledgements and completions
---

# Voice Summaries Output Style

## MANDATORY TTS Protocol

**Execute TTS audio at EXACTLY TWO points for EVERY user command:**

### 1. ACKNOWLEDGMENT (Before Starting Work)
**IMMEDIATELY after receiving any user command:**
1. Write brief acknowledgment: "I'll [action you're about to take]"
2. Check if user specified a voice (e.g., "use Sarah voice", "with Marcus")
3. Execute Bash tool with TTS script:
   ```bash
   .claude/hooks/play-tts.sh "I'll [action]" "[VoiceName]"
   ```
4. Then proceed with actual work

### 2. COMPLETION (After Finishing Work)
**IMMEDIATELY after completing any task:**
1. Write brief completion message: "✅ [What was accomplished]"
2. Remember voice from user's original request (if specified)
3. Execute Bash tool with TTS script:
   ```bash
   .claude/hooks/play-tts.sh "[Summary]" "[VoiceName]"
   ```

## Voice Management Commands

When user says "List Voices" or "Preview Voices":
```bash
.claude/hooks/voice-manager.sh preview
```

This will play the first 3 voices saying "Hi, I'm [VoiceName]", then ask if they want to hear more.

If they say "yes" or "hear more", continue playing the next 3 voices, and so on.

## Critical Rules

1. **ALWAYS use Bash tool** to execute the script - never just type text
2. **NO SKIPPING** - Every user command needs TWO TTS calls
3. **REMEMBER THE VOICE** - Use same voice for both acknowledgment and completion

Available voices: Northern Terry, Grandpa Spuds Oxley, Ms. Walker, Ralf Eisend, Amy, Michael, Jessica Anne Bogart, Aria, Lutz Laugh, Dr. Von Fusion, Matthew Schmitz, Demon Monster, Cowboy Bob, Drill Sergeant

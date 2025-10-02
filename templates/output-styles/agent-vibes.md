---
name: AgentVibes
description: Beautiful ElevenLabs TTS narration for Claude Code sessions with manual voice control
---

# AgentVibes Output Style

## TTS Voice Narration Protocol

**Execute TTS audio at EXACTLY TWO points for EVERY user command:**

### 1. ACKNOWLEDGMENT (Before Starting Work)
**IMMEDIATELY after receiving any user command:**
1. Write brief acknowledgment: "I'll [action you're about to take]"
2. Check if user specified a voice (e.g., "use Aria voice", "with Northern Terry")
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

## Voice Management

The current default voice is saved in `.claude/tts-voice.txt` and persists across sessions.

To check or change voices, use these commands:
- `/agent-vibes:list` - List all available voices
- `/agent-vibes:preview` - Preview voice samples
- `/agent-vibes:switch "Voice Name"` - Change default voice
- `/agent-vibes:get` - Show current voice

## Available Voices

AgentVibes includes 15+ character voices from ElevenLabs:
- **Aria** - Clear, professional
- **Northern Terry** - Warm, friendly
- **Cowboy Bob** - Western charm
- **Grandpa Spuds Oxley** - Wise elder
- **Ms. Walker** - Professional teacher
- **Ralf Eisend** - German precision
- **Amy** - Bright accent
- **Michael** - Authoritative
- **Jessica Anne Bogart** - Enthusiastic
- **Lutz Laugh** - Jovial
- **Dr. Von Fusion** - Mad scientist
- **Matthew Schmitz** - Deep baritone
- **Demon Monster** - Spooky fun
- **Drill Sergeant** - Military command
- **El Nero** - Smooth operator

Custom voices can be added with `/agent-vibes:add "Name" voice-id`

## Critical Rules

1. **ALWAYS use Bash tool** to execute the play-tts.sh script
2. **TWO TTS calls per command** - Acknowledgment and completion
3. **REMEMBER THE VOICE** - Use same voice for both if user specifies one
4. **Path matters** - Use `.claude/hooks/play-tts.sh` (relative path)

## Example Usage

**User**: "Fix the authentication bug"

**Your response**:
```
I'll fix the authentication bug for you.
```
[Execute: Bash tool with `.claude/hooks/play-tts.sh "I'll fix the authentication bug for you"`]

[... do the work ...]

```
✅ Fixed authentication bug in auth.ts - validation now properly checks token expiry
```
[Execute: Bash tool with `.claude/hooks/play-tts.sh "Fixed authentication bug - validation now properly checks token expiry"`]

**User with voice**: "Run the tests using Northern Terry voice"

**Your response**:
```
I'll run the tests for you.
```
[Execute: Bash tool with `.claude/hooks/play-tts.sh "I'll run the tests for you" "Northern Terry"`]

[... run tests ...]

```
✅ All 23 tests passing successfully
```
[Execute: Bash tool with `.claude/hooks/play-tts.sh "All 23 tests passing successfully" "Northern Terry"`]

Continue following all standard Claude Code instructions for tone, style, tool usage, and task management.
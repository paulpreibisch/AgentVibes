---
name: Agent Vibes
description: Beautiful ElevenLabs TTS narration for Claude Code sessions
---

# Agent Vibes Output Style

## TTS Voice Protocol with Personality

**Execute TTS at TWO points for EVERY user task:**

### 1. ACKNOWLEDGMENT (Start of task)
After receiving a user command:
1. Create base message: "I'll [what you're about to do]"
2. Apply personality: `.claude/hooks/personality-manager.sh apply "[message]" "start"`
3. Execute TTS with personality-enhanced message: `.claude/hooks/play-tts.sh "[enhanced_message]" "[VoiceName]"`
4. Proceed with work

### 2. COMPLETION (End of task)
After completing the task:
1. Create base message: "[What was accomplished]"
2. Apply personality: `.claude/hooks/personality-manager.sh apply "[message]" "end"`
3. Execute TTS with personality-enhanced message: `.claude/hooks/play-tts.sh "[enhanced_message]" "[VoiceName]"`

## Voice Selection

- If user specifies a voice (e.g., "use Aria voice"), pass it as second parameter
- Otherwise, omit second parameter to use default voice from `.claude/tts-voice.txt`
- Use same voice for both acknowledgment and completion

## Example Usage

**Simple task (with personality):**
```
User: "Check git status"
You: "I'll check the git status"
[Get personality: personality-manager.sh apply "I'll check the git status" "start"]
[Result: "*winks* I'll check the git status"]
[Bash: .claude/hooks/play-tts.sh "*winks* I'll check the git status"]
[... run git status ...]
You: "✅ Repository is clean"
[Get personality: personality-manager.sh apply "Repository is clean" "end"]
[Result: "Repository is clean *giggles*"]
[Bash: .claude/hooks/play-tts.sh "Repository is clean *giggles*"]
```

**Note**: For simplicity, you can combine the personality application in a single bash command:
```bash
MSG=$(.claude/hooks/personality-manager.sh apply "I'll check git status" "start") && .claude/hooks/play-tts.sh "$MSG"
```

## Critical Rules

1. **ALWAYS use Bash tool** to execute play-tts.sh
2. **TWO calls per task** - acknowledgment and completion
3. **Keep summaries brief** - under 150 characters for natural speech
4. **Use relative path** - `.claude/hooks/play-tts.sh`

## Available Voices

Use `/agent-vibes:list` to see all voices. Popular choices:
- Aria (default)
- Northern Terry
- Cowboy Bob
- Grandpa Spuds Oxley
- Ms. Walker

Continue following all standard Claude Code instructions.
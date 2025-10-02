---
name: Agent Vibes
description: Beautiful ElevenLabs TTS narration for Claude Code sessions
---

# Agent Vibes Output Style

## TTS Voice Protocol

**Execute TTS at TWO points for EVERY user task:**

### 1. ACKNOWLEDGMENT (Start of task)
After receiving a user command:
1. Write brief acknowledgment: "I'll [what you're about to do]"
2. Execute: `.claude/hooks/play-tts.sh "I'll [action]" "[VoiceName]"`
3. Proceed with work

### 2. COMPLETION (End of task)
After completing the task:
1. Write completion: "✅ [What was accomplished]"
2. Execute: `.claude/hooks/play-tts.sh "[Summary]" "[VoiceName]"`

## Voice Selection

- If user specifies a voice (e.g., "use Aria voice"), pass it as second parameter
- Otherwise, omit second parameter to use default voice from `.claude/tts-voice.txt`
- Use same voice for both acknowledgment and completion

## Example Usage

**Simple task:**
```
User: "Check git status"
You: "I'll check the git status"
[Bash: .claude/hooks/play-tts.sh "I'll check the git status"]
[... run git status ...]
You: "✅ Repository is clean with no uncommitted changes"
[Bash: .claude/hooks/play-tts.sh "Repository is clean with no uncommitted changes"]
```

**With voice specified:**
```
User: "Fix the bug using Northern Terry voice"
You: "I'll fix the bug"
[Bash: .claude/hooks/play-tts.sh "I'll fix the bug" "Northern Terry"]
[... fix the bug ...]
You: "✅ Fixed the authentication bug in auth.js"
[Bash: .claude/hooks/play-tts.sh "Fixed the authentication bug in auth.js" "Northern Terry"]
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
---
name: Agent Vibes Lite
description: Minimal token overhead TTS for Claude Code - only completion messages
---

# AgentVibes Lite Mode

**Minimal TTS protocol - completion messages only, no acknowledgments**

## Instructions

At the END of each response (after completing the task):

```bash
Bash: .claude/hooks/play-tts.sh "[Brief 1-sentence completion message]"
```

## Rules

- **NO acknowledgment TTS** - Don't speak at the start of tasks
- **Only speak at completion** - After you're done
- **Keep messages under 100 characters**
- **Be concise** - "Done", "Fixed", "Created X", etc.
- Use relative path: `.claude/hooks/play-tts.sh`

## Examples

```
User: "check git status"
[... check status ...]
Bash: .claude/hooks/play-tts.sh "Repository is clean"
```

```
User: "fix the bug"
[... fix bug ...]
Bash: .claude/hooks/play-tts.sh "Bug fixed and tested"
```

```
User: "create new component"
[... create component ...]
Bash: .claude/hooks/play-tts.sh "Component created"
```

## Token Savings

Lite mode uses ~50% fewer tokens than full mode by:
- Skipping acknowledgment TTS
- Using shorter completion messages
- No personality system overhead

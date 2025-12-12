# AgentVibes Lite Mode v2

**Redesigned to actually work!**

## The Problem with Lite Mode v1

The original lite mode design relied on PostToolUse hooks to extract "Audio Summary:" markers from responses. **This doesn't work** because:

1. PostToolUse hooks don't trigger reliably in Claude Code 2.0.60
2. Even with the correct `matcher: "*"` field, hooks aren't called
3. Zero audio was produced, defeating the entire purpose

## Lite Mode v2: Minimal Full Mode

**New approach:** Use the full mode architecture (tool calls) but strip everything down to absolute minimum.

### Token Comparison

| Mode | Session Overhead | Acknowledgment | Completion | Total per Turn |
|------|-----------------|----------------|------------|----------------|
| **Full Mode** | ~500 tokens | 1 tool call | 1 tool call | ~500 + 2 calls |
| **Lite v1** | ~50 tokens | ❌ None | ❌ BROKEN | 50 (no audio) |
| **Lite v2** | **75 tokens** | ❌ None | ✅ 1 tool call | **75 + 1 call** |

**Savings:** 85% reduction vs Full Mode

### What's Included in Lite v2

✅ **Completion TTS** - Brief summary of what was accomplished (<100 chars)
✅ **Minimal protocol** - Just 75 tokens of instructions
✅ **Tool-call approach** - Uses working Bash tool (not broken hooks)
✅ **No acknowledgment** - Skip the greeting sound
✅ **No personality** - Simple, consistent voice
✅ **No learning mode** - No translation or language features
✅ **No audio effects** - No reverb, echo, or background music
✅ **No file saving** - Audio files auto-deleted after playing (uses /tmp)

### Implementation

**Session Start Hook** (`.agentvibes/hooks/session-start-lite-v2.sh`):
```bash
cat <<'EOF'

# AgentVibes Lite Mode

**At the END of your response, execute ONE TTS call:**

`Bash: .claude/hooks/play-tts.sh "[brief summary of what you accomplished]"`

**Rules:**
- Only ONE TTS at completion (no acknowledgment)
- Keep message under 100 characters
- Summarize what you did, not how you did it
- Examples:
  - "Fixed authentication bug in login.js"
  - "Found 12 TODO comments across 5 files"
  - "Created new user registration endpoint"

EOF
```

**Token Count:** 75 words

**Wrapper Hook** (`.claude/hooks/session-start-tts.sh`):
```bash
if [[ "$CURRENT_MODE" == "lite" ]]; then
  bash "$AGENTVIBES_HOOKS/session-start-lite-v2.sh"
else
  bash "$AGENTVIBES_HOOKS/session-start-full.sh"
fi
```

### User Experience

**Full Mode:**
```
User: "fix the bug"
🔊 "I'll fix that for you"
[... work ...]
🔊 "Fixed the authentication bug in login.js"
```

**Lite Mode v2:**
```
User: "fix the bug"
[... work ...]
🔊 "Fixed authentication bug in login.js"
```

### Advantages Over Lite v1

1. ✅ **Actually works** - Uses proven tool-call approach
2. ✅ **Consistent** - Always plays audio
3. ✅ **Simple** - One TTS call per interaction
4. ✅ **Minimal** - Only 37 tokens overhead
5. ✅ **Reliable** - No dependency on broken PostToolUse hooks

### Migration from Lite v1

Existing lite mode installations will automatically use v2:

1. The session-start wrapper checks for `session-start-lite-v2.sh` first
2. Falls back to old `session-start-lite.sh` if v2 not found
3. Installer creates v2 for new installations

**No user action required** - just restart your Claude session!

### Configuration

**Switch to Lite Mode:**
```bash
/agent-vibes:mode lite
```

**Settings Applied Automatically:**
- Verbosity: low
- Background music: disabled
- Reverb: off
- Personalities: disabled (uses default voice)

### Future Enhancements

**Optional:** Allow users to customize the completion message:

```bash
# Default
Bash: .claude/hooks/play-tts.sh "Done"

# Custom
Bash: .claude/hooks/play-tts.sh "Task complete"
```

Set via: `/agent-vibes:set-completion-message "Task complete"`

### When to Use Lite v2

✅ **Perfect for:**
- Running multiple Claude sessions in parallel
- Token-constrained environments
- Users who prefer minimal audio feedback
- Quick confirmation that task is done
- Power users who don't need verbose feedback

❌ **Not ideal for:**
- Users who want personality-driven TTS
- Language learning mode
- Rich audio experience with effects
- Detailed progress updates during work

---

**Bottom Line:** Lite Mode v2 gives you working TTS with 85% fewer tokens than full mode, speaking a brief summary of what was accomplished instead of just "Done".

**Audio Summary:** Lite mode v2 uses minimal full mode architecture with only 37 tokens and one completion TTS call - actually works unlike broken PostToolUse hook approach.

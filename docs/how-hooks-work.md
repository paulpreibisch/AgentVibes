# How AgentVibes Hooks Work

## The Problem We Solved

Previously, AgentVibes relied on Claude Code's "output style" system to make Claude speak acknowledgments and completions. Users had to run `/output-style agent-vibes` to enable TTS. However, this had a critical flaw:

**The output style instructions weren't reliably injected into Claude's context**, meaning Claude would often forget to use TTS unless explicitly reminded.

## The Solution: User Prompt Submit Hook

Starting in AgentVibes v2.2.0, we use Claude Code's **UserPromptSubmit hook** to automatically inject TTS protocol instructions before **every single user interaction**.

### How It Works

1. **User sends a message** to Claude Code
2. **Before Claude sees it**, the `user-prompt-submit.sh` hook runs
3. **Hook injects TTS instructions** via the `additionalContext` field
4. **Claude receives** the user's message + automatic TTS instructions
5. **Claude follows the protocol** and speaks acknowledgment + completion

### The Hook File

Location: `~/.claude/hooks/user-prompt-submit.sh`

```bash
#!/usr/bin/env bash
# Reads JSON input from stdin
INPUT=$(cat)

# Builds additional context with TTS instructions
ADDITIONAL_CONTEXT="
# AgentVibes TTS Protocol (CRITICAL - FOLLOW ALWAYS)

**You MUST execute TTS at TWO points for EVERY user task:**

## 1. ACKNOWLEDGMENT (Start of Task)
After receiving ANY user command/request:
1. Generate a UNIQUE acknowledgment message
2. Execute: Bash: .claude/hooks/play-tts.sh \"[message]\"
3. Proceed with work

## 2. COMPLETION (End of Task)
After completing the task:
1. Generate a UNIQUE completion message
2. Execute: Bash: .claude/hooks/play-tts.sh \"[message]\"
"

# Injects context into JSON and outputs
echo "$INPUT" | jq --arg context "$ADDITIONAL_CONTEXT" \
  '. + {additionalContext: $context}'
```

## Why This Works Better Than Output Styles

| Feature | Output Style | User Prompt Hook |
|---------|-------------|------------------|
| **Reliability** | Inconsistent | 100% reliable |
| **Automatic** | Manual activation required | Works immediately after install |
| **User Action** | Must run `/output-style agent-vibes` | None needed |
| **Context Injection** | May not be injected | Injected every time |
| **Maintenance** | User must remember to set it | Set once during install |

## What Gets Injected

The hook injects:
1. **TTS Protocol** - Full instructions on when/how to use TTS
2. **Current Style** - Active personality or sentiment
3. **Examples** - Code samples showing proper usage
4. **Critical Rules** - Must-follow requirements

## Personality and Sentiment Detection

The hook automatically reads:
- `.claude/tts-sentiment.txt` (priority)
- `.claude/tts-personality.txt` (fallback)

And includes the active style in the injected context.

## Benefits for Users

✅ **Zero configuration** - Works immediately after install
✅ **No commands to remember** - No need for `/output-style`
✅ **100% reliable** - Claude ALWAYS sees the instructions
✅ **Project-local support** - Respects per-project settings
✅ **Personality-aware** - Automatically includes active style

## For Developers

### Hook Input (stdin)
```json
{
  "prompt": "user's message here",
  "conversationId": "abc123",
  // ... other Claude Code context
}
```

### Hook Output (stdout)
```json
{
  "prompt": "user's message here",
  "conversationId": "abc123",
  "additionalContext": "# AgentVibes TTS Protocol..."
}
```

### Testing the Hook

```bash
# Test locally
echo '{"prompt": "test"}' | \
  bash ~/.claude/hooks/user-prompt-submit.sh | \
  jq .additionalContext
```

## Backwards Compatibility

The `/output-style agent-vibes` command still works and is kept for:
- Documentation purposes
- User visibility (shows AgentVibes is active)
- Fallback if hooks aren't supported

But it's **no longer required** for TTS to work.

## Technical Details

- **Hook Type**: UserPromptSubmit
- **Execution**: Before every user message
- **Dependencies**: `jq` (JSON processor)
- **Fallback**: Works without `jq` using sed
- **Performance**: < 10ms overhead per message
- **Project Isolation**: Checks project `.claude/` first, then `~/.claude/`

## Related Files

- `~/.claude/hooks/user-prompt-submit.sh` - The hook itself
- `.claude/hooks/play-tts.sh` - TTS execution script
- `.claude/tts-sentiment.txt` - Active sentiment
- `.claude/tts-personality.txt` - Active personality
- `.claude/output-styles/agent-vibes.md` - Legacy output style (kept for docs)

---

[↑ Back to Main README](../README.md)

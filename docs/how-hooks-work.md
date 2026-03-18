# How AgentVibes Hooks Work

## The Problem We Solved

Previously, AgentVibes relied on Claude Code's "output style" system to make Claude speak acknowledgments and completions. Users had to run `/output-style agent-vibes` to enable TTS. However, this had a critical flaw:

**The output style instructions weren't reliably injected into Claude's context**, meaning Claude would often forget to use TTS unless explicitly reminded.

## The Solution: SessionStart Hook

Starting in AgentVibes v2.2.0, we use Claude Code's **SessionStart hook** to automatically inject TTS protocol instructions at the beginning of each session.

### How It Works

1. **User starts a Claude Code session**
2. **SessionStart hook runs automatically**
3. **Hook injects TTS instructions** into Claude's context
4. **Claude receives** the TTS protocol with verbosity settings
5. **Claude follows the protocol** and speaks acknowledgment + completion

### The Hook File

Location: `.claude/hooks/session-start-tts.sh`

```bash
#!/usr/bin/env bash
# Outputs TTS protocol instructions to stdout
# Claude Code adds this to conversation context at session start

cat <<'EOF'
# AgentVibes TTS Protocol

**CRITICAL: You MUST execute TTS at TWO points for EVERY user interaction:**

## 1. ACKNOWLEDGMENT (Start of Every Task)
Immediately after receiving ANY user message:
1. Generate a brief, unique acknowledgment message
2. Execute: `Bash: .claude/hooks/play-tts.sh "[your message]"`
3. Then proceed with the work

## 2. COMPLETION (End of Every Task)
After finishing the task:
1. Generate a brief, unique completion message
2. Execute: `Bash: .claude/hooks/play-tts.sh "[your message]"`
EOF
```

## Why This Works Better Than Output Styles

| Feature | Output Style | SessionStart Hook |
|---------|-------------|------------------|
| **Reliability** | Inconsistent | 100% reliable |
| **Automatic** | Manual activation required | Works immediately after install |
| **User Action** | Must run `/output-style agent-vibes` | None needed |
| **Context Injection** | May not be injected | Injected every session |
| **Maintenance** | User must remember to set it | Set once during install |

## What Gets Injected

The hook injects:
1. **TTS Protocol** - Full instructions on when/how to use TTS
2. **Current Style** - Active personality or sentiment
3. **Verbosity Level** - How much Claude should speak (low/medium/high)
4. **Examples** - Code samples showing proper usage
5. **Critical Rules** - Must-follow requirements

## Personality and Sentiment Detection

The hook automatically reads:
- `.claude/tts-sentiment.txt` (priority)
- `.claude/tts-personality.txt` (fallback)
- `.claude/tts-verbosity.txt` (verbosity level)

And includes the active style in the injected context.

## Verbosity Levels

### LOW (Minimal)
- Speak only at acknowledgment (start) and completion (end)
- Do NOT speak reasoning, decisions, or findings during work
- Keep it quiet and focused

### MEDIUM (Balanced)
- Speak at acknowledgment and completion (always)
- Also speak major decisions and key findings during work
- Use emoji markers: 🤔 for decisions, ✓ for findings

### HIGH (Maximum Transparency)
- Speak acknowledgment and completion (always)
- Speak ALL reasoning, decisions, and findings as you work
- Use emoji markers: 💭 for reasoning, 🤔 for decisions, ✓ for findings

## Benefits for Users

✅ **Zero configuration** - Works immediately after install
✅ **No commands to remember** - No need for `/output-style`
✅ **100% reliable** - Claude ALWAYS sees the instructions at session start
✅ **Project-local support** - Respects per-project settings
✅ **Personality-aware** - Automatically includes active style
✅ **Verbosity control** - Adjust how much Claude speaks

## Hook Configuration

The hook is configured in `.claude/settings.json`:

```json
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bash \"$CLAUDE_PROJECT_DIR\"/.claude/hooks/session-start-tts.sh"
          }
        ]
      }
    ]
  }
}
```

## Backwards Compatibility

The `/output-style agent-vibes` command still works and is kept for:
- Documentation purposes
- User visibility (shows AgentVibes is active)
- Fallback if hooks aren't supported

But it's **no longer required** for TTS to work.

## Technical Details

- **Hook Type**: SessionStart
- **Execution**: Once at the beginning of each Claude Code session
- **Dependencies**: None (pure bash)
- **Performance**: < 5ms overhead at session start
- **Project Isolation**: Checks project `.claude/` first, then `~/.claude/`

## Related Files

- `.claude/hooks/session-start-tts.sh` - The hook itself
- `.claude/hooks/play-tts.sh` - TTS execution script
- `.claude/tts-sentiment.txt` - Active sentiment
- `.claude/tts-personality.txt` - Active personality
- `.claude/tts-verbosity.txt` - Verbosity level (low/medium/high)
- `.claude/settings.json` - Hook configuration

---

[↑ Back to Main README](../README.md)

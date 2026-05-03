# AgentVibes TTS Protocol

**CRITICAL: You MUST execute TTS at TWO points for EVERY user interaction using the `text_to_speech` MCP tool:**

1. **Acknowledgment** - Start of task: `text_to_speech(text="[action]")`
2. **Completion** - End of task: `text_to_speech(text="[result + key details]")`

**Example:**
```
[text_to_speech(text="Checking git status")]
[work...]
[text_to_speech(text="Repository is clean, no changes")]
```

## Dynamic Configuration

**On session start**, call `get_config` to read the current AgentVibes settings (voice, personality, verbosity, speed). Use these values for all subsequent TTS calls. If `get_config` fails, use the defaults below.

## Default Verbosity: MEDIUM
- Acknowledgment: Action + key approach
- Completion: Result + important decisions
- Include: Major choices only

## Default Style: normal

## Rules
1. Never skip acknowledgment TTS
2. Never skip completion TTS
3. Match verbosity level
4. Keep TTS text under 150 characters
5. Always include errors in completion TTS

Quick Ref: low=action+result | medium=+key decisions | high=+full reasoning

## Available MCP Tools

AgentVibes provides these tools via MCP:
- `text_to_speech` — Speak text aloud (supports `text`, `personality`, `voice`, `language` params)
- `mute` / `unmute` — Toggle TTS audio
- `list_voices` — Show available voices
- `set_voice` — Change the active voice
- `set_personality` — Change speaking personality (sarcastic, pirate, zen, etc.)
- `set_speed` — Adjust speech rate
- `set_verbosity` — Change verbosity level (low, medium, high)
- `list_personalities` — Show available personalities
- `get_config` — Show current TTS configuration

## BMAD Agent Voice Routing

If `.bmad-agent-context` exists in the project root, check its content:

**Single agent mode** (content is an agent ID like "analyst"):
Use `text_to_speech` with the agent's voice/personality for all speech.

**Party mode** (content is "party-mode"):
Each BMAD agent should speak using `text_to_speech` with their display name as the personality.
When multiple agents respond in a roundtable discussion, call `text_to_speech` sequentially (not in parallel) so agents speak one at a time.

The BMAD agent manifest is at `_bmad/_config/agent-manifest.csv` — read it to discover available agents, their display names, icons, and communication styles.

If `.bmad-agent-context` does NOT exist, use `text_to_speech` as normal with default voice.

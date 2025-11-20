---
description: Set a pretext word/phrase that prefixes all TTS announcements
---

# Set TTS Pretext

Configure a word or phrase that will be spoken before every TTS message.

## Usage

```bash
/agent-vibes:set-pretext <word>
```

## Examples

Set "AgentVibes" as the pretext:
```bash
/agent-vibes:set-pretext AgentVibes
```

Set a phrase:
```bash
/agent-vibes:set-pretext "Project Alpha"
```

Clear the pretext:
```bash
/agent-vibes:set-pretext ""
```

## What It Does

When a pretext is set:
- **Without pretext**: "I'll do the task"
- **With pretext**: "AgentVibes: I'll do the task"

The pretext is saved locally in `.agentvibes/config/agentvibes.json` and persists across sessions.

!bash
CONFIG_DIR="${CLAUDE_PROJECT_DIR:-.}/.agentvibes/config"
CONFIG_FILE="$CONFIG_DIR/agentvibes.json"

# Get the pretext from arguments
PRETEXT="$ARGUMENTS"

# Create config directory if it doesn't exist
mkdir -p "$CONFIG_DIR"

# Initialize config file if it doesn't exist
if [ ! -f "$CONFIG_FILE" ]; then
    echo '{}' > "$CONFIG_FILE"
fi

# Update or clear the pretext
if [ -z "$PRETEXT" ]; then
    # Clear pretext
    jq 'del(.pretext)' "$CONFIG_FILE" > "${CONFIG_FILE}.tmp" && mv "${CONFIG_FILE}.tmp" "$CONFIG_FILE"
    echo "✅ Pretext cleared"
else
    # Set pretext
    jq --arg pretext "$PRETEXT" '.pretext = $pretext' "$CONFIG_FILE" > "${CONFIG_FILE}.tmp" && mv "${CONFIG_FILE}.tmp" "$CONFIG_FILE"
    echo "✅ Pretext set to: $PRETEXT"
    echo "📢 All TTS messages will now start with: \"$PRETEXT:\""
fi

---
description: Set sentiment/personality for your current voice
argument-hint: [personality_name|list|get]
---

# Agent Vibes Sentiment Command

Set the sentiment/personality style for your current voice without changing the voice itself.

```bash
.claude/hooks/sentiment-manager.sh "$@"
```

## Usage

```bash
# Set sentiment for current voice
/agent-vibes:sentiment flirty
/agent-vibes:sentiment sarcastic
/agent-vibes:sentiment angry

# See current sentiment
/agent-vibes:sentiment get

# List available sentiments
/agent-vibes:sentiment list
```

## What This Does

The sentiment command allows you to:
- Keep your current voice (e.g., your custom voice)
- Apply a personality style (flirty, sarcastic, angry, etc.)
- Change how AI speaks without changing WHO speaks

## Example

```bash
# You're using your custom voice "MyVoice"
/agent-vibes:switch MyVoice

# Now add a sarcastic sentiment to MyVoice
/agent-vibes:sentiment sarcastic
# AI will now respond with sarcasm in MyVoice

# Or set both at once
/agent-vibes:switch MyVoice --sentiment flirty
```

## Available Sentiments

Run `/agent-vibes:sentiment list` to see all available personality styles.

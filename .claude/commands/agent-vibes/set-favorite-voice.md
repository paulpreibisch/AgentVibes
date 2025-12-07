---
description: Set or update the favorite voice for a personality
argument-hint: <personality_name> <voice_name>
---

# /agent-vibes:set-favorite-voice

Set or update the favorite voice for a specific personality.

This command allows you to assign a preferred voice to a personality. When you switch to that personality, it will automatically use the assigned voice.

## Usage

```bash
# Set favorite voice for a personality
/agent-vibes:set-favorite-voice flirty "Aria"
/agent-vibes:set-favorite-voice sarcastic "Northern Terry"

# For Piper voices (when Piper provider is active)
/agent-vibes:set-favorite-voice flirty "en_US-amy-medium"
```

## Confirmation Prompt

If the personality already has a favorite voice assigned, you'll see a confirmation prompt:

```
⚠️  WARNING: Personality 'flirty' already has a favorite voice assigned!

   Current favorite (piper): Jessica Anne Bogart
   New voice: Aria

Do you want to replace the favorite voice?

Enter your choice (yes/no):
```

**Options:**
- **yes** / **y** - Replace the current favorite with the new voice
- **no** / **n** - Keep the current favorite voice

## Provider-Aware

This command is provider-aware and will update the correct voice field:
- **Piper TTS** - Updates `piper_voice` field
- **Piper** - Updates `piper_voice` field

## How It Works

1. Checks if the personality exists
2. Detects the active TTS provider (Piper TTS or Piper)
3. Checks if a favorite voice is already assigned
4. If yes, shows confirmation prompt
5. Updates the personality markdown file with the new voice

## Voice Assignment Storage

Favorite voices are stored in personality markdown files:

```markdown
---
name: flirty
description: Playful and charming personality
piper_voice: Jessica Anne Bogart
piper_voice: en_US-amy-medium
---
```

## Examples

```bash
# Assign Aria to flirty personality
/agent-vibes:set-favorite-voice flirty "Aria"

# Assign Northern Terry to sarcastic personality
/agent-vibes:set-favorite-voice sarcastic "Northern Terry"

# Update pirate personality to use Cowboy Bob
/agent-vibes:set-favorite-voice pirate "Cowboy Bob"
```

## Implementation

!bash .claude/hooks/personality-manager.sh set-favorite-voice $ARGUMENTS

---
description: Configure voice effects (reverb, echo, pitch, EQ) for TTS output
tags: [user]
---

Configure voice effects for TTS output. Effects can be applied globally, to specific agents, or to the default voice.

## Usage

```
/agent-vibes:effects <effect> <level> [--agent <name>] [--all]
/agent-vibes:effects list
/agent-vibes:effects demo <effect>
```

## Available Effects

### Reverb
Adds room/space ambiance to the voice.

```
/agent-vibes:effects reverb off          # No reverb
/agent-vibes:effects reverb light        # Small room
/agent-vibes:effects reverb medium       # Conference room
/agent-vibes:effects reverb heavy        # Large hall
/agent-vibes:effects reverb cathedral    # Massive space
```

### Echo (coming soon)
```
/agent-vibes:effects echo off|light|medium|heavy
```

### Pitch (coming soon)
```
/agent-vibes:effects pitch normal|low|high|deep|chipmunk
```

### EQ (coming soon)
```
/agent-vibes:effects eq flat|warm|bright|radio|telephone
```

## Targeting

By default, effects apply to the `default` config (used when no agent specified).

```
# Apply to default
/agent-vibes:effects reverb medium

# Apply to specific agent
/agent-vibes:effects reverb heavy --agent Winston

# Apply to all agents
/agent-vibes:effects reverb medium --all
```

## Examples

```
# Give Winston a cathedral reverb
/agent-vibes:effects reverb cathedral --agent Winston

# Set medium reverb for everyone
/agent-vibes:effects reverb medium --all

# Turn off reverb for John
/agent-vibes:effects reverb off --agent John

# List current effects for all agents
/agent-vibes:effects list

# Demo reverb levels
/agent-vibes:effects demo reverb
```

## Effect Levels Reference

| Effect | Level | Sox Command | Description |
|--------|-------|-------------|-------------|
| reverb | off | (none) | Dry voice |
| reverb | light | reverb 20 50 50 | Small room |
| reverb | medium | reverb 40 50 70 | Conference room |
| reverb | heavy | reverb 70 50 100 | Large hall |
| reverb | cathedral | reverb 90 30 100 | Epic space |

## Requirements

- `sox` must be installed for effects to work
- Install on macOS: `brew install sox`
- Install on Linux/WSL: `apt install sox`

## Related Commands

- `/agent-vibes:background-music` - Toggle background music
- `/agent-vibes:personality` - Set voice personality style

---
description: Set TTS speech speed for Piper voices
argument-hint: [target] <speed>
---

# Set Speech Speed

Control the speech rate for Piper TTS voices (Piper TTS doesn't support speed control).

## Usage

```bash
/agent-vibes:set-speed 2x              # Set main voice to 2x slower
/agent-vibes:set-speed target 2x       # Set target language to 2x slower
/agent-vibes:set-speed 0.5x            # Set main voice to 2x faster
/agent-vibes:set-speed target 3x       # Set target language to 3x slower
/agent-vibes:set-speed normal          # Reset to normal speed (1.0)
/agent-vibes:set-speed target normal   # Reset target to normal speed
```

## Speed Values

- `0.5x` or `-2x` = 2x faster (half duration)
- `1x` or `normal` = Normal speed
- `2x` or `+2x` = 2x slower (double duration, great for learning)
- `3x` or `+3x` = 3x slower (triple duration, very slow)

## Examples

```bash
# Make Spanish 2x slower for learning
/agent-vibes:set-speed target 2x

# Make main voice faster
/agent-vibes:set-speed 0.5x

# Reset target language to normal speed
/agent-vibes:set-speed target normal
```

!bash .claude/hooks/speed-manager.sh $ARGUMENTS

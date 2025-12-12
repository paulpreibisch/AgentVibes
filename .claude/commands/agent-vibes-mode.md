---
description: Switch between AgentVibes modes (lite/full) or check current mode
scope: project
---

# AgentVibes Mode Manager

Switches between Lite Mode (minimal overhead) and Full Mode (all features).

## Usage

```bash
/agent-vibes:mode           # Show current mode
/agent-vibes:mode lite      # Switch to Lite Mode
/agent-vibes:mode full      # Switch to Full Mode
/agent-vibes:mode restore   # Restore from backup
```

**For status & diagnostics:** Use `/agent-vibes:help`

## Modes

### Lite Mode
- Minimal tokens (~50 vs ~500)
- No acknowledgment TTS
- Smart completion TTS only
- No .wav file saving
- Silent operation
- Perfect for parallel sessions

### Full Mode (Default)
- Full protocol (~500 tokens)
- Acknowledgment + completion TTS
- Personalities & learning
- Audio effects & background music
- All features enabled

## Implementation

```bash
#!/bin/bash
bash .agentvibes/hooks/switch-mode.sh "$@"
```

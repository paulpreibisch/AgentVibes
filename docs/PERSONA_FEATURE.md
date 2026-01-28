# 🎭 Persona Feature - Auto Voice Mapping for BMad Agents

## Overview

The Persona Feature enables **zero-config voice customization** for BMad agents. Simply create an `IDENTITY.md` file in your agent's workspace, and AgentVibes automatically:

- Reads persona attributes (name, creature, vibe, emoji)
- Maps vibe keywords to appropriate voice characteristics
- Applies voice settings during TTS without manual configuration
- Falls back gracefully if no IDENTITY.md exists

## Quick Start

### 1. Create IDENTITY.md in Your Workspace

```markdown
# IDENTITY.md - Who Am I?

- **Name:** Orian
- **Creature:** AI Assistant
- **Vibe:** Warm and helpful, with occasional dry humor
- **Emoji:** 🌟
```

### 2. Test Detection

```bash
cd /path/to/your/workspace
agentvibes detect-persona
```

You'll see output like:

```
┌─────────────────────────────────────┐
│       ✨ Persona Detected          │
├─────────────────────────────────────┤
│ Name: Orian 🌟                      │
│ Creature: AI Assistant              │
│ Vibe: Warm and helpful...           │
│                                     │
│ 🎤 Voice Settings:                  │
│   Voice: en_US-amy-medium           │
│   Speed: 1.0x                       │
│   Personality: normal               │
└─────────────────────────────────────┘
```

### 3. TTS Automatically Uses Persona Voice

When TTS runs in this workspace, AgentVibes automatically:
- Detects IDENTITY.md
- Applies the mapped voice
- Uses appropriate speed/personality

**No configuration required!**

## Vibe → Voice Mapping

AgentVibes uses keyword matching to map vibe descriptions to voice settings:

| Keywords | Voice | Speed | Personality |
|----------|-------|-------|-------------|
| professional, formal, business | lessac-medium | 1.0x | professional |
| warm, friendly, helpful, caring | amy-medium | 1.0x | normal |
| energetic, enthusiastic, upbeat | ryan-high | 1.1x | funny |
| calm, zen, peaceful, serene | kimberly-low | 0.9x | zen |
| witty, sarcastic, dry, clever | ryan-medium | 1.0x | sarcastic |
| direct, concise, brief, efficient | lessac-medium | 1.05x | normal |
| dramatic, theatrical, expressive | ljspeech-high | 0.95x | dramatic |
| technical, robot, robotic, mechanical | libritts-high | 1.0x | robot |

**Fallback:** If no keywords match, defaults to `amy-medium` at 1.0x speed with `normal` personality.

## Integration with BMad

### For BMad Users

1. **Install AgentVibes** in your BMad workspace:
   ```bash
   npm install -g agentvibes
   ```

2. **Create IDENTITY.md** for each agent (already part of BMad v6 bootstrap)

3. **TTS automatically works** - no additional configuration needed!

### For BMad Developers

The persona feature integrates seamlessly with BMad's agent lifecycle:

1. **Detection happens automatically** when TTS is invoked
2. **Workspace context** is determined via:
   - `CLAUDE_PROJECT_DIR` (MCP context)
   - `CLAWDBOT_WORKSPACE` (Clawdbot context)
   - Current directory (fallback)
3. **Voice settings** are applied via environment variables:
   - `AGENTVIBES_PERSONA_VOICE`
   - `AGENTVIBES_PERSONA_SPEED`
   - `AGENTVIBES_PERSONA_PERSONALITY`

## Advanced Usage

### Override Detection

You can override persona detection by setting environment variables:

```bash
export AGENTVIBES_VOICE="en_US-ryan-high"
export AGENTVIBES_SPEED="1.2"
agentvibes tts "This uses the override voice"
```

### Debug Mode

Enable debug logging to see persona detection in action:

```bash
export AGENTVIBES_DEBUG=1
agentvibes tts "Testing persona detection"
```

Output:
```
🎭 Persona detected: Orian (en_US-amy-medium @ 1.0x)
🎵 Saved to: ~/.claude/audio/tts-processed-123456.wav
```

### Programmatic Access

Use the persona detector in your own Node.js code:

```javascript
import { detectPersona, getPersonaVoice } from 'agentvibes/src/utils/persona-detector.js';

const persona = await detectPersona('/path/to/workspace');
console.log(`Voice: ${persona.voice}, Speed: ${persona.speed}x`);
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     TTS Request                             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│           persona-tts-wrapper.sh                            │
│  • Detects workspace directory                              │
│  • Checks for IDENTITY.md                                   │
│  • Runs persona-detector.js if found                        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│           persona-detector.js                               │
│  • Parses IDENTITY.md                                       │
│  • Extracts vibe, name, creature, emoji                     │
│  • Maps vibe → voice characteristics                        │
│  • Returns voice, speed, personality                        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Environment Variables Set:                                 │
│  • AGENTVIBES_PERSONA_VOICE                                 │
│  • AGENTVIBES_PERSONA_SPEED                                 │
│  • AGENTVIBES_PERSONA_PERSONALITY                           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                play-tts.sh                                  │
│  • Uses persona voice settings                              │
│  • Generates TTS audio                                      │
│  • Applies effects/background music                         │
└─────────────────────────────────────────────────────────────┘
```

## Testing

### Unit Tests

```bash
npm test
```

### Manual Testing

```bash
# Test with sample IDENTITY.md
cd /tmp/test-workspace
cat > IDENTITY.md << 'EOF'
- **Name:** TestBot
- **Vibe:** energetic and enthusiastic
- **Emoji:** ⚡
EOF

agentvibes detect-persona .
```

### Integration Testing

```bash
# Test full TTS pipeline with persona
export AGENTVIBES_DEBUG=1
~/.claude/hooks/persona-tts-wrapper.sh "Hello from persona TTS!"
```

## Troubleshooting

### Persona Not Detected

**Problem:** AgentVibes uses default voice despite IDENTITY.md existing.

**Solutions:**
1. Check IDENTITY.md format (must have bullet list with `**Key:** Value`)
2. Verify workspace directory is correct: `echo $CLAUDE_PROJECT_DIR`
3. Enable debug mode: `export AGENTVIBES_DEBUG=1`
4. Run detection manually: `agentvibes detect-persona /path/to/workspace`

### Voice Not Matching Expected

**Problem:** Voice doesn't match the vibe description.

**Solutions:**
1. Check vibe keywords - see mapping table above
2. Use more specific keywords (e.g., "sarcastic" instead of "funny")
3. Override manually: `export AGENTVIBES_VOICE="desired-voice"`

### Node Module Not Found

**Problem:** `persona-detector.js` not found when running wrapper.

**Solutions:**
1. Reinstall AgentVibes: `npm install -g agentvibes`
2. Check global npm modules: `npm root -g`
3. Set NODE_PATH: `export NODE_PATH=$(npm root -g)`

## Future Enhancements

Planned improvements for the persona feature:

- [ ] Multi-language vibe detection
- [ ] Custom vibe → voice mappings via config file
- [ ] Voice cloning integration for unique agent voices
- [ ] Emotion detection from vibe keywords (happy, sad, angry)
- [ ] Real-time voice switching based on context
- [ ] BMad team voice coordination (different voices per agent role)

## Contributing

To add new vibe mappings or improve detection:

1. Edit `src/utils/persona-detector.js`
2. Add new keyword mappings to `mapVibeToVoice()`
3. Test with sample IDENTITY.md files
4. Submit PR with test cases

## License

Apache 2.0 - same as AgentVibes core.

---

**Questions?** Open an issue at https://github.com/paulpreibisch/AgentVibes/issues

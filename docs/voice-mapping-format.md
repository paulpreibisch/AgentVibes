# Voice Mapping Format Specification

> **Version**: 2.0.0
> **Status**: Production
> **Purpose**: Define voice mapping formats across AgentVibes

---

## Multi-Provider Format (v2.0.0)

### Personality Voice Mapping

**Standard Format** (`.claude/personalities/*.md`):

```yaml
---
name: sarcastic
description: Dry wit and cutting observations
voices:
  elevenlabs: Jessica Anne Bogart
  piper: en_US-amy-medium
---
```

**Fields:**
- `name` (required): Personality identifier
- `description` (optional): Human-readable description
- `voices` (required): Object with provider-specific voice names
  - `elevenlabs`: ElevenLabs voice name
  - `piper`: Piper voice model name

---

## Provider Override

Force a specific provider regardless of global setting:

```yaml
---
name: pirate
voices:
  elevenlabs: Pirate Marshal
  piper: en_GB-northern_english_male-medium
provider: piper  # Always use Piper for this personality
---
```

**Use Cases:**
- Pirate personality → Piper (for local, offline feel)
- Professional personality → ElevenLabs (for premium quality)
- Budget-conscious personalities → Piper

---

## Multilingual Voice Mapping

**Language-Specific Voices** (`.claude/language-voices.yaml`):

```yaml
languages:
  spanish:
    code: es
    name: Spanish
    elevenlabs:
      voice: Antoni
      voice_id: ErXwobaYiN019PkySvjV
    piper:
      voice: es_ES-sharvard-medium
      locale: es_ES
  french:
    code: fr
    name: French
    elevenlabs:
      voice: Thomas
      voice_id: GBv7mTt0atIp3Br8iCZE
    piper:
      voice: fr_FR-siwis-medium
      locale: fr_FR
```

---

## BMAD Plugin Format

**Agent Voice Table** (`.agentvibes/bmad/bmad-voices.md`):

```markdown
| Agent ID | Agent Name | ElevenLabs Voice | Piper Voice | Personality |
|----------|------------|------------------|-------------|-------------|
| pm | John (Product Manager) | Jessica Anne Bogart | en_US-lessac-medium | professional |
| dev | James (Developer) | Matthew Schmitz | en_US-joe-medium | normal |
| qa | Quinn (QA) | Burt Reynolds | en_US-ryan-high | professional |
```

**Columns:**
- `Agent ID`: Must match BMAD's `agent.id` field
- `Agent Name`: Display name (reference only)
- `ElevenLabs Voice`: Voice name for ElevenLabs provider
- `Piper Voice`: Voice model for Piper provider (e.g., `en_US-lessac-medium`)
- `Personality`: Optional personality to apply

---

## Backward Compatibility

### Old Single-Voice Format (v1.0.0 - Deprecated)

```yaml
---
name: sarcastic
voice: Jessica Anne Bogart
---
```

**Behavior**: Automatically treated as `voices.elevenlabs: Jessica Anne Bogart`

**Migration**: Add `piper` voice to enable multi-provider support:

```yaml
---
name: sarcastic
voices:
  elevenlabs: Jessica Anne Bogart  # From old 'voice:' field
  piper: en_US-amy-medium          # Add this
---
```

---

## Validation Rules

1. ✅ `voices` must be an object with provider keys
2. ✅ At least one provider voice must be specified
3. ✅ `provider` override must match available provider (`elevenlabs`/`piper`)
4. ✅ Voice names must exist in provider's voice library
5. ✅ Multilingual mappings should specify both providers (fallback to English if missing)

---

## Complete Examples

### Minimal Personality

```yaml
---
name: minimal
voices:
  elevenlabs: Clyde
  piper: en_US-ryan-high
---
```

### Complete Personality with All Features

```yaml
---
name: professional
description: Clear, articulate, and authoritative
voices:
  elevenlabs: Brian
  piper: en_US-danny-low
provider: elevenlabs  # Force ElevenLabs for premium quality
sentiment: neutral
---

# Professional Personality

## AI Instructions
Use formal, corporate language. Be precise and businesslike.

## Example Responses
- "Initiating repository status assessment per your request"
- "Issue identified and resolved according to debugging best practices"
```

### Provider-Locked Personality

```yaml
---
name: premium-quality
description: Uses only highest-quality provider
voices:
  elevenlabs: Jeremy
  piper: en_US-libritts-high
provider: elevenlabs  # Always use ElevenLabs regardless of global setting
---
```

---

## Voice Name References

### ElevenLabs Voices

Use voice display names from ElevenLabs Voice Library:
- `Aria`, `Brian`, `Clyde`, `Jessica Anne Bogart`, `Pirate Marshal`, etc.
- See: `/agent-vibes:list` or [ElevenLabs Voice Library](https://elevenlabs.io/app/voice-library)

### Piper Voices

Use Piper voice model names (format: `{language}_{locale}-{name}-{quality}`):
- `en_US-amy-medium`, `en_US-lessac-medium`, `en_GB-northern_english_male-medium`
- See: [Piper Voices Repository](https://huggingface.co/rhasspy/piper-voices)

---

## Learn More

- **Provider Architecture**: [docs/architecture/provider-system.md](architecture/provider-system.md)
- **Provider Setup**: [docs/providers/](providers/)
- **Troubleshooting**: [docs/troubleshooting.md](troubleshooting.md)

**Questions?** Visit [agentvibes.org/support](https://agentvibes.org/support)

---

**Last Updated**: 2025-01-05
**Version**: 2.0.0

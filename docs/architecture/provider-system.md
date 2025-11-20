# Provider System Architecture

> **Context**: Multi-provider TTS architecture for AgentVibes
> **Purpose**: Unified interface for pluggable TTS providers
> **Pattern**: Router + Provider Implementation pattern
> **Status**: Production (v2.0.0+)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Design Principles](#design-principles)
- [Component Architecture](#component-architecture)
- [Request Flow](#request-flow)
- [Provider Interface Contract](#provider-interface-contract)
- [State Management](#state-management)
- [Extension Points](#extension-points)
- [Related Files](#related-files)
- [Migration Guide](#migration-guide)

---

## Overview

AgentVibes implements a **multi-provider TTS architecture** that allows seamless switching between different text-to-speech services. The system abstracts provider-specific details behind a unified interface, enabling:

- 🔄 **Runtime provider switching** without configuration changes
- 🎤 **Automatic voice mapping** across providers
- 💾 **Persistent state management** for user preferences
- 🔌 **Plugin extensibility** for adding new providers
- ⚡ **Zero-downtime switching** with immediate effect

**Current Providers:**
- **ElevenLabs** - Premium AI voices (150+ voices, 30+ languages)
- **Piper TTS** - Free offline neural voices (50+ voices, 18 languages)

---

## Design Principles

### 1. Provider Abstraction
**Unified interface hides provider complexity**
- Single entry point for all TTS requests (`play-tts.sh`)
- Provider-agnostic API for callers
- Implementation details encapsulated in provider scripts

### 2. Loose Coupling
**Provider implementations are independent**
- Each provider is a standalone script
- No cross-provider dependencies
- Adding/removing providers doesn't affect others
- Provider failures are isolated

### 3. Simple State Management
**File-based configuration for transparency**
- `.claude/tts-provider.txt` - Active provider name
- `.claude/personalities/*.md` - Voice mappings per provider
- No databases or complex state stores
- Human-readable and git-friendly

### 4. Backward Compatibility
**Seamless migration from single-provider**
- Old `voice:` format still works (treated as ElevenLabs)
- New `voices: {elevenlabs: X, piper: Y}` format preferred
- Migration warnings guide users to new format
- No forced breaking changes

---

## Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    User/Claude Code                         │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  play-tts.sh (Router)                       │
│  • Personality provider override check                       │
│  • Active provider resolution                                │
│  • Provider script delegation                                │
└──────────────────────────┬──────────────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          │                                  │
          ▼                                  ▼
┌──────────────────────┐         ┌──────────────────────┐
│ play-tts-elevenlabs  │         │   play-tts-piper     │
│                      │         │                      │
│ • API requests       │         │ • Local synthesis    │
│ • Voice mapping      │         │ • Voice models       │
│ • Language codes     │         │ • Offline mode       │
│ • Error handling     │         │ • Fast generation    │
└──────────┬───────────┘         └──────────┬───────────┘
           │                                 │
           ▼                                 ▼
┌─────────────────────────────────────────────────────────────┐
│                  Audio Output (mpv/afplay)                  │
└─────────────────────────────────────────────────────────────┘
```

### Router Layer

**File**: `.claude/hooks/play-tts.sh`

**Responsibilities:**
- Check for personality provider override
- Read active provider from state file
- Validate provider exists
- Delegate to provider-specific implementation
- Handle errors and provide fallbacks

**Key Logic:**
```bash
# Check personality override first
PROVIDER=""
if [[ personality has provider field ]]; then
  PROVIDER=$(personality_provider)
fi

# Fall back to global provider
if [[ -z "$PROVIDER" ]]; then
  PROVIDER=$(get_active_provider)
fi

# Delegate to provider script
exec "$PROVIDER_SCRIPT" "$@"
```

### Provider Implementations

**Files**: `.claude/hooks/play-tts-{provider}.sh`

Each provider implements:
- Text-to-speech synthesis
- Voice name resolution
- Language handling
- Error messaging
- Audio playback integration

**Current Implementations:**
- `play-tts-elevenlabs.sh` - ElevenLabs API integration
- `play-tts-piper.sh` - Piper TTS local synthesis

**Future Providers:**
- `play-tts-azure.sh` - Microsoft Azure TTS
- `play-tts-google.sh` - Google Cloud TTS
- `play-tts-aws.sh` - Amazon Polly

### Provider Manager

**File**: `.claude/hooks/provider-manager.sh`

**Functions:**
- `get_active_provider()` - Read current provider from state
- `set_active_provider()` - Update state with new provider
- `list_providers()` - Discover available provider scripts
- `validate_provider()` - Check if provider exists and is valid
- `get_provider_script_path()` - Resolve provider script location

### State Management

**Files:**
- `.claude/tts-provider.txt` - Active provider name (project-local)
- `~/.claude/tts-provider.txt` - Global fallback
- `.claude/personalities/*.md` - Per-personality voice mappings
- `.agentvibes/bmad/bmad-voices.md` - BMAD agent voice table

**State Flow:**
```
Project-local (.claude/tts-provider.txt)
          ↓
   Global fallback (~/.claude/tts-provider.txt)
          ↓
   Default (elevenlabs)
```

---

## Request Flow

### Standard TTS Request

```
1. User triggers TTS (e.g., task completion)
   │
   ▼
2. play-tts.sh receives request
   • Parameters: $1=text, $2=voice_name (optional)
   │
   ▼
3. Check personality provider override
   • Read current personality from .claude/tts-personality.txt
   • Extract provider: field from personality YAML
   • If set and valid, use personality provider
   │
   ▼
4. Fall back to global provider (if no override)
   • provider-manager.sh: get_active_provider()
   • Read .claude/tts-provider.txt
   • Default to "elevenlabs" if not set
   │
   ▼
5. Resolve provider script path
   • provider-manager.sh: get_provider_script_path()
   • Returns .claude/hooks/play-tts-{provider}.sh
   • Validate script exists and is executable
   │
   ▼
6. Delegate to provider implementation
   • exec play-tts-{provider}.sh "$text" "$voice"
   • Provider handles synthesis
   • Provider plays audio
   │
   ▼
7. Audio output via system player (mpv/afplay)
```

### Provider Switch Request

```
1. User runs: /agent-vibes:provider switch piper
   │
   ▼
2. provider-commands.sh validates provider
   • Check provider exists
   • Check platform compatibility (Piper requires WSL/Linux)
   • Check language compatibility with current language
   │
   ▼
3. User confirmation prompt
   • Show current vs new provider
   • Show any warnings (language fallbacks, platform issues)
   • Require explicit Y/n confirmation
   │
   ▼
4. Update state
   • provider-manager.sh: set_active_provider(piper)
   • Write "piper" to .claude/tts-provider.txt
   │
   ▼
5. Test new provider
   • play-tts.sh "Provider switched successfully"
   • Immediate feedback to user
```

---

## Provider Interface Contract

Every provider implementation must adhere to this contract:

### Command Line Interface

```bash
play-tts-{provider}.sh <text> [voice_name]
```

**Parameters:**
- `$1` (required): Text to synthesize
- `$2` (optional): Voice name override

### Return Codes

- `0` - Success (audio played successfully)
- `1` - Provider error (API failure, network issue, etc.)
- `2` - Configuration error (missing API key, invalid voice, etc.)
- `3` - Platform error (unsupported platform, missing dependencies)

### Standard Output

```bash
🌍 Using spanish voice: Antoni          # Language info
🎤 Using voice: Aria (session override) # Voice selection
🎵 Saved to: /path/to/audio.mp3        # Audio file path
🎭 Using personality override: piper    # Provider override
```

### Error Output (stderr)

```bash
❌ Provider 'foo' not found
⚠️  Language 'arabic' not supported by piper, using English
🔑 ElevenLabs API key not found
```

### Audio Output

- Must play audio via system player (mpv/afplay)
- Must handle audio padding for WSL static prevention
- Must clean up temporary files
- Must not cut off audio start/end

### Voice Resolution

Providers must support:
1. Voice name parameter from caller
2. Personality-specific voice mapping
3. Language-specific voice mapping
4. Fallback to default voice

**Priority Order:**
```
1. Voice name parameter ($2)
2. Language-specific voice (e.g., Spanish → Antoni)
3. Personality voice (e.g., pirate → Pirate Marshal)
4. Default voice (e.g., Aria)
```

---

## State Management

### Provider State

**Location**: `.claude/tts-provider.txt` (project) or `~/.claude/tts-provider.txt` (global)

**Format**: Plain text, single line
```
elevenlabs
```

**Read by**: `get_active_provider()`
**Written by**: `set_active_provider()`

### Voice Mappings

**Location**: `.claude/personalities/*.md`

**Format**: YAML frontmatter
```yaml
---
name: pirate
voices:
  elevenlabs: Pirate Marshal
  piper: en_GB-northern_english_male-medium
provider: piper  # Optional override
---
```

**Read by**: `personality-manager.sh:get_personality_data()`

### BMAD Agent Voices

**Location**: `.agentvibes/bmad/bmad-voices.md`

**Format**: Markdown table
```markdown
| Agent ID | Name | ElevenLabs Voice | Piper Voice | Personality |
|----------|------|------------------|-------------|-------------|
| pm | John | Jessica Anne Bogart | en_US-lessac-medium | professional |
```

**Read by**: `bmad-voice-manager.sh:get_agent_voice()`

---

## Extension Points

### Adding a New Provider

To add a new TTS provider to AgentVibes:

#### 1. Create Provider Script

**File**: `.claude/hooks/play-tts-{provider}.sh`

```bash
#!/bin/bash
# Provider: {Your Provider Name}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEXT="${1:-Hello World}"
VOICE_OVERRIDE="${2:-}"

# 1. Voice resolution
if [[ -n "$VOICE_OVERRIDE" ]]; then
  VOICE="$VOICE_OVERRIDE"
else
  # Check language, personality, or default
  VOICE="default-voice"
fi

# 2. Synthesize speech
# ... your provider-specific synthesis ...

# 3. Play audio
mpv --really-quiet "$AUDIO_FILE"

# 4. Exit with appropriate code
exit 0
```

#### 2. Add Voice Mappings

Update all personality files in `.claude/personalities/*.md`:

```yaml
---
name: sarcastic
voices:
  elevenlabs: Jessica Anne Bogart
  piper: en_US-amy-medium
  yourprovider: your-voice-name  # Add this line
---
```

#### 3. Update Installer

Add provider option to `bin/agent-vibes` installer:

```javascript
const providers = [
  { name: 'ElevenLabs', value: 'elevenlabs', ... },
  { name: 'Piper', value: 'piper', ... },
  { name: 'Your Provider', value: 'yourprovider', ... }  // Add this
];
```

#### 4. Add Provider Commands

Update `.claude/hooks/provider-commands.sh`:

```bash
case "$provider_name" in
  elevenlabs) ... ;;
  piper) ... ;;
  yourprovider)  # Add this
    echo "Your Provider - Description"
    echo "Platform: All"
    echo "Cost: ..."
    ;;
esac
```

#### 5. Create Documentation

Create `.docs/providers/yourprovider-setup.md` with:
- Installation instructions
- Configuration requirements
- Platform compatibility
- Voice library information
- Troubleshooting guide

#### 6. Test Provider

```bash
# Switch to new provider
/agent-vibes:provider switch yourprovider

# Test with personalities
/agent-vibes:personality sarcastic
# Trigger TTS to hear new voice

# Test languages
/agent-vibes:set-language spanish
# Trigger TTS to verify language support
```

---

## Related Files

### Core Provider System

| File | Purpose |
|------|---------|
| `.claude/hooks/play-tts.sh` | Router - main entry point |
| `.claude/hooks/provider-manager.sh` | Provider management functions |
| `.claude/hooks/play-tts-elevenlabs.sh` | ElevenLabs implementation |
| `.claude/hooks/play-tts-piper.sh` | Piper implementation |
| `.claude/hooks/provider-commands.sh` | Slash commands for providers |

### Voice Management

| File | Purpose |
|------|---------|
| `.claude/hooks/personality-manager.sh` | Personality voice resolution |
| `.claude/hooks/language-manager.sh` | Language-specific voice mapping |
| `.claude/hooks/bmad-voice-manager.sh` | BMAD agent voice lookup |
| `.claude/language-voices.yaml` | Language-to-voice mappings |

### State Files

| File | Purpose |
|------|---------|
| `.claude/tts-provider.txt` | Active provider name |
| `.claude/personalities/*.md` | Voice mappings per personality |
| `.agentvibes/bmad/bmad-voices.md` | BMAD agent voice table |

### Slash Commands

| File | Purpose |
|------|---------|
| `.claude/commands/agent-vibes/provider.md` | Provider management commands |
| `.claude/commands/agent-vibes/switch.md` | Voice switching (single provider) |
| `.claude/commands/agent-vibes/list.md` | List voices (provider-aware) |

---

## Migration Guide

### From Single-Provider (v1.x) to Multi-Provider (v2.x)

#### Personality Files

**Old Format (v1.x)**:
```yaml
---
name: sarcastic
voice: Jessica Anne Bogart
---
```

**New Format (v2.x)**:
```yaml
---
name: sarcastic
voices:
  elevenlabs: Jessica Anne Bogart
  piper: en_US-amy-medium
---
```

**Migration**: Old format still works (treated as `voices.elevenlabs`), but new format recommended for multi-provider support.

#### BMAD Plugin

**Old Format (v1.x)**:
```markdown
| Agent | Name | Voice | Personality |
|-------|------|-------|-------------|
| pm | John | Jessica | professional |
```

**New Format (v2.x)**:
```markdown
| Agent | Name | ElevenLabs Voice | Piper Voice | Personality |
|-------|------|------------------|-------------|-------------|
| pm | John | Jessica Anne Bogart | en_US-lessac-medium | professional |
```

**Migration**: Automatic detection in `bmad-voice-manager.sh` - checks for "| ElevenLabs Voice |" header to determine format.

#### API Changes

No breaking API changes. All existing scripts continue to work:
- `play-tts.sh "text"` - Still works
- `/agent-vibes:switch voice` - Still works
- Personality switching - Still works

New features added:
- `/agent-vibes:provider switch piper` - New
- `provider:` field in personality frontmatter - New
- Multi-provider voice tables - New

---

## Learn More

- **Provider Comparison**: [agentvibes.org/providers](https://agentvibes.org/providers)
- **Setup Guides**: [docs/providers/](../providers/)
- **Voice Mapping Format**: [docs/voice-mapping-format.md](../voice-mapping-format.md)
- **Troubleshooting**: [docs/troubleshooting.md](../troubleshooting.md)

**Questions?** Visit [agentvibes.org/support](https://agentvibes.org/support)

---

**Last Updated**: 2025-01-05
**Architecture Version**: 2.0.0
**Status**: Production

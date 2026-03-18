# /agent-vibes:bmad Command

Complete BMAD voice integration - assigns unique voices to each BMAD agent AND makes them speak when activated.

## Usage

```
/agent-vibes:bmad <subcommand> [arguments]
```

## Subcommands

### `enable`
Enables voice assignment for BMAD agents AND automatically injects TTS into agent activation instructions.

**What it does:**
1. ✅ Enables BMAD voice plugin (assigns voices to agents)
2. ✅ Backs up current voice/personality settings
3. ✅ Injects TTS hooks into all BMAD agent files
4. ✅ BMAD agents will now SPEAK when they activate!

**Example:**
```
/agent-vibes:bmad enable
```

**Output:**
```
✅ BMAD voice plugin enabled
💾 Previous settings backed up:
   Voice: Aria
   Personality: normal

📊 BMAD Agent Voice Mappings:
   pm → Matthew Schmitz [professional]
   dev → Jessica Anne Bogart [normal]
   qa → Ralf Eisend [professional]

🎤 Automatically enabling TTS for BMAD agents...

✅ Injected TTS into: pm.md → Voice: Matthew Schmitz
✅ Injected TTS into: dev.md → Voice: Jessica Anne Bogart
✅ Injected TTS into: qa.md → Voice: Ralf Eisend

🎉 TTS enabled for 10 agents
💡 BMAD agents will now speak when activated!
```

### `disable`
Disables BMAD voice plugin AND removes TTS from all BMAD agents.

**What it does:**
1. ✅ Restores your previous voice/personality settings
2. ✅ Removes TTS hooks from all BMAD agent files
3. ✅ Disables BMAD voice plugin
4. ✅ Agents return to normal (silent) behavior

**Example:**
```
/agent-vibes:bmad disable
```

**Output:**
```
❌ BMAD voice plugin disabled
🔄 Restoring previous settings:
   Voice: Aria
   Personality: normal

🔇 Automatically disabling TTS for BMAD agents...

✅ Removed TTS from: pm.md
✅ Removed TTS from: dev.md
✅ Removed TTS from: qa.md

✅ TTS disabled for 10 agents
```

### `status`
Shows plugin status and current voice mappings.

**Example:**
```
/agent-vibes:bmad status
```

**Output:**
```
✅ BMAD voice plugin: ENABLED

📊 BMAD Agent Voice Mappings:
   pm → Matthew Schmitz [professional]
   dev → Jessica Anne Bogart [normal]
   qa → Ralf Eisend [professional]
   ...
```

### `list`
Lists all BMAD agents and their assigned voices.

**Example:**
```
/agent-vibes:bmad list
```

### `set <agent-id> <voice> [personality]`
Quickly change voice for specific agent.

**Examples:**
```
/agent-vibes:bmad set pm "Aria"
/agent-vibes:bmad set dev "Cowboy Bob" sarcastic
/agent-vibes:bmad set qa "Northern Terry" professional
```

**Arguments:**
- `agent-id`: BMAD agent identifier (pm, dev, qa, architect, po, analyst, sm, ux-expert, bmad-master, bmad-orchestrator)
- `voice`: Valid AgentVibes voice name
- `personality` (optional): Personality to apply (default: normal)

### `edit`
Opens `.agentvibes/bmad/bmad-voices.md` for manual editing.

**Example:**
```
/agent-vibes:bmad edit
```

**Usage:**
Edit the markdown table directly to change voice mappings.

## How It Works

### Voice Assignment
1. **Plugin File**: `.agentvibes/bmad/bmad-voices.md` contains voice-to-agent mappings
2. **Activation Flag**: `.agentvibes/bmad/bmad-voices-enabled.flag` enables/disables the plugin

### TTS Injection (Automatic)
When you run `/agent-vibes:bmad enable`, the system automatically:

1. **Scans BMAD agents**: Finds all `.md` files in `.bmad-core/agents/` or `bmad-core/agents/`
2. **Injects TTS hooks**: Modifies each agent's `activation-instructions` YAML block
3. **Assigns voices**: Uses the voice mapping from the plugin file
4. **Creates backups**: Saves `.backup-pre-tts` files before modifying

**What gets injected:**
```yaml
activation-instructions:
  - STEP 4: Greet user with your name/role and immediately run `*help`
  - # AGENTVIBES-TTS-INJECTION: Speak agent greeting with assigned voice
  - Run this bash command to announce activation: .claude/hooks/play-tts.sh "Agent pm activated and ready" "Matthew Schmitz"
```

**Result**: When you activate a BMAD agent with `/BMad:agents:pm`, you'll hear:
🔊 "Agent pm activated and ready" (spoken in Matthew Schmitz's voice)

### Provider Support
The TTS injection works with **any configured TTS provider**:
- ✅ **Piper TTS** - Uses AI voices with full voice mapping
- ✅ **Piper TTS** - Uses neural voices (free, offline)

The system automatically detects your configured provider via `/agent-vibes:provider info` and uses the appropriate TTS engine. You can switch providers anytime with `/agent-vibes:provider switch` and the BMAD agents will continue speaking using the new provider.

## Available BMAD Agents (Provider-Aware)

The voice used depends on your active TTS provider. Run `/agent-vibes:provider info` to check your provider.

| Agent ID | Role | Piper TTS Voice | Piper Voice |
|----------|------|------------------|-------------|
| pm | Product Manager | Matthew Schmitz | en_US-ryan-high |
| dev | Developer | Aria | en_US-amy-medium |
| analyst | Business Analyst | Jessica Anne Bogart | en_US-kristin-medium |
| architect | Architect | Michael | en_GB-alan-medium |
| sm | Scrum Master | Matthew Schmitz | en_US-joe-medium |
| tea | Test Architect | Michael | en_US-arctic-medium |
| tech-writer | Technical Writer | Aria | en_US-lessac-medium |
| ux-designer | UX Designer | Jessica Anne Bogart | en_US-lessac-medium |
| frame-expert | Visual Designer | Matthew Schmitz | en_GB-alan-medium |
| bmad-master | BMAD Master | Michael | en_US-danny-low |

## Implementation Details

**For AgentVibes Developers:**

The plugin integrates with the Agent Vibes output style through bash hooks:

```bash
# Check if BMAD agent is active
BMAD_AGENT_ID=$(echo "$COMMAND" | grep -oP '/BMad:agents:\K[a-z-]+')

# Get voice from plugin if enabled
if [[ -n "$BMAD_AGENT_ID" ]]; then
    MAPPED_VOICE=$(.claude/hooks/bmad-voice-manager.sh get-voice "$BMAD_AGENT_ID")
    if [[ -n "$MAPPED_VOICE" ]]; then
        .claude/hooks/play-tts.sh "message" "$MAPPED_VOICE"
    fi
fi
```

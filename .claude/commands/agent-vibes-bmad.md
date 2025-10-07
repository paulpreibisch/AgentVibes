# /agent-vibes:bmad Command

Manage BMAD voice plugin integration for automatic voice assignment to BMAD agents.

## Usage

```
/agent-vibes:bmad <subcommand> [arguments]
```

## Subcommands

### `enable`
Enables automatic voice assignment for BMAD agents.

**Example:**
```
/agent-vibes:bmad enable
```

**Output:**
- Creates `.claude/plugins/bmad-voices-enabled.flag`
- Shows current agent voice mappings
- Confirms activation

### `disable`
Disables BMAD voice plugin (reverts to default AgentVibes behavior).

**Example:**
```
/agent-vibes:bmad disable
```

**Output:**
- Removes activation flag
- AgentVibes uses default voice settings

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
Opens `.claude/plugins/bmad-voices.md` for manual editing.

**Example:**
```
/agent-vibes:bmad edit
```

**Usage:**
Edit the markdown table directly to change voice mappings.

## How It Works

1. **Plugin File**: `.claude/plugins/bmad-voices.md` contains voice mappings
2. **Activation Flag**: `.claude/plugins/bmad-voices-enabled.flag` enables/disables plugin
3. **Auto-Detection**: When a BMAD agent activates (e.g., `/BMad:agents:pm`), AgentVibes automatically:
   - Detects the agent ID from the command
   - Looks up voice mapping in plugin file
   - Uses assigned voice for TTS acknowledgments/completions

## Available BMAD Agents

| Agent ID | Role | Default Voice |
|----------|------|---------------|
| pm | Product Manager | Matthew Schmitz |
| dev | Developer | Jessica Anne Bogart |
| qa | QA Engineer | Ralf Eisend |
| architect | Architect | Michael |
| po | Product Owner | Amy |
| analyst | Analyst | Lutz Laugh |
| sm | Scrum Master | Ms. Walker |
| ux-expert | UX Expert | Aria |
| bmad-master | BMAD Master | Aria |
| bmad-orchestrator | Orchestrator | Ms. Walker |

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

# /agent-vibes:bmad-tts Command

Automatically inject TTS hooks into BMAD agent files so they speak when activated.

## Usage

```
/agent-vibes:bmad-tts <subcommand>
```

## Subcommands

### `enable`
Injects TTS hooks into all BMAD agent activation instructions.

**What it does:**
- Scans `.bmad-core/agents/` directory for all agent files
- Injects TTS call into each agent's activation instructions
- Uses voice mapping from AgentVibes BMAD plugin
- Creates backups before modifying files

**Example:**
```
/agent-vibes:bmad-tts enable
```

**Output:**
```
🎤 Enabling TTS for all BMAD agents...

✅ Injected TTS into: pm.md → Voice: Matthew Schmitz
✅ Injected TTS into: dev.md → Voice: Jessica Anne Bogart
✅ Injected TTS into: qa.md → Voice: Ralf Eisend
⚠️  TTS already injected in: architect.md

🎉 TTS enabled for 3 agents
   Skipped 1 agents (already enabled)

💡 BMAD agents will now speak when activated!
```

### `disable`
Removes TTS hooks from all BMAD agents.

**Example:**
```
/agent-vibes:bmad-tts disable
```

**Output:**
```
🔇 Disabling TTS for all BMAD agents...

✅ Removed TTS from: pm.md
✅ Removed TTS from: dev.md
✅ Removed TTS from: qa.md

✅ TTS disabled for 3 agents
```

### `status`
Shows which agents have TTS enabled.

**Example:**
```
/agent-vibes:bmad-tts status
```

**Output:**
```
📊 BMAD TTS Injection Status:

   ✅ pm (pm) → Voice: Matthew Schmitz
   ✅ dev (dev) → Voice: Jessica Anne Bogart
   ❌ qa (qa)
   ✅ architect (architect) → Voice: Michael

Summary: 3 enabled, 1 disabled
```

### `restore`
Restore agents from backup (undo TTS injection).

**Example:**
```
/agent-vibes:bmad-tts restore
```

**Output:**
```
🔄 Restoring agents from backup...

✅ Restored: pm.md
✅ Restored: dev.md

✅ Restored 2 agents from backup
```

## How It Works

1. **Detection**: Automatically finds `.bmad-core/agents/` directory
2. **Injection**: Adds TTS call to agent's STEP 4 (greeting) in activation-instructions
3. **Voice Mapping**: Uses BMAD voice plugin to assign correct voice per agent
4. **Safety**: Creates `.backup-pre-tts` files before making changes

## What Gets Injected

Before:
```yaml
activation-instructions:
  - STEP 4: Greet user with your name/role and immediately run `*help`
```

After:
```yaml
activation-instructions:
  - STEP 4: Greet user with your name/role and immediately run `*help`
  - # AGENTVIBES-TTS-INJECTION: Speak agent greeting with assigned voice
  - Run this bash command to announce activation: .claude/hooks/play-tts.sh "Agent pm activated and ready" "Matthew Schmitz"
```

## Requirements

- **BMAD-METHOD™** installed (`.bmad-core/` directory must exist)
- **AgentVibes** installed with BMAD plugin enabled (optional, uses default voice if not)
- **TTS Provider** configured (ElevenLabs or Piper)

## Example Workflow

```bash
# 1. Enable BMAD voice plugin (assigns voices to agents)
/agent-vibes:bmad enable

# 2. Inject TTS hooks into agents
/agent-vibes:bmad-tts enable

# 3. Activate a BMAD agent - it will now speak!
/BMad:agents:pm

# You'll hear: "Agent pm activated and ready" in Matthew Schmitz's voice
```

## Troubleshooting

**"BMAD installation not found"**
- Make sure you're in a directory with `.bmad-core/` folder
- BMAD-METHOD™ must be installed first

**"No activation-instructions found"**
- Agent file format may be incompatible
- Check that agent uses standard BMAD YAML structure

**TTS not playing when agent activates**
- Verify `.claude/hooks/play-tts.sh` exists
- Check TTS provider is configured: `/agent-vibes:provider info`
- Ensure you've run `/output-style Agent Vibes`

## Tips

- Run `/agent-vibes:bmad-tts status` to see which agents have TTS
- Use `/agent-vibes:bmad set <agent> <voice>` to customize voices before enabling TTS
- Backups are created automatically - use `restore` to undo changes
- TTS only plays when agents **activate**, not during normal conversation

## Related Commands

- `/agent-vibes:bmad enable` - Enable BMAD voice plugin
- `/agent-vibes:bmad status` - View agent voice mappings
- `/agent-vibes:bmad set <agent> <voice>` - Customize agent voice
- `/agent-vibes:provider info` - Check TTS provider status

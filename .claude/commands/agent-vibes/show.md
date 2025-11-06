---
description: Restore all hidden AgentVibes slash commands to the command list
---

You are about to restore all hidden AgentVibes slash commands.

**What this does:**
- Moves all AgentVibes commands from `.claude/.agentvibes-backup/` back to `.claude/commands/agent-vibes/`
- Restores full command visibility
- Removes the hidden state flag
- All AgentVibes slash commands become visible again

**IMPORTANT IMPLEMENTATION STEPS:**

1. **Check if commands are hidden:**
   - Check if `.claude/.agentvibes-hidden.flag` exists
   - If it does NOT exist, respond: "⚠️ AgentVibes commands are already visible. Nothing to restore."
   - Stop execution

2. **Check if backup directory exists:**
   ```bash
   if [ ! -d ".claude/.agentvibes-backup" ]; then
     echo "⚠️ Backup directory not found. Commands may not have been properly hidden."
     exit 1
   fi
   ```

3. **Restore all command files:**
   ```bash
   mv .claude/.agentvibes-backup/* .claude/commands/agent-vibes/
   rmdir .claude/.agentvibes-backup
   ```

4. **Remove the hidden state flag:**
   ```bash
   rm -f .claude/.agentvibes-hidden.flag
   ```

5. **Display success message:**
   ```
   ✅ AgentVibes commands restored successfully!

   📂 All commands are now visible in `.claude/commands/agent-vibes/`

   🔄 Please reload Claude Code to see changes:
      Press Ctrl+Shift+P → "Developer: Reload Window"

   💡 To hide commands again, use: /agent-vibes:hide

   ✨ All AgentVibes slash commands are now available!
   ```

**Commands that will be restored:**
- add.md
- agent-vibes.md
- agent.md
- agent-health-coach.md
- agent-motivator.md
- agent-negotiator.md
- bmad.md
- get.md
- language.md
- learn.md
- list.md
- personality.md
- preview.md
- provider.md
- replay-target.md
- replay.md
- sample.md
- sentiment.md
- set-favorite-voice.md
- set-language.md
- set-pretext.md
- set-speed.md
- switch.md
- target-voice.md
- target.md
- update.md
- version.md
- whoami.md
- commands.json

Now execute the restoration process following the steps above.

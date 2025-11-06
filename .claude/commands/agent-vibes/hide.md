---
description: Hide all AgentVibes slash commands from the command list (MCP users)
---

You are about to hide all AgentVibes slash commands from the Claude Code interface.

**What this does:**
- Moves all AgentVibes commands from `.claude/commands/agent-vibes/` to `.claude/.agentvibes-backup/`
- Keeps only the `show.md` and `hide.md` commands visible
- Creates a flag file to track hidden state
- Does NOT affect MCP functionality - you can still use AgentVibes through MCP tools

**IMPORTANT IMPLEMENTATION STEPS:**

1. **Check if already hidden:**
   - Check if `.claude/.agentvibes-hidden.flag` exists
   - If it exists, respond: "⚠️ AgentVibes commands are already hidden. Use /agent-vibes:show to restore them."
   - Stop execution

2. **Create backup directory:**
   ```bash
   mkdir -p .claude/.agentvibes-backup
   ```

3. **Move all command files EXCEPT hide.md and show.md:**
   ```bash
   cd .claude/commands/agent-vibes

   # Move all files except hide.md and show.md
   for file in *.md *.json; do
     if [ "$file" != "hide.md" ] && [ "$file" != "show.md" ]; then
       mv "$file" ../../.agentvibes-backup/
     fi
   done
   ```

4. **Create the hidden state flag:**
   ```bash
   touch .claude/.agentvibes-hidden.flag
   ```

5. **Display success message:**
   ```
   ✅ AgentVibes commands hidden successfully!

   📦 Backed up to: `.claude/.agentvibes-backup/`

   🔄 Please reload Claude Code to see changes:
      Press Ctrl+Shift+P → "Developer: Reload Window"

   💡 To restore commands, use: /agent-vibes:show

   ℹ️  MCP functionality is unaffected - AgentVibes MCP tools still work normally.
   ```

**Files that will be hidden:**
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

**Files that will remain visible:**
- hide.md (this command)
- show.md (to restore commands)

Now execute the hiding process following the steps above.

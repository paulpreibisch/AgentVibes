# Advanced Features

## Custom Personalities

1. Create new personality:
   ```bash
   /agent-vibes:personality add mycustom
   ```

2. Edit `.claude/personalities/mycustom.md`:
   ```markdown
   ---
   name: mycustom
   description: My style
   voice: Aria
   ---

   ## AI Instructions
   Speak in your unique style...
   ```

3. Use it:
   ```bash
   /agent-vibes:personality mycustom
   ```

## Add Custom Voices

```bash
# Get voice ID from piper.io
/agent-vibes:add "My Voice" abc123xyz789
```

## Use in Custom Output Styles

```markdown
I'll do the task
[Bash: .claude/hooks/play-tts.sh "Starting" "Aria"]

... work ...

✅ Done
[Bash: .claude/hooks/play-tts.sh "Complete" "Cowboy Bob"]
```

---

[↑ Back to Main README](../README.md)

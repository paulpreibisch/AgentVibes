# 🎤 AgentVibes - Simple Setup

> **Give Claude a voice in 30 seconds**

---

## What is this?

AgentVibes makes Claude Code speak to you. That's it.

When Claude works on your tasks, you'll hear:
- ✅ "Starting the task" when Claude begins
- ✅ "Task complete" when Claude finishes

Perfect for multitasking - hear when your AI assistant is done without watching the screen.

---

## Install (30 seconds)

```bash
npx agentvibes install
```

**That's it!** Answer a few questions and you're done.

**Requirements:** Just Node.js 16+ (`node --version`)

**No git, no git-lfs, no cloning needed.** npm handles everything.

---

## First Steps

### Choose a voice
```bash
/agent-vibes:switch Aria
```

### Test it
```bash
/agent-vibes:sample Aria
```

### Hide the commands (clean up your command list)
```bash
/agent-vibes:hide
```

Commands still work, just not cluttering your list!

---

## Common Questions

**Q: Does this require git-lfs?**
**A:** NO. Just `npx agentvibes install` - zero git operations.

**Q: How much does this cost?**
**A:** Free! Uses Piper TTS (offline) or macOS Say (built-in).

**Q: Does MCP use context tokens?**
**A:** Yes (~1500-2000 tokens). If concerned, use slash commands instead (zero tokens). Or just don't install MCP.

**Q: Too many slash commands?**
**A:** Use `/agent-vibes:hide` to hide them all. They still work, just cleaner.

**Q: Can I use this without BMAD?**
**A:** Yes! AgentVibes works standalone. BMAD is completely optional.

**Q: What are those .onnx.json files?**
**A:** Piper TTS voice model metadata. Not your settings - ignore them.

---

## Want More Features?

This is the simple guide. AgentVibes can also:
- 🎭 Speak with personalities (pirate, sarcastic, formal, etc.)
- 🌍 Speak in 30+ languages
- 📚 Language learning mode (hear tasks in English + Spanish)
- 🎨 Audio effects (reverb, pitch shifting, etc.)
- 🎪 BMAD multi-agent integration (optional)

**[→ Full README](README.md)** - All features, advanced setup, documentation

---

## Quick Commands Reference

```bash
# Voice control
/agent-vibes:list                     # See all voices
/agent-vibes:switch <voice-name>      # Change voice
/agent-vibes:sample <voice-name>      # Test a voice

# System
/agent-vibes:mute                     # Silence TTS
/agent-vibes:unmute                   # Enable TTS
/agent-vibes:hide                     # Hide commands from list
/agent-vibes:show                     # Show commands again

# Replay
/agent-vibes:replay                   # Hear last message again
```

---

## Troubleshooting

**No sound?**
1. Test: `/agent-vibes:sample Aria`
2. Check volume is up
3. Reinstall: `npx agentvibes install --yes`

**Commands not found?**
```bash
npx agentvibes install --yes
```

**git-lfs error?**
You're using the wrong installation method. Use `npx agentvibes install` not `git clone`.

**[→ Full Troubleshooting Guide](docs/troubleshooting.md)**

---

## That's It!

Simple TTS for Claude Code. No complexity required.

**Want the full experience?** [→ Full README](README.md)

**Having issues?** [→ Troubleshooting](docs/troubleshooting.md)

**Questions?** [→ FAQ](README.md#-frequently-asked-questions-faq)

---

Made with ❤️ by [Paul Preibisch](https://github.com/paulpreibisch) | [GitHub](https://github.com/paulpreibisch/AgentVibes) | [Website](https://agentvibes.org)

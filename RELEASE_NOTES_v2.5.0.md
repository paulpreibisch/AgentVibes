# Release v2.5.0 - Verbosity Control System

**Release Date:** November 16, 2025
**Type:** Minor Release (New Features)

---

## 🎙️ AI Summary

**AgentVibes v2.5.0 introduces intelligent verbosity control** - giving you precise control over how much Claude speaks while working. This release adds a groundbreaking three-level system (LOW/MEDIUM/HIGH) that uses emoji markers (💭 🤔 ✓) for automatic TTS detection, eliminating the need for manual Bash calls. Whether you want minimal interruption during focused work or maximum transparency for learning and debugging, you can now adjust Claude's chattiness to match your workflow. Available via slash commands (`/agent-vibes:verbosity`) and MCP tools, with automatic protocol injection and real-time marker detection.

---

## ✨ New Features

### 🎙️ Verbosity Control System (Issue #32)

**Three intelligent verbosity levels:**

**🔇 LOW (Minimal)** - Default behavior
- Speaks only acknowledgments (task start) and completions (task end)
- Quiet, focused work sessions
- No intermediate reasoning spoken

**🤔 MEDIUM (Balanced)**
- Acknowledgments + completions
- Major decisions: "I'll use grep to search"
- Key findings: "Found 12 instances at line 1323"
- Perfect for understanding major decisions without full narration

**💭 HIGH (Maximum Transparency)**
- All reasoning: "Let me search for all instances"
- All decisions: "I'll use grep for this"
- All findings: "Found it at line 1323"
- Perfect for learning mode, debugging, full transparency

**How it works:**
1. User sets verbosity level via slash command or MCP
2. Session-start hook injects verbosity-aware protocol
3. Claude uses emoji markers naturally in text (💭 🤔 ✓)
4. Output hook auto-detects markers and triggers TTS
5. No manual Bash TTS calls needed - all automatic!

**New Files:**
- `.claude/hooks/verbosity-manager.sh` (172 lines) - Get/set verbosity level
- `.claude/hooks/user-prompt-output.sh` (111 lines) - Auto-detect emoji markers
- `.claude/commands/agent-vibes/verbosity.md` (89 lines) - Slash command docs

**Modified Files:**
- `.claude/hooks/session-start-tts.sh` (+69 lines) - Inject verbosity protocol
- `mcp-server/server.py` (+70 lines) - Add MCP tools
- `README.md` (+47 lines) - Document verbosity feature

**User Controls:**

Slash Command:
```bash
/agent-vibes:verbosity           # Show current level
/agent-vibes:verbosity high      # Maximum transparency
/agent-vibes:verbosity medium    # Balanced
/agent-vibes:verbosity low       # Minimal
```

MCP Tools:
```python
mcp__agentvibes__get_verbosity()
mcp__agentvibes__set_verbosity(level="high")
```

---

## 📊 Statistics

- **Commits:** 2
- **Files Changed:** 7
- **Lines Added:** 558
- **Lines Removed:** 2
- **Net Change:** +556 lines

**Files Modified:**
- `.claude/commands/agent-vibes/verbosity.md` (+89 lines)
- `.claude/hooks/session-start-tts.sh` (+69 lines)
- `.claude/hooks/user-prompt-output.sh` (+111 lines)
- `.claude/hooks/verbosity-manager.sh` (+172 lines)
- `README.md` (+47 lines)
- `mcp-server/server.py` (+70 lines)
- `package.json` (version bump)

---

## 🎯 User Impact

### Who Benefits?

**Developers who want quiet focus:**
- Set verbosity to LOW for minimal interruption
- Only hear task start/end confirmations
- Perfect for deep concentration work

**Users learning Claude Code:**
- Set verbosity to HIGH for full transparency
- Hear Claude's complete thought process
- Understand how AI reasons through problems

**Power users who want balance:**
- Set verbosity to MEDIUM for key insights
- Hear major decisions and findings
- Stay informed without overwhelming narration

### Migration Notes

**No breaking changes!**
- Default verbosity is LOW (current behavior)
- Existing installations continue working as before
- Opt-in feature - activate when ready

**To enable:**
```bash
/agent-vibes:verbosity high
# Then restart Claude Code session
```

---

## 🔧 Technical Details

### Architecture

**Emoji Marker System:**
- 💭 = Reasoning/thinking (HIGH only)
- 🤔 = Decisions (MEDIUM + HIGH)
- ✓ = Findings/results (MEDIUM + HIGH)

**Output Hook Processing:**
- Intercepts Claude's text output
- Regex pattern matching for emoji markers
- Async TTS trigger (non-blocking)
- Verbosity-aware filtering

**Protocol Injection:**
- Session-start hook reads verbosity level
- Injects appropriate instructions for Claude
- Different markers for each verbosity level
- Automatic, transparent to user

### Testing Performed

✅ All three verbosity levels tested
✅ Session-start hook protocol injection verified
✅ MCP tools functional (get/set operations)
✅ Verbosity manager script validation
✅ Emoji marker auto-detection working
✅ Documentation complete

---

## 🚀 Installation

### New Installations
```bash
npx agentvibes@latest
```

### Existing Installations
```bash
npx agentvibes update
```

### Beta Testing
```bash
npx agentvibes@beta  # v2.5.0-beta.1 was available for testing
```

---

## 📚 Documentation

**Updated:**
- `README.md` - New Verbosity Control section in Table of Contents
- `.claude/commands/agent-vibes/verbosity.md` - Complete slash command guide
- `mcp-server/server.py` - MCP tool documentation

**New Sections:**
- Verbosity Control in Key Features
- Three-level system explanation
- Usage examples for each level
- MCP integration guide

---

## 🙏 Credits

**Implementation:** Paul Preibisch ([@997Fire](https://x.com/997Fire))
**Co-authored by:** Claude AI
**Issue:** [#32](https://github.com/paulpreibisch/AgentVibes/issues/32)
**Beta Release:** v2.5.0-beta.1 (Nov 16, 2025)

---

## 🔗 Links

- **NPM Package:** https://www.npmjs.com/package/agentvibes
- **GitHub Repository:** https://github.com/paulpreibisch/AgentVibes
- **Issue #32:** https://github.com/paulpreibisch/AgentVibes/issues/32
- **Documentation:** https://agentvibes.org

---

## Example: HIGH Verbosity in Action

```
User: "Find all TODO comments in the codebase"

[TTS: "I'll search through the codebase"]
💭 Let me use the Grep tool to search for TODO comments
🤔 I'll search all files with pattern "TODO"
[Grep runs...]
✓ Found 12 TODO comments across 5 files
💭 Let me organize these by file
[TTS: "Found 12 TODO comments in 5 files"]
```

**What gets spoken automatically:**
1. "Let me use the Grep tool to search for TODO comments"
2. "I'll search all files with pattern TODO"
3. "Found 12 TODO comments across 5 files"
4. "Let me organize these by file"

**No manual Bash TTS calls needed** - emoji markers trigger everything automatically! 🎉

---

**Full Changelog:** https://github.com/paulpreibisch/AgentVibes/compare/v2.4.3...v2.5.0

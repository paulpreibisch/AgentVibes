# BMAD Plugin (Full Documentation)

**Automatically switch voices when using BMAD agents!**

The BMAD plugin detects when you activate a BMAD agent (e.g., `/BMad:agents:pm`) and automatically uses the assigned voice for that role.

## Default BMAD Voice Mappings

| Agent | Role | Voice | Personality |
|-------|------|-------|-------------|
| **pm** | Product Manager | Jessica Anne Bogart | professional |
| **dev** | Developer | Matthew Schmitz | normal |
| **qa** | QA Engineer | Burt Reynolds | professional |
| **architect** | Architect | Michael | normal |
| **po** | Product Owner | Tiffany | professional |
| **analyst** | Analyst | Ralf Eisend | normal |
| **sm** | Scrum Master | Ms. Walker | professional |
| **ux-expert** | UX Expert | Aria | normal |
| **bmad-master** | BMAD Master | Archer | zen |
| **bmad-orchestrator** | Orchestrator | Tom | professional |

## Plugin Management

```bash
# Check status (auto-enables if BMAD detected)
/agent-vibes-bmad status

# Disable plugin
/agent-vibes-bmad disable

# Re-enable plugin
/agent-vibes-bmad enable

# Customize agent voice
/agent-vibes-bmad set pm "Aria" zen

# Edit configuration
/agent-vibes-bmad edit
```

## 🔄 BMAD Version Support

AgentVibes automatically detects and supports both BMAD v4 and v6-alpha:

- **v4 (Legacy)**: Uses `.bmad-core/` directory structure
- **v6-alpha (Current)**: Uses unified `bmad/` directory structure

The plugin automatically detects which version you have installed and configures paths accordingly. **No manual configuration needed!**

### How Detection Works

1. Checks for `bmad/_cfg/manifest.yaml` (v6)
2. Falls back to `.bmad-core/install-manifest.yaml` (v4)
3. Resolves configuration paths based on detected version

### Upgrading from v4 to v6

If you upgrade BMAD from v4 to v6-alpha:

1. Reinstall AgentVibes: `npx agentvibes update --yes`
2. AgentVibes will auto-detect the new v6 structure
3. All voice mappings will continue working

**No manual intervention required!**

For detailed version support information, see [BMAD v6 Support Documentation](bmad-v6-support.md).

## How It Works

1. **Auto-Detection**: Plugin checks for BMAD installation (both v4 and v6)
2. **Auto-Enable**: Enables automatically when BMAD is detected
3. **Settings Preservation**: Saves your previous voice/personality when enabling
4. **Restore on Disable**: Restores previous settings when disabling

## 🌍 Language Support with BMAD

When you set a language, AgentVibes intelligently selects the best voice:

**Language Priority System:**
1. **BMAD Agent Active** + **Language Set**: Uses multilingual version of agent's assigned voice
   - If agent's voice doesn't support the language → switches to Antoni/Rachel/Domi/Bella (multilingual)
2. **BMAD Agent Active** + **No Language Set**: Uses agent's assigned voice (default English)
3. **No BMAD Agent** + **Language Set**: Uses current voice if multilingual, otherwise switches to Antoni
4. **No BMAD Agent** + **No Language Set**: Uses current voice/personality normally

**Example Workflow:**
```bash
# Set language to Spanish
/agent-vibes:set-language spanish

# Activate BMAD PM agent
/BMad:agents:pm
# → Will try to use Jessica Anne Bogart for Spanish
# → If not multilingual, falls back to Antoni (Spanish-optimized)

# All TTS will speak in Spanish with appropriate voice
```

**Supported Languages:**
- Spanish, French, German, Italian, Portuguese, Chinese, Japanese, Korean, Polish, Dutch, Turkish, Russian, and 20+ more

**Multilingual Fallback Voices:**
- **Antoni** - Best for Spanish
- **Rachel** - Best for French
- **Domi** - Best for German
- **Bella** - Best for Italian
- **Charlotte** - European languages
- **Matilda** - Latin languages

---

[↑ Back to Main README](../README.md)

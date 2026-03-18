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

## 🔊 TTS Injection: How BMAD Agents Get Their Voice

When you install BMAD with AgentVibes enabled, the installer adds voice instructions to each agent file. This is called **TTS Injection** - a loosely-coupled system where BMAD contains placeholder markers that AgentVibes (or any TTS provider) can replace with speaking instructions.

### How TTS Injection Works

BMAD agent files contain **injection point markers** - special comments that tell installers where TTS instructions should go:

#### Before Installation (BMAD Source)

```xml
<rules>
  <r>ALWAYS communicate in {communication_language}...</r>
  <!-- TTS_INJECTION:agent-tts -->
  <r>Stay in character until exit selected</r>
</rules>
```

The `<!-- TTS_INJECTION:agent-tts -->` marker tells the installer: "Replace me with TTS instructions!"

#### After Installation (with AgentVibes enabled)

```xml
<rules>
  <r>ALWAYS communicate in {communication_language}...</r>
  - When responding to user messages, speak your responses using TTS:
      Call: `.claude/hooks/bmad-speak.sh '{agent-id}' '{response-text}'`
      Where {agent-id} is your agent type (pm, architect, dev, etc.)

  - Auto Voice Switching: AgentVibes automatically switches to the voice
      assigned for your agent role when activated

  - Speak naturally as your character. Your assigned voice and personality
      will be used automatically.
  <r>Stay in character until exit selected</r>
</rules>
```

#### After Installation (with AgentVibes disabled)

If TTS is disabled, the marker is simply stripped clean:

```xml
<rules>
  <r>ALWAYS communicate in {communication_language}...</r>
  <r>Stay in character until exit selected</r>
</rules>
```

### How Other TTS Providers Can Integrate

The injection point system is **provider-agnostic**. Any TTS tool can create their own installer that replaces these markers. For example:

```xml
<!-- TTS_INJECTION:agent-tts -->
```

Could become (for a different TTS provider):

```xml
- When responding, use OtherTTS to speak:
    Call: `other-tts-command '{agent-id}' '{message}'`
```

This keeps BMAD source files clean while allowing any voice system to integrate seamlessly!

### Existing BMAD Installations

Already have BMAD installed? Use the **BMAD TTS Injector** to add voice support:

```bash
# Check current status
.claude/hooks/bmad-tts-injector.sh status

# Enable TTS for BMAD agents
.claude/hooks/bmad-tts-injector.sh enable

# Disable TTS (restores original files from backup)
.claude/hooks/bmad-tts-injector.sh disable
```

**Safety Features:**
- Creates timestamped backups before any modifications
- Verifies file integrity after processing
- Can restore original files at any time

**Backup Location:** `~/.agentvibes/backups/agents/`

---

[↑ Back to Main README](../README.md)

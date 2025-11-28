# Release v2.14.0 - Auto-Translation for BMAD and Language Learning Mode

**Release Date:** 2025-11-28
**Type:** Minor Release (New Features)

## AI Summary

AgentVibes v2.14.0 introduces automatic translation for TTS output (Issues #50 and #51). When AgentVibes speaks acknowledgments like "Starting the build" or completions like "All tests passed!", this text is normally in English. Now, BMAD users who set `communication_language: Spanish` in `.bmad/core/config.yaml` will hear these spoken messages automatically translated to Spanish - matching their project's communication preference. This version also updates our Language Learning Mode feature to utilize Google Deep Translate, reducing token usage (Claude no longer needs to do the translation! Google now does it for free!).

**Key Highlights:**
- 🌐 **BMAD Multi-Language TTS** - Auto-detect `communication_language` from BMAD config and translate TTS
- 🎓 **Learning Mode Auto-Translation** - Hear English + auto-translated target language (no manual translation!)
- 🔄 **Translation Manager** - New `/agent-vibes:translate` command for manual control
- 🐍 **translator.py** - Core translation engine using deep-translator (Google Translate)
- ✅ **140 Tests Passing** - 18 new translation tests + all existing tests

---

## New Features

### BMAD Multi-Language TTS (Issue #50)
**Files:** `.claude/hooks/translate-manager.sh`, `.claude/hooks/translator.py`, `.claude/hooks/play-tts.sh`

BMAD users can now have TTS automatically translated based on their communication language preference:

```yaml
# .bmad/core/config.yaml
communication_language: Spanish
```

```bash
# Enable auto-detection from BMAD config
/agent-vibes:translate auto

# All TTS is now automatically translated to Spanish!
```

**Priority Cascade:**
1. Manual override (`/agent-vibes:translate set spanish`)
2. BMAD config (`communication_language` in `.bmad/core/config.yaml`)
3. Default (no translation - English)

### Learning Mode Auto-Translation (Issue #51)
**Files:** `.claude/hooks/play-tts.sh`, `.claude/hooks/learn-manager.sh`

Language Learning Mode now automatically translates TTS to your target language:

```bash
# Set up learning mode
/agent-vibes:target spanish
/agent-vibes:learn

# Now when Claude speaks:
# 1st: "Starting the build" (English)
# 2nd: "Iniciando la compilación" (Spanish - AUTO-TRANSLATED!)
```

**Before v2.14.0:** Claude had to manually translate each message
**After v2.14.0:** AgentVibes auto-translates using Google Translate - zero effort!

### New Translation Commands
**File:** `.claude/commands/agent-vibes/translate.md`

| Command | Description |
|---------|-------------|
| `/agent-vibes:translate` | Show current translation settings |
| `/agent-vibes:translate set <lang>` | Set translation language (e.g., `spanish`) |
| `/agent-vibes:translate auto` | Use BMAD `communication_language` setting |
| `/agent-vibes:translate off` | Disable translation (speak English) |
| `/agent-vibes:translate status` | Show detailed translation status |

### translator.py - Core Translation Engine
**File:** `.claude/hooks/translator.py`

New Python translation engine using deep-translator:
- Uses Google Translate (free, no API key required)
- Supports 25+ languages
- Language detection with langdetect
- CLI and library mode support

```bash
# CLI usage
python3 translator.py "Hello world" spanish
# Output: Hola mundo

# Language detection
python3 translator.py detect "Bonjour le monde"
# Output: fr
```

---

## Files Added

| File | Description |
|------|-------------|
| `.claude/hooks/translator.py` | Core translation engine (237 lines) |
| `.claude/hooks/translate-manager.sh` | Translation settings management (341 lines) |
| `.claude/hooks/requirements.txt` | pip dependencies (deep-translator, langdetect) |
| `.claude/commands/agent-vibes/translate.md` | Slash command documentation |
| `test/unit/translator.bats` | 18 comprehensive tests |

## Files Modified

| File | Changes |
|------|---------|
| `.claude/hooks/play-tts.sh` | Added translation/learning mode integration (+139 lines) |
| `.claude/hooks/learn-manager.sh` | Added source guards for function sharing |
| `docs/language-learning-mode.md` | Added auto-translation docs, translation mode section |

---

## Changes Summary

**Commits:** 4
- feat: Add auto-translation for BMAD and Language Learning Mode
- docs: Update README with v2.13.9 release notes
- fix: Add initial value to reduce() call for reliability

**Files Changed:** 10
**Lines Added:** 1,100
**Lines Removed:** 21

**Test Results:** 140/140 passing (128 bats + 12 node)

---

## Supported Languages

Spanish, French, German, Italian, Portuguese, Chinese, Japanese, Korean, Russian, Polish, Dutch, Turkish, Arabic, Hindi, Swedish, Danish, Norwegian, Finnish, Czech, Romanian, Ukrainian, Greek, Bulgarian, Croatian, Slovak

---

## Migration Notes

**No migration required** - This is a minor release with new features.

**New Dependencies:**
- `deep-translator>=1.11.4` (pip)
- `langdetect>=1.0.9` (pip)

Install with:
```bash
pip install deep-translator langdetect
```

**Compatibility:** 100% backward compatible with v2.13.9

**Recommended Action:** Update to get auto-translation features
```bash
npx agentvibes@latest update
```

---

## References

- GitHub Issue #50: BMAD Multi-Language TTS
- GitHub Issue #51: Auto-translate in Language Learning Mode
- deep-translator: https://github.com/nidhaloff/deep-translator

---

# Release v2.13.9 - Provider-Aware Voice Migration

**Release Date:** 2025-11-27
**Type:** Patch Release (Bug Fix & Enhancement)

## AI Summary

AgentVibes v2.13.9 fixes a critical issue where BMAD voice mappings were not provider-aware, causing "Voice model not found" errors when switching between ElevenLabs and Piper TTS providers. The release introduces intelligent voice migration that automatically maps voices when switching providers (e.g., "Amy" → "en_US-amy-medium"), ensuring seamless provider switching without manual reconfiguration.

**Key Highlights:**
- Smart Voice Migration - Automatic voice mapping when switching TTS providers
- Provider-Aware Docs - BMAD documentation now shows both ElevenLabs and Piper columns
- Valid Piper Names - Fixed incomplete Piper voice names (kristin → en_US-kristin-medium)
- Preserve Voice Names - Internal spaces in voice names no longer stripped
- 122 Tests Passing - All functionality verified (110 bats + 12 node tests)

---

[Previous release notes continue below...]

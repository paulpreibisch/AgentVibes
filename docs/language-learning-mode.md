# 📚 Language Learning Mode

**Learn a second language naturally while you program!** 🌍

AgentVibes' Language Learning Mode is a **breakthrough feature** that helps programmers learn new languages through **context and repetition**. Every task acknowledgment and completion is spoken **twice** - first in your native language (English), then in your target language (e.g., Spanish).

## 🎯 Why This Is Revolutionary

**The Problem:** Traditional language learning apps are disconnected from your daily workflow. You have to stop coding, open Duolingo, and study separately.

**The Solution:** With AgentVibes, you learn **while you code**. Every git commit, every build command, every test run - you hear it in English, then immediately in Spanish. Natural, contextual, effortless learning.

## ✨ How It Works

1. **Set your target language** - Choose from 30+ languages (Spanish, French, German, etc.)
2. **Enable learning mode** - One simple command
3. **Code normally** - AgentVibes handles the rest
4. **Automatic translation** - **NEW!** AgentVibes auto-translates TTS to your target language using Google Translate
5. **Hear everything twice** - English first, then your target language (auto-translated!)
6. **Adjust speed** - Slow down target language for better comprehension

> **New in v2.14!** Auto-translation means Claude doesn't need to manually translate messages. AgentVibes automatically translates any English TTS text to your target language using deep-translator (Google Translate). Zero extra effort from Claude, zero extra prompting from you!

## 🚀 Quick Start (Learn Spanish Example)

```bash
# Step 1: Set Spanish as your target language
/agent-vibes:target spanish

# Step 2: Enable learning mode
/agent-vibes:learn

# Step 3: Code normally!
# Every acknowledgment plays twice:
#   1st: "Starting the build" (English)
#   2nd: "Iniciando la compilación" (Spanish)

# Optional: Slow down Spanish for learning
/agent-vibes:set-speed target 2x    # 2x slower Spanish
```

## 📖 Example Learning Session

```
User: "Run the tests"

Claude (English): "Running your test suite now!"
🔊 Plays in English (Aria voice)

Claude (Spanish): "¡Ejecutando tu suite de pruebas ahora!"
🔊 Plays in Spanish (Antoni voice, 2x slower if configured)

User: "Fix the bug"

Claude (English): "I'll track down that bug for you!"
🔊 Plays in English

Claude (Spanish): "¡Voy a rastrear ese error para ti!"
🔊 Plays in Spanish
```

## 🎓 Why This Works for Learning

1. **Context-based learning** - Hear programming terms in real situations
2. **Spaced repetition** - Natural exposure throughout your coding day
3. **Native pronunciation** - AI voices model perfect accent
4. **Adjustable pace** - Slow down difficult phrases
5. **Consistent exposure** - Build vocabulary passively while working
6. **Zero extra effort** - Learning happens automatically

## 🌍 Supported Target Languages

Spanish, French, German, Italian, Portuguese, Chinese, Japanese, Korean, Russian, Arabic, Hindi, Polish, Dutch, Turkish, Swedish, Danish, Norwegian, Finnish, Czech, Romanian, Ukrainian, Greek, Bulgarian, Croatian, Slovak, and more!

## 🎚️ Advanced Features

**Speech Rate Control:**
```bash
# Slow down target language for better comprehension
/agent-vibes:set-speed target 2x    # 2x slower
/agent-vibes:set-speed target 3x    # 3x slower (best for beginners)
/agent-vibes:set-speed normal       # Reset to normal speed
```

**Mixed Provider Support:**
- Use **ElevenLabs** for English (premium quality)
- Use **Piper TTS** for Spanish (free, adjustable speed)
- System auto-detects provider from voice name

**Auto-Voice Selection:**
- System picks the best voice for your target language
- Provider-aware (ElevenLabs voices for ElevenLabs, Piper voices for Piper)
- Smart fallback if preferred voice unavailable

## 📝 All Language Learning Commands

| Command | Description |
|---------|-------------|
| `/agent-vibes:target <language>` | Set target language to learn (e.g., `spanish`) |
| `/agent-vibes:target-voice <voice>` | Set voice for target language |
| `/agent-vibes:learn` | Enable/disable learning mode |
| `/agent-vibes:language <language>` | Set your native/main language |
| `/agent-vibes:set-speed target <speed>` | Adjust target language speed |
| `/agent-vibes:set-speed get` | Show current speed settings |
| `/agent-vibes:replay-target` | Replay last target language audio |

## 🌐 Translation Mode (Single Language)

Not doing language learning, but want TTS in a different language? Use **Translation Mode** to speak ONLY in your preferred language:

```bash
# Set Spanish as your TTS language (no English, just Spanish)
/agent-vibes:translate set spanish

# Or use BMAD's communication_language setting (auto-detected)
/agent-vibes:translate auto

# Disable translation (speak English)
/agent-vibes:translate off

# Check current settings
/agent-vibes:translate status
```

**Translation Mode vs Learning Mode:**
| Feature | Translation Mode | Learning Mode |
|---------|-----------------|---------------|
| **Use Case** | Native speaker of target language | Learning a new language |
| **Output** | Single language only | Both languages sequentially |
| **Command** | `/agent-vibes:translate set <lang>` | `/agent-vibes:learn` |
| **BMAD Integration** | Auto-detects from config.yaml | Manual configuration |

### BMAD Integration

If you use BMAD and have `communication_language` set in your config:

```yaml
# .bmad/core/config.yaml
communication_language: Spanish
document_output_language: Spanish
```

AgentVibes will automatically detect this and translate TTS to Spanish when you run:
```bash
/agent-vibes:translate auto
```

## 💡 Pro Tips

1. **Start with 2x slower** - Give yourself time to process
2. **Use Piper TTS for free** - Unlimited practice with no API costs
3. **Learn during routine tasks** - Git commits, builds, tests
4. **Gradually increase speed** - As you improve, speed up the playback
5. **Combine with personalities** - Learn sarcasm in Spanish! 😄

## 🎯 Real-World Use Case

**Before AgentVibes Learning Mode:**
- Study Spanish on Duolingo for 30 minutes
- Context: Random sentences like "The apple is red"
- Total daily practice: 30 minutes

**With AgentVibes Learning Mode:**
- Code for 8 hours with learning mode enabled
- Context: Real programming tasks you're actually doing
- Total daily practice: Hundreds of contextual phrases
- **Result:** Learn programming vocabulary in Spanish naturally!

---

**[← Back to Main README](../README.md)**

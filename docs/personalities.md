# Personalities vs Sentiments

## 🎪 Personalities (Voice + Style)

**Personalities change BOTH voice AND how Claude talks.** Each has a dedicated Piper TTS voice:

| Personality | Voice | Style |
|------------|-------|-------|
| **sarcastic** | Jessica Anne Bogart | Dry wit and cutting observations |
| **flirty** | Jessica Anne Bogart | Playful charm and compliments |
| **pirate** | Pirate Marshal | Seafaring swagger - "Arr matey!" |
| **grandpa** | Grandpa Spuds Oxley | Rambling nostalgic stories |
| **dry-humor** | Aria | British wit and deadpan delivery |
| **angry** | Demon Monster | Frustrated and loud |
| **robot** | Dr. Von Fusion | Mechanical and precise |
| **zen** | Aria | Peaceful and mindful |
| **professional** | Matthew Schmitz | Formal and corporate |

**All 19 personalities:** sarcastic, flirty, pirate, grandpa, dry-humor, angry, robot, zen, professional, dramatic, millennial, surfer-dude, sassy, poetic, moody, funny, annoying, crass, normal, random

```bash
/agent-vibes:personality sarcastic
/agent-vibes:personality pirate
/agent-vibes:personality list
```

## 💭 Sentiments (Style Only)

**Sentiments apply personality styles to YOUR current voice:**

```bash
# Use YOUR voice with sarcastic attitude
/agent-vibes:sentiment sarcastic

# Clear sentiment
/agent-vibes:sentiment clear
```

**Key Difference:**
- **Personality** = Changes voice + style (e.g., Pirate Marshal + pirate speak)
- **Sentiment** = Keeps your voice + adds style (e.g., Your Voice + sarcasm)

## 🎤 Combine Voice + Sentiment

```bash
# Switch to Aria with sarcastic sentiment
/agent-vibes:switch Aria --sentiment sarcastic
```

---

[↑ Back to Main README](../README.md)

---
description: Switch to a different ElevenLabs TTS voice
argument-hint: [voice_name_or_number]
---

# Voice Selection

If no arguments provided, display this list:

## 🎤 Available ElevenLabs Voices

1. **Amy** - Young and friendly
2. **Aria** - Clear professional
3. **Cowboy Bob** - Western charm
4. **Demon Monster** - Deep and spooky
5. **Dr. Von Fusion** - Eccentric scientist
6. **Drill Sergeant** - Military authority
7. **Grandpa Spuds Oxley** - Wise elder
8. **Jessica Anne Bogart** - Wickedly eloquent
9. **Lutz Laugh** - Jovial and giggly
10. **Matthew Schmitz** - Deep baritone
11. **Michael** - British urban
12. **Ms. Walker** - Warm teacher
13. **Northern Terry** - Eccentric British
14. **Ralf Eisend** - International speaker

Then check current voice with: !bash .claude/hooks/voice-manager.sh get

And inform user: "To switch voices, use `/agent-vibes:switch <number>` or `/agent-vibes:switch <name>`"

If arguments ARE provided, execute: !bash .claude/hooks/voice-manager.sh switch $ARGUMENTS

---
description: Switch to a different TTS voice (provider-aware)
argument-hint: [voice_name_or_number] [--sentiment personality_name]
---

# Voice Selection

## Step 1: Detect Active Provider

First, check which TTS provider is active by running:

```bash
!bash .claude/hooks/voice-manager.sh whoami
```

This will show the current provider (Piper TTS or Piper) and current voice.

## Step 2: Display Voice List Based on Provider

### If Provider is Piper TTS:

Show this list:

## 🎤 Available Piper TTS Voices

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

### If Provider is Piper:

Run this command to list Piper voices:

```bash
!bash .claude/hooks/voice-manager.sh list
```

This will show all downloaded Piper voices including multi-speaker voices.

## Step 3: Voice Switching

If user provides a voice name or number:

1. Parse arguments for --sentiment flag
2. If --sentiment is present:
   - Extract voice name/number (everything before --sentiment)
   - Extract sentiment name (after --sentiment)
   - Execute: !bash .claude/hooks/voice-manager.sh switch <voice>
   - Then execute: !bash .claude/hooks/sentiment-manager.sh set <sentiment>
3. If no --sentiment flag:
   - Execute: !bash .claude/hooks/voice-manager.sh switch $ARGUMENTS

If no arguments provided:
- Show the voice list based on active provider (as described in Step 2)
- Inform user: "To switch voices, use `/agent-vibes:switch <number>` or `/agent-vibes:switch <name>`"

## Examples

```bash
# Switch voice only
/agent-vibes:switch Jessica Anne Bogart  # Piper TTS
/agent-vibes:switch en_US-lessac-medium  # Piper

# Switch voice by number
/agent-vibes:switch 5

# Switch voice and set sentiment
/agent-vibes:switch Aria --sentiment sarcastic
/agent-vibes:switch 5 --sentiment flirty
```

## Important Notes

- The voice list MUST match the active provider (don't show Piper TTS voices when Piper is active!)
- Always check whoami first to determine which provider is active
- For Piper, use `voice-manager.sh list` to get the actual downloaded voices

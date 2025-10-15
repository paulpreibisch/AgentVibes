---
description: Set the language you want to learn
---

Set the target language you want to learn. When learning mode is enabled, TTS will speak in your main language FIRST, then speak the translation in your target language.

Usage:
```
/agent-vibes:target spanish
/agent-vibes:target french
/agent-vibes:target german
```

Recommended voices by target language:
- Spanish → Antoni (ElevenLabs) / es_ES-davefx-medium (Piper)
- French → Rachel (ElevenLabs) / fr_FR-siwis-medium (Piper)
- German → Domi (ElevenLabs) / de_DE-thorsten-medium (Piper)
- Italian → Bella (ElevenLabs) / it_IT-riccardo-x_low (Piper)
- Portuguese → Matilda (ElevenLabs) / pt_BR-faber-medium (Piper)
- Chinese → Amy (ElevenLabs) / zh_CN-huayan-medium (Piper)
- Japanese → Antoni (ElevenLabs) / ja_JP-hikari-medium (Piper)
- Other languages → Antoni (ElevenLabs) / check available Piper voices

**Note:** The system will automatically suggest the correct voice based on your active TTS provider. After setting your target language, the suggestion will match whether you're using ElevenLabs or Piper.

After setting your target language:
1. Set the voice for target language with `/agent-vibes:target-voice <voice>`
2. Enable learning mode with `/agent-vibes:learn`

Supported languages: spanish, french, german, italian, portuguese, chinese, japanese, korean, hindi, arabic, polish, dutch, turkish, swedish, russian, and 15+ more.

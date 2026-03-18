---
description: Launch the AgentVibes audio browser - browse, preview, and install TTS voices. Automatically switches AgentVibes to the selected voice after you close the browser.
---

Launch the AgentVibes Voice Browser. After the user selects a voice, you (the agent) will automatically switch AgentVibes to that voice.

## Step 1 — Open the Voice Browser

```bash
node bin/agentvibes-voice-browser.js
```

Wait for the user to browse, preview voices (Space), and install one (I). The browser will save the selection to `~/.agentvibes/config.json`.

## Step 2 — After the Browser Closes, Read the Selected Voice

```bash
cat ~/.agentvibes/config.json 2>/dev/null || echo "{}"
```

Look at the `defaultVoice` field and `ttsProvider` field in the output.

## Step 3 — Switch AgentVibes to the Selected Voice

Based on what was installed, run the appropriate command:

**Piper curated voice** (e.g., `en_US-amy-medium`, `ryan`, `bryce`):
```bash
bash .claude/hooks/voice-manager.sh switch <defaultVoice>
```

**LibriTTS multi-speaker voice** (e.g., `libritts-speaker-42`):
1. Extract the speaker ID from the voice name (the number after `libritts-speaker-`)
2. Download the model if needed:
```bash
bash .claude/hooks/piper-voice-manager.sh download en_US-libritts-high
```
3. Register the speaker in `.claude/hooks/piper-multispeaker-registry.sh` by adding an entry to `MULTISPEAKER_VOICES`:
```
"Speaker_<ID>:en_US-libritts-high:<ID>:LibriTTS Speaker"
```
4. Switch to it:
```bash
bash .claude/hooks/voice-manager.sh switch Speaker_<ID>
```

**macOS voice** (provider = `macos`):
```bash
bash .claude/hooks/voice-manager.sh switch <defaultVoice>
```
(Ensure piper provider is not active — switch provider to `macos` first if needed)

**Windows SAPI voice** (provider = `windows-sapi`):
```bash
bash .claude/hooks/voice-manager.sh switch <defaultVoice>
```

## Key Bindings in the Browser

| Key | Action |
|-----|--------|
| `Space` | Preview voice |
| `I` | Install voice as AgentVibes default |
| `P` | Show copy-paste prompt for this voice |
| `L` | Filter by provider |
| `F` | Show favorites only |
| `/` | Search voices |
| `1-6` | Sort by column |
| `T` | Switch to Background Music tab |
| `Q` | Quit |

## Notes

- The browser auto-saves selections to `~/.agentvibes/config.json`
- LibriTTS voices require the `en_US-libritts-high.onnx` model (~57MB, downloaded on first use)
- Press `P` on any voice for ready-to-use copy-paste commands
- After switching, you can verify with `/agent-vibes:whoami`

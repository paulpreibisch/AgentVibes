---
name: AgentVibes GrokBot TTS setup
description: >-
  Use when installing AgentVibes TTS + Kokoro on Windows for a GrokBot fleet,
  or when each bot needs a unique spoken Kokoro voice and -llm identity.
---

# Install AgentVibes + Kokoro for a GrokBot fleet

## Goal

Install AgentVibes and Kokoro on the user's Windows machine, set Kokoro as the TTS provider, and give each GrokBot a unique `-llm` identity, Kokoro voice, and spoken name so speech plays on local speakers.

## Prerequisites

- Windows machine available via Shell (Node.js + Python 3)
- Permission to install npm/pip packages on that machine

## Steps

### 1. Install AgentVibes

```powershell
npx agentvibes install
```

Open the TUI anytime with:

```powershell
npx agentvibes
```

### 2. Install Kokoro

```powershell
pip install kokoro soundfile numpy
```

If `pip` is missing:

```powershell
python -m pip install kokoro soundfile numpy
```

### 3. Set provider to Kokoro

Prefer the AgentVibes TUI provider picker. On Windows you can also run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "$env:USERPROFILE\.claude\hooks-windows\provider-manager.ps1" set kokoro
```

(If AgentVibes installed under a project `.claude` folder, use that `hooks-windows` path instead.)

### 4. Verify speech

Play a short test line via `play-tts.ps1` (under AgentVibes `.claude\hooks-windows`) and confirm audio on the local speakers.

### 5. Assign fleet voices

For each GrokBot, add one row to `audio-effects.cfg`:

```text
llm:<key>|light||0.20|<kokoro_voice>|<Spoken Name> GrokBot|kokoro
```

Rules:

- One unique Kokoro voice per bot (no reuse)
- Spoken pretext must identify the bot (e.g. `Chief of Staff GrokBot`)
- Mirror rows into both project and user `.claude\config\audio-effects.cfg` when both exist
- Update `%USERPROFILE%\.grokbot\agentvibes-tts.md` if that cheat sheet exists

Example voices: `am_michael`, `am_adam`, `bm_george`, `af_bella`, `af_nicole`, `af_sarah`, `bm_lewis`.

### 6. Teach each bot to speak

Each bot should call:

```powershell
& "<AgentVibes>\.claude\hooks-windows\play-tts.ps1" -Text "Short update." -llm "<their-key>"
```

Keep spoken lines short; the pretext carries identity.

### 7. Prove it

Play one short test line per bot with its `-llm` key so the user can hear the voice differences. Report the roster table (bot → key → voice → spoken name).

## Do not

- Publish website/blog content unless asked
- Reuse Kokoro voices across bots
- Rely on MCP for local speaker playback (GrokBot MCP runs off-machine)

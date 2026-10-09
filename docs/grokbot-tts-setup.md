# GrokBot TTS setup (Windows + Kokoro)

Use AgentVibes with **Kokoro** on Windows so each Cursor **GrokBot** speaks on local speakers with its own voice and spoken name.

## Goal

Install AgentVibes and Kokoro on Windows, set Kokoro as the TTS provider, and give every GrokBot a unique `-llm` identity, Kokoro voice, and spoken pretext.

For an agent-run checklist, use the skill:

[`.agents/skills/agentvibes-grokbot-tts-setup/SKILL.md`](../.agents/skills/agentvibes-grokbot-tts-setup/SKILL.md)

## Install AgentVibes

Requires **Node.js**.

```powershell
npx agentvibes install
```

Open the TUI anytime:

```powershell
npx agentvibes
```

## Install Kokoro

Requires **Python 3**.

```powershell
pip install kokoro soundfile numpy
```

If `pip` is not on PATH:

```powershell
python -m pip install kokoro soundfile numpy
```

## Set provider to Kokoro

Prefer the AgentVibes TUI provider picker. On Windows you can also run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "$env:USERPROFILE\.claude\hooks-windows\provider-manager.ps1" set kokoro
```

If AgentVibes is installed under a project `.claude` folder, use that project's `hooks-windows\provider-manager.ps1` path instead.

## Play speech with `-llm`

Each GrokBot should call `play-tts.ps1` with its own `-llm` key:

```powershell
& "<AgentVibes>\.claude\hooks-windows\play-tts.ps1" -Text "Short update." -llm "<their-key>"
```

Keep spoken lines short. The spoken pretext (from config) carries the bot identity.

Verify with one short test line and confirm audio on the local speakers.

## `audio-effects.cfg` row format

Add one row per bot (engine `kokoro`):

```text
llm:<key>|light||0.20|<kokoro_voice>|<Spoken Name> GrokBot|kokoro
```

Rules:

- One unique Kokoro voice per bot (do not reuse voices)
- Spoken pretext must identify the bot (for example `Chief of Staff GrokBot`)
- Mirror rows into both project and user `.claude\config\audio-effects.cfg` when both exist

Example voices: `am_michael`, `am_adam`, `bm_george`, `af_bella`, `af_nicole`, `af_sarah`, `bm_lewis`.

## Pasteable GrokBot prompt

```
Run the AgentVibes GrokBot TTS setup skill on my Windows PC (or follow these steps):

1) Install Agent Vibes (Node.js):
   npx agentvibes install
   Then: npx agentvibes

2) Install Kokoro (Python 3):
   pip install kokoro soundfile numpy
   (or: python -m pip install kokoro soundfile numpy)

3) Set the TTS provider to Kokoro (Agent Vibes TUI, or):
   powershell -NoProfile -ExecutionPolicy Bypass -File "$env:USERPROFILE\.claude\hooks-windows\provider-manager.ps1" set kokoro

4) Verify play-tts.ps1 speaks a short test line.

5) Give each of my GrokBots a unique -llm key, Kokoro voice, and spoken "<Name> GrokBot" pretext in audio-effects.cfg (engine kokoro). No shared voices.

6) Have each bot speak with:
   & "<path-to-AgentVibes>\.claude\hooks-windows\play-tts.ps1" -Text "Short update." -llm "<their-key>"

Play one short test line per bot so I can hear the difference.
```

## Related

- Skill: [`.agents/skills/agentvibes-grokbot-tts-setup/SKILL.md`](../.agents/skills/agentvibes-grokbot-tts-setup/SKILL.md)
- [Quick Start](quick-start.md)
- [Providers](providers.md)
- [Windows Setup](../WINDOWS-SETUP.md)

[← Back to Main README](../README.md)

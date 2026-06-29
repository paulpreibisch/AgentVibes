# AgentVibes TalkingHead Module — Design

Status: **working prototype** (overnight build). This document captures the architecture, the three avatar modes, the data flow, and the roadmap to a proper, installable module.

## Goal

Give AgentVibes a visual presence: while you develop, a second monitor shows **talking-head avatars on a 3D galaxy** that **speak the AgentVibes TTS** as it arrives — for everyday Claude, for BMAD party mode, and for ad-hoc "OpenCast" scenes.

## Data flow (already working)

```
Agent (ubuntu-rdp or local)
   │  TTS request
   ▼
play-remote.ps1 (SSH receiver, session 0)  ──writes──▶ ~/.agentvibes/tts-queue/*.json
   ▼
tts-watcher.ps1 (user session, has audio) ──runs──▶ play-tts.ps1
   │  synthesizes WAV (piper/kokoro/sapi)
   │  ┌─────────────────────────────────────────────┐
   │  │ NEW: best-effort forward (flag-gated)        │
   │  └─ POST {audioBase64,text,voice,project,llm} ──┼─▶ TalkingHead server :3747
   ▼                                                 ▼
local speakers (skipped if browser is playing)   SSE /events ──▶ browser stage (cosmic.html)
                                                     │ fetch /audio/<id>.wav
                                                     ▼ decode → speakAudio({audio,words}) → lip-sync
```

Key fixes that made it work:
- Server `/speak` now broadcasts **`text`** (was dropped → no lip-sync words).
- Browser **decodes** the WAV to an AudioBuffer and calls `speakAudio({audio, words, wtimes, wdurations})` — passing a URL silently played nothing.
- `mixerGainSpeech: 3.0` — output was too quiet.
- Chrome autoplay handled by launching the app window with `--autoplay-policy=no-user-gesture-required` plus a click-to-enable fallback.
- `talkinghead.mjs` needs a `three` **import map** and a truthy `ttsEndpoint` placeholder (it's never called — we feed our own audio).
- ReadyPlayerMe is dead (NXDOMAIN); avatars come from `met4citizen/TalkingHead@main/avatars/*.glb`.

## The three modes

| Mode | Avatars | Background | Persistence |
|---|---|---|---|
| **regular** | one default (`brunette`), always | static galaxy | — |
| **party** (BMAD) | up to 4, one per agent voice | static galaxy | voice→avatar **remembered** in `localStorage` |
| **opencast** | characters suited to the cast | **regenerated** theme per cast (seeded by name) | per-session |

Routing: each `/speak` carries `voice`, `project`, `llm`. The stage maps a stable identity (voice, falling back to llm/project) to a slot. In party/opencast the mapping is remembered so an agent keeps the same face and accent colour. The speaking slot steps forward and glows; others dim.

## Avatar roster (verified loadable)

`brunette`, `brunette-t` (female, RPM), `avaturn`, `avatarsdk` (realistic), `vroid` (anime).
`mpfb` exists but exceeds the jsDelivr size limit.

## Components

- `server.js` — zero-dep Node server. SSE `/events`, `POST /speak`, `/audio/:id`, static `/public`, `/avatars.json`, `/health`, `/has-browser`.
- `public/cosmic.html` — the stage: Three.js galaxy + TalkingHead cast + caption + clips + modes + self-demo.
- `public/gallery.html` — landing page / launcher.
- `public/index.html` — original single-head POC (known-good baseline).
- `public/demo-audio/` — bundled scripted party clips + `manifest.json` for the self-playing demo.
- `open-cosmic.ps1` — opens a dedicated Chrome app window (autoplay on) to any view.

## Roadmap

1. **Project = folder name.** Carry `project` through `play-remote.ps1`'s queue JSON and `play-tts.ps1`'s forward (currently dropped at the queue boundary → badge shows the home folder).
2. **TUI integration.** Toggle the module on/off (the `config/talking-head-enabled.txt` flag already gates the forward) and choose default mode + avatar.
3. **True generative avatars.** For "new clothes/hair every time": self-host a GLB set, or integrate an avatar-generation API and cache per agent. Until then, variety = 5 heads × accent/lighting theming.
4. **Proper install.** Move into the package, write the server + page as installed assets, add idempotent install + tests per the non-destructive config rules.
5. **Party-mode handshake.** Let `bmad-party-mode` announce its cast (names + voices) so the stage pre-builds the right heads before the first line.
6. **Audio source policy.** Currently the browser becomes the sole audio source when connected (no echo). Consider a per-mode toggle (speakers + avatar, or avatar only).

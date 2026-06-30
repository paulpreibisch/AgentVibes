# agentvibes-avatars

A **talking-head avatar window** on a galaxy stage that lip-syncs **any TTS audio you POST to it**. Run it, leave the window open, and `POST` audio + text to `/speak` — an avatar speaks it with synchronized lip movement, captions, and a chat log. Multiple sources (projects / remote servers) appear as their own tabs.

It's a thin, zero-dependency Node HTTP server plus a browser page. The heavy 3D — the [TalkingHead](https://github.com/met4citizen/TalkingHead) library, [three.js](https://github.com/mrdoob/three.js), and the avatar models — is **loaded from CDN at runtime, not bundled**, so this package stays tiny and ships only its own code.

## Install

```bash
npm install -g agentvibes-avatars
```

## Run

```bash
agentvibes-avatars            # start the server + open the avatar window
agentvibes-avatars --port 4000
agentvibes-avatars --view gallery.html
```

This starts the receiver on `http://localhost:3747` and opens a dedicated Chrome app window (with autoplay enabled so audio plays hands-free). If Chrome isn't found it falls back to your default browser. If a window is already open, it's refreshed in place instead of duplicated.

> First run needs internet (to fetch the TalkingHead library + three.js from CDN). After that the browser caches them.

## Speak to it

POST JSON to `/speak`. `audioBase64` is a base64-encoded WAV; the other fields drive the labels.

```bash
curl -X POST http://localhost:3747/speak \
  -H "Content-Type: application/json" \
  -d '{
    "audioBase64": "<base64 WAV>",
    "text": "Hello from my app.",
    "voice": "en_US-amy-medium",
    "project": "my-app",
    "origin": "local"
  }'
```

| field | meaning |
|---|---|
| `audioBase64` | base64 WAV to play (required for audio) |
| `text` | caption + chat bubble + lip-sync timing |
| `voice` | logical voice name (drives avatar colour/mapping) |
| `project` | session/tab label |
| `origin` | source label badge: `local`, `remote`, or a server name |

The window assigns a consistent avatar per voice, groups messages by `project` into tabs (with unread badges), and lets you click any chat bubble to replay it.

## Endpoints

| method | path | purpose |
|---|---|---|
| `POST` | `/speak` | play audio + show text |
| `GET` | `/has-browser` | `{ "connected": bool }` |
| `GET` | `/health` | liveness |
| `POST` | `/reload` | refresh open windows |

## Security

The server binds **`127.0.0.1` only**. State-changing endpoints reject requests carrying a non-loopback `Origin` header (blocks CSRF from a stray browser tab); local tools that POST without an `Origin` work normally. Request bodies are size-capped.

## How it fits with AgentVibes

[AgentVibes](https://github.com/paulpreibisch/AgentVibes) forwards its TTS to this window automatically. But the receiver is generic — anything that can synthesize a WAV and POST it can drive the avatars.

## Credits

- [TalkingHead](https://github.com/met4citizen/TalkingHead) by met4citizen — MIT
- [three.js](https://github.com/mrdoob/three.js) — MIT

Loaded from CDN at runtime; not bundled or redistributed by this package. See [LICENSE](./LICENSE).

## License

MIT © Paul Preibisch

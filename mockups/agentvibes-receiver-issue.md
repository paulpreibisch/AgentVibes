# AgentVibes Receiver - Android App Specification

## 🎯 Vision

Create a native Android app that acts as an audio receiver for OpenClaw TTS messages, replacing the Termux-based solution with a user-friendly mobile experience.

**Core Use Case:** Install OpenClaw on a remote server, message it via Telegram/WhatsApp from anywhere, and the AgentVibes Receiver app plays TTS responses through your phone speakers—making it work like Siri, but powered by AgentVibes!

---

## 📱 App Overview

**Name:** AgentVibes Receiver
**Platform:** Android (Kotlin)
**Type:** Background service with foreground notification
**Primary Function:** Receive text messages from OpenClaw servers → Generate TTS locally → Play through phone speakers

---

## 🎨 UI Design (6 Screens)

All mockups generated using Gemini Nano-Banana-Pro API and available in:
`/home/fire/claude/AgentVibes/mockups/agentvibes-receiver/`

### Screen 1: Onboarding (01-onboarding.jpg)
- Welcome screen with value proposition
- Feature highlights (50+ voices, audio effects, background operation)
- Large "Connect Your Bot" CTA button
- Clean gradient design (purple to blue)

### Screen 2: Add Connection (02-add-connection.jpg)
- QR code scanner with camera viewfinder
- Alternative: "Paste Connection Link" button
- Helper text about automatic deep link detection
- Instructions for both QR and Telegram link methods

### Screen 3: Main Dashboard (03-dashboard.jpg)
- Connection status card (showing active bots count)
- List of connected bots with:
  - Bot name and emoji
  - Status (Connected/Idle)
  - Server URL
  - Last message timestamp
- "Add Another Bot" button

### Screen 4: Active TTS Playback (04-active-playback.jpg)
- Dark mode "Now Playing" interface
- Bot avatar and name
- Message text display
- Animated waveform visualization
- Voice and effects info
- Playback controls (replay, pause, skip)
- Progress bar with timestamps
- Quick actions (mute, favorite)

### Screen 5: Settings (05-settings.jpg)
- Voice selection with preview
- Audio effects configuration:
  - Reverb (Off/Light/Heavy)
  - Background music toggle + track selector + volume slider
  - Speech speed slider
- Auto-play and notification toggles
- "Save Settings" button

### Screen 6: Bot Management (06-bot-management.jpg)
- Manage multiple bot connections
- Per-bot actions (Settings/Remove/Reconnect)
- Connection limit display (3/5 bots)
- Tip about auto-disconnect after 24 hours

---

## 🔧 Technical Architecture

### Connection Methods

#### Method 1: Deep Link (Primary - Mobile Users)
- **URL Format:** `https://agentvibes.org/pair?server=wss://...&token=abc123&botName=MyBot`
- **Flow:**
  1. User taps link in Telegram/WhatsApp
  2. If app installed → opens directly via Android App Links
  3. If app NOT installed → browser redirects to Play Store/F-Droid/APK download
  4. User installs, taps link again → connects

#### Method 2: QR Code (Fallback - Desktop Users)
- **Format:** Same URL as deep link, encoded in QR
- **Flow:** User opens app → tap "Add Bot" → scan QR from OpenClaw dashboard

### Core Components

```
┌─────────────────────────────────────────────────┐
│  OpenClaw Server (Remote)                       │
│  - Generates text messages                      │
│  - Sends via WebSocket                          │
└─────────────────────────────────────────────────┘
                     ↓ WebSocket (wss://)
┌─────────────────────────────────────────────────┐
│  AgentVibes Receiver App (Android)              │
│                                                  │
│  ┌─────────────────────────────────────────┐   │
│  │  Foreground Service                      │   │
│  │  - Maintains WebSocket connection        │   │
│  │  - Receives text messages                │   │
│  │  - Persists in background                │   │
│  └─────────────────────────────────────────┘   │
│                     ↓                            │
│  ┌─────────────────────────────────────────┐   │
│  │  Piper TTS Engine (Local)                │   │
│  │  - ONNX Runtime for inference            │   │
│  │  - Bundled voice models                  │   │
│  │  - Generates audio WAV files             │   │
│  └─────────────────────────────────────────┘   │
│                     ↓                            │
│  ┌─────────────────────────────────────────┐   │
│  │  Audio Effects Processor                 │   │
│  │  - Android AudioEffects API (reverb)     │   │
│  │  - ExoPlayer (background music mixing)   │   │
│  │  - Applies .claude/config settings       │   │
│  └─────────────────────────────────────────┘   │
│                     ↓                            │
│  ┌─────────────────────────────────────────┐   │
│  │  MediaPlayer                             │   │
│  │  - Plays processed audio                 │   │
│  │  - Outputs to phone speakers             │   │
│  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

### Tech Stack

**Language:** Kotlin
**Architecture:** MVVM with Android Architecture Components
**Networking:** OkHttp WebSockets
**TTS:** Piper TTS (ONNX Runtime Android)
**Audio:** Android AudioEffects API + ExoPlayer
**Persistence:** Room Database (SQLite)
**Configuration:** SharedPreferences (encrypted with Android Keystore)
**UI:** Material Design 3 components

### Key Features

1. **Background Service** - Foreground service with persistent notification
2. **WebSocket Management** - Auto-reconnect on network changes (WiFi ↔ Cellular)
3. **Local TTS** - Piper voice models bundled with app (offline operation)
4. **Audio Effects** - Reverb, background music, pitch adjustment
5. **Multi-Bot Support** - Connect to multiple OpenClaw servers simultaneously
6. **Config Sync** - Fetch `.claude/config/audio-effects.cfg` from server on first connect

---

## 🚀 MVP Scope (2-Week Sprint)

### Must-Haves (Week 1)

- [ ] Deep link handling (`agentvibes://pair`)
- [ ] Android App Links for `https://agentvibes.org/pair`
- [ ] WebSocket connection with authentication
- [ ] Foreground service with notification
- [ ] Piper TTS integration (single default voice)
- [ ] Basic audio playback
- [ ] Connection management (add, remove)
- [ ] Onboarding flow

### Must-Haves (Week 2)

- [ ] QR code scanner (ZXing library)
- [ ] Multiple voice support
- [ ] Audio effects (reverb via AudioEffects API)
- [ ] Background music mixing (ExoPlayer)
- [ ] Settings screen (voice, effects, speed)
- [ ] Bot management screen
- [ ] Message queue (offline resilience)

### Nice-to-Haves (Post-MVP)

- [ ] Visual message history
- [ ] Push-to-talk with Whisper (voice input)
- [ ] Multi-bot quick switcher
- [ ] Notification quick actions (mute, reply)
- [ ] Voice model downloader (on-demand)
- [ ] Custom audio effects presets

---

## 🌐 OpenClaw Server Integration

### Pairing API Endpoint (New)

**Endpoint:** `POST /api/pairing/generate`
**Response:**
```json
{
  "token": "jwt_token_expires_5_mins",
  "qr_image": "data:image/png;base64,...",
  "deep_link": "https://agentvibes.org/pair?server=wss://...&token=...&botName=MyBot",
  "expires_at": "2026-02-01T22:30:00Z"
}
```

### WebSocket Protocol

**Connection:** `wss://server/ws/agentvibes?token=<pairing_token>`
**Message Format:**
```json
{
  "type": "tts",
  "text": "Hello from OpenClaw!",
  "voice": "en_US-amy-medium",
  "effects": {
    "reverb": "light",
    "background_music": "agentvibes_soft_flamenco_loop.mp3",
    "background_volume": 0.30
  },
  "timestamp": "2026-02-01T22:15:30Z"
}
```

**Server → App Messages:**
- `tts` - Text to speak
- `config` - Configuration update
- `ping` - Keepalive

**App → Server Messages:**
- `pong` - Keepalive response
- `status` - Connection status
- `ack` - Message acknowledgment

---

## 🧪 Testing Strategy

### Critical Test Scenarios

1. **Background Resilience**
   - App survives Android battery optimization
   - Service remains alive during screen off
   - Audio plays correctly after hours in background

2. **Audio Quality**
   - Reverb + background music doesn't distort
   - No audio clipping or crackling
   - Volume normalization across voices

3. **Multi-Bot Management**
   - Switch between bots without audio glitches
   - Handle simultaneous messages from multiple bots
   - Connection state persists across app restarts

4. **Network Recovery**
   - WebSocket reconnect on WiFi ↔ Cellular handoff
   - Graceful handling of server disconnects
   - Message queue replay after reconnection

5. **Deep Link Flow**
   - Tap link when app not installed → Play Store
   - Tap link when app installed → instant open
   - QR scan → connection successful

### Automated Testing

- **Unit Tests:** ViewModel logic, TTS processing, WebSocket state machine
- **Integration Tests:** Room database, audio pipeline
- **E2E Tests:** Espresso tests for UI flows with mock server

---

## 📚 Documentation Needs

### For Users

1. **Quick Start Guide** - Install app, scan QR, connect
2. **Troubleshooting** - Common issues (battery optimization, audio not playing)
3. **FAQ** - What is AgentVibes Receiver? How does it differ from Termux setup?

### For OpenClaw Bot Developers

1. **Integration Guide** - How to generate pairing QR/links
2. **WebSocket Protocol Spec** - Message formats, authentication
3. **Audio Effects Reference** - Supported SOX effects and equivalents

### For Android Developers (Contributing)

1. **Architecture Overview** - MVVM, dependency injection, service lifecycle
2. **Building & Testing** - Local dev setup, running tests
3. **Contributing Guide** - PR process, code style, testing requirements

---

## 🔐 Security Considerations

1. **Token Security**
   - Pairing tokens expire after 5 minutes or first use
   - JWT tokens stored in encrypted SharedPreferences (Android Keystore)
   - No tokens logged or exposed in crash reports

2. **Network Security**
   - Only WSS (secure WebSocket) connections allowed
   - Certificate pinning for known servers
   - Validate server URL format before connection

3. **Permissions**
   - INTERNET (required)
   - CAMERA (for QR scanning, request at runtime)
   - FOREGROUND_SERVICE (for background operation)
   - POST_NOTIFICATIONS (Android 13+, request at runtime)

4. **Data Privacy**
   - Messages not logged or stored long-term
   - Connection profiles stored locally only
   - No analytics or telemetry without user consent

---

## 📊 Success Metrics

### MVP Launch (Week 2)

- [ ] App installs from 10 beta testers
- [ ] 90% success rate on first connection attempt
- [ ] Zero crashes in background service over 24 hours
- [ ] Audio quality rated 4+ stars by testers
- [ ] < 5 seconds from deep link tap to audio playback

### Post-Launch (Month 1)

- [ ] 100+ active users
- [ ] 95% 7-day retention rate
- [ ] < 1% crash rate
- [ ] 4.5+ star rating on Play Store
- [ ] < 10% battery drain per hour of active use

---

## 🗓️ Development Timeline

### Week 1: Core Infrastructure
- Days 1-2: Project setup, architecture, dependencies
- Days 3-4: WebSocket connection + foreground service
- Day 5: Piper TTS integration + basic playback

### Week 2: Features & Polish
- Days 6-7: Deep links + QR scanner + onboarding
- Days 8-9: Audio effects + settings screen
- Day 10: Testing, bug fixes, documentation

**Total Estimate:** 2 weeks (10 working days) for MVP

---

## 🎤 Party Mode Discussion Summary

### Participants (BMAD Agents)

- 🧙 **BMad Master** - Workflow orchestration
- 📋 **Pm** - Product strategy, scope validation
- 🏗️ **Architect** - System architecture, tech stack decisions
- 💻 **Dev** - Implementation details, code structure
- 🚀 **Quick Flow Solo Dev** - Rapid prototyping, estimates
- 🎨 **Ux Designer** - UI/UX design, user flows
- 🧪 **Tea** - Testing strategy, quality assurance

### Key Decisions Made

1. **Deep links as primary pairing method** (mobile users)
2. **QR codes as fallback** (desktop users)
3. **Local Piper TTS** (offline operation, no API costs)
4. **WebSocket for real-time messaging** (not REST polling)
5. **Foreground service architecture** (survives background)
6. **MVP scope: 2 weeks** (10 working days)
7. **Material Design 3** (modern Android UI)
8. **Multi-bot support from MVP** (not post-launch feature)

### Design Highlights

- **One-tap connection** via Telegram deep links
- **Siri-like experience** for OpenClaw users
- **Zero configuration** after initial pairing
- **Beautiful mockups** generated with Gemini Nano-Banana-Pro API
- **Professional audio pipeline** (TTS → effects → mixing → playback)

---

## 🔗 Related Resources

- **Main AgentVibes Repo:** https://github.com/paulpreibisch/AgentVibes
- **OpenClaw Website:** https://openclaw.ai/
- **Mockups Location:** `/home/fire/claude/AgentVibes/mockups/agentvibes-receiver/`
- **Mockup Generator Script:** `/home/fire/claude/AgentVibes/mockups/generate-agentvibes-receiver-mockups.cjs`
- **Party Mode Conversation:** Full conversation archived in this issue

---

## 🚀 Next Steps

1. **Create GitHub repo** ✅ (Done: https://github.com/paulpreibisch/AgentVibes-Receiver)
2. **Push mockups to repo** - Commit all 6 UI screens
3. **Set up Android project** - Initialize Kotlin/Gradle project
4. **Create landing page** - `agentvibes.org/pair` for deep link handling
5. **Implement OpenClaw pairing API** - `/api/pairing/generate` endpoint
6. **Begin Week 1 development** - WebSocket + Foreground Service + TTS

---

**Discussion Date:** February 1, 2026
**Issue Created:** February 2, 2026
**Status:** Planning → Development Ready
**Priority:** High
**Labels:** enhancement, android, mobile, MVP

---

## 💬 Questions for Discussion

1. Should we support F-Droid distribution in addition to Play Store?
2. What's the minimum Android API level? (Recommend: API 26 / Android 8.0)
3. Do we need tablet/landscape optimizations for MVP?
4. Should background music tracks be bundled or downloaded on-demand?
5. How should we handle multiple simultaneous TTS messages from different bots?

---

**Generated by:** BMAD Party Mode Discussion
**Mockups:** Gemini Nano-Banana-Pro API
**Documentation:** Claude Sonnet 4.5

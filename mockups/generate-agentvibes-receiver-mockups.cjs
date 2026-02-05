const fs = require('fs');
const path = require('path');

const API_KEY = 'process.env.GOOGLE_API_KEY';
const MODEL = 'nano-banana-pro-preview';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

// Create output directory
const OUTPUT_DIR = path.join(__dirname, 'agentvibes-receiver');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function generateMockup(prompt, filename) {
  console.log(`\n🎨 Generating: ${filename}...`);

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': API_KEY
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseModalities: ['IMAGE'],
          temperature: 0.7
        }
      })
    });

    const data = await response.json();

    if (!data.candidates || !data.candidates[0]) {
      console.error('❌ No candidates in response:', JSON.stringify(data, null, 2));
      return;
    }

    const imagePart = data.candidates[0].content.parts.find(
      p => p.inlineData?.mimeType?.startsWith('image/')
    );

    if (!imagePart) {
      console.error('❌ No image data in response');
      return;
    }

    const imageBuffer = Buffer.from(imagePart.inlineData.data, 'base64');
    const outputPath = path.join(OUTPUT_DIR, filename);
    fs.writeFileSync(outputPath, imageBuffer);
    console.log(`✅ Saved: ${outputPath}`);

    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));

  } catch (error) {
    console.error(`❌ Error generating ${filename}:`, error.message);
  }
}

// ==============================================================================
// SCREEN 1: ONBOARDING / WELCOME
// ==============================================================================
const SCREEN_1_ONBOARDING = `
Create a mobile app onboarding screen for "AgentVibes Receiver" - an Android app that receives TTS audio from OpenClaw bots.

LAYOUT (Mobile portrait ~1080x1920):

┌─────────────────────────────────────┐
│          TOP SECTION (40%)          │
│                                     │
│      [Large 🎤 Microphone Icon]     │
│                                     │
│       AgentVibes Receiver           │
│                                     │
│   Turn your phone into a speaker   │
│     for OpenClaw AI assistants      │
│                                     │
├─────────────────────────────────────┤
│        FEATURES LIST (40%)          │
│                                     │
│  ✓ Receive voice messages from     │
│    your OpenClaw bots               │
│                                     │
│  ✓ 50+ professional AI voices       │
│    with Piper TTS                   │
│                                     │
│  ✓ Audio effects: reverb,           │
│    background music                 │
│                                     │
│  ✓ Works in background -            │
│    just tap and connect             │
│                                     │
├─────────────────────────────────────┤
│       BOTTOM SECTION (20%)          │
│                                     │
│   ┌───────────────────────────┐    │
│   │  🔗 Connect Your Bot      │    │
│   │   (Large primary button)  │    │
│   └───────────────────────────┘    │
│                                     │
│        Skip for now                 │
│                                     │
└─────────────────────────────────────┘

CRITICAL FEATURES:
1. Large microphone icon at top (3D gradient style)
2. Clear value proposition text
3. 4 bullet points with checkmarks
4. Large CTA button "Connect Your Bot"
5. Skip link at bottom

STYLE:
- Modern Material Design 3
- Gradient background (purple to blue)
- White text on gradient background
- Primary button: bright teal/cyan (#00BCD4)
- Clean, friendly, professional
- Sans-serif typography (Roboto/Inter)

Show complete onboarding screen!
`;

// ==============================================================================
// SCREEN 2: ADD CONNECTION (QR SCANNER)
// ==============================================================================
const SCREEN_2_ADD_CONNECTION = `
Create a mobile app screen for scanning QR codes to connect OpenClaw bots.

LAYOUT (Mobile portrait ~1080x1920):

┌─────────────────────────────────────┐
│  ← BACK    Add Connection           │
├─────────────────────────────────────┤
│                                     │
│          INSTRUCTIONS (15%)         │
│                                     │
│   Scan QR code from your OpenClaw   │
│   bot dashboard, or tap a connection│
│   link from Telegram/WhatsApp       │
│                                     │
├─────────────────────────────────────┤
│                                     │
│       QR SCANNER VIEW (60%)         │
│                                     │
│   ┌───────────────────────────┐    │
│   │                           │    │
│   │   [Camera viewfinder      │    │
│   │    with scanning frame]   │    │
│   │                           │    │
│   │   Rounded square overlay  │    │
│   │   with corner brackets    │    │
│   │                           │    │
│   └───────────────────────────┘    │
│                                     │
│     Point camera at QR code         │
│                                     │
├─────────────────────────────────────┤
│        BOTTOM SECTION (25%)         │
│                                     │
│   ┌───────────────────────────┐    │
│   │  📋 Paste Connection Link │    │
│   │   (Secondary button)      │    │
│   └───────────────────────────┘    │
│                                     │
│         OR                          │
│                                     │
│   Already have the app open when   │
│   you tap a link? It connects       │
│   automatically!                    │
│                                     │
└─────────────────────────────────────┘

CRITICAL FEATURES:
1. Back button and title in header
2. Clear instructions at top
3. Camera viewfinder with scanning overlay (rounded square, corner brackets)
4. "Point camera at QR code" helper text
5. Secondary button "Paste Connection Link"
6. Helper text about automatic connection

STYLE:
- Clean white background
- Camera viewfinder with dark overlay
- Scanning frame: bright cyan/teal corners
- Typography: Roboto/Inter, 16sp body text
- Material Design 3 components

Show complete QR scanner screen!
`;

// ==============================================================================
// SCREEN 3: MAIN DASHBOARD (CONNECTED)
// ==============================================================================
const SCREEN_3_DASHBOARD = `
Create a mobile app main dashboard showing connected OpenClaw bots with status.

LAYOUT (Mobile portrait ~1080x1920):

┌─────────────────────────────────────┐
│  ☰ Menu    AgentVibes Receiver   ⚙️ │
├─────────────────────────────────────┤
│        CONNECTION STATUS (20%)      │
│                                     │
│   ✅ Connected to 2 bots            │
│   🔊 Audio playing in background    │
│                                     │
│   Last message: 2 minutes ago       │
│                                     │
├─────────────────────────────────────┤
│         BOT LIST (60%)              │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 🤖 My OpenClaw Assistant    │   │
│  │ Status: 🟢 Connected         │   │
│  │ Server: wss://my-server.com │   │
│  │                              │   │
│  │ Last: "Task completed!"      │   │
│  │ 2 min ago                    │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 🤖 Work Bot                  │   │
│  │ Status: 🟢 Connected         │   │
│  │ Server: wss://work-bot.io   │   │
│  │                              │   │
│  │ Last: "Analysis ready"       │   │
│  │ 5 min ago                    │   │
│  └─────────────────────────────┘   │
│                                     │
├─────────────────────────────────────┤
│       BOTTOM SECTION (20%)          │
│                                     │
│   ┌───────────────────────────┐    │
│   │  ➕ Add Another Bot       │    │
│   │   (Outlined button)       │    │
│   └───────────────────────────┘    │
│                                     │
└─────────────────────────────────────┘

CRITICAL FEATURES:
1. Hamburger menu + Settings icon in header
2. Status card showing connection count and activity
3. Bot cards with:
   - Bot name with robot emoji
   - Green dot connection status
   - Server URL (truncated)
   - Last message preview
   - Timestamp
4. "Add Another Bot" button at bottom
5. Material cards with elevation/shadow

STYLE:
- White background
- Status card: light blue/cyan background (#E1F5FE)
- Bot cards: white with subtle shadow
- Green status dots (#4CAF50)
- Typography: Roboto, 14sp body, 18sp card titles
- Material Design 3 cards with rounded corners

Show complete dashboard!
`;

// ==============================================================================
// SCREEN 4: ACTIVE TTS PLAYBACK
// ==============================================================================
const SCREEN_4_ACTIVE_PLAYBACK = `
Create a mobile app screen showing active TTS audio playback with message.

LAYOUT (Mobile portrait ~1080x1920):

┌─────────────────────────────────────┐
│  ← Back    Now Playing              │
├─────────────────────────────────────┤
│                                     │
│       BOT IDENTITY (15%)            │
│                                     │
│      [Large bot avatar/icon]        │
│       My OpenClaw Assistant         │
│                                     │
├─────────────────────────────────────┤
│                                     │
│      MESSAGE DISPLAY (40%)          │
│                                     │
│   ┌───────────────────────────┐    │
│   │                           │    │
│   │  "I've analyzed the data  │    │
│   │   and found 3 key insights│    │
│   │   that will help optimize │    │
│   │   your workflow..."       │    │
│   │                           │    │
│   └───────────────────────────┘    │
│                                     │
├─────────────────────────────────────┤
│                                     │
│    AUDIO VISUALIZATION (20%)        │
│                                     │
│   [Animated waveform bars]          │
│   ▂▃▅▇▆▄▃▂▁▂▄▆▇▅▃▁               │
│                                     │
│   Voice: Amy (en_US-amy-medium)     │
│   Effects: Light Reverb             │
│   Background: Soft Flamenco (20%)   │
│                                     │
├─────────────────────────────────────┤
│      PLAYBACK CONTROLS (15%)        │
│                                     │
│      ◀◀    ⏸    ▶▶                 │
│   (Replay) (Pause) (Skip)           │
│                                     │
│   ━━━━━━━━━━━━━━━━━━━━             │
│   0:08 / 0:15                       │
│                                     │
├─────────────────────────────────────┤
│        QUICK ACTIONS (10%)          │
│                                     │
│   [🔇 Mute]  [⭐ Favorite]          │
│                                     │
└─────────────────────────────────────┘

CRITICAL FEATURES:
1. Back button and "Now Playing" title
2. Bot avatar/icon with name
3. Message card showing TTS text
4. Animated audio waveform visualization
5. Voice and effects info below waveform
6. Playback controls (replay, pause, skip)
7. Progress bar with timestamps
8. Quick action buttons (mute, favorite)

STYLE:
- Dark mode UI (dark background #121212)
- Message card: slightly lighter dark (#1E1E1E)
- Accent color: cyan/teal (#00BCD4)
- Waveform: animated gradient (purple to cyan)
- Large touch targets for controls (56dp)
- Material Design 3 dark theme

Show complete active playback screen!
`;

// ==============================================================================
// SCREEN 5: SETTINGS / VOICE SELECTION
// ==============================================================================
const SCREEN_5_SETTINGS = `
Create a mobile app settings screen for voice and audio effects configuration.

LAYOUT (Mobile portrait ~1080x1920):

┌─────────────────────────────────────┐
│  ← Back    Settings                 │
├─────────────────────────────────────┤
│                                     │
│      VOICE SETTINGS (35%)           │
│                                     │
│  🎙️ Voice Selection                │
│                                     │
│  ┌───────────────────────────┐     │
│  │ Amy (en_US-amy-medium) ✓  │     │
│  │ ► Tap to preview          │     │
│  └───────────────────────────┘     │
│                                     │
│  Popular Voices:                    │
│  • Lessac (Default Male)            │
│  • Ryan (High Quality)              │
│  • Alan (British Male)              │
│                                     │
│  [Change Voice ▶]                   │
│                                     │
├─────────────────────────────────────┤
│      AUDIO EFFECTS (35%)            │
│                                     │
│  🎚️ Effects                         │
│                                     │
│  Reverb: ○ Off  ● Light  ○ Heavy   │
│                                     │
│  🎵 Background Music                │
│  [ ✓ ] Enable background music      │
│                                     │
│  Track: Soft Flamenco               │
│  Volume: ━━━━●━━━ 30%              │
│                                     │
│  [Browse Tracks ▶]                  │
│                                     │
├─────────────────────────────────────┤
│      ADVANCED (20%)                 │
│                                     │
│  Speech Speed: ━━━●━━━━ 1.0x       │
│                                     │
│  [ ✓ ] Auto-play new messages       │
│  [ ✓ ] Vibrate on message           │
│  [   ] Low battery mode             │
│                                     │
├─────────────────────────────────────┤
│        FOOTER (10%)                 │
│                                     │
│   ┌───────────────────────────┐    │
│   │    💾 Save Settings       │    │
│   └───────────────────────────┘    │
│                                     │
└─────────────────────────────────────┘

CRITICAL FEATURES:
1. Back button and "Settings" title
2. Voice selection card with current voice + checkmark
3. "Change Voice" link to voice library
4. Reverb radio buttons (Off/Light/Heavy)
5. Background music toggle + track selector + volume slider
6. Speech speed slider
7. Auto-play and notification toggles
8. Save button at bottom

STYLE:
- Light mode UI (white background)
- Section headers: bold, 16sp, dark gray
- Cards: white with subtle border/shadow
- Radio buttons and checkboxes: Material Design 3
- Sliders: teal/cyan accent (#00BCD4)
- Typography: Roboto, 14sp body text

Show complete settings screen!
`;

// ==============================================================================
// SCREEN 6: BOT MANAGEMENT (MULTIPLE CONNECTIONS)
// ==============================================================================
const SCREEN_6_BOT_MANAGEMENT = `
Create a mobile app screen for managing multiple connected OpenClaw bots.

LAYOUT (Mobile portrait ~1080x1920):

┌─────────────────────────────────────┐
│  ← Back    My Bots                  │
├─────────────────────────────────────┤
│                                     │
│       CONNECTED BOTS (70%)          │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 🤖 My OpenClaw Assistant    │   │
│  │ 🟢 Connected · Active       │   │
│  │                             │   │
│  │ wss://my-server.com         │   │
│  │ Last: 2 min ago             │   │
│  │                             │   │
│  │ [⚙️ Settings] [🗑️ Remove]   │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 🤖 Work Bot                 │   │
│  │ 🟢 Connected · Idle         │   │
│  │                             │   │
│  │ wss://work-bot.io           │   │
│  │ Last: 15 min ago            │   │
│  │                             │   │
│  │ [⚙️ Settings] [🗑️ Remove]   │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 🤖 Personal Assistant       │   │
│  │ 🔴 Disconnected             │   │
│  │                             │   │
│  │ wss://personal.bot          │   │
│  │ Last: 3 hours ago           │   │
│  │                             │   │
│  │ [🔗 Reconnect] [🗑️ Remove]  │   │
│  └─────────────────────────────┘   │
│                                     │
├─────────────────────────────────────┤
│         ACTION BAR (30%)            │
│                                     │
│   ┌───────────────────────────┐    │
│   │  ➕ Add New Bot           │    │
│   └───────────────────────────┘    │
│                                     │
│   Connection Limit: 3/5 bots       │
│                                     │
│   💡 Tip: Inactive bots are         │
│   automatically disconnected         │
│   after 24 hours to save battery    │
│                                     │
└─────────────────────────────────────┘

CRITICAL FEATURES:
1. Back button and "My Bots" title
2. Bot cards showing:
   - Bot name with emoji
   - Status (Connected/Disconnected) with colored dot
   - Activity state (Active/Idle)
   - Server URL
   - Last activity timestamp
   - Action buttons (Settings/Remove or Reconnect/Remove)
3. "Add New Bot" button
4. Connection count (3/5)
5. Helpful tip about auto-disconnect

STYLE:
- White background
- Bot cards: white with elevation
- Status indicators:
  - Green dot (#4CAF50) for connected
  - Red dot (#F44336) for disconnected
- Action buttons: text buttons (teal for settings, red for remove)
- Typography: Roboto, 14sp body, 16sp bot names
- Material Design 3 cards

Show complete bot management screen!
`;

// ==============================================================================
// GENERATE ALL MOCKUPS
// ==============================================================================
async function generateAllMockups() {
  console.log('🎨 Starting AgentVibes Receiver mockup generation...\n');
  console.log('📱 Generating 6 mobile app screens\n');

  const screens = [
    { prompt: SCREEN_1_ONBOARDING, filename: '01-onboarding.jpg', name: 'Onboarding' },
    { prompt: SCREEN_2_ADD_CONNECTION, filename: '02-add-connection.jpg', name: 'Add Connection (QR Scanner)' },
    { prompt: SCREEN_3_DASHBOARD, filename: '03-dashboard.jpg', name: 'Main Dashboard' },
    { prompt: SCREEN_4_ACTIVE_PLAYBACK, filename: '04-active-playback.jpg', name: 'Active TTS Playback' },
    { prompt: SCREEN_5_SETTINGS, filename: '05-settings.jpg', name: 'Settings' },
    { prompt: SCREEN_6_BOT_MANAGEMENT, filename: '06-bot-management.jpg', name: 'Bot Management' }
  ];

  for (const screen of screens) {
    console.log(`\n📱 Screen: ${screen.name}`);
    await generateMockup(screen.prompt, screen.filename);
  }

  console.log('\n\n✅ All mockups generated!');
  console.log(`📂 Output directory: ${OUTPUT_DIR}`);
  console.log('\n📱 Generated screens:');
  screens.forEach((s, i) => {
    console.log(`   ${i + 1}. ${s.name} → ${s.filename}`);
  });
}

// Run the generator
generateAllMockups().catch(console.error);

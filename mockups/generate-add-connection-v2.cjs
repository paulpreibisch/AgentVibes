const fs = require('fs');
const path = require('path');

const API_KEY = 'process.env.GOOGLE_API_KEY';
const MODEL = 'nano-banana-pro-preview';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const OUTPUT_DIR = path.join(__dirname, 'agentvibes-receiver');

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

  } catch (error) {
    console.error(`❌ Error generating ${filename}:`, error.message);
  }
}

// ==============================================================================
// SCREEN 2 v2: ADD CONNECTION (with Skills Directory Link)
// ==============================================================================
const SCREEN_2_ADD_CONNECTION_V2 = `
Create a mobile app screen for connecting to OpenClaw bots with QR scanning, deep links, AND a bot discovery feature.

LAYOUT (Mobile portrait ~1080x1920):

┌─────────────────────────────────────┐
│  ← Back    Add Connection           │
├─────────────────────────────────────┤
│                                     │
│       QR SCANNER VIEW (45%)         │
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
│   📷 Point camera at QR code        │
│      from bot dashboard             │
│                                     │
├─────────────────────────────────────┤
│        OR OPTIONS (40%)             │
│                                     │
│   ┌───────────────────────────┐    │
│   │  📋 Paste Connection Link │    │
│   │   (Secondary button)      │    │
│   └───────────────────────────┘    │
│                                     │
│         OR                          │
│                                     │
│   ┌───────────────────────────┐    │
│   │ 🔍 Browse Available Bots  │    │
│   │                           │    │
│   │ agentvibes.org/skills     │    │
│   │ [📋 Copy Link]            │    │
│   └───────────────────────────┘    │
│                                     │
├─────────────────────────────────────┤
│         HELPER TEXT (15%)           │
│                                     │
│   💡 Tap a connection link from     │
│   Telegram/WhatsApp? It connects    │
│   automatically!                    │
│                                     │
└─────────────────────────────────────┘

CRITICAL FEATURES:
1. Back button and title in header
2. Camera viewfinder with scanning overlay (rounded square, cyan corner brackets)
3. "Point camera at QR code" helper text with camera emoji
4. "Paste Connection Link" button (outlined style)
5. **NEW: "Browse Available Bots" card with:**
   - Discovery icon (🔍)
   - Title "Browse Available Bots"
   - URL shown: "agentvibes.org/skills"
   - Copy link button/icon
   - Card has subtle border/elevation
6. Helper text about automatic deep link connection
7. "OR" dividers between options

STYLE:
- Clean white background
- Camera viewfinder with dark overlay
- Scanning frame: bright cyan/teal corners (#00BCD4)
- Browse Bots card: light cyan background (#E1F5FE) with border
- Typography: Roboto/Inter, 16sp body text
- Material Design 3 components
- Copy icon: small cyan icon next to URL

Show complete screen with all three connection methods!
`;

async function generate() {
  console.log('🎨 Generating updated Add Connection screen (v2)...\n');
  await generateMockup(SCREEN_2_ADD_CONNECTION_V2, '02-add-connection-v2.jpg');
  console.log('\n✅ Updated mockup generated!');
  console.log(`📂 Output: ${OUTPUT_DIR}/02-add-connection-v2.jpg`);
}

generate().catch(console.error);

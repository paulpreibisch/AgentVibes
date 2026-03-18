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
// SKILLS DIRECTORY V2 - AgentVibes Receiver Compatible Bots Only
// ==============================================================================
const SKILLS_DIRECTORY_V2 = `
Create a professional web page design for "AgentVibes Skills Directory" showing ONLY OpenClaw bots that are compatible with AgentVibes Receiver app.

LAYOUT (Desktop web ~1920x1080):

┌─────────────────────────────────────────────────────────┐
│  HEADER (20%)                                           │
│                                                         │
│  🎤 AgentVibes Skills Directory                        │
│  OpenClaw Bots Compatible with AgentVibes Receiver     │
│                                                         │
│  ✅ All bots below support voice TTS via your phone    │
│                                                         │
│  [🔍 Search bots...]                                    │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  CONTENT (70%)                                          │
│                                                         │
│  Available Bots (6 total)                              │
│                                                         │
│  ┌──────────────┬──────────────┬──────────────┐       │
│  │ 🤖           │ 💻           │ 📚           │       │
│  │ Personal AI  │ Code Helper  │ Spanish      │       │
│  │ Assistant    │              │ Tutor        │       │
│  │              │              │              │       │
│  │ ✅ AgentVibes│ ✅ AgentVibes│ ✅ AgentVibes│       │
│  │ Compatible   │ Compatible   │ Compatible   │       │
│  │              │              │              │       │
│  │ Your 24/7    │ Debug &      │ Learn Spanish│       │
│  │ companion for│ optimize your│ with voice   │       │
│  │ tasks        │ code         │ lessons      │       │
│  │              │              │              │       │
│  │ Voice:       │ Voice:       │ Voice:       │       │
│  │ • 50+ voices │ • Code       │ • Bilingual  │       │
│  │ • Background │   explanations│  TTS        │       │
│  │   music      │ • Error      │ • Pronunciation│      │
│  │              │   readouts   │   practice   │       │
│  │              │              │              │       │
│  │ 247 users    │ 189 users    │ 156 users    │       │
│  │              │              │              │       │
│  │ [🔗 Connect] │ [🔗 Connect] │ [🔗 Connect] │       │
│  └──────────────┴──────────────┴──────────────┘       │
│                                                         │
│  ┌──────────────┬──────────────┬──────────────┐       │
│  │ 📰           │ 🎯           │ 🏋️           │       │
│  │ Daily News   │ Focus Bot    │ Workout      │       │
│  │ Briefing     │              │ Coach        │       │
│  │              │              │              │       │
│  │ ✅ AgentVibes│ ✅ AgentVibes│ ✅ AgentVibes│       │
│  │ Compatible   │ Compatible   │ Compatible   │       │
│  │              │              │              │       │
│  │ Get top news │ Pomodoro     │ Personal     │       │
│  │ read aloud   │ timer with   │ trainer with │       │
│  │              │ voice cues   │ instructions │       │
│  │              │              │              │       │
│  │ Voice:       │ Voice:       │ Voice:       │       │
│  │ • Summaries  │ • Break      │ • Exercise   │       │
│  │ • Headlines  │   reminders  │   guidance   │       │
│  │ • Categories │ • Focus      │ • Motivation │       │
│  │              │   sessions   │              │       │
│  │              │              │              │       │
│  │ 134 users    │ 98 users     │ 87 users     │       │
│  │              │              │              │       │
│  │ [🔗 Connect] │ [🔗 Connect] │ [🔗 Connect] │       │
│  └──────────────┴──────────────┴──────────────┘       │
│                                                         │
│  💡 Want to add your bot? [Submit Bot →]               │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  FOOTER (10%)                                           │
│                                                         │
│  Powered by AgentVibes & OpenClaw                      │
│  [About] [How to Submit] [Help] [AgentVibes App]      │
│                                                         │
└─────────────────────────────────────────────────────────┘

CRITICAL FEATURES:
1. Clear header: "OpenClaw Bots Compatible with AgentVibes Receiver"
2. Subtitle: "All bots below support voice TTS via your phone"
3. Search bar centered at top
4. Exactly 6 bot cards in 3x2 grid
5. Each bot card shows:
   - Large emoji icon for bot type
   - Bot name (bold, large)
   - Green checkmark badge: "✅ AgentVibes Compatible"
   - Short description (2 lines max)
   - "Voice:" section listing voice features (3 bullet points)
   - User count: "XXX users"
   - "Connect" button (teal, prominent)
6. All cards have equal height and white background with shadow
7. "Want to add your bot?" call-to-action at bottom
8. Footer with key links

STYLE:
- Modern, clean web design
- White background
- Bot cards: white with subtle shadow/elevation
- Primary color: Teal/cyan (#00BCD4)
- Checkmark badge: Green (#4CAF50) background, white text
- Typography: Inter/Roboto, clean sans-serif
- Search bar: rounded, light gray background (#F5F5F5)
- Connect buttons: filled teal, large, rounded
- User counts: gray text, small
- Emoji icons: large (48px+)
- Generous spacing between cards

Show complete skills directory with ONLY AgentVibes-compatible bots!
`;

async function generate() {
  console.log('🎨 Generating AgentVibes Skills Directory (v2 - Compatible Bots Only)...\n');
  await generateMockup(SKILLS_DIRECTORY_V2, 'skills-directory-v2.jpg');
  console.log('\n✅ Skills directory v2 mockup generated!');
  console.log(`📂 Output: ${OUTPUT_DIR}/skills-directory-v2.jpg`);
}

generate().catch(console.error);

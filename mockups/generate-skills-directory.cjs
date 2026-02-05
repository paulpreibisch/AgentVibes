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
// SKILLS DIRECTORY WEB PAGE
// ==============================================================================
const SKILLS_DIRECTORY_PAGE = `
Create a professional web page design for "AgentVibes Skills Directory" - a marketplace for discovering OpenClaw bots.

LAYOUT (Desktop web ~1920x1080):

┌─────────────────────────────────────────────────────────┐
│  HEADER (15%)                                           │
│                                                         │
│  🎤 AgentVibes Skills Directory                        │
│  Discover OpenClaw Bots You Can Connect To             │
│                                                         │
│  [🔍 Search bots...]                                    │
│                                                         │
│  Filter: [All] [Personal] [Work] [Fun] [Learning]      │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  CONTENT (75%)                                          │
│                                                         │
│  Featured Bots                                          │
│                                                         │
│  ┌──────────────┬──────────────┬──────────────┐       │
│  │ 🤖 Bot Card 1│ 💻 Bot Card 2│ 📚 Bot Card 3│       │
│  │              │              │              │       │
│  │ Personal AI  │ Code Helper  │ Spanish      │       │
│  │ Assistant    │ Bot          │ Tutor        │       │
│  │              │              │              │       │
│  │ Your 24/7    │ Debug &      │ Learn Spanish│       │
│  │ companion    │ optimize     │ while coding │       │
│  │              │              │              │       │
│  │ Features:    │ Features:    │ Features:    │       │
│  │ • Reminders  │ • Code review│ • Daily      │       │
│  │ • Scheduling │ • Bug detect │   lessons    │       │
│  │ • Voice TTS  │ • Best       │ • Voice      │       │
│  │              │   practices  │   practice   │       │
│  │              │              │              │       │
│  │ OpenClaw     │ DevTools Inc │ LangLearn    │       │
│  │ Community    │              │ Team         │       │
│  │              │              │              │       │
│  │ [🔗 Connect] │ [🔗 Connect] │ [🔗 Connect] │       │
│  └──────────────┴──────────────┴──────────────┘       │
│                                                         │
│  ┌──────────────┬──────────────┬──────────────┐       │
│  │ 📰 Bot Card 4│ 🎮 Bot Card 5│ 🍳 Bot Card 6│       │
│  │              │              │              │       │
│  │ News Bot     │ Gaming       │ Recipe       │       │
│  │              │ Companion    │ Assistant    │       │
│  │              │              │              │       │
│  │ Daily tech & │ Game tips &  │ Cook like a  │       │
│  │ world news   │ strategies   │ pro          │       │
│  │              │              │              │       │
│  │ Features:    │ Features:    │ Features:    │       │
│  │ • Top stories│ • Walkthroughs│• Step-by-step│       │
│  │ • Summaries  │ • Stats      │• Ingredients │       │
│  │ • Categories │ • Community  │• Nutrition   │       │
│  │              │              │              │       │
│  │ NewsHub      │ GamersUnite  │ ChefBot      │       │
│  │              │              │              │       │
│  │ [🔗 Connect] │ [🔗 Connect] │ [🔗 Connect] │       │
│  └──────────────┴──────────────┴──────────────┘       │
│                                                         │
│  [Load More Bots...]                                   │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  FOOTER (10%)                                           │
│                                                         │
│  Powered by AgentVibes & OpenClaw                      │
│  [About] [Submit a Bot] [Help] [Terms]                │
│                                                         │
└─────────────────────────────────────────────────────────┘

CRITICAL FEATURES:
1. Professional header with AgentVibes branding
2. Large search bar with magnifying glass icon
3. Filter pills/chips for categories (All, Personal, Work, Fun, Learning)
4. Bot cards in 3-column grid layout
5. Each bot card shows:
   - Icon/emoji for bot type
   - Bot name (large, bold)
   - Tagline/description (1 line)
   - 3-4 key features (bullet points)
   - Author/creator name
   - "Connect" button (primary color, teal/cyan)
6. Cards have elevation/shadow for depth
7. "Load More Bots" button at bottom
8. Footer with links

STYLE:
- Modern web design (2024)
- Clean white background
- Bot cards: white with subtle shadow/border
- Primary color: Teal/cyan (#00BCD4)
- Header: Light gradient (purple to blue subtle)
- Typography: Clean sans-serif (Inter/Roboto)
- Search bar: rounded corners, light gray background
- Filter pills: rounded, outlined style
- Connect buttons: filled teal, white text
- Spacing: generous whitespace between cards
- Responsive grid layout

Show complete skills directory web page!
`;

async function generate() {
  console.log('🎨 Generating AgentVibes Skills Directory web page mockup...\n');
  await generateMockup(SKILLS_DIRECTORY_PAGE, 'skills-directory-page.jpg');
  console.log('\n✅ Skills directory mockup generated!');
  console.log(`📂 Output: ${OUTPUT_DIR}/skills-directory-page.jpg`);
}

generate().catch(console.error);

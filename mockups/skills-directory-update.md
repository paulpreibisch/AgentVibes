# Updated Feature: Bot Discovery on Add Connection Screen

## 🔍 New Addition: Browse Available Bots

The **Add Connection** screen (Screen 2) has been updated to include a **bot discovery feature** that transforms it from a passive pairing screen into an active exploration hub.

### What Changed

**Before (v1):**
- QR code scanner
- Paste connection link button
- Helper text about automatic connection

**After (v2):**
- QR code scanner
- Paste connection link button
- **NEW: "Browse Available Bots" card** ✨
  - Copyable link to `agentvibes.org/skills`
  - Discovery icon (🔍)
  - Prominent card with light cyan background
  - "Copy Link" button for sharing
- Helper text about automatic connection

### User Problem Solved

**Problem:** Users can only connect to bots they already know about. No way to discover what OpenClaw bots exist.

**Solution:** Dedicated skills directory page where users can browse available bots, read descriptions, and connect with one tap.

### User Flow

```
1. User opens AgentVibes Receiver app
2. Taps "Add Connection"
3. Sees three options:
   a) Scan QR code (if bot dashboard is visible)
   b) Paste link (if bot sent link already)
   c) Browse Available Bots (discover new bots) ← NEW
4. Taps "Browse Available Bots"
5. Browser opens: agentvibes.org/skills
6. Sees directory of public OpenClaw bots:
   - Personal assistants
   - Code helpers
   - Language tutors
   - News bots
   - Entertainment bots
7. Finds interesting bot
8. Taps "Connect" button on bot card
9. Redirected to deep link: agentvibes://pair?server=...
10. App opens automatically
11. Connected!
```

### Skills Directory Page Structure

**URL:** `https://agentvibes.org/skills`

**Page Layout:**

```
┌─────────────────────────────────────────┐
│  AgentVibes Skills Directory            │
│  Discover OpenClaw Bots                 │
├─────────────────────────────────────────┤
│                                         │
│  🔍 [Search bots...]                    │
│                                         │
│  Filter: [All] [Personal] [Work] [Fun] │
│                                         │
├─────────────────────────────────────────┤
│  Featured Bots                          │
│                                         │
│  ┌───────────────────────────────┐     │
│  │ 🤖 Personal AI Assistant       │     │
│  │ Your 24/7 helpful companion    │     │
│  │                                │     │
│  │ Features:                      │     │
│  │ • Task reminders               │     │
│  │ • Schedule management          │     │
│  │ • Voice responses              │     │
│  │                                │     │
│  │ By: OpenClaw Community         │     │
│  │                                │     │
│  │ [🔗 Connect Now]               │     │
│  └───────────────────────────────┘     │
│                                         │
│  ┌───────────────────────────────┐     │
│  │ 💻 Code Helper Bot             │     │
│  │ Debug & optimize your code     │     │
│  │                                │     │
│  │ Features:                      │     │
│  │ • Code review                  │     │
│  │ • Bug detection                │     │
│  │ • Best practices               │     │
│  │                                │     │
│  │ By: DevTools Inc.              │     │
│  │                                │     │
│  │ [🔗 Connect Now]               │     │
│  └───────────────────────────────┘     │
│                                         │
│  [Load More...]                        │
│                                         │
└─────────────────────────────────────────┘
```

### Technical Implementation

#### Skills Directory Backend (Simple)

**Option 1: Static JSON (MVP)**
```json
// skills-directory.json
{
  "bots": [
    {
      "id": "personal-assistant",
      "name": "Personal AI Assistant",
      "description": "Your 24/7 helpful companion",
      "category": "personal",
      "features": ["Task reminders", "Schedule management", "Voice responses"],
      "author": "OpenClaw Community",
      "server": "wss://assistant.openclaw.ai",
      "pairing_endpoint": "https://assistant.openclaw.ai/api/pair"
    },
    {
      "id": "code-helper",
      "name": "Code Helper Bot",
      "description": "Debug & optimize your code",
      "category": "work",
      "features": ["Code review", "Bug detection", "Best practices"],
      "author": "DevTools Inc.",
      "server": "wss://codehelper.openclaw.ai",
      "pairing_endpoint": "https://codehelper.openclaw.ai/api/pair"
    }
  ]
}
```

**Option 2: Dynamic API (Post-MVP)**
- Backend service that aggregates bots from multiple sources
- Bots can register themselves
- Rating/review system
- Analytics (connection counts, popularity)

#### Connect Button Flow

When user taps "Connect Now" on a bot card:

```javascript
// Frontend (agentvibes.org/skills)
async function connectToBot(botId) {
  // Call bot's pairing endpoint to generate token
  const response = await fetch(bot.pairing_endpoint, {
    method: 'POST',
    body: JSON.stringify({ source: 'skills-directory' })
  });

  const { token, server } = await response.json();

  // Redirect to deep link
  window.location = `agentvibes://pair?server=${server}&token=${token}&botName=${bot.name}`;

  // Fallback for non-app users
  setTimeout(() => {
    window.location = 'https://play.google.com/store/apps/details?id=org.agentvibes.receiver';
  }, 1000);
}
```

### UI Updates Required

**Add Connection Screen (02-add-connection-v2.jpg):**
- [x] Add "Browse Available Bots" card
- [x] Copyable link to skills directory
- [x] Discovery icon (🔍)
- [x] Light cyan background for card
- [x] Copy link button

**Skills Directory Page (New):**
- [ ] Responsive web design (mobile-first)
- [ ] Bot card layout
- [ ] Search functionality
- [ ] Category filters
- [ ] "Connect Now" buttons with deep link generation
- [ ] Fallback to app download if app not installed

### Benefits

1. **User Discovery** - Users find bots they didn't know existed
2. **Bot Promotion** - Bot developers get visibility for their OpenClaw bots
3. **Ecosystem Growth** - Encourages more bot creation (visibility = incentive)
4. **Reduced Friction** - One-tap connection instead of manual URL entry
5. **Community Building** - Central hub for the OpenClaw ecosystem

### MVP Scope

**Week 1-2 (App Development):**
- [x] Add "Browse Bots" card to Add Connection screen
- [x] Implement copyable link functionality
- [ ] Test deep link flow from web page to app

**Post-MVP (Skills Directory):**
- [ ] Create static skills directory web page
- [ ] Design bot card layout
- [ ] Add 5-10 featured bots
- [ ] Implement deep link generation on "Connect" buttons
- [ ] Add search and filtering (optional)

### Open Questions

1. **Who hosts the skills directory?**
   - Option A: agentvibes.org (AgentVibes team)
   - Option B: openclaw.ai (OpenClaw team)
   - Option C: Both (cross-link between sites)

2. **How do bots get listed?**
   - Option A: Manual curation (submit via GitHub PR)
   - Option B: Self-service registration (API)
   - Option C: Hybrid (curated featured bots + self-service community bots)

3. **Do we need bot verification/security checks?**
   - Trusted badge for verified bots?
   - Security warnings for unverified bots?
   - Required security audit before listing?

4. **Monetization strategy?**
   - All free (community-driven)?
   - Premium bot listings (promoted placement)?
   - Sponsored bots?

### Next Steps

1. ✅ Update Add Connection screen mockup with bot discovery
2. ✅ Commit updated mockup to GitHub repo
3. 🔄 Update Issue #1 with this new feature
4. ⏳ Design skills directory web page mockup
5. ⏳ Decide on hosting and governance (agentvibes.org vs openclaw.ai)
6. ⏳ Create static skills directory with 5-10 featured bots
7. ⏳ Implement deep link generation on "Connect" buttons

### Updated Mockup

**File:** `02-add-connection-v2.jpg`
**Location:** `/mockups/agentvibes-receiver/02-add-connection-v2.jpg`
**Status:** ✅ Generated and committed to repo

---

**This feature transforms AgentVibes Receiver from a pairing tool into a bot discovery platform!** 🔍🤖✨

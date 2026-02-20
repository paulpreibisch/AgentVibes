# TUI Console Bug Tracker (Internal / Not for Public Repo)

> Last updated: 2026-02-18 (attempt #5)
> Branch: alpha
> Relevant files: `src/console/app.js`, `src/console/tabs/*.js`

---

## Bug 1 — Gray block characters below tab bar row / dual-row tab display

**Status:** In progress (fix attempt #5 applied 2026-02-18 — pending user test)
**Severity:** High — visible on every tab switch

### Symptoms
- After tab switch, a row of gray block/arrow characters appears immediately below the tab bar (row 4).
- OR: the tab bar appears on TWO rows (duplicate row) when using `{bold}` tags in a `height:1` box.
- Characters look like `<`, `>`, box-drawing glyphs fused with the content area border.
- Persists across all tabs.

### Root Cause (confirmed from blessed source)
Two separate causes:
1. **Dual row**: Using `tags: true` with `{bold}..{/bold}` in a `height:1` box triggers an internal
   line-count calculation in blessed's `parseContent()` that can cause a second rendered row.
2. **Arrows on wrong row**: The previous `>...<` character approach wrote characters that appeared
   on the contentArea border row (row 4) rather than the tab bar row (row 3).

### Fix Applied (2026-02-18 — attempt #5)
**Replace tabBarBox with individual child boxes — no tag parsing, explicit positioning**

`_createTabBar()` now creates ONE `blessed.box` per tab as a child of the tabBarBox parent.
Each child has `tags: false`, is positioned at `left: xOffset` with exact `width: text.length`.
`_updateTabBar(activeTabId)` sets `el.style.fg/bg/bold` directly on the active item's box —
no `setContent()`, no `clearPos()`, no tag parsing. The final `screen.render()` picks up the
style changes on the next paint cycle.

### Why Previous Attempts Failed
- **Attempt #1**: Used `>...<` plain-text markers — markers rendered on row 4 (below tab bar).
- **Attempt #2/3/4**: Used `tags: true` + `{bold}` tags in a single `height:1` box — caused
  dual-row display due to blessed's internal line count miscalculation.

---

## Bug 2 — Settings content bleeding through all other tabs

**Status:** Fixed by Bug 2 fix (attempt #5) — pending user test
**Severity:** High — gold text and labels from settings tab visible in voices/music/agents

### Symptoms
- Gold `#ffd700` value labels (voice name, provider, pitch etc.) from settings tab visible when on
  voices, music, agents, or help tabs.
- Only affects transitions FROM the initial settings page (first tab shown on startup).
- Other tab-to-tab transitions are clean (voices→music, music→agents etc.).

### Root Cause (confirmed from blessed source — screen.js line 728-733)
**blessed's `screen.render()` does NOT clear the `lines` back buffer before rendering.**
The comment in blessed's own code says:
```
// TODO: Could possibly drop .dirty and just clear the `lines` buffer every
// time before a screen.render. This way clearRegion doesn't have to be
// called in arbitrary places for the sake of clearing a spot where an
// element used to be (e.g. when an element moves or is hidden).
// this.screen.clearRegion(0, this.cols, 0, this.rows);  ← COMMENTED OUT
```
The full-screen clear is explicitly commented out. Without it, stale cells in `lines` from the
previous tab persist if they are not overwritten by the new tab's render.

Additionally: `Element.prototype.render()` calls `_getCoords(true)` which returns early if
`this.hidden`, then does `delete this.lpos; return;` — so hidden tabs delete their position cache
on every render pass, which can break `clearPos()` on subsequent switches.

### Fix Applied (2026-02-18 — attempt #5)
**Explicit `screen.clearRegion()` at the start of every tab switch**

In `_initNavigation()`, inside the render-suppression try block, BEFORE hiding/showing tabs:
```js
this.screen.clearRegion(0, this.screen.cols, 4, this.screen.rows - 2);
```
This directly overwrites all cells in the content area with `dattr + ' '` (screen default attr +
space), marking them dirty. The subsequent tab render overwrites these cells with correct content.
This is exactly the fix blessed developers themselves documented but left uncommitted.

Also: `_updateTabBar()` and `_updateContextFooter()` are now called INSIDE the suppression window
to prevent any intermediate renders triggered by `setContent()` / `style` mutations.

---

## Bug 3 — Header title not visible (FIXED)

**Status:** Fixed 2026-02-17 (attempt #1 of header fix)
**Severity:** High — completely invisible on startup

### Symptoms
- Header row (rows 0-2) showed as solid dark navy with no text.
- "AgentVibes v4.0" and working folder path were invisible.

### Root Cause
Standard `{cyan-fg}` maps to ANSI 36 (dark dim cyan) — invisible against `#1a237e` navy background.
`{magenta-fg}` maps to ANSI 35 (dark dim magenta) — same problem.
Missing `valign: 'middle'` caused single-line content to render at top of 3-row box.

### Fix
- `{bright-cyan-fg}` → ANSI 96 (bright cyan) — clearly visible.
- `{bright-magenta-fg}` → ANSI 95 (bright magenta) — visible but later changed per UX feedback.
- Added `valign: 'middle'` and `padding: { left: 2 }`.

---

## Bug 4 — Header style refinements (FIXED)

**Status:** Fixed 2026-02-18
**Severity:** Low — cosmetic/UX

### User Requirements
- "Vibes" should be light pink (not magenta).
- "v" prefix for version number should be gray.
- Version number "4.0" should be yellow/gold.
- Add folder emoji 📁 and "working folder:" label before the path.

### Fix Applied
Updated `_createHeader()` content string in `app.js`:
```
{bright-cyan-fg}Agent{/}{#ffc0cb-fg}Vibes{/}  {#90a4ae-fg}v{/}{#ffd700-fg}4.0{/}  │  📁 working folder: /path
```

---

## Known Remaining Issues / Watch List

- [ ] Tab bar individual boxes (attempt #5): verify all 7 tabs display on a single row without overflow.
- [ ] Tab bar active styling: verify `el.style.fg/bg/bold` changes take effect on next render.
- [ ] Music tab: confirm orange border renders correctly with new switch logic.
- [ ] Verify voices tab preview (audio) is properly stopped on `onBlur()` during tab switch.
- [ ] `onFocus()` for settings calls `_buttons[_currentIdx].focus()` → `screen.render()`. Should be
  clean since it fires after suppression ends (render is restored).
- [ ] `_renderTabBarContent()` helper (app.js) is now unused in production but kept for unit tests.
- [ ] `docs/internal/` should be added to `.gitignore` if this repo becomes public.

---

## Environment

- OS: WSL2 (Linux 6.6.87.1-microsoft-standard-WSL2)
- Node: ESM modules
- Terminal: Blessed 0.x
- TTS: Piper (WSL, `PULSE_SERVER=unix:/mnt/wslg/PulseServer`)

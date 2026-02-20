# AgentVibes Private Dev — TODO

> This file tracks all in-flight tasks so context is not lost between sessions.
> All code changes are made in `/home/fire/claude/AgentVibes/` (public working copy)
> and synced to `/home/fire/claude/AgentVibesPrivate/` (private fork).

---

## Open Issues

| # | Title | GitHub Issue | Priority |
|---|-------|-------------|----------|
| 1 | Install tab wizard screen transition artifacts | [#1](https://github.com/paulpreibisch/AgentVibesPrivate/issues/1) | High |
| 2 | Install tab header inconsistency vs other tabs | [#2](https://github.com/paulpreibisch/AgentVibesPrivate/issues/2) | Medium |

---

## Issue #1 — Artifacts on Screen Transitions

**Status:** Fixed — applied 2026-02-20
**File:** `src/console/tabs/install-tab.js`

### Problem
When pressing Enter to move from Screen 1 → Screen 2 (dependency check), stale terminal
characters from the previous screen bleed through. Notably: gold `ESC [` text from
Screen 1's hint line and section separator underlines remain visible.

### Root Cause
Two issues:
1. `hintLine` had no explicit width — blessed auto-shrank it to content width. When
   Screen 2's shorter hint replaced Screen 1's longer hint, trailing cells of the old
   hint were outside the widget's `lines` array and never written as spaces.
2. `_HDR()` separator was 60 dashes — shorter than terminal width, leaving stale cells
   if the previous screen had more right-margin content.

### Applied Fix
1. Added `right: 2` to `hintLine` — explicit right bound prevents auto-shrink so all
   cells within the hint row get covered on every render.
2. Extended `_HDR()` dashes from 60 → 100 — always overwrites previous header content.
3. Extended Screen 2 separator underline from ~28 chars to 78 chars (`'─'.repeat(78)`).

---

## Issue #2 — Header Inconsistency

**Status:** Likely resolved (visual perception or pre-nav-fix artifact) — monitor
**Files:** `src/console/app.js`, `src/console/tabs/install-tab.js`

### Problem
On the Install tab, only the subtitle row "Agent Vibes Customization Tool" appeared
clearly visible. The full branded header (cyan "AgentVibes" logotype, git info, cwd
path) did not appear the same way.

### Analysis
Code inspection confirms the geometry is correct:
- `headerBox`: `top: 0, height: 3` — occupies rows 0-2 on screen
- Tab bar: `top: 3, height: 1`
- Install tab `box`: `top: 4` — no overlap with header at all

`clearRegion(0, cols, 2, rows-2)` uses `yi < yl` (exclusive upper), so it clears rows
2..rows-3. Row 2 is the empty bottom row of `headerBox` — actual title content at rows
0-1 is never touched.

The olines invalidation also starts at row 2. Header rows 0-1 are left in `olines` and
compared correctly on render — no stale-clear needed.

**Likely cause:** Issue occurred before the nav fix (last session) when
`_createRealTabs()` ran before `_initNavigation()`, causing `navigationService` to be
null and the `forceActivate` tab switch to fail silently. The navigation fix (swapping
order) should have resolved the root cause.

**If still seen:** Add a styled mini-title row inside the install tab box at `top: 0`
(inside border) — makes the wizard self-contained regardless of global header state.

---

## Sync Instructions

To sync changes from the working copy to the private repo:

```bash
# Rsync (excludes .git, node_modules, ~ dir, .bundler-temp)
rsync -av --exclude='.git' --exclude='node_modules' --exclude='.bundler-temp' --exclude='~' \
  /home/fire/claude/AgentVibes/ /home/fire/claude/AgentVibesPrivate/

# Commit only tracked-file changes
cd /home/fire/claude/AgentVibesPrivate
git add <changed files>
git commit -m "sync: ..."
git push
```

---

## Private Repo Info

- **Private repo:** https://github.com/paulpreibisch/AgentVibesPrivate (private)
- **Public repo:** https://github.com/paulpreibisch/AgentVibes (public)
- **Working branch:** `alpha`
- **Local working copy:** `/home/fire/claude/AgentVibes/`
- **Private fork local copy:** `/home/fire/claude/AgentVibesPrivate/`

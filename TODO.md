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

**Status:** Open — fix in progress
**File:** `src/console/tabs/install-tab.js`

### Problem
When pressing Enter to move from Screen 1 → Screen 2 (dependency check), stale terminal
characters from the previous screen bleed through. Notably: gold `ESC [` text from
Screen 1's hint line and section separator underlines remain visible.

### Current Approach (not fully working)
Single persistent `contentBox`, `setContent('')` + `screen.render()` before each transition.

### Fix Plan
1. Extend `_HDR()` dash separator from 60 → 100+ chars
2. Extend Screen 2 dependency table underlines to 80+ chars
3. Pad every content line with trailing spaces to at least terminal width

```js
// _HDR helper — increase dash repeat:
const _HDR = (emoji, label) =>
  `{${COLORS.sectionHdr}-fg}${emoji}  ${label} ${'─'.repeat(100)}{/${COLORS.sectionHdr}-fg}`;

// Screen 2 underlines — extend significantly:
`  {${COLORS.noticeFg}-fg}${'─'.repeat(80)}{/${COLORS.noticeFg}-fg}`,
```

---

## Issue #2 — Header Inconsistency

**Status:** Open — needs investigation
**Files:** `src/console/app.js`, `src/console/tabs/install-tab.js`

### Problem
On the Install tab, only the subtitle row "Agent Vibes Customization Tool" is clearly
visible. The full branded header (cyan "AgentVibes" logotype, git info, cwd path) that
is visible on Settings tab does not appear the same way.

### Fix Plan
1. Check if install tab box z-order is covering the global header
2. Confirm `headerBox` (rows 0-2 in screen) is not obstructed when install tab is active
3. If visual design issue: add consistent styled header row at top of install tab box

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

---
name: release
description: Managed release workflow with human-in-the-loop checkpoints for AgentVibes. Use when the user says /release or wants to do a release.
---

# AgentVibes Release Workflow

Execute the following steps IN ORDER. Stop at every **🛑 HUMAN CHECKPOINT** and wait for explicit user approval before continuing.

---

## Step 1 — Pre-Flight Checks (automated)

Run all of these and report results:

1. **Tests:** `npm run test:coverage` — must be 0 failures. Block release if any fail.
2. **Sensitive file scan:** `git log --oneline -20` and `git diff HEAD~1..HEAD -- . ':(exclude)*.wav' ':(exclude)*.mp3'` — scan for API keys, tokens, personal paths (look for patterns like `sk-`, `Bearer `, `/Users/[name]/`, passwords). Report findings.
3. **Cognitive complexity:** grep `settings-tab.js` for any new functions over ~100 lines and report. Note that SonarCloud runs on CI automatically after push — it cannot be run locally.
4. **Pending uncommitted changes:** `git status` — warn if there are uncommitted changes.
5. **Current version:** read `package.json` version.

Report all results, then proceed.

---

## Step 2 — Determine Version Bump

Based on commits since last tag (`git log $(git describe --tags --abbrev=0)..HEAD --oneline`), recommend:
- **patch** (x.x.X) — bug fixes only
- **minor** (x.X.0) — new features, no breaking changes  
- **major** (X.0.0) — breaking changes

Show the commit list and your recommendation. Then proceed to Step 3.

---

## Step 3 — Draft Release Notes & README

Draft the following and **display all drafts to the user before making any changes**:

### 3a. RELEASE_NOTES.md update
- New section at the top following the existing format (emoji heading, date, feature sections)
- Keep the English version in `RELEASE_NOTES.md`

### 3b. README.md update  
- Update version badge line (e.g. `**Version**: v4.5`)
- Replace the "NEW IN vX.X" section with the new version's highlights
- Rename the old "NEW IN" section to just "vX.X — [title]"

### 3c. package.json version bump
- Show the new version string

### 3d. Translated files needed
- `docs/i18n/README.es.md`, `README.fr.md`, `README.de.md`, `README.pt.md`, `README.ja.md`, `README.ko.md`, `README.zh.md`, `README.it.md`
- `docs/i18n/RELEASE_NOTES.es.md`, etc. (same 8 languages)
- Note: translations are generated after English approval

---

## 🛑 HUMAN CHECKPOINT 1 — Review Drafts

**STOP. Show the user:**
1. The full RELEASE_NOTES.md addition (English)
2. The README.md diff (what changes, not the full file)
3. The new package.json version
4. The commit list that informed this release

**Ask:** "Does this look correct? Any changes before I apply and translate?"

**DO NOT proceed until the user says yes / approves.**

---

## Step 4 — Apply English Changes (after approval)

1. Update `RELEASE_NOTES.md` — prepend new section
2. Update `README.md` — version + new section
3. Update `package.json` — version bump

---

## Step 5 — Generate Translated Files

Translate the approved English release notes and README new-version section into all 8 languages. Create/update:

```
docs/i18n/README.es.md       (Spanish)
docs/i18n/README.fr.md       (French)
docs/i18n/README.de.md       (German)
docs/i18n/README.pt.md       (Portuguese)
docs/i18n/README.ja.md       (Japanese)
docs/i18n/README.ko.md       (Korean)
docs/i18n/README.zh.md       (Chinese Simplified)
docs/i18n/README.it.md       (Italian)

docs/i18n/RELEASE_NOTES.es.md
docs/i18n/RELEASE_NOTES.fr.md
docs/i18n/RELEASE_NOTES.de.md
docs/i18n/RELEASE_NOTES.pt.md
docs/i18n/RELEASE_NOTES.ja.md
docs/i18n/RELEASE_NOTES.ko.md
docs/i18n/RELEASE_NOTES.zh.md
docs/i18n/RELEASE_NOTES.it.md
```

Each translated file should:
- Start with a note: `> 🌐 [English version](../../README.md)`
- Translate all prose content
- Keep code blocks, commands, and file paths in English
- Keep emoji as-is

---

## 🛑 HUMAN CHECKPOINT 2 — Review Translated Files

**STOP. Tell the user:** "Translations complete. Please spot-check the languages you know before I commit."

Offer to display any specific translation on request.

**DO NOT proceed until the user approves.**

---

## Step 6 — Commit, Tag & Push

```bash
git add README.md RELEASE_NOTES.md package.json docs/i18n/
git commit -m "chore: bump version to vX.X.X for npm publish\n\nCo-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
git tag vX.X.X
```

Show the commit and tag, then ask:

---

## 🛑 HUMAN CHECKPOINT 3 — Confirm Push

**STOP. Ask:** "Ready to push master + tag vX.X.X to origin and create the GitHub release?"

**DO NOT push until the user explicitly confirms.**

---

## Step 7 — Push & GitHub Release (after confirmation)

```bash
git push origin master
git push origin vX.X.X
gh release create vX.X.X --title "vX.X.X — [title]" --notes "[release notes body]"
```

---

## Step 8 — npm Publish (separate confirmation)

**Ask separately:** "Do you also want to publish to npm? (`npm publish`)"

Only run `npm publish` if the user explicitly says yes.

---

## Step 9 — Post-Release

Report:
- GitHub release URL
- npm package URL (if published)
- Remind user to check SonarCloud CI scan results at: https://sonarcloud.io/project/overview?id=paulpreibisch_AgentVibes
- Note any open Dependabot alerts

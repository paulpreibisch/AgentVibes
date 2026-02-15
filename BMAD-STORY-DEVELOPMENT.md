# BMAD Story Development Methodology for AgentVibes

## Overview

This project uses **BMAD (BMM - Business Model Methodology)** for proper story development. Instead of ad-hoc implementation, BMAD provides:

- **Sprint tracking** via `sprint-status.yaml`
- **Story files** with acceptance criteria and dev notes
- **Automated workflow** for each story
- **Built-in code review** and fix workflow
- **Status tracking** across sprint progress

## The Correct BMAD Workflow

### Phase 1: Sprint Planning
```bash
# Initialize sprint and create sprint-status.yaml
/sprint-planning

# This creates: docs/implementation-artifacts/sprint-status.yaml
# Which tracks all stories and their current status
```

### Phase 2: Story Development (Repeat for Each Story)
```bash
# Develop next ready story using BMAD dev-story workflow
/dev-story

# This workflow:
# 1. Finds next "ready-for-dev" story from sprint-status.yaml
# 2. Loads story file with acceptance criteria
# 3. Loads project-context.md for coding standards
# 4. Marks story as "in-progress"
# 5. Guides implementation task-by-task
# 6. Runs code review (adversarial)
# 7. Tracks fixes for issues
# 8. Marks story complete when all ACs satisfied
# 9. Updates sprint-status.yaml
```

### Phase 3: Story Status Tracking
```bash
# View overall sprint progress anytime
/sprint-status

# Shows:
# - All epics and their stories
# - Current status of each story (ready-for-dev, in-progress, complete)
# - Progress metrics
# - Next story to work on
```

## Current Project Structure

```
AgentVibes/
├── docs/
│   ├── prd.md                          # Product Requirements
│   ├── epics.md                        # All epics and stories defined
│   ├── implementation-artifacts/       # Sprint artifacts (created by /sprint-planning)
│   │   └── sprint-status.yaml         # Sprint tracking (CREATED by workflow)
│   └── ...
├── _bmad/
│   ├── bmm/
│   │   ├── config.yaml               # BMAD configuration
│   │   └── workflows/
│   │       └── 4-implementation/
│   │           ├── dev-story/        # Story implementation workflow
│   │           └── sprint-planning/  # Sprint initialization workflow
│   └── core/
│       └── tasks/
│           └── workflow.xml          # BMAD execution engine (read-only)
└── ...
```

## How It Works: The Dev-Story Workflow

When you run `/dev-story`, here's what happens:

### Step 1: Find Next Story
- Reads `sprint-status.yaml`
- Finds first story with `status: ready-for-dev`
- Extracts story details (ID, title, acceptance criteria)

### Step 2: Load Context
- Reads project-context.md (coding standards)
- Loads story file with acceptance criteria
- Extracts Dev Notes (previous learnings, architecture guidance)

### Step 3: Check for Review Continuation
- Detects if story has "Senior Developer Review" section
- If yes: Resume with pending review items
- If no: Start fresh implementation

### Step 4: Mark In-Progress
- Updates sprint-status.yaml: `ready-for-dev` → `in-progress`

### Step 5: Implement Tasks (Loop)
For each task in the story's Tasks/Subtasks:
- Write code
- Write tests
- Validate against acceptance criteria
- Check against project-context.md
- **Adversarial code review** (built-in)
- Fix HIGH and MEDIUM severity issues
- Mark task complete ✓

### Step 6: Complete Story
- Verify all acceptance criteria satisfied
- Update story status in sprint-status.yaml: `in-progress` → `complete`
- Prepare for next story

## Status Values in sprint-status.yaml

```yaml
development_status:
  # Story keys use format: "epic-number-story-number-name"
  4-1-path-validation:
    status: ready-for-dev      # Ready to start development
    # or
    status: in-progress         # Currently being developed
    # or
    status: complete            # All acceptance criteria satisfied
```

## The Project-Context File

The workflow automatically uses `project-context.md` (if exists) which contains:
- Coding standards
- Security requirements from CLAUDE.md
- Architecture patterns
- Testing requirements
- Performance benchmarks

This ensures code consistency across all stories.

## What the /dev-story Workflow Checks

At each step, the workflow verifies:

1. **Code Quality**
   - Follows project patterns
   - Matches CLAUDE.md requirements
   - Security hotspots addressed

2. **Test Coverage**
   - All functions have tests
   - Edge cases covered
   - Performance benchmarks met

3. **Acceptance Criteria**
   - All ACs implemented
   - Story file updated

4. **Code Review**
   - Adversarial review for issues
   - AUTO-FIX: HIGH and MEDIUM severity
   - Document DONE by workflow

## Recommended Sprint Structure

**Sprint 3: Epic 4 - Custom Background Music**

Stories (in order):
- [ ] 4.1: Path Validation - COMPLETE ✓
- [ ] 4.2: Audio Format Detection - COMPLETE ✓
- [ ] 4.3: File Ownership Verification - COMPLETE ✓
- [ ] 4.4: File Copy and Secure Storage - COMPLETE ✓
- [ ] 4.5: Music File Input and Selection - READY
- [ ] 4.6: Post-Install Music Config - READY
- [ ] 4.7: TTS Integration - READY
- [ ] 4.8: Security Testing - READY

## Next Steps

1. **Run Sprint Planning:**
   ```bash
   /sprint-planning
   ```
   This initializes `sprint-status.yaml` and marks stories ready-for-dev

2. **For Each Story, Run:**
   ```bash
   /dev-story
   ```
   Workflow handles everything: implementation, review, fixes, status updates

3. **Check Progress Anytime:**
   ```bash
   /sprint-status
   ```

## Benefits of Using BMAD vs Manual Approach

| Aspect | Manual | BMAD |
|--------|--------|------|
| Story tracking | Manual list | Automated sprint-status.yaml |
| Code review | Run separately | Built into dev-story |
| Issue fixing | Manual finding | Auto-detect & auto-fix HIGH/MED |
| Status updates | Manual commits | Automatic via workflow |
| Context loading | Must remember | Auto-loaded from story file |
| Testing | Manual reminder | Built-in validation |
| Progress visibility | Hidden in commits | Visible in sprint-status |

## Key BMAD Constraints (DO NOT VIOLATE)

From `_bmad/core/tasks/workflow.xml`:

1. ✅ **Execute ALL steps in exact order** - No skipping
2. ✅ **Never skip steps** - Even if seeming redundant
3. ✅ **Save to file after EVERY template-output** - Preserve progress
4. ✅ **WAIT for user confirmation** - Unless in YOLO mode
5. ✅ **Update status files** - Keep sprint-status.yaml current

## Example: Running /dev-story in Action

```
🚀 Starting BMAD Story Development

Step 1: Finding next story...
  ✓ Found story: 4-5-music-file-input-selection
  ✓ Status: ready-for-dev

Step 2: Loading context...
  ✓ Loaded story file: stories/4-5-music-file-input-selection.md
  ✓ Loaded project-context.md
  ✓ Found 5 tasks/subtasks

Step 3: Check for review continuation...
  ℹ Fresh start (no previous review)

Step 4: Mark in-progress...
  ✓ Updated sprint-status.yaml
  ✓ Story 4-5 now: in-progress

Step 5a: Implementing task 1...
  📝 Write code: music-file-input.js
  ✅ Tests: 12 passing
  ✅ Validation: AC satisfied
  ✅ Code review: 2 issues found
  🔧 Auto-fixed: 2 HIGH severity issues
  ✓ Task 1 complete

Step 5b-e: Implementing tasks 2-5...
  (repeat for each task)

Step 6: Complete story...
  ✓ All ACs verified
  ✓ All tests passing
  ✓ Updated sprint-status.yaml: in-progress → complete
  ✓ Story 4-5 COMPLETE!

Ready for next story: 4-6-post-install-config
```

## Using YOLO Mode (When Appropriate)

If you want faster development without confirmations:

```bash
/dev-story #yolo
```

This skips all intermediate confirmations but still:
- Runs tests
- Does code review
- Auto-fixes issues
- Updates status files

Use YOLO when:
- You're confident in the implementation
- You want rapid iteration
- You've done multiple similar stories

## Important Files

| File | Purpose | Created By |
|------|---------|-----------|
| `docs/implementation-artifacts/sprint-status.yaml` | Sprint tracking | `/sprint-planning` |
| `docs/stories/*.md` | Individual story files | `/create-story` |
| `project-context.md` | Coding standards | Project setup |
| `_bmad/bmm/config.yaml` | BMAD configuration | Read-only |
| `_bmad/core/tasks/workflow.xml` | Workflow engine | Read-only |

---

**Ready to use BMAD properly? Start with `/sprint-planning`** ✨

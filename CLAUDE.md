# AgentVibes Development Guidelines

**Version:** 3.0
**Updated:** 2026-02-15
**Status:** Active (Using BMAD Methodology)

## Overview

AgentVibes is a Text-to-Speech system for AI assistants with personality support.

### Time Estimates

Always estimate in **AI time** — Paul does not write code, that's Claude's job. "30 minutes" means 30 human minutes; the AI equivalent is seconds to a few minutes. When giving estimates, say things like "~10 minutes of AI work" or "quick — a few minutes tops."

### Project Uses BMAD Methodology

This project follows **BMAD (BMM - Business Model Methodology)** for all story development:
- Use `/sprint-planning` to initialize sprint tracking
- Use `/dev-story` for each story implementation (NOT manual commits)
- `/dev-story` handles: implementation → testing → code review → auto-fixes → status updates
- All stories tracked in `docs/implementation-artifacts/sprint-status.yaml`
- Status updates: `ready-for-dev` → `in-progress` → `complete`

**Required Reading:** See `BMAD-STORY-DEVELOPMENT.md` for complete workflow.

## Critical Rules

### ✅ MANDATORY: Use BMAD Workflow
1. **Initialize sprint:** Run `/sprint-planning` once per sprint
2. **Develop each story:** Run `/dev-story` (NOT manual coding)
3. **Never skip workflow steps** - Workflow enforces quality gates
4. **Update sprint-status.yaml** automatically via `/dev-story`
5. **Code review included** - Built into `/dev-story` workflow

### ✅ Git Workflow (ONLY Outside BMAD)
For changes outside story development:
1. Describe changes before acting
2. Get explicit user approval before commits/pushes
3. Test locally before pushing
4. Exception: Changes made by `/dev-story` auto-commit

### 🚫 RELEASE: MANDATORY HUMAN APPROVAL BEFORE ANY PUSH

**NEVER run `git push`, `git push --follow-tags`, or `npm publish` during a release without first stopping and showing the user:**

1. The full content of `RELEASE_NOTES.md` for that release
2. The updated section of `README.md`
3. Explicitly asking: **"Please review — type 'approve' to push, or request changes."**

**Wait for explicit approval. Do NOT push speculatively.** It doesn't matter how clean the content is. The human-in-the-loop checkpoint is non-negotiable.

This rule was added after Claude pushed v4.6.5 without pausing for review.

## Security Requirements (SonarCloud Compliance)

### Core Security Rules (NO EXCEPTIONS)
1. **No hardcoded credentials** - Never commit API keys, passwords, tokens
2. **Validate all external input** - User input, files, environment variables
3. **Secure temp directories** - Use `$XDG_RUNTIME_DIR` or user-specific `/tmp`
4. **Verify file ownership** - Check before processing external files (uid check)
5. **Prevent path traversal** - Validate paths stay within expected directories (use `path.resolve()`)
6. **Never log sensitive data** - Mask credentials in logs

### Bash/Shell Security
```bash
set -euo pipefail  # REQUIRED: Always use strict mode

# Secure temp with proper permissions
TEMP_DIR="${XDG_RUNTIME_DIR:-/tmp}/agentvibes-$RANDOM"
mkdir -p "$TEMP_DIR"; chmod 700 "$TEMP_DIR"

# Verify file ownership before processing
[[ $(stat -c '%u' "$file" 2>/dev/null || stat -f '%u' "$file" 2>/dev/null) == $(id -u) ]] || exit 1

trap 'rm -f "$TEMP_FILE"' EXIT  # Clean up: use single quotes for deferred expansion

# Validate input
[[ "$VALUE" =~ ^[0-9]+$ ]] || exit 1  # Only allow numbers

echo "$VARIABLE"  # GOOD: Quoted
echo $VARIABLE    # BAD: Vulnerable to word splitting
```

### JavaScript/Node.js Security
```javascript
// Path safety: ALWAYS use path.resolve()
const safePath = path.resolve(userInput);
function isPathSafe(target, base) {
  const r = path.resolve(target), b = path.resolve(base);
  return r === b || r.startsWith(b + path.sep);
}

// Never log credentials - ALWAYS mask
console.log('Key: ' + apiKey.substring(0, 3) + '...');  // Good
console.log(`Key: ${apiKey}`);                           // BAD

// Resource cleanup with try-finally
let proc;
try {
  proc = spawn(...);
} finally {
  if (proc && !proc.killed) proc.kill();
}
```

### Python Security
```python
# Resource cleanup
process = None
try:
    process = subprocess.Popen(...)
finally:
    if process and process.poll() is None:
        process.kill()

# Graceful error handling
try:
    content = path.read_text()
except (PermissionError, UnicodeDecodeError, OSError) as e:
    print(f"Warning: {e}", file=sys.stderr)
    return default_value
```

## Code Quality Standards

- ✅ **Error handling:** No silent failures - always handle errors explicitly
- ✅ **Defensive programming:** Check preconditions and validate inputs
- ✅ **Resource cleanup:** Always clean up files, processes, connections
- ✅ **Race conditions:** Use file locking for shared resources
- ✅ **Comments:** Security-critical code only (explain WHY, not WHAT)
- ✅ **Single responsibility:** Keep functions focused and testable

## Testing Requirements

- Run `npm test` before committing (REQUIRED)
- Write tests for: input validation, path handling, edge cases
- Code review via `/dev-story` includes test validation
- Target: 80%+ code coverage for new features

## Definition of Done (Checked by /dev-story)

- [ ] All tests pass (`npm test`)
- [ ] No Sonar security hotspots
- [ ] Code follows project patterns (project-context.md)
- [ ] Credentials masked in logs
- [ ] Paths validated (no traversal)
- [ ] File operations safe (ownership checked)
- [ ] Shell scripts use strict mode
- [ ] Resources properly cleaned up
- [ ] Acceptance criteria satisfied

## Story Development Workflow (REQUIRED)

### For Each Sprint:
1. Run `/sprint-planning` to initialize sprint-status.yaml
2. For each story, run `/dev-story` (handles everything)
3. Check progress anytime with `/sprint-status`

### What /dev-story Does:
- Finds next ready-for-dev story
- Loads story file with acceptance criteria
- Implements tasks with code + tests
- **Runs adversarial code review** (finds 3-10 issues)
- **Auto-fixes HIGH and MEDIUM severity issues**
- Validates against project-context.md
- Updates sprint-status.yaml automatically
- Marks story complete when all ACs satisfied

**Never bypass the workflow** - it enforces all quality gates.

## Important Files

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Development standards (this file) |
| `BMAD-STORY-DEVELOPMENT.md` | How to use BMAD methodology |
| `project-context.md` | Project-specific patterns (if exists) |
| `docs/epics.md` | All epics and stories |
| `docs/implementation-artifacts/sprint-status.yaml` | Sprint progress tracking |
| `_bmad/core/tasks/workflow.xml` | BMAD execution engine (read-only) |

## References

- **BMAD Methodology:** See `/sprint-planning`, `/dev-story`, `/sprint-status` workflows
- **Security Standards:** [SonarCloud Rules](https://rules.sonarsource.com/javascript/type/Security_Hotspot), [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- **Bash Best Practices:** [Shellharden](https://github.com/anordal/shellharden/blob/master/how_to_do_things_safely_in_bash.md)

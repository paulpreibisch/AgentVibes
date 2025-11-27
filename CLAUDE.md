# AgentVibes Development Guidelines

## Overview
AgentVibes is a Text-to-Speech system for AI assistants with personality support.
This document defines coding standards and quality requirements for all contributions.

## CRITICAL: PR and Commit Workflow

**NEVER push to a PR or commit changes without explicit user approval.**

When working on PRs or making changes to external repositories:
1. **Always describe the changes first** - Explain what you plan to modify
2. **Wait for user to test locally** - Do not push until user confirms testing is complete
3. **Ask before pushing** - Get explicit "yes, push it" or similar confirmation
4. **If user says "let me know before adding to PR"** - This means STOP and WAIT for approval

This rule applies to:
- All commits to any repository
- All pushes to remote branches
- All PR updates
- Any changes to BMAD-METHOD or other external projects

## Sonar Quality Gates (REQUIRED)

All code MUST pass SonarCloud quality gates before merging. The following checks are mandatory:

### Security Hotspots
1. **No hardcoded credentials** - API keys, passwords, tokens must NEVER be in code
2. **Validate all external input** - User input, environment variables, file content
3. **Use secure temp directories** - Prefer `$XDG_RUNTIME_DIR` with fallback to user-specific `/tmp`
4. **Verify file ownership** - Before processing files from directories that could be influenced externally
5. **Prevent path traversal** - Always validate paths are within expected directories

### Shell Script Security (Bash)
```bash
# REQUIRED: Always use strict mode
set -euo pipefail

# REQUIRED: Use secure temp directories
if [[ -n "${XDG_RUNTIME_DIR:-}" ]] && [[ -d "$XDG_RUNTIME_DIR" ]]; then
  TEMP_DIR="$XDG_RUNTIME_DIR/agentvibes-FEATURE"
else
  TEMP_DIR="/tmp/agentvibes-FEATURE-$USER"
fi

# REQUIRED: Set restrictive permissions on directories
mkdir -p "$TEMP_DIR"
chmod 700 "$TEMP_DIR"

# REQUIRED: Verify ownership before processing external files
if [[ "$(stat -c '%u' "$DIR" 2>/dev/null || stat -f '%u' "$DIR" 2>/dev/null)" != "$(id -u)" ]]; then
  echo "Error: Directory not owned by current user" >&2
  exit 1
fi

# REQUIRED: Use single quotes in trap to defer variable expansion
trap 'rm -f "$PID_FILE"' EXIT

# REQUIRED: Validate numeric input
if [[ "$VALUE" =~ ^[0-9]+$ ]]; then
  # Safe to use
fi

# REQUIRED: Quote all variables
echo "$VARIABLE"  # Good
echo $VARIABLE    # Bad - word splitting/globbing risk
```

### JavaScript/Node.js Security
```javascript
// REQUIRED: Use path.resolve() for path operations
const safePath = path.resolve(userInput);

// REQUIRED: Validate paths are within expected directory
function isPathSafe(targetPath, basePath) {
  const resolved = path.resolve(targetPath);
  const baseResolved = path.resolve(basePath);
  // Check for exact match OR starts with base + separator
  return resolved === baseResolved || resolved.startsWith(baseResolved + path.sep);
}

// REQUIRED: Never log sensitive data
console.log('API Key: ***************...');  // Good - masked
console.log(`API Key: ${apiKey}`);           // Bad - exposes credential

// REQUIRED: Use try-finally for resource cleanup
let process;
try {
  process = spawn(...);
  // ... use process
} finally {
  if (process && !process.killed) {
    process.kill();
  }
}
```

### Python Security
```python
# REQUIRED: Use try-finally for resource cleanup
process = None
try:
    process = subprocess.Popen(...)
    # ... use process
finally:
    if process and process.poll() is None:
        process.kill()

# REQUIRED: Handle file operation errors gracefully
try:
    content = file_path.read_text()
except (PermissionError, UnicodeDecodeError, OSError) as e:
    print(f"Warning: Could not read file: {e}", file=sys.stderr)
    return default_value
```

## Code Quality Standards

### Reliability
1. **Always handle errors** - No silent failures
2. **Use defensive programming** - Check preconditions
3. **Clean up resources** - Files, processes, connections
4. **Avoid race conditions** - Use file locking where needed

### Maintainability
1. **Add comments for security-critical code** - Explain why, not what
2. **Keep functions focused** - Single responsibility
3. **Use meaningful variable names** - Self-documenting code

## Testing Requirements

### Before Committing
1. Run existing test suite: `npm test`
2. Add tests for new security-critical code
3. Manual testing of affected features

### Test Coverage
- All input validation must have tests
- All path handling must have tests
- Edge cases must be covered

## Pre-Release Checklist

- [ ] All tests pass (`npm test`)
- [ ] No new Sonar security hotspots
- [ ] Credentials are masked in logs
- [ ] File operations validate paths
- [ ] Shell scripts use strict mode
- [ ] Resources are properly cleaned up
- [ ] Error handling is comprehensive

## References

- [SonarCloud Security Rules](https://rules.sonarsource.com/javascript/type/Security_Hotspot)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Bash Security Best Practices](https://github.com/anordal/shellharden/blob/master/how_to_do_things_safely_in_bash.md)

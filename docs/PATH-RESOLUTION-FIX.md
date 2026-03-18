# Path Resolution Fix - Issue #770

**Problem:** AgentVibes TTS was failing with `play-tts.sh: not found` errors when:
1. Working directory changed during builds (e.g., entering `moderation-portal/`)
2. Scripts were called via symlinks
3. AgentVibes was installed in non-standard locations

**Root Cause:** Relative paths using `$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)` assumed:
- Script always at `./.claude/hooks/play-tts.sh`
- Project root always 2 levels up
- No symlinks or working directory changes

## Solution Implemented

All TTS provider scripts now use **absolute path resolution with symlink support**:

### Pattern (Pre-Fix)
```bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
```

### Pattern (Post-Fix)
```bash
# Resolve symlinks correctly with readlink -f
SCRIPT_PATH="$(readlink -f "${BASH_SOURCE[0]}")"
SCRIPT_DIR="$(dirname "$SCRIPT_PATH")"

# Find PROJECT_ROOT by searching up the directory tree
PROJECT_ROOT="$SCRIPT_DIR"
while [[ "$PROJECT_ROOT" != "/" ]]; do
  if [[ -d "$PROJECT_ROOT/.claude/hooks" ]]; then
    PROJECT_ROOT="$(dirname "$(dirname "$PROJECT_ROOT")")"
    break
  fi
  PROJECT_ROOT="$(dirname "$PROJECT_ROOT")"
done

# Verify valid installation
if [[ ! -d "$PROJECT_ROOT/.claude/hooks" ]]; then
  echo "❌ ERROR: Could not find AgentVibes .claude/hooks directory" >&2
  exit 1
fi
```

## Files Updated

✅ `.claude/hooks/play-tts.sh` - Main TTS entry point
✅ `.claude/hooks/play-tts-piper.sh` - Piper provider
✅ `.claude/hooks/play-tts-soprano.sh` - Soprano provider
✅ `.claude/hooks/play-tts-macos.sh` - macOS provider

## How It Works

1. **`readlink -f`**: Resolves the actual file location (follows symlinks)
2. **Upward search**: Walks up directory tree looking for `.claude/hooks`
3. **Validation**: Verifies PROJECT_ROOT is valid before proceeding
4. **Fallback**: Graceful error messages if installation is corrupted

## Benefits

- ✅ Works from any working directory
- ✅ Works with symlinks to the script
- ✅ Works with non-standard installations
- ✅ Detects corrupted installations early
- ✅ Clear error messages for debugging

## Testing

Test the fix by running TTS from different directories:

```bash
# From project root
cd /path/to/AgentVibes
./.claude/hooks/play-tts.sh "Hello from project root"

# From subdirectory
cd src/installer
/path/to/AgentVibes/.claude/hooks/play-tts.sh "Hello from subdirectory"

# Via global symlink (if installed)
play-tts "Hello from global symlink"
```

## Best Practices for New Hooks

When creating new hook scripts that source other scripts:

```bash
#!/usr/bin/env bash
set -euo pipefail

# Use readlink -f for symlink-safe path resolution
SCRIPT_PATH="$(readlink -f "${BASH_SOURCE[0]}")"
SCRIPT_DIR="$(dirname "$SCRIPT_PATH")"

# Source other scripts with absolute paths
source "$SCRIPT_DIR/other-script.sh"
```

## Related Issues

- **Issue #770** (SoraSage) - Original symlink/path issue
- **Issue #32** - Verbosity handling
- **Issue #80** - Token optimization

## References

- [Bash Path Resolution Best Practices](https://github.com/koalaman/shellcheck/wiki/SC2064)
- [readlink(1) - Follow symlinks](https://man7.org/linux/man-pages/man1/readlink.1.html)
- [Bash BASH_SOURCE Documentation](https://www.gnu.org/software/bash/manual/html_node/Bash-Variables.html)

# AI-Optimized Documentation Standards

**Version**: 1.0
**Purpose**: Maximize AI coding assistant effectiveness through comprehensive code context
**Source**: AgentVibes Multi-Provider TTS System PRD

---

## Overview

All code shall follow **AI-optimized documentation standards** to maximize AI coding assistant effectiveness. These standards ensure AI assistants understand not just *what* code does, but *why* it exists, *how* it integrates, and *when* to use specific patterns.

---

## File-Level Context Headers

**Required for all source files**

Every file must begin with a comprehensive context header that provides AI assistants with architectural understanding:

```javascript
/**
 * @fileoverview [Brief description]
 * @context [Why this exists, what problem it solves]
 * @architecture [How it fits in the system, patterns used]
 * @dependencies [Required files, state, external tools]
 * @entrypoints [How code is called/invoked]
 * @patterns [Conventions followed]
 * @related [GitHub issues, docs, similar files]
 */
```

### Field Descriptions

- **@fileoverview**: One-line summary of file's purpose
- **@context**: The business/technical problem this file solves
- **@architecture**: How this file fits into the larger system, design patterns used
- **@dependencies**: Required files, external state, system tools needed
- **@entrypoints**: How this code gets invoked (CLI commands, imports, hooks)
- **@patterns**: Coding conventions, naming patterns, common idioms used
- **@related**: Links to GitHub issues, related files, documentation

### Example (JavaScript)

```javascript
/**
 * @fileoverview Provider abstraction layer for multi-TTS system
 * @context Supports switching between ElevenLabs and Piper TTS without code changes
 * @architecture Router pattern - delegates to provider-specific implementations
 * @dependencies .claude/tts-provider.txt, play-tts-elevenlabs.sh, play-tts-piper.sh
 * @entrypoints Called by personality-manager.sh, language-manager.sh
 * @patterns Provider registry pattern, fail-fast validation
 * @related GitHub issue #25, docs/prd.md, provider-manager.sh
 */
```

### Example (Bash)

```bash
#!/bin/bash
# @fileoverview ElevenLabs TTS provider implementation
# @context Handles all ElevenLabs API interactions for voice synthesis
# @architecture Provider interface implementation, follows play-tts.sh contract
# @dependencies ELEVENLABS_API_KEY, curl, mpv/afplay/aplay
# @entrypoints Called by play-tts.sh router when provider=elevenlabs
# @patterns Error code propagation, temp file cleanup, audio fallback chain
# @related play-tts.sh, provider-manager.sh, docs/providers.md
```

---

## Function Documentation

**Required for all functions**

Each function must include comprehensive intent-based documentation:

```bash
# @function [name]
# @intent [Purpose - why this function exists]
# @why [Context - problem it solves]
# @param [Parameters with types]
# @returns [Return value and format]
# @exitcode [Exit codes and meanings]
# @sideeffects [Files modified, state changes]
# @edgecases [Corner cases, gotchas]
# @calledby [What calls this function]
# @calls [What this function calls]
```

### Field Descriptions

- **@function**: Function name
- **@intent**: High-level purpose from user perspective
- **@why**: Technical context - what problem does this solve?
- **@param**: Parameters with types, default values, constraints
- **@returns**: What the function returns and in what format
- **@exitcode**: Exit codes and their meanings (for scripts)
- **@sideeffects**: Files written, state modified, external calls made
- **@edgecases**: Corner cases, known limitations, gotchas
- **@calledby**: What calls this function (helps AI understand flow)
- **@calls**: What this function calls (helps AI trace dependencies)

### Example (Bash)

```bash
# @function get_active_provider
# @intent Determine which TTS provider is currently active
# @why Needed to route TTS requests to correct provider implementation
# @param None
# @returns Provider name (elevenlabs|piper) to stdout
# @exitcode 0=success, 1=no provider configured, 2=invalid provider
# @sideeffects Reads .claude/tts-provider.txt or ~/.claude/tts-provider.txt
# @edgecases Returns "elevenlabs" if file missing (backward compat)
# @calledby play-tts.sh, provider-manager.sh, personality-manager.sh
# @calls cat, validate_provider_name
get_active_provider() {
    local provider_file
    # Try project-local first, then global fallback
    if [[ -f ".claude/tts-provider.txt" ]]; then
        provider_file=".claude/tts-provider.txt"
    elif [[ -f "$HOME/.claude/tts-provider.txt" ]]; then
        provider_file="$HOME/.claude/tts-provider.txt"
    else
        # Default to elevenlabs for backward compatibility
        echo "elevenlabs"
        return 0
    fi

    cat "$provider_file"
}
```

### Example (JavaScript)

```javascript
/**
 * @function selectTTSProvider
 * @intent Interactive provider selection during installation
 * @why Allows users to choose between ElevenLabs (premium) and Piper (free)
 * @param {Object} options - Configuration options
 * @param {string} options.platform - Detected platform (wsl|linux|macos|windows)
 * @param {boolean} options.piperAvailable - Whether Piper can be installed
 * @returns {Promise<string>} Selected provider name
 * @sideeffects Writes to .claude/tts-provider.txt
 * @edgecases Disables Piper option on non-WSL/Linux platforms
 * @calledby installer.js main flow
 * @calls inquirer.prompt, detectPlatform, chalk.cyan
 */
async function selectTTSProvider(options) {
    const choices = [
        {
            name: 'ElevenLabs - Premium quality [API key required]',
            value: 'elevenlabs',
        }
    ];

    if (options.piperAvailable) {
        choices.push({
            name: 'Piper TTS - Free, offline [Recommended for WSL/Linux]',
            value: 'piper',
        });
    }

    const { provider } = await inquirer.prompt([{
        type: 'list',
        name: 'provider',
        message: 'Choose your TTS provider:',
        choices,
    }]);

    return provider;
}
```

---

## Additional Documentation Elements

### AI Notes

Use `# AI NOTE:` comments for non-obvious logic that might confuse AI assistants:

```bash
# AI NOTE: We check project-local .claude/ before global ~/.claude/ to support
# per-project provider configurations. This allows users to use ElevenLabs for
# work projects and Piper for personal projects.
if [[ -f ".claude/tts-provider.txt" ]]; then
    provider_file=".claude/tts-provider.txt"
elif [[ -f "$HOME/.claude/tts-provider.txt" ]]; then
    provider_file="$HOME/.claude/tts-provider.txt"
fi
```

### Architecture Decision Records (ADRs)

For critical design decisions, include inline ADRs:

```bash
# ADR-001: Provider Router Pattern
# Decision: Use play-tts.sh as router instead of modifying all callers
# Rationale: Minimizes changes to existing code, easier to add new providers
# Consequences: Single point of failure, but easier maintenance
# Date: 2025-01-05
```

### Cross-Reference Maps

For complex systems, include navigation aids:

```bash
# CROSS-REFERENCE MAP
# ==================
# Provider Management:
#   - play-tts.sh              → Router (entry point)
#   - provider-manager.sh      → Core provider logic
#   - play-tts-elevenlabs.sh   → ElevenLabs implementation
#   - play-tts-piper.sh        → Piper implementation
#
# State Files:
#   - .claude/tts-provider.txt → Active provider
#   - .claude/tts-voice.txt    → Default voice
```

### Pattern Examples

For extensibility, provide pattern examples:

```bash
# PATTERN: Adding a New Provider
# =============================
# 1. Create play-tts-{provider}.sh following this interface:
#    - Input: $1=message, $2=voice_name (optional)
#    - Output: Audio playback
#    - Exit codes: 0=success, 1=error
#
# 2. Add provider to provider-manager.sh:
#    PROVIDERS=("elevenlabs" "piper" "newprovider")
#
# 3. Add voice mappings to personality files:
#    voices:
#      elevenlabs: "Aria"
#      piper: "en_US-amy-medium"
#      newprovider: "voice-id-here"
```

### State File Format Documentation

Document all state file formats:

```bash
# STATE FILE: .claude/tts-provider.txt
# Format: Single line containing provider name
# Valid values: elevenlabs, piper
# Example:
#   elevenlabs
#
# Location precedence:
#   1. .claude/tts-provider.txt (project-local)
#   2. ~/.claude/tts-provider.txt (global fallback)
#
# Created by: installer.js, /agent-vibes:provider switch
# Read by: play-tts.sh, provider-manager.sh, personality-manager.sh
```

---

## Benefits for AI Assistants

Following these standards enables AI assistants to:

1. **Understand Intent**: Know *why* code exists, not just what it does
2. **Navigate Quickly**: Find related code through @related and cross-references
3. **Modify Safely**: Understand side effects and edge cases before changing code
4. **Extend Correctly**: Follow established patterns when adding features
5. **Debug Effectively**: Trace call chains through @calledby/@calls
6. **Maintain Context**: Preserve architectural understanding across conversations

---

## Implementation Checklist

When writing new code:

- [ ] Add file-level context header with all 7 fields
- [ ] Document all functions with 9-field format
- [ ] Add AI NOTEs for non-obvious logic
- [ ] Include ADRs for design decisions
- [ ] Provide cross-reference maps for complex modules
- [ ] Document state file formats
- [ ] Include pattern examples for extensibility
- [ ] Link to related GitHub issues/docs

---

## Related Resources

- **Source PRD**: `docs/prd.md` (Multi-Provider TTS System)
- **Example Implementation**: `.claude/hooks/play-tts.sh`, `provider-manager.sh`
- **GitHub Issue**: #25 (Multi-Provider TTS Feature)

---

**Generated from**: AgentVibes Multi-Provider TTS System PRD v1.0
**Extracted by**: John (PM)
**Date**: 2025-01-05

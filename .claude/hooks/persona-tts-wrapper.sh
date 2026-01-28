#!/usr/bin/env bash
#
# File: .claude/hooks/persona-tts-wrapper.sh
#
# AgentVibes - Persona-aware TTS Wrapper
# Automatically detects IDENTITY.md and applies persona voice settings
#
# @fileoverview Zero-config TTS wrapper that reads IDENTITY.md for voice settings
# @context Intercepts TTS calls and applies persona-based voice/speed before synthesis
# @architecture Detection → voice mapping → TTS delegation → fallback handling
# @dependencies persona-detector.js, play-tts.sh, provider-manager.sh
# @entrypoints Called by Clawdbot channel TTS hooks or direct MCP usage
# @patterns Pre-flight detection, environment variable passing, graceful degradation
# @related persona-detector.js, voice-manager.sh, play-tts.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Detect workspace directory
# Priority:
# 1. CLAUDE_PROJECT_DIR (MCP context)
# 2. CLAWDBOT_WORKSPACE (Clawdbot context)
# 3. Current directory (fallback)
WORKSPACE_DIR="${CLAUDE_PROJECT_DIR:-${CLAWDBOT_WORKSPACE:-$(pwd)}}"

# Path to persona detector
PERSONA_DETECTOR="$SCRIPT_DIR/../../src/utils/persona-detector.js"

# Check if persona detector exists
if [[ ! -f "$PERSONA_DETECTOR" ]]; then
  # Fallback: try to find it via node module resolution
  PERSONA_DETECTOR="$(npm root -g 2>/dev/null || echo "$HOME/.npm-global/lib/node_modules")/agentvibes/src/utils/persona-detector.js"
fi

# Function to detect persona and extract voice settings
detect_persona_voice() {
  local workspace="$1"

  # Use Node.js to run persona detector
  node -e "
    import { detectPersona, getPersonaVoice, getPersonaSpeed } from '$PERSONA_DETECTOR';
    const persona = await detectPersona('$workspace');
    console.log('VOICE=' + persona.voice);
    console.log('SPEED=' + persona.speed);
    console.log('PERSONALITY=' + persona.personality);
    console.log('NAME=' + persona.name);
  " 2>/dev/null || echo "VOICE=en_US-amy-medium
SPEED=1.0
PERSONALITY=normal
NAME=Assistant"
}

# Detect persona if IDENTITY.md exists
if [[ -f "$WORKSPACE_DIR/IDENTITY.md" ]]; then
  # Extract persona settings
  PERSONA_SETTINGS=$(detect_persona_voice "$WORKSPACE_DIR")

  # Parse settings
  export AGENTVIBES_PERSONA_VOICE=$(echo "$PERSONA_SETTINGS" | grep "^VOICE=" | cut -d= -f2)
  export AGENTVIBES_PERSONA_SPEED=$(echo "$PERSONA_SETTINGS" | grep "^SPEED=" | cut -d= -f2)
  export AGENTVIBES_PERSONA_PERSONALITY=$(echo "$PERSONA_SETTINGS" | grep "^PERSONALITY=" | cut -d= -f2)
  export AGENTVIBES_PERSONA_NAME=$(echo "$PERSONA_SETTINGS" | grep "^NAME=" | cut -d= -f2)

  # Override voice settings if not already set
  [[ -z "${AGENTVIBES_VOICE:-}" ]] && export AGENTVIBES_VOICE="$AGENTVIBES_PERSONA_VOICE"
  [[ -z "${AGENTVIBES_SPEED:-}" ]] && export AGENTVIBES_SPEED="$AGENTVIBES_PERSONA_SPEED"

  # Optional: Log persona detection (only if AGENTVIBES_DEBUG is set)
  if [[ "${AGENTVIBES_DEBUG:-}" == "1" ]]; then
    echo "🎭 Persona detected: $AGENTVIBES_PERSONA_NAME ($AGENTVIBES_PERSONA_VOICE @ ${AGENTVIBES_PERSONA_SPEED}x)" >&2
  fi
fi

# Delegate to standard TTS handler
exec "$SCRIPT_DIR/play-tts.sh" "$@"

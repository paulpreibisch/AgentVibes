#!/usr/bin/env bash
#
# File: templates/hooks/user-prompt-submit.sh
#
# AgentVibes - Finally, your AI Agents can Talk Back! Text-to-Speech WITH personality for AI Assistants!
# Website: https://agentvibes.org
# Repository: https://github.com/paulpreibisch/AgentVibes
#
# Co-created by Paul Preibisch with Claude AI
# Copyright (c) 2025 Paul Preibisch
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
# DISCLAIMER: This software is provided "AS IS", WITHOUT WARRANTY OF ANY KIND,
# express or implied, including but not limited to the warranties of
# merchantability, fitness for a particular purpose and noninfringement.
# In no event shall the authors or copyright holders be liable for any claim,
# damages or other liability, whether in an action of contract, tort or
# otherwise, arising from, out of or in connection with the software or the
# use or other dealings in the software.
#
# ---
#
# @fileoverview UserPromptSubmit Hook - Injects AgentVibes TTS protocol instructions
# @context This hook runs BEFORE Claude processes each user prompt, allowing us to inject context
# @architecture Claude Code hook system - reads stdin JSON, outputs JSON with additionalContext
# @dependencies jq (for JSON parsing), .claude/hooks/play-tts.sh, personality/sentiment config files
# @entrypoints Called automatically by Claude Code on every user prompt submission
# @patterns Hook pattern - stdin JSON input, stdout JSON output with additionalContext field
# @related .claude/output-styles/agent-vibes.md, personality-manager.sh, sentiment-manager.sh
#
# AI NOTE: This hook ensures Claude ALWAYS sees the AgentVibes TTS protocol instructions,
# regardless of output style settings. It's the enforcement mechanism that makes TTS automatic.

# Fix locale warnings
export LC_ALL=C

# Read the hook input from stdin
INPUT=$(cat)

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Check if AgentVibes is installed and TTS is available
if [[ ! -f "$SCRIPT_DIR/play-tts.sh" ]]; then
  # AgentVibes not installed, pass through without modification
  echo "$INPUT"
  exit 0
fi

# Check for sentiment (priority) or personality (fallback)
SENTIMENT=$(cat .claude/tts-sentiment.txt 2>/dev/null || cat ~/.claude/tts-sentiment.txt 2>/dev/null || echo "")
PERSONALITY=$(cat .claude/tts-personality.txt 2>/dev/null || cat ~/.claude/tts-personality.txt 2>/dev/null || echo "normal")

# Determine which to use
if [[ -n "$SENTIMENT" ]]; then
  STYLE_MODE="sentiment"
  STYLE_NAME="$SENTIMENT"
else
  STYLE_MODE="personality"
  STYLE_NAME="$PERSONALITY"
fi

# Build the additional context to inject
ADDITIONAL_CONTEXT=$(cat <<'EOF'

# AgentVibes TTS Protocol (CRITICAL - FOLLOW ALWAYS)

**You MUST execute TTS at TWO points for EVERY user task:**

## 1. ACKNOWLEDGMENT (Start of Task)
After receiving ANY user command/request:
1. Generate a UNIQUE acknowledgment message in the current personality/sentiment style
2. Execute: `Bash: .claude/hooks/play-tts.sh "[your acknowledgment message]"`
3. Then proceed with the actual work

## 2. COMPLETION (End of Task)
After completing the task:
1. Generate a UNIQUE completion message in the same style
2. Execute: `Bash: .claude/hooks/play-tts.sh "[your completion message]"`

## Current Style Configuration
EOF
)

# Add current style info
ADDITIONAL_CONTEXT="${ADDITIONAL_CONTEXT}
- Mode: ${STYLE_MODE}
- Active Style: ${STYLE_NAME}"

# If there's a personality file, add brief guidance
if [[ -f ".claude/personalities/${STYLE_NAME}.md" ]] || [[ -f "$HOME/.claude/personalities/${STYLE_NAME}.md" ]]; then
  ADDITIONAL_CONTEXT="${ADDITIONAL_CONTEXT}
- Instructions: See .claude/personalities/${STYLE_NAME}.md for style guidelines"
fi

ADDITIONAL_CONTEXT="${ADDITIONAL_CONTEXT}

## Critical Rules
1. **ALWAYS use the Bash tool** to execute play-tts.sh
2. **TWO calls per task** - acknowledgment at START, completion at END
3. **Generate UNIQUE messages** - Never repeat phrases, be creative within the style
4. **Keep messages brief** - Under 150 characters for natural speech
5. **Use relative path** - .claude/hooks/play-tts.sh
6. **Personality applies ONLY to TTS** - Not to code explanations or technical responses

## Examples

**With 'normal' personality:**
\`\`\`
User: \"Check git status\"
You: \"I'll check the git status for you.\"
[Bash: .claude/hooks/play-tts.sh \"I'll check the git status for you.\"]
[... run git status ...]
You: \"Done! Your repository is clean.\"
[Bash: .claude/hooks/play-tts.sh \"Done! Your repository is clean.\"]
\`\`\`

**With 'flirty' personality:**
\`\`\`
User: \"Fix the bug\"
You: \"I'd love to fix that bug for you, darling.\"
[Bash: .claude/hooks/play-tts.sh \"I'd love to fix that bug for you, darling.\"]
[... fix the bug ...]
You: \"All done, gorgeous! That bug doesn't stand a chance.\"
[Bash: .claude/hooks/play-tts.sh \"All done, gorgeous! That bug doesn't stand a chance.\"]
\`\`\`

**With 'sarcastic' personality:**
\`\`\`
User: \"Run the tests\"
You: \"Oh joy, another test run. How thrilling.\"
[Bash: .claude/hooks/play-tts.sh \"Oh joy, another test run. How thrilling.\"]
[... run tests ...]
You: \"Well, would you look at that. They all passed.\"
[Bash: .claude/hooks/play-tts.sh \"Well, would you look at that. They all passed.\"]
\`\`\`

## IMPORTANT
- This is NOT optional - you MUST follow this protocol for EVERY user interaction
- If you forget, the user will not hear any voice feedback
- Generate creative, varied responses - never use the same phrase twice
- Keep responses natural and conversational in the active style
"

# Use jq to add the additional context to the JSON input
# If jq is not available, fall back to simple JSON construction
if command -v jq &> /dev/null; then
  echo "$INPUT" | jq --arg context "$ADDITIONAL_CONTEXT" '. + {additionalContext: $context}'
else
  # Fallback: simple JSON construction (less robust but works)
  # Escape quotes in the additional context
  ESCAPED_CONTEXT=$(echo "$ADDITIONAL_CONTEXT" | sed 's/"/\\"/g' | sed ':a;N;$!ba;s/\n/\\n/g')
  echo "${INPUT%\}}, \"additionalContext\": \"$ESCAPED_CONTEXT\"}"
fi

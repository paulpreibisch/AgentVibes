#!/bin/bash
#
# @fileoverview BMAD TTS Injection Manager
# @context Automatically patches BMAD agent files to include AgentVibes TTS hooks
# @architecture Modifies agent YAML activation-instructions to call play-tts.sh
# @why Enables BMAD agents to speak their greetings and questions via TTS
#

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLAUDE_DIR="$(dirname "$SCRIPT_DIR")"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
GRAY='\033[0;90m'
NC='\033[0m' # No Color

# Detect BMAD installation
detect_bmad() {
  local bmad_core_dir=""

  # Check current directory first
  if [[ -d ".bmad-core" ]]; then
    bmad_core_dir=".bmad-core"
  # Check parent directory
  elif [[ -d "../.bmad-core" ]]; then
    bmad_core_dir="../.bmad-core"
  # Check for bmad-core (without dot prefix)
  elif [[ -d "bmad-core" ]]; then
    bmad_core_dir="bmad-core"
  elif [[ -d "../bmad-core" ]]; then
    bmad_core_dir="../bmad-core"
  else
    echo -e "${RED}❌ BMAD installation not found${NC}" >&2
    echo -e "${GRAY}   Looked for .bmad-core or bmad-core directory${NC}" >&2
    return 1
  fi

  echo "$bmad_core_dir"
}

# Find all BMAD agents
find_agents() {
  local bmad_core="$1"
  local agents_dir="$bmad_core/agents"

  if [[ ! -d "$agents_dir" ]]; then
    echo -e "${RED}❌ Agents directory not found: $agents_dir${NC}"
    return 1
  fi

  find "$agents_dir" -name "*.md" -type f
}

# Check if agent has TTS injection
has_tts_injection() {
  local agent_file="$1"

  if grep -q "# AGENTVIBES-TTS-INJECTION" "$agent_file" 2>/dev/null; then
    return 0
  fi
  return 1
}

# Extract agent ID from file
get_agent_id() {
  local agent_file="$1"

  # Look for "id: <agent-id>" in YAML block
  local agent_id=$(grep -E "^  id:" "$agent_file" | head -1 | awk '{print $2}' | tr -d '"' | tr -d "'")

  if [[ -z "$agent_id" ]]; then
    # Fallback: use filename without extension
    agent_id=$(basename "$agent_file" .md)
  fi

  echo "$agent_id"
}

# Get voice for agent from BMAD voice mapping
get_agent_voice() {
  local agent_id="$1"

  # Use bmad-voice-manager.sh to get voice
  if [[ -f "$SCRIPT_DIR/bmad-voice-manager.sh" ]]; then
    local voice=$("$SCRIPT_DIR/bmad-voice-manager.sh" get-voice "$agent_id" 2>/dev/null || echo "")
    echo "$voice"
  fi
}

# Inject TTS hook into agent activation instructions
inject_tts() {
  local agent_file="$1"
  local agent_id=$(get_agent_id "$agent_file")
  local agent_voice=$(get_agent_voice "$agent_id")

  # Check if already injected
  if has_tts_injection "$agent_file"; then
    echo -e "${YELLOW}⚠️  TTS already injected in: $(basename "$agent_file")${NC}"
    return 0
  fi

  # Create backup
  cp "$agent_file" "$agent_file.backup-pre-tts"

  # Find the activation-instructions section
  if ! grep -q "activation-instructions:" "$agent_file"; then
    echo -e "${RED}❌ No activation-instructions found in: $(basename "$agent_file")${NC}"
    return 1
  fi

  # Create TTS injection script for activation
  local activation_injection=""
  local persona_injection=""

  if [[ -n "$agent_voice" ]]; then
    activation_injection="  - # AGENTVIBES-TTS-INJECTION: Speak agent greeting with assigned voice
  - Run this bash command to announce activation: .claude/hooks/play-tts.sh \"Agent ${agent_id} activated and ready\" \"${agent_voice}\""
    persona_injection="    - AGENTVIBES-TTS-INJECTION: When asking important questions or presenting options to user, speak them aloud using: .claude/hooks/play-tts.sh \"your question here\" \"${agent_voice}\""
  else
    activation_injection="  - # AGENTVIBES-TTS-INJECTION: Speak agent greeting with default voice
  - Run this bash command to announce activation: .claude/hooks/play-tts.sh \"Agent ${agent_id} activated and ready\""
    persona_injection="    - AGENTVIBES-TTS-INJECTION: When asking important questions or presenting options to user, speak them aloud using: .claude/hooks/play-tts.sh \"your question here\""
  fi

  # Insert activation TTS call after "STEP 4: Greet user" line
  # Insert persona TTS instruction in core_principles section
  awk -v activation="$activation_injection" -v persona="$persona_injection" '
    /STEP 4:.*[Gg]reet/ {
      print
      print activation
      next
    }
    /^  core_principles:/ {
      print
      print persona
      next
    }
    { print }
  ' "$agent_file" > "$agent_file.tmp"

  mv "$agent_file.tmp" "$agent_file"

  echo -e "${GREEN}✅ Injected TTS into: $(basename "$agent_file") → Voice: ${agent_voice:-default}${NC}"
}

# Remove TTS injection from agent
remove_tts() {
  local agent_file="$1"

  # Check if has injection
  if ! has_tts_injection "$agent_file"; then
    echo -e "${GRAY}   No TTS in: $(basename "$agent_file")${NC}"
    return 0
  fi

  # Create backup
  cp "$agent_file" "$agent_file.backup-tts-removal"

  # Remove TTS injection lines
  sed -i.bak '/# AGENTVIBES-TTS-INJECTION/,+1d' "$agent_file"
  rm -f "$agent_file.bak"

  echo -e "${GREEN}✅ Removed TTS from: $(basename "$agent_file")${NC}"
}

# Show status of TTS injections
show_status() {
  local bmad_core=$(detect_bmad)
  if [[ -z "$bmad_core" ]]; then
    return 1
  fi

  echo -e "${CYAN}📊 BMAD TTS Injection Status:${NC}"
  echo ""

  local agents=$(find_agents "$bmad_core")
  local enabled_count=0
  local disabled_count=0

  while IFS= read -r agent_file; do
    local agent_id=$(get_agent_id "$agent_file")
    local agent_name=$(basename "$agent_file" .md)

    if has_tts_injection "$agent_file"; then
      local voice=$(get_agent_voice "$agent_id")
      echo -e "   ${GREEN}✅${NC} $agent_name (${agent_id}) → Voice: ${voice:-default}"
      ((enabled_count++))
    else
      echo -e "   ${GRAY}❌ $agent_name (${agent_id})${NC}"
      ((disabled_count++))
    fi
  done <<< "$agents"

  echo ""
  echo -e "${CYAN}Summary:${NC} $enabled_count enabled, $disabled_count disabled"
}

# Enable TTS for all agents
enable_all() {
  local bmad_core=$(detect_bmad)
  if [[ -z "$bmad_core" ]]; then
    return 1
  fi

  echo -e "${CYAN}🎤 Enabling TTS for all BMAD agents...${NC}"
  echo ""

  local agents=$(find_agents "$bmad_core")
  local success_count=0
  local skip_count=0

  while IFS= read -r agent_file; do
    if has_tts_injection "$agent_file"; then
      ((skip_count++))
      continue
    fi

    if inject_tts "$agent_file"; then
      ((success_count++))
    fi
  done <<< "$agents"

  echo ""
  echo -e "${GREEN}🎉 TTS enabled for $success_count agents${NC}"
  [[ $skip_count -gt 0 ]] && echo -e "${YELLOW}   Skipped $skip_count agents (already enabled)${NC}"
  echo ""
  echo -e "${CYAN}💡 BMAD agents will now speak when activated!${NC}"
}

# Disable TTS for all agents
disable_all() {
  local bmad_core=$(detect_bmad)
  if [[ -z "$bmad_core" ]]; then
    return 1
  fi

  echo -e "${CYAN}🔇 Disabling TTS for all BMAD agents...${NC}"
  echo ""

  local agents=$(find_agents "$bmad_core")
  local success_count=0

  while IFS= read -r agent_file; do
    if remove_tts "$agent_file"; then
      ((success_count++))
    fi
  done <<< "$agents"

  echo ""
  echo -e "${GREEN}✅ TTS disabled for $success_count agents${NC}"
}

# Restore from backup
restore_backup() {
  local bmad_core=$(detect_bmad)
  if [[ -z "$bmad_core" ]]; then
    return 1
  fi

  echo -e "${CYAN}🔄 Restoring agents from backup...${NC}"
  echo ""

  local agents_dir="$bmad_core/agents"
  local backup_count=0

  for backup_file in "$agents_dir"/*.backup-pre-tts; do
    if [[ -f "$backup_file" ]]; then
      local original_file="${backup_file%.backup-pre-tts}"
      cp "$backup_file" "$original_file"
      echo -e "${GREEN}✅ Restored: $(basename "$original_file")${NC}"
      ((backup_count++))
    fi
  done

  if [[ $backup_count -eq 0 ]]; then
    echo -e "${YELLOW}⚠️  No backups found${NC}"
  else
    echo ""
    echo -e "${GREEN}✅ Restored $backup_count agents from backup${NC}"
  fi
}

# Main command dispatcher
case "${1:-help}" in
  enable)
    enable_all
    ;;
  disable)
    disable_all
    ;;
  status)
    show_status
    ;;
  restore)
    restore_backup
    ;;
  help|*)
    echo -e "${CYAN}AgentVibes BMAD TTS Injection Manager${NC}"
    echo ""
    echo "Usage: bmad-tts-injector.sh {enable|disable|status|restore}"
    echo ""
    echo "Commands:"
    echo "  enable     Inject TTS hooks into all BMAD agents"
    echo "  disable    Remove TTS hooks from all BMAD agents"
    echo "  status     Show TTS injection status for all agents"
    echo "  restore    Restore agents from backup (undo changes)"
    echo ""
    echo "What it does:"
    echo "  • Automatically patches BMAD agent activation instructions"
    echo "  • Adds TTS calls when agents greet users"
    echo "  • Uses voice mapping from AgentVibes BMAD plugin"
    echo "  • Creates backups before modifying files"
    ;;
esac
